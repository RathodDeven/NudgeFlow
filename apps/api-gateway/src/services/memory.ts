import { type DbPool, getSessionMemoryState, updateSessionMemoryState } from '@nudges/db'
import type { MemoryDelta } from '@nudges/domain'

export const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.length / 4))

export const applyMessageMemoryUpdate = async (
  pool: DbPool,
  sessionId: string,
  messageBody: string
): Promise<void> => {
  const memoryState = await getSessionMemoryState(pool, sessionId)
  if (!memoryState) return

  await updateSessionMemoryState(pool, {
    sessionId,
    summaryState: memoryState.summaryState,
    compactFacts: memoryState.compactFacts,
    messageCount: memoryState.messageCount + 1,
    tokenEstimate: memoryState.tokenEstimate + estimateTokens(messageBody)
  })
}

export const applyAgentMemoryDelta = async (
  pool: DbPool,
  sessionId: string,
  memoryDelta: MemoryDelta
): Promise<void> => {
  const memoryState = await getSessionMemoryState(pool, sessionId)
  if (!memoryState) return

  const mergedFacts = { ...memoryState.compactFacts, ...memoryDelta.compactFactsDelta }

  await updateSessionMemoryState(pool, {
    sessionId,
    summaryState: memoryDelta.summaryState,
    compactFacts: mergedFacts,
    messageCount: memoryState.messageCount,
    tokenEstimate: memoryState.tokenEstimate + memoryDelta.tokenEstimate
  })
}
