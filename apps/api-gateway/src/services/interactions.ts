import { type DbPool, insertInteractionEvent, saveMessage } from '@nudges/db'

export const recordMessageInteraction = async (
  pool: DbPool,
  params: {
    sessionId: string
    direction: 'inbound' | 'outbound' | 'system'
    body: string
    channel: string
    providerMessageId?: string
    language?: string
  }
): Promise<void> => {
  await saveMessage(
    pool,
    params.sessionId,
    params.direction,
    params.body,
    params.channel,
    params.providerMessageId,
    params.language
  )

  await insertInteractionEvent(pool, {
    sessionId: params.sessionId,
    channel: params.channel,
    direction: params.direction,
    eventType: 'message',
    transcript: params.body,
    providerId: params.providerMessageId
  })
}

export const recordHandoffInteraction = async (
  pool: DbPool,
  params: {
    sessionId: string
    channel: string
    direction: 'system'
    reason?: string
    mode: 'handoff' | 'resume'
  }
): Promise<void> => {
  await insertInteractionEvent(pool, {
    sessionId: params.sessionId,
    channel: params.channel,
    direction: params.direction,
    eventType: params.mode === 'handoff' ? 'handoff' : 'system',
    summary: params.reason ?? (params.mode === 'resume' ? 'agent_resumed' : undefined),
    handoffFlag: params.mode === 'handoff'
  })
}
