import {
  getScheduledActionById,
  getSessionContext,
  listOverdueScheduledActions,
  markScheduledActionProcessing,
  updateScheduledActionStatus
} from '@nudges/db'
import { type ConnectionOptions, Queue, Worker } from 'bullmq'
import { sendWhatsAppFollowup, sendWhatsAppTemplate } from './followup'
import { evaluateAndPersistPolicy } from './policy'
import { dbPool, env } from './state'

const redisUrl = new URL(env.REDIS_URL || 'redis://localhost:6379')

const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined
}

export const followupQueue = new Queue('followup_queue', { connection })

type FollowupJob = {
  scheduledActionId: string
  sessionId: string
}

new Worker<FollowupJob>(
  'followup_queue',
  async job => {
    const { scheduledActionId, sessionId } = job.data
    try {
      const action = await getScheduledActionById(dbPool, scheduledActionId)
      const sessionContext = await getSessionContext(dbPool, sessionId)

      if (!sessionContext || !action) {
        await updateScheduledActionStatus(dbPool, {
          actionId: scheduledActionId,
          status: 'failed',
          lastError: 'session_or_action_not_found'
        })
        return { status: 'failed', reason: 'session_or_action_not_found' }
      }

      const evaluation = await evaluateAndPersistPolicy({
        sessionId,
        sessionTimezone: sessionContext.tenantTimezone,
        isAgentActive: sessionContext.isAgentActive
      })

      if (!evaluation.allowed) {
        await updateScheduledActionStatus(dbPool, {
          actionId: scheduledActionId,
          status: 'cancelled',
          lastError: evaluation.reasons.join(',')
        })
        return { status: 'skipped', reasons: evaluation.reasons }
      }

      if (action.actionType === 'whatsapp_followup') {
        await sendWhatsAppFollowup(sessionId)
      } else if (action.actionType === 'whatsapp_template') {
        await sendWhatsAppTemplate(sessionId)
      } else {
        await updateScheduledActionStatus(dbPool, {
          actionId: scheduledActionId,
          status: 'failed',
          lastError: `unsupported_action:${action.actionType}`
        })
        return { status: 'failed', sessionId, action: action.actionType }
      }

      await updateScheduledActionStatus(dbPool, {
        actionId: scheduledActionId,
        status: 'completed'
      })

      return { status: 'completed', sessionId, action: action.actionType }
    } catch (error) {
      await updateScheduledActionStatus(dbPool, {
        actionId: scheduledActionId,
        status: 'failed',
        lastError: (error as Error).message
      })
      throw error
    }
  },
  { connection }
)

const recoverOverdueActions = async (): Promise<void> => {
  const overdue = await listOverdueScheduledActions(dbPool, new Date().toISOString(), 200)
  for (const action of overdue) {
    if (action.actionType === 'voice_call') {
      await updateScheduledActionStatus(dbPool, {
        actionId: action.id,
        status: 'cancelled',
        lastError: 'handled_by_bolna_schedule'
      })
      continue
    }

    const claimed = await markScheduledActionProcessing(dbPool, action.id)
    if (!claimed) continue

    try {
      await followupQueue.add(
        action.actionType,
        { scheduledActionId: action.id, sessionId: action.sessionId },
        { jobId: action.idempotencyKey }
      )
    } catch (error) {
      await updateScheduledActionStatus(dbPool, {
        actionId: action.id,
        status: 'pending',
        lastError: (error as Error).message
      })
    }
  }
}

recoverOverdueActions().catch(error => {
  console.error(error)
  process.exit(1)
})
