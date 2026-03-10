import { isWithinContactWindow } from '@nudges/config'
import type { ConversationSession } from '@nudges/domain'

export type GuardrailResult = {
  allowed: boolean
  reasons: string[]
  sanitizedMessage?: string
}

const piiPatterns = [/\b\d{12}\b/g, /\b\d{16}\b/g, /\b\d{6}\b/g, /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi]

export const redactPii = (text: string): string => {
  let redacted = text
  for (const pattern of piiPatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
}

export const enforceMessagingPolicy = (params: {
  now: Date
  timezone: string
  startHour: number
  endHour: number
  attemptsInWindow: number
  maxAttempts: number
  blocked: boolean
  optedOut: boolean
  isAgentActive: boolean
}): GuardrailResult => {
  const reasons: string[] = []
  if (!params.isAgentActive) reasons.push('human_takeover_active')
  if (params.blocked) reasons.push('blocked_by_user')
  if (params.optedOut) reasons.push('user_opted_out')
  if (params.attemptsInWindow >= params.maxAttempts) reasons.push('attempt_limit_reached')
  if (!isWithinContactWindow(params.now, params.startHour, params.endHour, params.timezone)) {
    reasons.push('outside_contact_window')
  }

  return { allowed: reasons.length === 0, reasons }
}

export const guardOutboundMessage = (message: string): GuardrailResult => {
  return { allowed: true, reasons: [], sanitizedMessage: redactPii(message) }
}
