import type { SummaryState } from '@nudges/domain'

export const hasRequiredSummaryKeys = (value: unknown): value is SummaryState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const summary = value as Record<string, unknown>
  return (
    typeof summary.sessionIntent === 'string' &&
    typeof summary.stageContext === 'string' &&
    typeof summary.persuasionPath === 'string' &&
    typeof summary.nextAction === 'string' &&
    typeof summary.preferredLanguage === 'string' &&
    Array.isArray(summary.userObjections) &&
    Array.isArray(summary.commitments)
  )
}

export const buildFallbackSummaryState = (stageContext: string | null | undefined): SummaryState => ({
  sessionIntent: 'recovery',
  userObjections: [],
  stageContext: (stageContext ?? 'fresh_loan') as SummaryState['stageContext'],
  persuasionPath: 'default',
  commitments: [],
  nextAction: 'continue',
  preferredLanguage: 'hinglish'
})
