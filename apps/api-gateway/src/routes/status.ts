import type { FastifyInstance } from 'fastify'
import { eventLogger } from '../state'

export const registerStatusRoutes = (app: FastifyInstance): void => {
  app.post('/status-sync/poll', async request => {
    eventLogger.log({
      event: 'status_poll_requested',
      level: 'info',
      payload: { body: request.body as Record<string, unknown> }
    })
    return { ok: true, source: 'status-sync-worker' }
  })
}
