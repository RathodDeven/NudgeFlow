import type { MessageEvent, SummaryState } from '@nudges/domain'

export type CompactionResult = {
  summary: SummaryState
  compactFacts: Record<string, string>
  archivedMessages: MessageEvent[]
}

const MAX_RECENT_TURNS = 8

export const estimateTokenBudget = (messages: MessageEvent[]): number => {
  const chars = messages.reduce((sum, current) => sum + current.body.length, 0)
  return Math.ceil(chars / 4)
}

const dedupe = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

export const compactSessionMemory = (
  messages: MessageEvent[],
  summary: SummaryState,
  currentTokenEstimate: number,
  tokenLimit: number
): CompactionResult => {
  if (currentTokenEstimate < tokenLimit * 0.7) {
    return { summary, compactFacts: {}, archivedMessages: [] }
  }

  const cutoff = Math.max(0, messages.length - MAX_RECENT_TURNS)
  const archived = messages.slice(0, cutoff)
  const retained = messages.slice(cutoff)

  const objectionHints = archived
    .map(entry => entry.body)
    .filter(text => /cost|rate|interest|later|busy|document|kyc|not now/i.test(text))

  const commitmentHints = retained
    .map(entry => entry.body)
    .filter(text => /(will|today|tomorrow|send|upload|complete)/i.test(text))

  const updatedSummary: SummaryState = {
    ...summary,
    userObjections: dedupe([...summary.userObjections, ...objectionHints.slice(0, 3)]),
    commitments: dedupe([...summary.commitments, ...commitmentHints.slice(0, 3)]),
    nextAction: retained[retained.length - 1]?.body ?? summary.nextAction
  }

  const compactFacts: Record<string, string> = {
    last_compaction_at: new Date().toISOString(),
    archived_count: String(archived.length),
    retained_count: String(retained.length)
  }

  if (currentTokenEstimate >= tokenLimit * 0.85) {
    updatedSummary.userObjections = updatedSummary.userObjections.slice(0, 5)
    updatedSummary.commitments = updatedSummary.commitments.slice(0, 5)
  }

  return { summary: updatedSummary, compactFacts, archivedMessages: archived }
}
