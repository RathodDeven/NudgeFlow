import { type BolnaExecution, parseBolnaExecution } from './execution'
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

export type BolnaCreateBatchRequest = {
  agentId: string
  csvContent: string
  fileName?: string
  fromPhoneNumbers?: string[]
  retryConfig?: Record<string, unknown>
}

export type BolnaCreateBatchResponse = {
  batchId: string
  state: string
}

export type BolnaScheduleBatchResponse = {
  message: string
  state: string
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

export { bolnaAgentPrompt, bolnaAgentVariables, bolnaAgentWelcomeMessage } from './agent-templates'

export const fetchBolnaExecution = async (params: {
  baseUrl: string
  apiKey: string
  executionId: string
}): Promise<BolnaExecution> => {
  const response = await fetch(`${params.baseUrl}/executions/${params.executionId}`, {
    headers: {
      Authorization: `Bearer ${params.apiKey}`
    }
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_fetch_execution_failed:${text}`)
  }
  const data = await response.json()
  return parseBolnaExecution(data)
}

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

export const createBolnaBatch = async (params: {
  baseUrl: string
  apiKey: string
  request: BolnaCreateBatchRequest
}): Promise<BolnaCreateBatchResponse> => {
  const form = new FormData()
  form.append('agent_id', params.request.agentId)
  form.append(
    'file',
    new Blob([params.request.csvContent], { type: 'text/csv' }),
    params.request.fileName ?? 'bolna-batch.csv'
  )

  for (const fromPhoneNumber of params.request.fromPhoneNumbers ?? []) {
    form.append('from_phone_numbers', fromPhoneNumber)
  }

  if (params.request.retryConfig) {
    form.append('retry_config', JSON.stringify(params.request.retryConfig))
  }

  const response = await fetch(`${params.baseUrl}/batches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`
    },
    body: form
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_batch_create_failed:${text}`)
  }

  const data = (await response.json()) as { batch_id?: string; state?: string }
  return {
    batchId: data.batch_id ?? '',
    state: data.state ?? 'created'
  }
}

export const scheduleBolnaBatch = async (params: {
  baseUrl: string
  apiKey: string
  batchId: string
  scheduledAt: string
  bypassCallGuardrails?: boolean
  isScheduled?: boolean
}): Promise<BolnaScheduleBatchResponse> => {
  const form = new FormData()
  form.append('scheduled_at', params.scheduledAt)
  form.append('is_scheduled', String(params.isScheduled ?? true))
  form.append('bypass_call_guardrails', String(params.bypassCallGuardrails ?? false))

  const response = await fetch(`${params.baseUrl}/batches/${params.batchId}/schedule`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`
    },
    body: form
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_batch_schedule_failed:${text}`)
  }

  const data = (await response.json()) as { message?: string; state?: string }
  return {
    message: data.message ?? 'success',
    state: data.state ?? 'scheduled'
  }
}

export const listBolnaBatches = async (params: {
  baseUrl: string
  apiKey: string
  agentId: string
}): Promise<BolnaBatchItem[]> => {
  const response = await fetch(`${params.baseUrl}/batches/${params.agentId}/all`, {
    headers: {
      Authorization: `Bearer ${params.apiKey}`
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_list_batches_failed:${text}`)
  }

  return (await response.json()) as BolnaBatchItem[]
}

export const stopBolnaBatch = async (params: {
  baseUrl: string
  apiKey: string
  batchId: string
}): Promise<{ message: string; state: string }> => {
  const response = await fetch(`${params.baseUrl}/batches/${params.batchId}/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_stop_batch_failed:${text}`)
  }

  return (await response.json()) as { message: string; state: string }
}

export const deleteBolnaBatch = async (params: {
  baseUrl: string
  apiKey: string
  batchId: string
}): Promise<{ message: string; state: string }> => {
  const response = await fetch(`${params.baseUrl}/batches/${params.batchId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${params.apiKey}`
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`bolna_delete_batch_failed:${text}`)
  }

  return (await response.json()) as { message: string; state: string }
}
