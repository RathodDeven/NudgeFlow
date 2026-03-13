export type BolnaExecution = {
  id: string
  agent_id?: string
  status: string
  transcript?: string
  created_at?: string
  updated_at?: string
  conversation_time?: number
  answered_by_voice_mail?: boolean
  error_message?: string
  telephony_data?: {
    to_number?: string
    from_number?: string
    call_type?: string
    duration?: number
    provider_call_id?: string
    recording_url?: string
    provider?: string
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export const parseBolnaExecution = (payload: unknown): BolnaExecution => {
  if (!isRecord(payload)) {
    throw new Error('payload_not_object')
  }

  const id = typeof payload.id === 'string' ? payload.id : ''
  const status = typeof payload.status === 'string' ? payload.status : ''
  if (!id || !status) {
    throw new Error('missing_required_fields')
  }

  const telephony = isRecord(payload.telephony_data) ? payload.telephony_data : undefined

  return {
    id,
    status,
    agent_id: typeof payload.agent_id === 'string' ? payload.agent_id : undefined,
    transcript: typeof payload.transcript === 'string' ? payload.transcript : undefined,
    created_at: typeof payload.created_at === 'string' ? payload.created_at : undefined,
    updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : undefined,
    conversation_time: typeof payload.conversation_time === 'number' ? payload.conversation_time : undefined,
    answered_by_voice_mail:
      typeof payload.answered_by_voice_mail === 'boolean' ? payload.answered_by_voice_mail : undefined,
    error_message: typeof payload.error_message === 'string' ? payload.error_message : undefined,
    telephony_data: telephony
      ? {
          to_number: typeof telephony.to_number === 'string' ? telephony.to_number : undefined,
          from_number: typeof telephony.from_number === 'string' ? telephony.from_number : undefined,
          call_type: typeof telephony.call_type === 'string' ? telephony.call_type : undefined,
          duration: typeof telephony.duration === 'number' ? telephony.duration : undefined,
          provider_call_id:
            typeof telephony.provider_call_id === 'string' ? telephony.provider_call_id : undefined,
          recording_url: typeof telephony.recording_url === 'string' ? telephony.recording_url : undefined,
          provider: typeof telephony.provider === 'string' ? telephony.provider : undefined
        }
      : undefined
  }
}

export const mapBolnaDisposition = (
  status: string
): 'answered' | 'no_answer' | 'busy' | 'failed' | undefined => {
  const normalized = status.toLowerCase()
  if (['completed', 'call_completed', 'call-disconnected', 'ended'].includes(normalized)) return 'answered'
  if (['busy', 'user_busy'].includes(normalized)) return 'busy'
  if (['no_answer', 'no-answer', 'missed'].includes(normalized)) return 'no_answer'
  if (['failed', 'error', 'canceled', 'cancelled', 'rejected', 'balance-low'].includes(normalized))
    return 'failed'
  return undefined
}

export type BolnaCallRequest = {
  agentId: string
  recipientPhoneNumber: string
  fromPhoneNumber?: string
  scheduledAt?: string
  userData?: Record<string, unknown>
  agentData?: Record<string, unknown>
  bypassCallGuardrails?: boolean
}

export type BolnaCallResponse = {
  message: string
  status: string
  executionId: string
}

export type BolnaStopCallResponse = {
  message: string
  status: string
  executionId: string
}

export { bolnaAgentPrompt, bolnaAgentVariables, bolnaAgentWelcomeMessage } from './agent-templates'

export const makeBolnaCall = async (params: {
  baseUrl: string
  apiKey: string
  request: BolnaCallRequest
}): Promise<BolnaCallResponse> => {
  const body = {
    agent_id: params.request.agentId,
    recipient_phone_number: params.request.recipientPhoneNumber,
    from_phone_number: params.request.fromPhoneNumber,
    scheduled_at: params.request.scheduledAt,
    user_data: params.request.userData,
    agent_data: params.request.agentData,
    bypass_call_guardrails: params.request.bypassCallGuardrails ?? false
  }

  const response = await fetch(`${params.baseUrl}/call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_call_failed:${text}`)
  }

  const data = (await response.json()) as { message?: string; status?: string; execution_id?: string }
  return {
    message: data.message ?? 'done',
    status: data.status ?? 'queued',
    executionId: data.execution_id ?? ''
  }
}

export const stopBolnaCall = async (params: {
  baseUrl: string
  apiKey: string
  executionId: string
}): Promise<BolnaStopCallResponse> => {
  const response = await fetch(`${params.baseUrl}/call/${params.executionId}/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_stop_failed:${text}`)
  }

  const data = (await response.json()) as { message?: string; status?: string; execution_id?: string }
  return {
    message: data.message ?? 'done',
    status: data.status ?? 'stopped',
    executionId: data.execution_id ?? params.executionId
  }
}
