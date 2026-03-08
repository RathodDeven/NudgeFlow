import type { LoanStage } from '@nudges/domain'
import { type NudgeStyle, stagePlaybooks } from './playbooks/stage-playbooks'

export type MessageVariant = 'morning' | 'evening'

export type PersuasionInput = {
  stage: LoanStage
  style: NudgeStyle
  userName?: string
  deepLink?: string
  languageTag?: string
  variant?: MessageVariant
}

export const buildNudgeMessage = (input: PersuasionInput): string => {
  const playbook = stagePlaybooks[input.stage]
  const base = input.style === 'progress' ? playbook.progressTemplate : playbook.helpTemplate
  const greeting = input.userName ? `Hi ${input.userName}, ` : 'Hi, '
  const variantLine =
    input.variant === 'evening'
      ? 'If evening works better, you can do this now.'
      : 'You can finish this in a few minutes.'
  const link = playbook.ctaType === 'deep_link' && input.deepLink ? ` Resume here: ${input.deepLink}` : ''
  return `${greeting}${base} ${variantLine}${link}`.trim()
}

export const chooseExperimentVariant = (stableKey: string): MessageVariant => {
  const hash = Array.from(stableKey).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return hash % 2 === 0 ? 'morning' : 'evening'
}

export { stagePlaybooks }
