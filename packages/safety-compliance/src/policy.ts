import { isWithinContactWindow } from '@nudges/config'

export type PolicyEvaluationInput = {
  now: Date
  timezone: string
  startHour: number
  endHour: number
  attemptsInWindow: number
  maxAttempts: number
  blocked: boolean
  optedOut: boolean
  nonResponsive: boolean
  isAgentActive: boolean
  windowStartAt: Date
  windowDays: number
  lastAttemptAt?: Date | null
  cooldownHours: number
}

export type PolicyEvaluationResult = {
  allowed: boolean
  reasons: string[]
  nextAttemptsInWindow: number
  nextWindowStartAt: Date
  nextLastAttemptAt: Date | null
}

export const evaluateOutreachPolicy = (input: PolicyEvaluationInput): PolicyEvaluationResult => {
  const reasons: string[] = []
  const windowEndsAt = new Date(input.windowStartAt.getTime() + input.windowDays * 24 * 60 * 60 * 1000)
  const resetWindow = input.now > windowEndsAt
  const windowStartAt = resetWindow ? input.now : input.windowStartAt
  const attemptsInWindow = resetWindow ? 0 : input.attemptsInWindow

  if (!input.isAgentActive) reasons.push('human_takeover_active')
  if (input.blocked) reasons.push('blocked_by_user')
  if (input.optedOut) reasons.push('user_opted_out')
  if (input.nonResponsive) reasons.push('non_responsive')

  if (attemptsInWindow >= input.maxAttempts) reasons.push('attempt_limit_reached')

  if (!isWithinContactWindow(input.now, input.startHour, input.endHour, input.timezone)) {
    reasons.push('outside_contact_window')
  }

  if (input.lastAttemptAt) {
    const cooldownEndsAt = new Date(input.lastAttemptAt.getTime() + input.cooldownHours * 60 * 60 * 1000)
    if (input.now < cooldownEndsAt) {
      reasons.push('cooldown_active')
    }
  }

  const allowed = reasons.length === 0
  return {
    allowed,
    reasons,
    nextAttemptsInWindow: allowed ? attemptsInWindow + 1 : attemptsInWindow,
    nextWindowStartAt: windowStartAt,
    nextLastAttemptAt: allowed ? input.now : (input.lastAttemptAt ?? null)
  }
}
