import {
  ensureSession,
  getSessionContext,
  getUserByPhoneE164,
  insertCallAttempt,
  insertInteractionEvent,
  updateInteractionSummary,
  updateLoanCaseInferenceSnapshot
} from '@nudges/db'
import { fetchBolnaExecution, mapBolnaDisposition, parseBolnaExecution } from '@nudges/provider-bolna'
import type { FastifyInstance } from 'fastify'
import { dbPool, env, getTenantId } from '../context'
import { markScheduledActionFromExecution, resolveScheduledActionStatus } from '../services/voice-scheduling'

const getStringFromRecord = (
  record: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  const value = record?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

const getBolnaSummary = (execution: {
  extracted_data?: Record<string, unknown>
  context_details?: Record<string, unknown>
  transcript?: string
}): string | undefined => {
  return (
    getStringFromRecord(execution.extracted_data, 'summary') ??
    getStringFromRecord(execution.extracted_data, 'call_summary') ??
    getStringFromRecord(execution.context_details, 'summary') ??
    getStringFromRecord(execution.context_details, 'call_summary') ??
    execution.transcript
  )
}

const getBolnaSuggestedNextCallAt = (execution: {
  extracted_data?: Record<string, unknown>
}): string | undefined => {
  return (
    getStringFromRecord(execution.extracted_data, 'callback_time_iso') ??
    getStringFromRecord(execution.extracted_data, 'promised_completion_time_iso')
  )
}

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

    app.log.info({
      msg: 'Bolna webhook received',
      executionId: execution.id,
      status: execution.status,
      batchId: execution.batch_id,
      hasTranscript: Boolean(execution.transcript),
      transcriptLength: execution.transcript?.length ?? 0,
      extractedKeys: Object.keys(execution.extracted_data ?? {}),
      contextKeys: Object.keys(execution.context_details ?? {}),
      telephony: {
        provider: execution.telephony_data?.provider,
        callType: execution.telephony_data?.call_type,
        from: execution.telephony_data?.from_number,
        to: execution.telephony_data?.to_number,
        providerCallId: execution.telephony_data?.provider_call_id,
        duration: execution.telephony_data?.duration,
        status: execution.telephony_data?.status,
        hangupReason: execution.telephony_data?.hangup_reason
      }
    })
    app.log.debug({ msg: 'Bolna webhook raw payload', payload: request.body, executionId: execution.id })

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

    // Fetch full execution details from Bolna API to get custom_extractions and summary.
    // The webhook payload only carries basic call metadata; analytics live in the executions endpoint.
    let fullExecution = null as Awaited<ReturnType<typeof fetchBolnaExecution>> | null
    if (env.BOLNA_API_KEY) {
      try {
        fullExecution = await fetchBolnaExecution({
          baseUrl: env.BOLNA_BASE_URL,
          apiKey: env.BOLNA_API_KEY,
          executionId: execution.id
        })
        app.log.debug({
          msg: 'Fetched full Bolna execution',
          executionId: execution.id,
          hasSummary: Boolean(fullExecution.summary),
          customExtractionKeys: Object.keys(fullExecution.custom_extractions ?? {})
        })
      } catch (err) {
        app.log.warn({ msg: 'Failed to fetch full Bolna execution', executionId: execution.id, error: err })
      }
    }

    // custom_extractions from the full execution API are the authoritative source for
    // intent, sentiment, follow-up times, etc.  Fall back to execution.extracted_data
    // (webhook payload) when the fetch is unavailable.
    const customExtractions: Record<string, unknown> =
      fullExecution?.custom_extractions ?? execution.extracted_data ?? {}

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
    }): Promise<void> => {
      if (!sessionContext?.loanCaseId) return

      // Use custom_extractions from the full execution fetch as authoritative source.
      const extracted = customExtractions
      // callback_time_iso / promised_completion_time_iso can be empty objects {} in
      // Bolna responses — only treat them as dates when they are non-empty strings.
      const callbackFromExtracted =
        typeof extracted.callback_time_iso === 'string' ? extracted.callback_time_iso : undefined
      const promisedCompletionFromExtracted =
        typeof extracted.promised_completion_time_iso === 'string'
          ? extracted.promised_completion_time_iso
          : undefined
      const extractedIntent = typeof extracted.intent_class === 'string' ? extracted.intent_class : undefined
      const resolvedIntent = extractedIntent ?? null

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
          context_details: fullExecution?.context_details ?? execution.context_details ?? {},
          bolna_execution_id: execution.id,
          bolna_batch_id: execution.batch_id ?? null,
          recording_url:
            fullExecution?.telephony_data?.recording_url ?? execution.telephony_data?.recording_url ?? null
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
        // Prefer the LLM-generated summary from the full execution API.
        // getBolnaSummary checks extracted_data / context_details as fallback.
        const bolnaSummary = fullExecution?.summary ?? getBolnaSummary(execution)
        const suggestedNextCallAt =
          getBolnaSuggestedNextCallAt(execution) ??
          (typeof customExtractions.callback_time_iso === 'string'
            ? customExtractions.callback_time_iso
            : undefined) ??
          (typeof customExtractions.promised_completion_time_iso === 'string'
            ? customExtractions.promised_completion_time_iso
            : undefined)

        if (bolnaSummary) {
          await updateInteractionSummary(
            dbPool,
            interactionId,
            bolnaSummary,
            callDisposition,
            callDurationSeconds
          )
        }

        await persistInferenceSnapshot({ summary: bolnaSummary, suggestedNextCallAt })
      } catch (error) {
        app.log.warn({ msg: 'Failed to persist Bolna summary payload', error, executionId: execution.id })
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
