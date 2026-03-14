export { mapBolnaDisposition, parseBolnaExecution, type BolnaExecution } from './execution'

export type BolnaCallRequest = {
  agentId: string
  recipientPhoneNumber: string
  fromPhoneNumber?: string
  scheduledAt?: string
  retryConfig?: Record<string, unknown>
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
    retry_config: params.request.retryConfig,
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
