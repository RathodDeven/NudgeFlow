export type BolnaExecution = {
  id: string
  agent_id?: string
  batch_id?: string
  status: string
  transcript?: string
  summary?: string
  custom_extractions?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  conversation_time?: number
  total_cost?: number
  answered_by_voice_mail?: boolean
  error_message?: string
  extracted_data?: Record<string, unknown>
  context_details?: Record<string, unknown>
  batch_run_details?: {
    status?: string
    created_at?: string
    updated_at?: string
    retried?: number
  }
  telephony_data?: {
    to_number?: string
    from_number?: string
    call_type?: string
    duration?: number
    provider_call_id?: string
    recording_url?: string
    provider?: string
    status?: string
    cost?: number
    hangup_by?: string
    hangup_reason?: string
    hangup_provider_code?: number
    ring_duration?: number
    post_dial_delay?: number
    to_number_carrier?: string
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

// Accepts both numeric and string representations (e.g. telephony_data.duration = "41")
const toNumberLenient = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

const parseRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined

export const parseBolnaExecution = (payload: unknown): BolnaExecution => {
  if (!isRecord(payload)) {
    throw new Error('payload_not_object')
  }

  const id = toStringOrUndefined(payload.id) ?? ''
  const status = toStringOrUndefined(payload.status) ?? ''
  if (!id || !status) {
    throw new Error('missing_required_fields')
  }

  const telephony = parseRecord(payload.telephony_data)
  const batchRun = parseRecord(payload.batch_run_details)

  return {
    id,
    status,
    agent_id: toStringOrUndefined(payload.agent_id),
    batch_id: toStringOrUndefined(payload.batch_id),
    transcript: toStringOrUndefined(payload.transcript),
    created_at: toStringOrUndefined(payload.created_at),
    updated_at: toStringOrUndefined(payload.updated_at),
    conversation_time:
      toNumberOrUndefined(payload.conversation_time) ?? toNumberLenient(payload.conversation_duration),
    total_cost: toNumberOrUndefined(payload.total_cost),
    answered_by_voice_mail:
      typeof payload.answered_by_voice_mail === 'boolean' ? payload.answered_by_voice_mail : undefined,
    error_message: toStringOrUndefined(payload.error_message),
    summary: toStringOrUndefined(payload.summary),
    custom_extractions: parseRecord(payload.custom_extractions),
    extracted_data: parseRecord(payload.extracted_data),
    context_details: parseRecord(payload.context_details),
    batch_run_details: batchRun
      ? {
          status: toStringOrUndefined(batchRun.status),
          created_at: toStringOrUndefined(batchRun.created_at),
          updated_at: toStringOrUndefined(batchRun.updated_at),
          retried: toNumberOrUndefined(batchRun.retried)
        }
      : undefined,
    telephony_data: telephony
      ? {
          to_number: toStringOrUndefined(telephony.to_number),
          from_number: toStringOrUndefined(telephony.from_number),
          call_type: toStringOrUndefined(telephony.call_type),
          duration: toNumberLenient(telephony.duration),
          provider_call_id: toStringOrUndefined(telephony.provider_call_id),
          recording_url: toStringOrUndefined(telephony.recording_url),
          provider: toStringOrUndefined(telephony.provider),
          status: toStringOrUndefined(telephony.status),
          cost: toNumberOrUndefined(telephony.cost),
          hangup_by: toStringOrUndefined(telephony.hangup_by),
          hangup_reason: toStringOrUndefined(telephony.hangup_reason),
          hangup_provider_code: toNumberOrUndefined(telephony.hangup_provider_code),
          ring_duration: toNumberOrUndefined(telephony.ring_duration),
          post_dial_delay: toNumberOrUndefined(telephony.post_dial_delay),
          to_number_carrier: toStringOrUndefined(telephony.to_number_carrier)
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
  if (['no_answer', 'no-answer', 'missed', 'voicemail'].includes(normalized)) return 'no_answer'
  if (['failed', 'error', 'canceled', 'cancelled', 'rejected', 'balance-low'].includes(normalized)) {
    return 'failed'
  }
  return undefined
}
