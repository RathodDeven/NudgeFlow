import {
  createScheduledAction,
  getSessionContext,
  getSessionRecentMessages,
  insertAgentDecision,
  insertInteractionEvent,
  listRecentCallSummaries,
  saveMessage,
  updateSessionMemoryState
} from '@nudges/db'
import { MEMORY_WINDOW_MESSAGES } from '@nudges/domain'
import { dbPool } from './state'

export const sendWhatsAppFollowup = async (sessionId: string): Promise<void> => {
  const session = await getSessionContext(dbPool, sessionId)
  if (!session) throw new Error('session_not_found')

  const recentMessages = await getSessionRecentMessages(dbPool, sessionId, MEMORY_WINDOW_MESSAGES)
  const callSummaries = await listRecentCallSummaries(dbPool, sessionId, 5)
  const nowStr = new Date().toISOString()

  const agentRes = await fetch('http://localhost:3010/agent/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: {
        id: sessionId,
        tenantId: session.tenantId,
        userId: session.userId,
        loanCaseId: session.loanCaseId,
        isAgentActive: session.isAgentActive,
        channel: session.channel,
        summaryState: session.summaryState,
        compactFacts: session.compactFacts,
        messageCount: recentMessages.length,
        tokenEstimate: session.tokenEstimate,
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
      trigger: 'scheduled_followup'
    })
  })

  if (!agentRes.ok) {
    throw new Error(`agent_runtime_failed:${await agentRes.text()}`)
  }

  const agentData = await agentRes.json()

  await insertAgentDecision(dbPool, {
    sessionId,
    trigger: 'scheduled_followup',
    route: agentData.route,
    confidence: agentData.confidence,
    guardrailNotes: agentData.guardrailNotes ?? [],
    suggestedNextFollowupAt: agentData.suggestedNextFollowupAt,
    modelName: agentData.usedModel
  })

  await updateSessionMemoryState(dbPool, {
    sessionId,
    summaryState: agentData.memoryDelta.summaryState,
    compactFacts: { ...session.compactFacts, ...(agentData.memoryDelta.compactFactsDelta ?? {}) },
    messageCount: session.messageCount + 1,
    tokenEstimate: session.tokenEstimate + agentData.memoryDelta.tokenEstimate
  })

  await saveMessage(dbPool, sessionId, 'outbound', agentData.body, 'whatsapp')
  await insertInteractionEvent(dbPool, {
    sessionId,
    channel: 'whatsapp',
    direction: 'outbound',
    eventType: 'message',
    transcript: agentData.body
  })

  await fetch('http://localhost:3040/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      toPhoneE164: session.phoneE164,
      body: agentData.body
    })
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
}
