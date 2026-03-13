import { ensureSession, getUserById, getUserMessages } from '@nudges/db'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId, protectedHandler } from '../context'
import { recordMessageInteraction } from '../services/interactions'
import { applyMessageMemoryUpdate } from '../services/memory'
import { eventLogger } from '../state'

export const registerUserMessageRoutes = (app: FastifyInstance): void => {
  app.get('/users/:id/messages', { preHandler: protectedHandler }, async request => {
    const userId = (request.params as { id: string }).id
    const messages = await getUserMessages(dbPool, userId)
    return { messages }
  })

  app.post('/users/:id/messages', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const body = request.body as {
      direction: 'inbound' | 'outbound' | 'system'
      body: string
      channel?: string
    }
    if (!body?.direction || !body?.body) {
      return reply.status(400).send({ error: 'direction and body are required' })
    }

    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)

    await recordMessageInteraction(dbPool, {
      sessionId,
      direction: body.direction,
      body: body.body,
      channel: body.channel || 'whatsapp'
    })
    await applyMessageMemoryUpdate(dbPool, sessionId, body.body)

    return { ok: true }
  })

  app.post('/users/:id/send-whatsapp', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const body = request.body as { message: string }
    if (!body?.message) {
      return reply.status(400).send({ error: 'message is required' })
    }

    const user = await getUserById(dbPool, userId)
    if (!user) {
      return reply.status(404).send({ error: 'user_not_found' })
    }

    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)

    const res = await fetch('http://localhost:3040/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        toPhoneE164: user.phoneE164,
        body: body.message
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return reply.status(500).send({ error: 'whatsapp_send_failed', details: err })
    }

    const gupshupRes = await res.json()

    await recordMessageInteraction(dbPool, {
      sessionId,
      direction: 'outbound',
      body: body.message,
      channel: 'whatsapp',
      providerMessageId: gupshupRes.providerMessageId
    })
    await applyMessageMemoryUpdate(dbPool, sessionId, body.message)

    eventLogger.log({
      event: 'manual_whatsapp_sent',
      level: 'info',
      payload: { userId, providerId: gupshupRes.providerMessageId }
    })

    return { ok: true, providerMessageId: gupshupRes.providerMessageId }
  })
}
