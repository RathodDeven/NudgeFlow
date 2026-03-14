import {
  ensureSession,
  getSessionContext,
  getUserById,
  getUserSessionInfo,
  insertUsers,
  listLatestInferredUsers,
  listUsers,
  updateAgentActive,
  updateUserStage
} from '@nudges/db'
import { bolnaAgentVariables } from '@nudges/provider-bolna'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId, protectedHandler } from '../context'
import {
  formatVoiceLoanAmount,
  formatVoiceLoanStage,
  resolveVoicePendingStep
} from '../services/voice-context'
import {
  cancelScheduledVoiceCalls,
  getVoiceCallTargetTime,
  scheduleVoiceCall
} from '../services/voice-scheduling'
import { eventLogger } from '../state'

const toCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

const getStringValue = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

const toBolnaContactNumber = (raw: unknown): string => {
  const normalized = String(raw ?? '').replace(/\s+/g, '')
  const digitsOnly = normalized.replace(/\D/g, '')

  if (digitsOnly.length === 10) return `+91${digitsOnly}`
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`
  if (normalized.startsWith('+')) return normalized
  if (digitsOnly.length > 0) return `+${digitsOnly}`
  return ''
}

export const registerUserRoutes = (app: FastifyInstance): void => {
  app.post('/users/upload-csv', { preHandler: protectedHandler }, async (request, reply) => {
    const body = request.body as { rows?: Array<Record<string, string>> }
    if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return reply.status(400).send({ error: 'rows array is required' })
    }

    const tid = await getTenantId()
    const stripQuotes = (s: string) => s.replace(/^['"]+|['"]+$/g, '').trim()
    const normalisePhone = (s: string): string => {
      const digits = String(s ?? '').replace(/\D/g, '')
      if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
      if (digits.length === 10) return digits
      return digits
    }

    const mapped = body.rows.map((r, idx) => {
      const rawMobile = r.mobile || r.phone || ''
      const phoneE164 = normalisePhone(rawMobile)

      if (idx < 5) {
        app.log.info({
          msg: 'CSV mobile normalization sample',
          rowIndex: idx,
          externalUserId: stripQuotes(r.customer_id || r.external_user_id || ''),
          rawMobile,
          digitsOnly: String(rawMobile).replace(/\D/g, ''),
          normalizedPhone: phoneE164
        })
      }

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
        phoneE164,
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

    app.log.info({
      msg: 'CSV upload mapped phones',
      totalRows: mapped.length,
      phoneSamples: mapped
        .slice(0, 5)
        .map(row => ({ externalUserId: row.externalUserId, phoneE164: row.phoneE164 }))
    })

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

  app.get('/users/export/inferred.csv', { preHandler: protectedHandler }, async (request, reply) => {
    const query = request.query as { limit?: string; intent?: string; highIntent?: string }
    const tid = await getTenantId()
    const rows = await listLatestInferredUsers(dbPool, tid, query?.limit ? Number(query.limit) : 1000, {
      intent: query.intent,
      highIntentFlag: query.highIntent
    })

    const headers = [
      'external_user_id',
      'full_name',
      'phone_e164',
      'city',
      'state',
      'partner_case_id',
      'current_stage',
      'loan_amount',
      'firm_name',
      'application_created_at',
      'application_updated_at',
      'tenant_timezone',
      'inferred_intent',
      'high_intent_flag',
      'last_call_disposition',
      'last_call_at',
      'suggested_next_call_at',
      'last_call_summary',
      'notes_for_agent',
      'extracted_data_json',
      'context_details_json',
      'bolna_execution_id',
      'bolna_batch_id',
      'recording_url'
    ]

    const lines = [headers.join(',')]
    for (const row of rows) {
      const inferred = row.inferred ?? {}

      lines.push(
        [
          row.externalUserId,
          row.fullName,
          row.phoneE164,
          row.city,
          row.state,
          row.partnerCaseId,
          row.currentStage,
          row.loanAmount,
          row.firmName,
          row.applicationCreatedAt,
          row.applicationUpdatedAt,
          row.tenantTimezone,
          inferred.inferred_intent,
          inferred.high_intent_flag,
          inferred.last_call_disposition,
          inferred.last_call_at,
          inferred.suggested_next_call_at,
          inferred.last_call_summary,
          inferred.notes_for_agent,
          inferred.extracted_data,
          inferred.context_details,
          inferred.bolna_execution_id,
          inferred.bolna_batch_id,
          inferred.recording_url
        ]
          .map(toCsvValue)
          .join(',')
      )
    }

    const csv = `${lines.join('\n')}\n`
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="inferred-users-latest.csv"')
    return reply.send(csv)
  })

  app.get('/users/export/bolna-batch.csv', { preHandler: protectedHandler }, async (request, reply) => {
    const query = request.query as { limit?: string; intent?: string; highIntent?: string }
    const tid = await getTenantId()
    const rows = await listLatestInferredUsers(dbPool, tid, query?.limit ? Number(query.limit) : 1000, {
      intent: query.intent,
      highIntentFlag: query.highIntent
    })

    const headers = ['contact_number', ...bolnaAgentVariables]

    const lines = [headers.join(',')]
    for (const row of rows) {
      const inferred = row.inferred ?? {}
      const variableValues: Record<string, string> = {
        timezone: getStringValue(row.tenantTimezone, 'Asia/Kolkata'),
        application_created_at: getStringValue(row.applicationCreatedAt, 'Unknown'),
        loan_amount: formatVoiceLoanAmount(row.loanAmount),
        loan_stage: formatVoiceLoanStage(row.currentStage),
        pending_step: resolveVoicePendingStep(row.currentStage),
        customer_name: getStringValue(row.fullName, 'Unknown'),
        firm_name: getStringValue(row.firmName, 'Unknown'),
        time: getStringValue(inferred.suggested_next_call_at ?? inferred.last_call_at, '')
      }

      lines.push(
        [
          toBolnaContactNumber(row.phoneE164),
          ...bolnaAgentVariables.map(variable => variableValues[variable] ?? '')
        ]
          .map(toCsvValue)
          .join(',')
      )
    }

    const csv = `${lines.join('\n')}\n`
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="bolna-batch-upload.csv"')
    return reply.send(csv)
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
