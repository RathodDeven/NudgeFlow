import { loadEnv } from '@nudges/config'
import { handoffRequestSchema, ingestExcelRequestSchema, metricsResponseSchema } from '@nudges/domain'
import { loadKnowledgeSet } from '@nudges/knowledge-runtime'
import { deriveFunnelMetrics } from '@nudges/observability'
import Fastify, { type FastifyRequest } from 'fastify'
import { createAuthToken, requireAdminAuth } from './auth'
import { eventLogger, sessionState } from './state'

const env = loadEnv()
const app = Fastify({ logger: true })
const protectedHandler = requireAdminAuth(env)

app.get('/health', async () => ({ ok: true, service: 'api-gateway' }))

app.post('/auth/login', async (request, reply) => {
  const body = request.body as { username?: string; password?: string }
  if (!body?.username || !body?.password) {
    return reply.status(400).send({ error: 'username and password are required' })
  }

  if (body.username !== env.ADMIN_USERNAME || body.password !== env.ADMIN_PASSWORD) {
    return reply.status(401).send({ error: 'invalid_credentials' })
  }

  const token = createAuthToken(body.username, env.DASHBOARD_AUTH_SECRET)
  return reply.send({
    token,
    expiresInSeconds: 43200
  })
})

app.get('/auth/me', { preHandler: protectedHandler }, async request => {
  const adminUser = (request as FastifyRequest & { adminUser?: string }).adminUser
  return { ok: true, username: adminUser }
})

app.post('/ingestion/excel', async (request, reply) => {
  const payload = ingestExcelRequestSchema.safeParse(request.body)
  if (!payload.success) {
    return reply.status(400).send({ error: payload.error.flatten() })
  }

  eventLogger.log({
    event: 'ingestion_request_received',
    level: 'info',
    tenantId: payload.data.tenantId,
    payload: { rows: payload.data.rows.length }
  })

  return {
    accepted: payload.data.rows.length,
    rejected: 0,
    errors: []
  }
})

app.post('/webhooks/whatsapp/gupshup', async request => {
  eventLogger.log({
    event: 'message_inbound_received',
    level: 'info',
    payload: { body: request.body as Record<string, unknown> }
  })

  return { ok: true }
})

app.post('/status-sync/poll', async request => {
  eventLogger.log({
    event: 'status_poll_requested',
    level: 'info',
    payload: { body: request.body as Record<string, unknown> }
  })
  return { ok: true, source: 'status-sync-worker' }
})

app.post('/sessions/:id/handoff', { preHandler: protectedHandler }, async (request, reply) => {
  const parsed = handoffRequestSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.flatten() })
  }

  const sessionId = (request.params as { id: string }).id
  sessionState.set(sessionId, { isAgentActive: false, updatedAt: new Date().toISOString() })

  eventLogger.log({
    event: 'session_handoff',
    level: 'info',
    sessionId,
    payload: { changedBy: parsed.data.changedBy, reason: parsed.data.reason }
  })

  return { ok: true, sessionId, isAgentActive: false }
})

app.post('/sessions/:id/resume', { preHandler: protectedHandler }, async (request, reply) => {
  const parsed = handoffRequestSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.flatten() })
  }

  const sessionId = (request.params as { id: string }).id
  sessionState.set(sessionId, { isAgentActive: true, updatedAt: new Date().toISOString() })

  eventLogger.log({
    event: 'session_resume',
    level: 'info',
    sessionId,
    payload: { changedBy: parsed.data.changedBy, reason: parsed.data.reason }
  })

  return { ok: true, sessionId, isAgentActive: true }
})

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

app.post('/tenants/:id/knowledge/publish', { preHandler: protectedHandler }, async (request, reply) => {
  const tenantId = (request.params as { id: string }).id
  const body = request.body as { knowledgePath?: string }

  if (!body?.knowledgePath) {
    return reply.status(400).send({ error: 'knowledgePath is required' })
  }

  const docs = await loadKnowledgeSet(body.knowledgePath)
  eventLogger.log({
    event: 'knowledge_published',
    level: 'info',
    tenantId,
    payload: { docs: docs.length, knowledgePath: body.knowledgePath }
  })

  return { ok: true, tenantId, documents: docs.length }
})

app.get('/dashboard/sessions', { preHandler: protectedHandler }, async () => {
  return {
    sessions: Array.from(sessionState.entries()).map(([sessionId, value]) => ({
      sessionId,
      ...value
    }))
  }
})

app.get('/dashboard/events', { preHandler: protectedHandler }, async () => {
  return {
    events: eventLogger.list().slice(-200)
  }
})

app
  .listen({ host: '0.0.0.0', port: env.PORT })
  .then(() => app.log.info(`api-gateway listening on ${env.PORT}`))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
