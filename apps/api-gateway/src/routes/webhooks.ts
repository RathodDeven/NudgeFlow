import {
  type InboundWebhook,
  markMessageAsRead,
  parseInboundWebhook,
  sendTypingIndicator
} from '@nudges/channel-gupshup'
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
import { MEMORY_WINDOW_MESSAGES, normalizeWhatsAppPhone } from '@nudges/domain'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId } from '../context'
import { env } from '../context'
import { recordMessageInteraction } from '../services/interactions'
import { applyAgentMemoryDelta, applyMessageMemoryUpdate } from '../services/memory'
import { buildFallbackSummaryState, hasRequiredSummaryKeys } from '../services/summary'
import { loadTenantTemplateConfig } from '../services/tenant-channel'
import { eventLogger, sandboxState } from '../state'

export const registerWebhookRoutes = (app: FastifyInstance): void => {
  app.post('/webhooks/whatsapp/gupshup', async request => {
    const payload = request.body as InboundWebhook
    app.log.info({ msg: 'Gupshup Webhook Payload Received', type: payload?.type, payload })

    if (payload?.type !== 'message') {
      return { ok: true }
    }

    const parsed = parseInboundWebhook(payload)

    // Normalize phone for DB lookup (user stores raw 10 digits without prefixes)
    const normalizedPhone = parsed.phone.replace(/[^\d]/g, '').slice(-10)

    const tid = await getTenantId()
    const user = await getUserByPhoneE164(dbPool, tid, normalizedPhone)

    if (!user) {
      app.log.warn({ msg: 'Inbound message from unknown user', phone: parsed.phone, normalizedPhone })
      return { ok: true }
    }

    const sessionId = await ensureSession(dbPool, user.id, tid)

    // Signal responsiveness to user
    const tConfig = await loadTenantTemplateConfig()
    if (parsed.providerMessageId && env.GUPSHUP_API_KEY) {
      const appName = tConfig?.appName
      const source = tConfig?.source
      if (appName) {
        const gConfig = {
          apiKey: env.GUPSHUP_API_KEY,
          appName,
          baseUrl: env.GUPSHUP_BASE_URL,
          source
        }
        // Fire and forget, don't block the main flow
        void markMessageAsRead(gConfig, parsed.providerMessageId)
        void sendTypingIndicator(gConfig, parsed.providerMessageId)
      } else {
        app.log.warn({
          msg: 'Gupshup appName not configured for tenant, skipping presence updates',
          phone: parsed.phone
        })
      }
    }

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

        const useWhatsapp = sandboxState.useWhatsappApi

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
          tenure_months: user.tenureMonths ?? 'Unknown',
          annual_interest_rate: user.annualInterestRate ?? 'Unknown',
          processing_fee: user.processingFee ?? 'Unknown',
          emi_amount: user.emiAmount ?? 'Unknown',
          partner_case_id: user.partnerCaseId ?? 'Unknown',
          is_reactivated: user.isReactivated ?? false,
          inferred_intent: user.inferredIntent ?? null,
          high_intent_flag: user.highIntentFlag ?? null,
          last_call_disposition: user.lastCallDisposition ?? null,
          last_call_at: user.lastCallAt ?? null,
          follow_up_at: user.followUpAt ?? null,
          call_summary_latest: user.callSummaryLatest ?? null,
          call_notes_latest: user.callNotesLatest ?? null,
          inference_extracted_data: user.inferenceExtractedData ?? {},
          inference_context_details: user.inferenceContextDetails ?? {},
          ...(memoryState?.compactFacts ?? {}),
          ...(user.metadata as Record<string, unknown>)
        }

        const agentPayload = {
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
        }

        app.log.info({ msg: 'Sending payload to agent-runtime', sessionId, payload: agentPayload })

        const agentRes = await fetch('http://localhost:3010/agent/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentPayload)
        })

        const agentData = await agentRes.json()
        app.log.info({ msg: 'Received response from agent-runtime', sessionId, response: agentData })

        // Comprehensive Phone Normalization for Gupshup/India
        const rawDigits = user.phoneE164.replace(/[^\d]/g, '')
        const raw10 = rawDigits.slice(-10)
        let toPhone = rawDigits
        if (toPhone.length === 10) {
          toPhone = `91${toPhone}`
        }

        // Handle CTA URL and Deep Links
        const finalWhatsappPayload = agentData.whatsappPayload
        if (finalWhatsappPayload?.type === 'cta_url' && finalWhatsappPayload.url) {
          const tConfigForCta = await loadTenantTemplateConfig()
          if (tConfigForCta?.ctaBaseUrl) {
            // Append mob_num to deep link
            const separator = tConfigForCta.ctaBaseUrl.includes('?') ? '&' : '?'
            finalWhatsappPayload.url = `${tConfigForCta.ctaBaseUrl}${separator}mob_num=${raw10}`
          }
        }

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

        // Always attempt to send WhatsApp for automated replies
        app.log.info({ msg: 'Dispatching WhatsApp response', sessionId, to: toPhone })
        await fetch('http://localhost:3040/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            toPhoneE164: normalizeWhatsAppPhone(toPhone),
            body: agentData.body,
            whatsappPayload: finalWhatsappPayload,
            appName: tConfig?.appName,
            source: tConfig?.source
          })
        })
      } catch (err) {
        app.log.error({ msg: 'Agent routing failed', error: err })
      }
    })()

    return { ok: true }
  })
}
