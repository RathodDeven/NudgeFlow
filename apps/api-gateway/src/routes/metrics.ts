import { metricsResponseSchema } from '@nudges/domain'
import { deriveFunnelMetrics } from '@nudges/observability'
import type { FastifyInstance } from 'fastify'
import { protectedHandler } from '../context'
import { eventLogger } from '../state'

export const registerMetricsRoutes = (app: FastifyInstance): void => {
  app.get('/metrics/funnel', { preHandler: protectedHandler }, async (_, reply) => {
    const metrics = deriveFunnelMetrics(eventLogger.list())
    const payload = metricsResponseSchema.parse({
      windowStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      windowEnd: new Date().toISOString(),
      ...metrics
    })

    return reply.send(payload)
  })

  app.get('/metrics/agent-performance', { preHandler: protectedHandler }, async () => {
    const events = eventLogger.list()
    const sent = events.filter(entry => entry.event === 'message_outbound_sent').length
    const inbound = events.filter(entry => entry.event === 'message_inbound_received').length
    const handoffs = events.filter(entry => entry.event === 'session_handoff').length
    return {
      sent,
      inbound,
      responseRate: sent === 0 ? 0 : Number((inbound / sent).toFixed(2)),
      handoffs
    }
  })
}
