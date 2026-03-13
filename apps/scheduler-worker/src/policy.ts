import { loadEnv } from '@nudges/config'
import { getPolicyState, recordPolicyEvent, upsertPolicyState } from '@nudges/db'
import { evaluateOutreachPolicy } from '@nudges/safety-compliance'
import { dbPool } from './state'

const env = loadEnv()

export const ensurePolicyState = async (sessionId: string) => {
  const existing = await getPolicyState(dbPool, sessionId)
  if (existing) return existing
  const nowIso = new Date().toISOString()
  return {
    sessionId,
    blocked: false,
    optedOut: false,
    nonResponsive: false,
    attemptsInWindow: 0,
    windowStartAt: nowIso,
    lastAttemptAt: null
  }
}

export const evaluateAndPersistPolicy = async (params: {
  sessionId: string
  sessionTimezone: string
  isAgentActive: boolean
}) => {
  const policyState = await ensurePolicyState(params.sessionId)
  const now = new Date()

  const evaluation = evaluateOutreachPolicy({
    now,
    timezone: params.sessionTimezone,
    startHour: env.CONTACT_START_HOUR,
    endHour: env.CONTACT_END_HOUR,
    attemptsInWindow: policyState.attemptsInWindow,
    maxAttempts: env.MAX_ATTEMPTS,
    blocked: policyState.blocked,
    optedOut: policyState.optedOut,
    nonResponsive: policyState.nonResponsive,
    isAgentActive: params.isAgentActive,
    windowStartAt: new Date(policyState.windowStartAt),
    windowDays: env.FOLLOWUP_WINDOW_DAYS,
    lastAttemptAt: policyState.lastAttemptAt ? new Date(policyState.lastAttemptAt) : null,
    cooldownHours: env.COOLDOWN_HOURS
  })

  await recordPolicyEvent(dbPool, {
    sessionId: params.sessionId,
    decision: evaluation.allowed ? 'allowed' : 'blocked',
    reasonCodes: evaluation.reasons
  })

  await upsertPolicyState(dbPool, {
    sessionId: params.sessionId,
    blocked: policyState.blocked,
    optedOut: policyState.optedOut,
    nonResponsive: policyState.nonResponsive,
    attemptsInWindow: evaluation.nextAttemptsInWindow,
    windowStartAt: evaluation.nextWindowStartAt.toISOString(),
    lastAttemptAt: evaluation.nextLastAttemptAt?.toISOString() ?? null
  })

  return evaluation
}
