export type FunnelMetrics = {
  reached: number
  replied: number
  resumed: number
  progressed: number
  converted: number
}

export type SessionItem = {
  sessionId: string
  isAgentActive: boolean
  updatedAt: string
}

export type EventItem = {
  event: string
  level: 'info' | 'warn' | 'error'
  sessionId?: string
  payload: Record<string, unknown>
  createdAt: string
}

export type PendingHITLTask = {
  id: string
  externalUserId: string
  stage: string
  messageBody: string
  status: 'drafting_required'
  createdAt: string
  callPriority?: 'P1' | 'P2' | 'P3' | 'none'
  callReason?: string
  blockerCode?: string
  userName?: string
  firmName?: string
  pendingStep?: string
  callScript?: string
  loanAmount?: number
  mobile?: string
  called?: boolean
}

export type ChatMessage = {
  role: 'user' | 'agent' | 'system'
  text: string
}

export type DbChatMessage = {
  id: string
  sessionId: string
  channel: string
  direction: 'inbound' | 'outbound' | 'system'
  body: string
  createdAt: string
}

export type ScheduledAction = {
  id: string
  sessionId: string
  actionType: string
  actionSubtype?: string
  dueAt: string
  status: string
  retryCount: number
  idempotencyKey: string
  lastError?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type CallAttempt = {
  id: string
  sessionId: string
  interactionEventId: string
  disposition?: string
  durationSeconds?: number
  providerCallId?: string
  providerTimestamp?: string
  createdAt: string
}

export type CsvUser = {
  id: string
  customerId: string
  name: string
  firmName: string
  mobile: string
  status: string
  loanAmount: number
  metadata?: Record<string, unknown>
  applicationCreatedAt?: string
  applicationUpdatedAt?: string
  inferredIntent?: string | null
  highIntentFlag?: string | null
  followUpAt?: string | null
  callSummaryLatest?: string | null
  callNotesLatest?: string | null
  lastCallAt?: string | null
  lastCallDisposition?: string | null
  inferenceExtractedData?: Record<string, unknown>
  inferenceContextDetails?: Record<string, unknown>
}

export type UntouchedCountResponse = {
  count: number
}

export type BatchStartUntouchedResponse = {
  ok: boolean
  total: number
  triggered: number
  failed: number
  errors: Array<{ userId: string; reason: string }>
  runMode: 'run_now' | 'schedule'
  batch: {
    batchId: string
    state: string
    scheduledAt: string
    csvRows: number
  } | null
  batchError: string | null
}

export type BolnaBatchItem = {
  batch_id: string
  humanized_created_at: string
  created_at: string
  updated_at: string
  status: string
  scheduled_at?: string
  from_phone_number?: string
  from_phone_numbers?: string[]
  file_name?: string
  valid_contacts: number
  total_contacts: number
  execution_status?: {
    completed: number
    ringing: number
    'in-progress': number
    [key: string]: number
  }
}
