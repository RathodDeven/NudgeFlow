import {
  ensureSession,
  getSessionContext,
  getUserById,
  getUserSessionInfo,
  insertUsers,
  listUsers,
  updateAgentActive,
  updateUserStage
} from '@nudges/db'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId, protectedHandler } from '../context'
import {
  cancelScheduledVoiceCalls,
  getVoiceCallTargetTime,
  scheduleVoiceCall
} from '../services/voice-scheduling'
import { eventLogger } from '../state'

export const registerUserRoutes = (app: FastifyInstance): void => {
  app.post('/users/upload-csv', { preHandler: protectedHandler }, async (request, reply) => {
    const body = request.body as { rows?: Array<Record<string, string>> }
    if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return reply.status(400).send({ error: 'rows array is required' })
    }

    const tid = await getTenantId()
    const stripQuotes = (s: string) => s.replace(/^['"]+|['"]+$/g, '').trim()
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
        applicationCreatedAt: r.application_creation_date || undefined,
        applicationUpdatedAt: r.application_updated_date || undefined,
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
    app.log.info({ msg: 'API returning users', count: users.length, firstUser: users[0] })
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

    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)
    const session = await getSessionContext(dbPool, sessionId)
    if (session) {
      await cancelScheduledVoiceCalls(dbPool, { sessionId, reason: 'stage_changed' })
      await scheduleVoiceCall(dbPool, {
        session,
        callReason: 'status_change',
        requestedAt: getVoiceCallTargetTime({ timezone: session.tenantTimezone })
      })
    }

    eventLogger.log({
      event: 'user_stage_updated',
      level: 'info',
      payload: { userId, newStage: body.stage }
    })

    return { ok: true, userId, stage: body.stage }
  })

  app.get('/users/:id/session', { preHandler: protectedHandler }, async request => {
    const userId = (request.params as { id: string }).id
    const tid = await getTenantId()
    const session = await getUserSessionInfo(dbPool, userId, tid)
    if (!session) {
      return { ok: true, isAgentActive: true }
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
}
