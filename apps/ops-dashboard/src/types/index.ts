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
}

export type ChatMessage = {
  role: 'user' | 'agent' | 'system'
  text: string
}
