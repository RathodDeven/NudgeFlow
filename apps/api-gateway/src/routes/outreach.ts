import {
  type DbUser,
  countUntouchedUsers,
  ensureSession,
  getSessionContext,
  getUserById,
  listCallAttemptsBySession,
  listScheduledActionsBySession,
  listUntouchedUsers
} from '@nudges/db'
import type { FastifyInstance } from 'fastify'
import { dbPool, env, getTenantId, protectedHandler } from '../context'
import { createAndScheduleBolnaBatch } from '../services/bolna-batch'
import { recordMessageInteraction } from '../services/interactions'
import { applyMessageMemoryUpdate } from '../services/memory'
import { loadTenantTemplateConfig } from '../services/tenant-channel'
import { cancelScheduledVoiceCalls, scheduleVoiceCall } from '../services/voice-scheduling'
import { buildTemplateVariables } from '../services/whatsapp-templates'
import { eventLogger } from '../state'

const startConversationForUser = async (params: {
  userId: string
  preferredCallAt?: string
  skipVoiceCall?: boolean
}): Promise<void> => {
  const { userId, preferredCallAt, skipVoiceCall = false } = params

  const user = await getUserById(dbPool, userId)
  if (!user) {
    throw new Error('user_not_found')
  }

  const tid = await getTenantId()
  const sessionId = await ensureSession(dbPool, userId, tid)
  const session = await getSessionContext(dbPool, sessionId)

  const templateConfig = await loadTenantTemplateConfig()
  if (templateConfig) {
    const variables = buildTemplateVariables(user, templateConfig.variableOrder)
    const res = await fetch('http://localhost:3040/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        toPhoneE164: user.phoneE164,
        body: '',
        templateName: templateConfig.templateId,
        variables
      })
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`whatsapp_send_failed:${err}`)
    }

    const gupshupRes = await res.json()
    await recordMessageInteraction(dbPool, {
      sessionId,
      direction: 'outbound',
      body: `Template ${templateConfig.templateId} sent`,
      channel: 'whatsapp',
      providerMessageId: gupshupRes.providerMessageId
    })
    await applyMessageMemoryUpdate(dbPool, sessionId, `Template ${templateConfig.templateId} sent`)
  }

  if (!skipVoiceCall && session) {
    await scheduleVoiceCall(dbPool, {
      session,
      callReason: 'initial',
      requestedAt: preferredCallAt
    })
  }
}

const sendBatchTemplates = async (
  users: DbUser[]
): Promise<{ triggered: number; failed: number; errors: Array<{ userId: string; reason: string }> }> => {
  let triggered = 0
  let failed = 0
  const errors: Array<{ userId: string; reason: string }> = []

  for (const user of users) {
    try {
      await startConversationForUser({ userId: user.id, skipVoiceCall: true })
      triggered += 1
    } catch (error) {
      failed += 1
      errors.push({
        userId: user.id,
        reason: (error as Error).message
      })
    }
  }

  return { triggered, failed, errors }
}

export const registerOutreachRoutes = (app: FastifyInstance): void => {
  app.post('/users/:id/start-conversation', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const body = request.body as { preferredCallAt?: string }

    try {
      await startConversationForUser({ userId, preferredCallAt: body?.preferredCallAt })
    } catch (error) {
      const message = (error as Error).message
      if (message === 'user_not_found') {
        return reply.status(404).send({ error: 'user_not_found' })
      }
      if (message.startsWith('whatsapp_send_failed:')) {
        return reply.status(500).send({ error: 'whatsapp_send_failed', details: message })
      }
      return reply.status(500).send({ error: 'start_conversation_failed', details: message })
    }

    eventLogger.log({
      event: 'manual_outreach_started',
      level: 'info',
      payload: { userId, preferredCallAt: body?.preferredCallAt ?? null }
    })

    return reply.send({ ok: true })
  })

  app.get('/users/untouched/count', { preHandler: protectedHandler }, async () => {
    const tid = await getTenantId()
    const count = await countUntouchedUsers(dbPool, tid)
    return { count }
  })

  app.post('/users/batch/start-untouched', { preHandler: protectedHandler }, async request => {
    const body = request.body as
      | {
          preferredCallAt?: string
          limit?: number
          runMode?: 'run_now' | 'schedule'
          scheduledAt?: string
        }
      | undefined
    const tid = await getTenantId()
    const untouchedUsers = await listUntouchedUsers(dbPool, tid, body?.limit ?? 200)

    const runMode = body?.runMode ?? 'run_now'
    const templateResult = await sendBatchTemplates(untouchedUsers)

    let batch: {
      batchId: string
      state: string
      scheduledAt: string
      csvRows: number
    } | null = null
    let batchError: string | null = null

    try {
      if (!env.BOLNA_API_KEY || !env.BOLNA_AGENT_ID) {
        throw new Error('bolna_not_configured')
      }

      const batchResult = await createAndScheduleBolnaBatch(dbPool, {
        tenantId: tid,
        users: untouchedUsers,
        bolna: {
          baseUrl: env.BOLNA_BASE_URL,
          apiKey: env.BOLNA_API_KEY,
          agentId: env.BOLNA_AGENT_ID,
          fromPhoneNumber: env.BOLNA_FROM_NUMBER
        },
        runMode,
        scheduledAt: runMode === 'schedule' ? body?.scheduledAt : undefined
      })

      batch = {
        batchId: batchResult.batch.batchId,
        state: batchResult.schedule.state,
        scheduledAt: batchResult.scheduledAt,
        csvRows: batchResult.csvRows
      }
    } catch (error) {
      batchError = (error as Error).message
      app.log.error({ msg: 'Failed to create/schedule Bolna batch', error: batchError })
    }

    eventLogger.log({
      event: 'batch_outreach_started',
      level: 'info',
      payload: {
        total: untouchedUsers.length,
        templates_triggered: templateResult.triggered,
        templates_failed: templateResult.failed,
        run_mode: runMode,
        bolna_batch_id: batch?.batchId ?? null,
        bolna_state: batch?.state ?? null,
        bolna_error: batchError
      }
    })

    return {
      ok: !batchError,
      total: untouchedUsers.length,
      triggered: templateResult.triggered,
      failed: templateResult.failed,
      errors: templateResult.errors,
      runMode,
      batch,
      batchError
    }
  })

  app.post('/users/:id/calls/cancel', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const body = request.body as { reason?: string }

    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)
    const cancelled = await cancelScheduledVoiceCalls(dbPool, {
      sessionId,
      reason: body?.reason ?? 'manual_cancel'
    })

    eventLogger.log({
      event: 'voice_calls_cancelled',
      level: 'info',
      payload: { userId, cancelled }
    })

    return reply.send({ ok: true, cancelled })
  })

  app.get('/users/:id/voice-status', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)

    const scheduledActions = await listScheduledActionsBySession(dbPool, sessionId, 20)
    const callAttempts = await listCallAttemptsBySession(dbPool, sessionId, 20)

    return reply.send({ scheduledActions, callAttempts })
  })
}
