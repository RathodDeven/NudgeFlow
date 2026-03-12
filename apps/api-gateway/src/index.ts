import { type InboundWebhook, parseInboundWebhook } from '@nudges/channel-gupshup'
import { loadEnv } from '@nudges/config'
import {
  ensureSession,
  ensureTenant,
  getPool,
  getUserById,
  getUserByPhoneE164,
  getUserMessages,
  getUserSessionInfo,
  insertUsers,
  listUsers,
  saveMessage,
  updateAgentActive,
  updateUserStage
} from '@nudges/db'
import {
  handoffRequestSchema,
  ingestExcelRequestSchema,
  metricsResponseSchema,
  userProfileSchema
} from '@nudges/domain'
import { loadKnowledgeSet } from '@nudges/knowledge-runtime'
import { deriveFunnelMetrics } from '@nudges/observability'
import Fastify, { type FastifyRequest } from 'fastify'
import { createAuthToken, requireAdminAuth } from './auth'
import { eventLogger, sessionState } from './state'

const env = loadEnv()
const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  }
})
const protectedHandler = requireAdminAuth(env)

// --- Database ---
const dbPool = getPool(env.DATABASE_URL)
const TENANT_KEY = process.env.TENANT_ID ?? 'clickpe'
let tenantUUID: string | null = null

const getTenantId = async (): Promise<string> => {
  if (!tenantUUID) {
    const resolved = await ensureTenant(dbPool, TENANT_KEY)
    tenantUUID = resolved
    console.info(`[api-gateway] Tenant '${TENANT_KEY}' → ${tenantUUID}`)
  }
  return tenantUUID
}

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
    const errorBody = payload.error.flatten()
    app.log.error({ msg: 'API Gateway: Ingestion Payload Validation Failed', error: errorBody.fieldErrors })
    return reply.status(400).send({ error: errorBody })
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
  const sessionInfo = await getUserSessionInfo(dbPool, user.id, tid)
  await saveMessage(dbPool, sessionId, 'inbound', parsed.text, 'whatsapp')

  eventLogger.log({
    event: 'message_inbound_received',
    level: 'info',
    payload: { userId: user.id, body: parsed.text }
  })

  // End immediately so webhook returns HTTP 200 within limits
  // Process the agent request async
  void (async () => {
    try {
      if (sessionInfo && !sessionInfo.isAgentActive) {
        app.log.info({ msg: 'Agent disabled, skipping auto-response', userId: user.id })
        return
      }

      const messages = await getUserMessages(dbPool, user.id)
      const nowStr = new Date().toISOString()

      console.log('user', user)

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
            summaryState: {
              sessionIntent: 'recovery',
              userObjections: [],
              stageContext: user.currentStage ?? 'fresh_loan',
              persuasionPath: 'default',
              commitments: [],
              nextAction: 'continue',
              preferredLanguage: 'hinglish'
            },
            compactFacts: {
              mobile_number: user.phoneE164,
              user_name: user.fullName ?? 'Unknown',
              user_city: user.city ?? 'Unknown',
              user_state: user.state ?? 'Unknown',
              application_date: user.loanCreatedAt ?? user.createdAt,
              last_update_date: user.loanUpdatedAt ?? user.createdAt,
              loan_amount: user.loanAmount ?? 'Unknown',
              partner_case_id: user.partnerCaseId ?? 'Unknown',
              is_reactivated: user.isReactivated ?? false,
              ...(user.metadata as Record<string, unknown>)
            },
            messageCount: messages.length,
            tokenEstimate: 0,
            createdAt: nowStr,
            updatedAt: nowStr
          },
          lastInboundMessage: messages[messages.length - 1],
          chatHistory: messages,
          trigger: 'inbound_reply'
        })
      })

      if (!agentRes.ok) {
        throw new Error(`Agent API failed: ${await agentRes.text()}`)
      }

      const agentData = await agentRes.json()
      await saveMessage(dbPool, sessionId, 'outbound', agentData.body, 'whatsapp')

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
    const errorBody = parsed.error.flatten()
    app.log.error({ msg: 'API Gateway: Handoff Payload Validation Failed', error: errorBody.fieldErrors })
    return reply.status(400).send({ error: errorBody })
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
    const errorBody = parsed.error.flatten()
    app.log.error({ msg: 'API Gateway: Resume Payload Validation Failed', error: errorBody.fieldErrors })
    return reply.status(400).send({ error: errorBody })
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

// --- User Management (DB-backed) ---

app.post('/users/upload-csv', { preHandler: protectedHandler }, async (request, reply) => {
  const body = request.body as { rows?: Array<Record<string, string>> }
  if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
    return reply.status(400).send({ error: 'rows array is required' })
  }

  const tid = await getTenantId()
  const stripQuotes = (s: string) => s.replace(/^["']+|["']+$/g, '').trim()
  const normalisePhone = (s: string) => s.replace(/\s+/g, '').replace(/^\+?91/, '')

  const mapped = body.rows.map(r => {
    const metadata: Record<string, unknown> = {
      tenure: r.tenure || undefined,
      annual_interest: r.annual_interest || undefined,
      disbursal_amount: r.disbursal_amount || r.disbursement_amount || undefined,
      loan_type: r.loan_type || undefined,
      application_updated_date: r.application_updated_date || undefined,
      last_stage_at: r.application_updated_date || r.application_creation_date || undefined
    }

    return {
      externalUserId: stripQuotes(r.customer_id || r.external_user_id || ''),
      fullName: r.name || r.full_name || 'Unknown',
      phoneE164: normalisePhone(r.mobile || r.phone || ''),
      currentStage: (r.status || 'fresh_loan').toLowerCase(),
      partnerCaseId: r.loan_application_no || r.partner_case_id || crypto.randomUUID(),
      loanAmount: r.loan_amount ? Number.parseFloat(r.loan_amount) : undefined,
      firmName: r.firm_name || undefined,
      city: r.current_city || r.city || undefined,
      state: r.current_state || r.state || undefined,
      createdAt: r.application_creation_date || r.user_creation_date || undefined,
      metadata
    }
  })

  const result = await insertUsers(dbPool, tid, mapped)

  eventLogger.log({
    event: 'csv_users_uploaded',
    level: 'info',
    payload: { inserted: result.inserted, skipped: result.skipped, total: body.rows.length }
  })

  return reply.send({ ok: true, ...result, total: body.rows.length })
})

app.get('/users', { preHandler: protectedHandler }, async () => {
  const tid = await getTenantId()
  const users = await listUsers(dbPool, tid)
  return { users }
})

app.get('/users/:id', { preHandler: protectedHandler }, async (request, reply) => {
  const userId = (request.params as { id: string }).id
  const user = await getUserById(dbPool, userId)
  if (!user) {
    return reply.status(404).send({ error: 'user_not_found' })
  }
  return { user }
})

app.get('/users/:id/messages', { preHandler: protectedHandler }, async (request, reply) => {
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
  await saveMessage(dbPool, sessionId, body.direction, body.body, body.channel || 'whatsapp')
  return { ok: true }
})

app.patch('/users/:id/stage', { preHandler: protectedHandler }, async (request, reply) => {
  const userId = (request.params as { id: string }).id
  const body = request.body as { stage?: string }
  if (!body?.stage) {
    return reply.status(400).send({ error: 'stage is required' })
  }

  const updated = await updateUserStage(dbPool, userId, body.stage)
  if (!updated) {
    return reply.status(404).send({ error: 'user_or_loan_case_not_found' })
  }

  eventLogger.log({
    event: 'user_stage_updated',
    level: 'info',
    payload: { userId, newStage: body.stage }
  })

  return { ok: true, userId, stage: body.stage }
})

app.get('/users/:id/session', { preHandler: protectedHandler }, async (request, reply) => {
  const userId = (request.params as { id: string }).id
  const tid = await getTenantId()
  const session = await getUserSessionInfo(dbPool, userId, tid)
  if (!session) {
    return { ok: true, isAgentActive: true } // Default true if no session yet
  }
  return { ok: true, isAgentActive: session.isAgentActive }
})

app.patch('/users/:id/agent-active', { preHandler: protectedHandler }, async (request, reply) => {
  const userId = (request.params as { id: string }).id
  const body = request.body as { isAgentActive?: boolean }
  if (typeof body?.isAgentActive !== 'boolean') {
    return reply.status(400).send({ error: 'isAgentActive boolean is required' })
  }

  const tid = await getTenantId()
  const sessionId = await ensureSession(dbPool, userId, tid)
  await updateAgentActive(dbPool, sessionId, body.isAgentActive)

  eventLogger.log({
    event: 'agent_active_toggled',
    level: 'info',
    payload: { userId, isAgentActive: body.isAgentActive }
  })

  return { ok: true, isAgentActive: body.isAgentActive }
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

  // 1. Send via local channel-whatsapp service
  const res = await fetch('http://localhost:3040/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      toPhoneE164: user.phoneE164,
      body: body.message
    })
  })

  if (!res.ok) {
    const err = await res.text()
    return reply.status(500).send({ error: 'whatsapp_send_failed', details: err })
  }

  const gupshupRes = await res.json()

  // 2. Save to DB
  await saveMessage(dbPool, sessionId, 'outbound', body.message, 'whatsapp')

  eventLogger.log({
    event: 'manual_whatsapp_sent',
    level: 'info',
    payload: { userId, providerId: gupshupRes.providerMessageId }
  })

  return { ok: true, providerMessageId: gupshupRes.providerMessageId }
})

app
  .listen({ host: '0.0.0.0', port: env.PORT })
  .then(() => app.log.info(`api-gateway listening on ${env.PORT}`))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
