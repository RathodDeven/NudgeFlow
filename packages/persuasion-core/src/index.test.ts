import { describe, expect, it } from 'vitest'
import { buildNudgeMessage, chooseExperimentVariant } from './index'

describe('persuasion-core', () => {
  it('builds stage-specific nudges', () => {
    const text = buildNudgeMessage({
      stage: 'document_upload',
      style: 'help',
      deepLink: 'https://example.com'
    })

    expect(text.toLowerCase()).toContain('document')
  })

  it('deterministically assigns experiment variant', () => {
    const one = chooseExperimentVariant('user-1')
    const two = chooseExperimentVariant('user-1')
    expect(one).toBe(two)
  })
})
