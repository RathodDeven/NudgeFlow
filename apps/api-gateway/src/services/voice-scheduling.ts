import { loadEnv } from '@nudges/config'
import {
  cancelScheduledActionsForSession,
  createScheduledAction,
  getScheduledActionByExecutionId,
  listScheduledActionsBySession,
  updateScheduledActionMetadata,
  updateScheduledActionStatus
} from '@nudges/db'
import type { DbPool, SessionContext } from '@nudges/db'
import { makeBolnaCall, stopBolnaCall } from '@nudges/provider-bolna'
import { buildVoiceUserData } from './voice-context'
import { getVoiceCallTargetTime, resolveScheduledAt } from './voice-time'

const env = loadEnv()

const getNextRetryDelayMs = (retryIndex: number) => {
  const baseMinutes = 30
  return Math.max(1, retryIndex) * baseMinutes * 60_000
}

const bolnaRetryConfig = {
  enabled: true,
  max_retries: 2,
  retry_intervals_minutes: [30, 60]
}

export const scheduleVoiceCall = async (
  pool: DbPool,
  params: {
    session: SessionContext
    callReason: 'initial' | 'follow_up' | 'retry' | 'status_change'
    requestedAt?: string
    retryIndex?: number
    maxRetries?: number
  }
): Promise<{ scheduledActionId: string | null; executionId?: string }> => {
  if (!env.BOLNA_API_KEY || !env.BOLNA_AGENT_ID) {
    return { scheduledActionId: null }
  }

  const now = new Date()
  const target = params.requestedAt ? new Date(params.requestedAt) : now
  const aligned = resolveScheduledAt(target, params.session.tenantTimezone)
  const scheduledAtIso = aligned.getTime() > now.getTime() + 60_000 ? aligned.toISOString() : undefined

  const { userData } = await buildVoiceUserData(pool, {
    session: params.session,
    callReason: params.callReason
  })

  const scheduledActionId = await createScheduledAction(pool, {
    sessionId: params.session.sessionId,
    actionType: 'voice_call',
    actionSubtype: params.callReason,
    dueAt: scheduledAtIso ?? now.toISOString(),
    status: scheduledAtIso ? 'scheduled' : 'queued',
    retryCount: params.retryIndex ?? 0,
    idempotencyKey: `voice_call_${params.session.sessionId}_${scheduledAtIso ?? now.toISOString()}`,
    metadata: {
      call_reason: params.callReason,
      retry_index: params.retryIndex ?? 0,
      max_retries: params.maxRetries ?? 0,
      requested_at: params.requestedAt ?? null,
      scheduled_at: scheduledAtIso ?? null
    }
  })

  try {
    const response = await makeBolnaCall({
      baseUrl: env.BOLNA_BASE_URL,
      apiKey: env.BOLNA_API_KEY,
      request: {
        agentId: env.BOLNA_AGENT_ID,
        recipientPhoneNumber: params.session.phoneE164,
        fromPhoneNumber: env.BOLNA_FROM_NUMBER,
        scheduledAt: scheduledAtIso,
        retryConfig: bolnaRetryConfig,
        userData,
        bypassCallGuardrails: false
      }
    })

    await updateScheduledActionMetadata(pool, {
      actionId: scheduledActionId,
      status: 'scheduled',
      metadata: {
        execution_id: response.executionId,
        provider_status: response.status
      }
    })

    return { scheduledActionId, executionId: response.executionId }
  } catch (error) {
    await updateScheduledActionStatus(pool, {
      actionId: scheduledActionId,
      status: 'failed',
      lastError: (error as Error).message
    })
    throw error
  }
}

export const scheduleVoiceRetryIfNeeded = async (
  pool: DbPool,
  params: {
    session: SessionContext
    recentFailedAttempts: number
  }
): Promise<boolean> => {
  const maxRetries = 2
  if (params.recentFailedAttempts >= 1 + maxRetries) return false

  const pending = await listScheduledActionsBySession(pool, params.session.sessionId, 20)
  const hasPendingRetry = pending.some(
    action =>
      action.actionType === 'voice_call' &&
      action.actionSubtype === 'retry' &&
      ['pending', 'scheduled', 'queued', 'processing'].includes(action.status)
  )

  if (hasPendingRetry) return false

  const retryIndex = Math.max(1, params.recentFailedAttempts)
  const desired = new Date(Date.now() + getNextRetryDelayMs(retryIndex))

  await scheduleVoiceCall(pool, {
    session: params.session,
    callReason: 'retry',
    requestedAt: desired.toISOString(),
    retryIndex,
    maxRetries
  })

  return true
}

export const cancelScheduledVoiceCalls = async (
  pool: DbPool,
  params: {
    sessionId: string
    reason: string
  }
): Promise<number> => {
  const actions = await listScheduledActionsBySession(pool, params.sessionId, 50)
  for (const action of actions) {
    if (action.actionType !== 'voice_call') continue
    const executionId = action.metadata?.execution_id
    if (executionId && env.BOLNA_API_KEY) {
      try {
        await stopBolnaCall({
          baseUrl: env.BOLNA_BASE_URL,
          apiKey: env.BOLNA_API_KEY,
          executionId: String(executionId)
        })
      } catch {
        // best effort
      }
    }
  }

  return cancelScheduledActionsForSession(pool, {
    sessionId: params.sessionId,
    actionType: 'voice_call',
    reason: params.reason
  })
}

export const resolveScheduledActionStatus = (status: string): 'processing' | 'completed' | 'failed' => {
  const normalized = status.toLowerCase()
  if (['queued', 'initiated', 'ringing', 'in_progress', 'in-progress', 'ongoing'].includes(normalized)) {
    return 'processing'
  }
  if (['completed', 'call_completed', 'call-disconnected', 'ended'].includes(normalized)) {
    return 'completed'
  }
  return 'failed'
}

export const markScheduledActionFromExecution = async (
  pool: DbPool,
  params: {
    executionId: string
    status: 'processing' | 'completed' | 'failed'
    lastError?: string
  }
): Promise<void> => {
  const action = await getScheduledActionByExecutionId(pool, params.executionId)
  if (!action) return
  await updateScheduledActionStatus(pool, {
    actionId: action.id,
    status: params.status,
    lastError: params.lastError
  })
}

export { getVoiceCallTargetTime }

export const isBolnaConfigured = (): boolean => Boolean(env.BOLNA_API_KEY && env.BOLNA_AGENT_ID)
