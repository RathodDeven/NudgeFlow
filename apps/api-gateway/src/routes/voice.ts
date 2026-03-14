import {
  ensureSession,
  getSessionContext,
  getUserByPhoneE164,
  insertCallAttempt,
  insertInteractionEvent,
  updateInteractionSummary,
  updateLoanCaseInferenceSnapshot,
  updateSessionMemoryState
} from '@nudges/db'
import { mapBolnaDisposition, parseBolnaExecution } from '@nudges/provider-bolna'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId } from '../context'
import { markScheduledActionFromExecution, resolveScheduledActionStatus } from '../services/voice-scheduling'

export const registerVoiceRoutes = (app: FastifyInstance): void => {
  app.post('/webhooks/voice/bolna', async (request, reply) => {
    let execution = null
    try {
      execution = parseBolnaExecution(request.body)
    } catch (error) {
      app.log.error({ msg: 'Voice webhook payload invalid', error })
      return reply.status(400).send({ error: 'invalid_payload' })
    }

    if (!execution) {
      return reply.status(400).send({ error: 'invalid_payload' })
    }

    const telephony = execution.telephony_data
    const rawPhone =
      telephony?.call_type?.toLowerCase() === 'inbound' ? telephony?.from_number : telephony?.to_number
    if (!rawPhone) {
      app.log.warn({ msg: 'Bolna execution missing phone number', executionId: execution.id })
      return { ok: true }
    }

    const tid = await getTenantId()
    const normalizedPhone = rawPhone.replace(/\s+/g, '').replace(/^\+?91/, '')
    const user = await getUserByPhoneE164(dbPool, tid, normalizedPhone)
    if (!user) {
      app.log.warn({ msg: 'Bolna execution for unknown user', phone: normalizedPhone })
      return { ok: true }
    }

    const sessionId = await ensureSession(dbPool, user.id, tid)
    const sessionContext = await getSessionContext(dbPool, sessionId)
    const callDisposition = mapBolnaDisposition(execution.status)
    const scheduleStatus = resolveScheduledActionStatus(execution.status)
    const callDurationSeconds = telephony?.duration ?? execution.conversation_time
    const direction = telephony?.call_type?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound'
    const eventType = execution.transcript ? 'call_summary' : 'call_attempt'
    const providerTimestamp = execution.updated_at ?? execution.created_at ?? new Date().toISOString()

    const toHighIntentValue = (value: unknown): string | null => {
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (['yes', 'true', 'high', '1'].includes(normalized)) return 'yes'
        if (['no', 'false', 'low', '0'].includes(normalized)) return 'no'
        return normalized || null
      }
      if (typeof value === 'number') return value > 0 ? 'yes' : 'no'
      if (typeof value === 'boolean') return value ? 'yes' : 'no'
      return null
    }

    const persistInferenceSnapshot = async (summary?: {
      summary?: string
      suggestedNextCallAt?: string
      updatedSummaryState?: Record<string, unknown>
    }): Promise<void> => {
      if (!sessionContext?.loanCaseId) return

      const extracted = execution.extracted_data ?? {}
      const callbackFromExtracted =
        typeof extracted.callback_time_iso === 'string' ? extracted.callback_time_iso : undefined
      const promisedCompletionFromExtracted =
        typeof extracted.promised_completion_time_iso === 'string'
          ? extracted.promised_completion_time_iso
          : undefined
      const extractedIntent = typeof extracted.intent_class === 'string' ? extracted.intent_class : undefined
      const summaryIntent =
        typeof summary?.updatedSummaryState?.sessionIntent === 'string'
          ? summary.updatedSummaryState.sessionIntent
          : undefined
      const resolvedIntent = extractedIntent ?? summaryIntent ?? null

      await updateLoanCaseInferenceSnapshot(dbPool, {
        loanCaseId: sessionContext.loanCaseId,
        inferred: {
          last_call_at: providerTimestamp,
          last_call_disposition: callDisposition ?? null,
          last_call_summary: summary?.summary ?? null,
          suggested_next_call_at:
            summary?.suggestedNextCallAt ?? callbackFromExtracted ?? promisedCompletionFromExtracted ?? null,
          inferred_intent: resolvedIntent,
          high_intent_flag: toHighIntentValue(extracted.high_intent_flag),
          notes_for_agent: typeof extracted.notes_for_agent === 'string' ? extracted.notes_for_agent : null,
          extracted_data: extracted,
          context_details: execution.context_details ?? {},
          bolna_execution_id: execution.id,
          bolna_batch_id: execution.batch_id ?? null,
          recording_url: execution.telephony_data?.recording_url ?? null
        }
      })
    }

    const interactionId = await insertInteractionEvent(dbPool, {
      sessionId,
      channel: 'voice',
      direction,
      eventType,
      transcript: execution.transcript,
      callDisposition,
      callDurationSeconds,
      providerId: execution.id,
      providerTimestamp
    })

    if ((eventType === 'call_attempt' || eventType === 'call_summary') && scheduleStatus !== 'processing') {
      await insertCallAttempt(dbPool, {
        sessionId,
        interactionEventId: interactionId,
        disposition: callDisposition,
        durationSeconds: callDurationSeconds,
        providerCallId: telephony?.provider_call_id ?? execution.id,
        providerTimestamp
      })
    }

    if (execution.status) {
      await markScheduledActionFromExecution(dbPool, {
        executionId: execution.id,
        status: scheduleStatus,
        lastError: execution.error_message
      })
    }

    if (execution.transcript && sessionContext) {
      try {
        const summaryRes = await fetch('http://localhost:3010/agent/summarize-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            summaryState: sessionContext.summaryState,
            compactFacts: sessionContext.compactFacts,
            transcript: execution.transcript
          })
        })

        if (summaryRes.ok) {
          const summary = await summaryRes.json()
          await updateInteractionSummary(
            dbPool,
            interactionId,
            summary.summary,
            callDisposition,
            callDurationSeconds
          )

          if (summary.updatedSummaryState) {
            await updateSessionMemoryState(dbPool, {
              sessionId,
              summaryState: summary.updatedSummaryState,
              compactFacts: sessionContext.compactFacts,
              messageCount: sessionContext.messageCount,
              tokenEstimate: sessionContext.tokenEstimate
            })
          }

          await persistInferenceSnapshot(summary)

          // Follow-up scheduling is paused for now; we only capture intent + summary.
          // if (summary.suggestedNextCallAt && sessionContext) {
          //   await scheduleVoiceCall(dbPool, {
          //     session: sessionContext,
          //     callReason: 'follow_up',
          //     requestedAt: summary.suggestedNextCallAt
          //   })
          // }
        }
      } catch (error) {
        app.log.warn({ msg: 'Failed to summarize call transcript', error })
      }
    } else {
      await persistInferenceSnapshot()
    }

    if (sessionContext && callDisposition && scheduleStatus !== 'processing') {
      if (!['no_answer', 'busy', 'failed'].includes(callDisposition)) {
        return { ok: true }
      }

      // Bolna auto-retry handles failed-call retries for now.
      // const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      // const recentFailures = await countRecentFailedCallAttempts(dbPool, sessionId, sinceIso)
      // await scheduleVoiceRetryIfNeeded(dbPool, {
      //   session: sessionContext,
      //   recentFailedAttempts: recentFailures
      // })
    }

    return { ok: true }
  })
}
