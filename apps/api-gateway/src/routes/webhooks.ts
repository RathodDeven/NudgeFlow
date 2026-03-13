import { type InboundWebhook, parseInboundWebhook } from '@nudges/channel-gupshup'
import {
  createScheduledAction,
  ensureSession,
  getSessionMemoryState,
  getSessionRecentMessages,
  getUserByPhoneE164,
  getUserSessionInfo,
  insertAgentDecision,
  listRecentCallSummaries
} from '@nudges/db'
import { MEMORY_WINDOW_MESSAGES } from '@nudges/domain'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId } from '../context'
import { recordMessageInteraction } from '../services/interactions'
import { applyAgentMemoryDelta, applyMessageMemoryUpdate } from '../services/memory'
import { buildFallbackSummaryState, hasRequiredSummaryKeys } from '../services/summary'
import { eventLogger } from '../state'

export const registerWebhookRoutes = (app: FastifyInstance): void => {
  app.post('/webhooks/whatsapp/gupshup', async request => {
    const payload = request.body as InboundWebhook
    app.log.info({ msg: 'Gupshup Webhook Payload Received', type: payload?.type, payload })

    if (payload?.type !== 'message') {
      return { ok: true }
    }

    const parsed = parseInboundWebhook(payload)
    const tid = await getTenantId()
    const user = await getUserByPhoneE164(dbPool, tid, parsed.phone)

    if (!user) {
      app.log.warn({ msg: 'Inbound message from unknown user', phone: parsed.phone })
      return { ok: true }
    }

    const sessionId = await ensureSession(dbPool, user.id, tid)

    await recordMessageInteraction(dbPool, {
      sessionId,
      direction: 'inbound',
      body: parsed.text,
      channel: 'whatsapp'
    })
    await applyMessageMemoryUpdate(dbPool, sessionId, parsed.text)

    eventLogger.log({
      event: 'message_inbound_received',
      level: 'info',
      payload: { userId: user.id, body: parsed.text }
    })

    void (async () => {
      try {
        const sessionInfo = await getUserSessionInfo(dbPool, user.id, tid)
        if (sessionInfo && !sessionInfo.isAgentActive) {
          app.log.info({ msg: 'Agent disabled, skipping auto-response', userId: user.id })
          return
        }

        const recentMessages = await getSessionRecentMessages(dbPool, sessionId, MEMORY_WINDOW_MESSAGES)
        const memoryState = await getSessionMemoryState(dbPool, sessionId)
        const callSummaries = await listRecentCallSummaries(dbPool, sessionId, 5)
        const nowStr = new Date().toISOString()
        const summaryState = hasRequiredSummaryKeys(memoryState?.summaryState)
          ? memoryState.summaryState
          : buildFallbackSummaryState(user.currentStage)
        const compactFacts = {
          mobile_number: user.phoneE164,
          user_name: user.fullName ?? 'Unknown',
          user_city: user.city ?? 'Unknown',
          user_state: user.state ?? 'Unknown',
          application_created_at: user.applicationCreatedAt ?? user.createdAt,
          application_updated_at: user.applicationUpdatedAt ?? user.createdAt,
          loan_amount: user.loanAmount ?? 'Unknown',
          partner_case_id: user.partnerCaseId ?? 'Unknown',
          is_reactivated: user.isReactivated ?? false,
          ...(memoryState?.compactFacts ?? {}),
          ...(user.metadata as Record<string, unknown>)
        }

        const agentRes = await fetch('http://localhost:3010/agent/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: {
              id: sessionId,
              tenantId: tid,
              userId: user.id,
              loanCaseId: user.loanCaseId ?? crypto.randomUUID(),
              isAgentActive: true,
              channel: 'whatsapp',
              summaryState,
              compactFacts,
              messageCount: recentMessages.length,
              tokenEstimate: memoryState?.tokenEstimate ?? 0,
              createdAt: nowStr,
              updatedAt: nowStr
            },
            lastInboundMessage: recentMessages[recentMessages.length - 1],
            chatHistory: recentMessages,
            callSummaries: callSummaries.map(summary => ({
              summary: summary.summary ?? 'Call update',
              disposition: summary.callDisposition,
              durationSeconds: summary.callDurationSeconds,
              providerId: summary.providerId,
              occurredAt: summary.createdAt
            })),
            trigger: 'inbound_reply'
          })
        })

        if (!agentRes.ok) {
          throw new Error(`Agent API failed: ${await agentRes.text()}`)
        }

        const agentData = await agentRes.json()

        await insertAgentDecision(dbPool, {
          sessionId,
          trigger: 'inbound_reply',
          route: agentData.route,
          confidence: agentData.confidence,
          guardrailNotes: agentData.guardrailNotes ?? [],
          suggestedNextFollowupAt: agentData.suggestedNextFollowupAt,
          modelName: agentData.usedModel
        })

        if (agentData.suggestedNextFollowupAt) {
          await createScheduledAction(dbPool, {
            sessionId,
            actionType: 'whatsapp_followup',
            dueAt: agentData.suggestedNextFollowupAt,
            status: 'pending',
            idempotencyKey: `whatsapp_followup_${sessionId}_${agentData.suggestedNextFollowupAt}`
          })
        }

        await applyAgentMemoryDelta(dbPool, sessionId, agentData.memoryDelta)

        await recordMessageInteraction(dbPool, {
          sessionId,
          direction: 'outbound',
          body: agentData.body,
          channel: 'whatsapp'
        })
        await applyMessageMemoryUpdate(dbPool, sessionId, agentData.body)

        await fetch('http://localhost:3040/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            toPhoneE164: user.phoneE164,
            body: agentData.body
          })
        })
      } catch (err) {
        app.log.error({ msg: 'Agent routing failed', error: err })
      }
    })()

    return { ok: true }
  })
}
