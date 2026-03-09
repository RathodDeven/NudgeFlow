import type { FunnelMetrics } from '../types'

export const initialMetrics: FunnelMetrics = {
  reached: 0,
  replied: 0,
  resumed: 0,
  progressed: 0,
  converted: 0
}

export const tokenKey = 'nudgeflow_admin_token'

export const authFetch = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  })

  if (response.status === 401) {
    throw new Error('unauthorized')
  }

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return (await response.json()) as T
}
