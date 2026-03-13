import { getSessionDispatchContext, updateAgentActive } from '@nudges/db'
import { handoffRequestSchema } from '@nudges/domain'
import type { FastifyInstance } from 'fastify'
import { dbPool, protectedHandler } from '../context'
import { recordHandoffInteraction } from '../services/interactions'
import { eventLogger } from '../state'

export const registerSessionRoutes = (app: FastifyInstance): void => {
  app.post('/sessions/:id/handoff', { preHandler: protectedHandler }, async (request, reply) => {
    const parsed = handoffRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      const errorBody = parsed.error.flatten()
      app.log.error({ msg: 'API Gateway: Handoff Payload Validation Failed', error: errorBody.fieldErrors })
      return reply.status(400).send({ error: errorBody })
    }

    const sessionId = (request.params as { id: string }).id
    await updateAgentActive(dbPool, sessionId, false)
    const state = await getSessionDispatchContext(dbPool, sessionId)

    eventLogger.log({
      event: 'session_handoff',
      level: 'info',
      sessionId,
      payload: { changedBy: parsed.data.changedBy, reason: parsed.data.reason }
    })

    await recordHandoffInteraction(dbPool, {
      sessionId,
      channel: state?.channel ?? 'whatsapp',
      direction: 'system',
      reason: parsed.data.reason,
      mode: 'handoff'
    })

    return { ok: true, sessionId, isAgentActive: state?.isAgentActive ?? false }
  })

  app.post('/sessions/:id/resume', { preHandler: protectedHandler }, async (request, reply) => {
    const parsed = handoffRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      const errorBody = parsed.error.flatten()
      app.log.error({ msg: 'API Gateway: Resume Payload Validation Failed', error: errorBody.fieldErrors })
      return reply.status(400).send({ error: errorBody })
    }

    const sessionId = (request.params as { id: string }).id
    await updateAgentActive(dbPool, sessionId, true)
    const state = await getSessionDispatchContext(dbPool, sessionId)

    eventLogger.log({
      event: 'session_resume',
      level: 'info',
      sessionId,
      payload: { changedBy: parsed.data.changedBy, reason: parsed.data.reason }
    })

    await recordHandoffInteraction(dbPool, {
      sessionId,
      channel: state?.channel ?? 'whatsapp',
      direction: 'system',
      reason: parsed.data.reason,
      mode: 'resume'
    })

    return { ok: true, sessionId, isAgentActive: state?.isAgentActive ?? true }
  })
}
