import type { MessageEvent, SummaryState } from '@nudges/domain'
import { describe, expect, it } from 'vitest'
import { compactSessionMemory } from './index'

const makeMessage = (id: number, body: string): MessageEvent => ({
  id: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  channel: 'whatsapp',
  direction: id % 2 === 0 ? 'outbound' : 'inbound',
  body,
  createdAt: new Date().toISOString()
})

describe('compactSessionMemory', () => {
  it('preserves summary when below threshold', () => {
    const summary: SummaryState = {
      sessionIntent: 'Resume doc upload',
      userObjections: [],
      stageContext: 'document_upload',
      persuasionPath: 'help',
      commitments: [],
      nextAction: 'wait',
      preferredLanguage: 'hinglish'
    }

    const result = compactSessionMemory([makeMessage(1, 'hello')], summary, 10, 1000)
    expect(result.archivedMessages).toHaveLength(0)
    expect(result.summary.nextAction).toBe('wait')
  })
})
