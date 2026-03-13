import { MEMORY_PROMPT_CHAR_CAP, MEMORY_PROMPT_MESSAGE_CAP } from '@nudges/domain'

export type HistoryMessage = { direction: 'inbound' | 'outbound'; body: string }

export const capRecentHistory = (chatHistory: HistoryMessage[] | undefined): HistoryMessage[] => {
  const bounded = (chatHistory ?? []).slice(-MEMORY_PROMPT_MESSAGE_CAP)
  const capped: HistoryMessage[] = []
  let totalChars = 0

  for (let i = bounded.length - 1; i >= 0; i--) {
    const turn = bounded[i]
    totalChars += turn.body.length
    if (totalChars > MEMORY_PROMPT_CHAR_CAP) break
    capped.unshift(turn)
  }

  return capped
}

export const buildHistoryBlock = (chatHistory: HistoryMessage[]): string => {
  if (chatHistory.length === 0) return '(No previous messages)'
  return chatHistory.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.body}`).join('\n')
}

export const estimateTokens = (...parts: string[]): number => {
  const joined = parts.filter(Boolean).join('\n')
  return Math.max(1, Math.ceil(joined.length / 4))
}
