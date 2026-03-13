import { listAgentDecisionsBySession, listRecentSessions } from '@nudges/db'
import type { FastifyInstance } from 'fastify'
import { dbPool, protectedHandler } from '../context'
import { eventLogger } from '../state'

export const registerDashboardRoutes = (app: FastifyInstance): void => {
  app.get('/dashboard/sessions', { preHandler: protectedHandler }, async () => {
    const sessions = await listRecentSessions(dbPool, 50)
    return { sessions }
  })

  app.get('/dashboard/events', { preHandler: protectedHandler }, async () => {
    return { events: eventLogger.list().slice(-200) }
  })

  app.get('/dashboard/sessions/:id/decisions', { preHandler: protectedHandler }, async request => {
    const sessionId = (request.params as { id: string }).id
    const decisions = await listAgentDecisionsBySession(dbPool, sessionId, 200)
    return { decisions }
  })
}
