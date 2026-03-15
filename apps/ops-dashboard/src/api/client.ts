import type { FunnelMetrics } from '../types'
import type { BatchStartUntouchedResponse, UntouchedCountResponse, BolnaBatchItem } from '../types'

export const initialMetrics: FunnelMetrics = {
  reached: 0,
  replied: 0,
  resumed: 0,
  progressed: 0,
  converted: 0
}

export const tokenKey = 'nudgeflow_admin_token'

export const authFetch = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> ?? {})
  }

  if (init?.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers
  })

  if (response.status === 401) {
    throw new Error('unauthorized')
  }

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return (await response.json()) as T
}

export const getUntouchedCount = (token: string): Promise<UntouchedCountResponse> =>
  authFetch<UntouchedCountResponse>('/users/untouched/count', token)

export const startUntouchedBatch = (
  token: string,
  body?: { preferredCallAt?: string; limit?: number; runMode?: 'run_now' | 'schedule'; scheduledAt?: string }
): Promise<BatchStartUntouchedResponse> =>
  authFetch<BatchStartUntouchedResponse>('/users/batch/start-untouched', token, {
    method: 'POST',
    body: JSON.stringify(body ?? {})
  })

export const downloadInferredUsersCsv = async (
  token: string,
  filters?: { intent?: string; highIntent?: string }
): Promise<Blob> => {
  const params = new URLSearchParams()
  if (filters?.intent) params.set('intent', filters.intent)
  if (filters?.highIntent) params.set('highIntent', filters.highIntent)
  const query = params.toString()

  const response = await fetch(`/api/users/export/inferred.csv${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (response.status === 401) {
    throw new Error('unauthorized')
  }

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return response.blob()
}

export const listBatches = (token: string): Promise<{ batches: BolnaBatchItem[] }> =>
  authFetch<{ batches: BolnaBatchItem[] }>('/batches', token)

export const stopBatch = (token: string, batchId: string): Promise<{ message: string; state: string }> =>
  authFetch<{ message: string; state: string }>(`/batches/${batchId}/stop`, token, {
    method: 'POST'
  })

export const deleteBatch = (token: string, batchId: string): Promise<{ message: string; state: string }> =>
  authFetch<{ message: string; state: string }>(`/batches/${batchId}`, token, {
    method: 'DELETE'
  })
