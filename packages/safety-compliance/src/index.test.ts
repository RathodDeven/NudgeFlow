import { describe, expect, it } from 'vitest'
import { enforceMessagingPolicy, redactPii } from './index'

describe('safety-compliance', () => {
  it('redacts pii patterns', () => {
    const text = 'PAN ABCDE1234F Aadhaar 123456789012 OTP 123456'
    const redacted = redactPii(text)
    expect(redacted).toContain('[REDACTED]')
  })

  it('blocks policy after max attempts', () => {
    const result = enforceMessagingPolicy({
      now: new Date('2026-03-08T06:00:00.000Z'),
      timezone: 'Asia/Kolkata',
      startHour: 8,
      endHour: 19,
      attemptsInWindow: 3,
      maxAttempts: 3,
      blocked: false,
      optedOut: false,
      isAgentActive: true
    })

    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain('attempt_limit_reached')
  })
})
