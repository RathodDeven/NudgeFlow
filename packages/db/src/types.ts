import type { Pool } from 'pg'

export type DbPool = Pool

export type DbUser = {
  id: string
  tenantId: string
  externalUserId: string
  fullName: string | null
  phoneE164: string
  localeHint: string | null
  city: string | null
  state: string | null
  consentProvided: boolean
  createdAt: string
  currentStage?: string
  partnerCaseId?: string
  loanCaseId?: string
  loanAmount?: number
  firmName?: string
  isReactivated?: boolean
  metadata?: Record<string, unknown>
  loanCreatedAt?: string
  loanUpdatedAt?: string
  applicationCreatedAt?: string
  applicationUpdatedAt?: string
  inferredIntent?: string | null
  highIntentFlag?: string | null
  followUpAt?: string | null
  callSummaryLatest?: string | null
  callNotesLatest?: string | null
  inferenceExtractedData?: Record<string, unknown>
  inferenceContextDetails?: Record<string, unknown>
  lastCallAt?: string | null
  lastCallDisposition?: string | null
}

export type InsertUserRow = {
  externalUserId: string
  fullName: string
  phoneE164: string
  currentStage: string
  partnerCaseId: string
  loanAmount?: number
  firmName?: string
  city?: string
  state?: string
  createdAt?: string
  applicationCreatedAt?: string
  applicationUpdatedAt?: string
  metadata?: Record<string, unknown>
}

export type ChatMessage = {
  id: string
  sessionId: string
  channel: string
  direction: 'inbound' | 'outbound' | 'system'
  body: string
  createdAt: string
}

export type UserSessionInfo = {
  sessionId: string
  isAgentActive: boolean
}

export type SessionMemoryState = {
  summaryState: Record<string, unknown>
  compactFacts: Record<string, unknown>
  messageCount: number
  tokenEstimate: number
}

export type AgentDecisionInsert = {
  sessionId: string
  trigger: string
  route: string
  confidence: number
  guardrailNotes: string[]
  suggestedNextFollowupAt?: string
  modelName: string
}

export type AgentDecisionRow = AgentDecisionInsert & {
  id: string
  createdAt: string
}

export type InteractionEventInsert = {
  sessionId: string
  channel: string
  direction: 'inbound' | 'outbound' | 'system'
  eventType: string
  transcript?: string
  summary?: string
  callDisposition?: string
  callDurationSeconds?: number
  consentFlag?: boolean
  handoffFlag?: boolean
  providerId?: string
  providerTimestamp?: string
}

export type InteractionEventRow = InteractionEventInsert & {
  id: string
  createdAt: string
}

export type CallAttemptInsert = {
  sessionId: string
  interactionEventId: string
  disposition?: string
  durationSeconds?: number
  providerCallId?: string
  providerTimestamp?: string
}

export type CallAttemptRow = CallAttemptInsert & {
  id: string
  createdAt: string
}

export type ScheduledActionInsert = {
  sessionId: string
  actionType: string
  actionSubtype?: string
  dueAt: string
  status: string
  retryCount?: number
  idempotencyKey: string
  lastError?: string
  metadata?: Record<string, unknown>
}

export type ScheduledActionRow = ScheduledActionInsert & {
  id: string
  createdAt: string
  updatedAt: string
}

export type PolicyStateRow = {
  sessionId: string
  blocked: boolean
  optedOut: boolean
  nonResponsive: boolean
  attemptsInWindow: number
  windowStartAt: string
  lastAttemptAt: string | null
}

export type PolicyEventInsert = {
  sessionId: string
  decision: string
  reasonCodes: string[]
}

export type PolicyEventRow = PolicyEventInsert & {
  id: string
  createdAt: string
}

export type SessionSummaryRow = {
  sessionId: string
  userId: string
  tenantId: string
  isAgentActive: boolean
  updatedAt: string
}

export type SessionDispatchContext = {
  sessionId: string
  tenantTimezone: string
  isAgentActive: boolean
  channel: string
}
