import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '../api/client'
import type { CsvUser, DbChatMessage, PendingHITLTask } from '../types'
import { useManualMessaging } from './useManualMessaging'
import { useSandboxSimulation } from './useSandboxSimulation'
import { useVoiceStatus } from './useVoiceStatus'

type UserDetailStateParams = {
  user: CsvUser
  token: string
  pendingTasks: PendingHITLTask[]
  onStatusChange: (userId: string, newStatus: string) => void
  globalUseWhatsapp: boolean
}

export const useUserDetailState = ({
  user,
  token,
  pendingTasks,
  onStatusChange,
  globalUseWhatsapp
}: UserDetailStateParams) => {
  const isSandbox = import.meta.env.VITE_ENABLE_SANDBOX === 'true'
  const [messages, setMessages] = useState<DbChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAgentActive, setIsAgentActive] = useState(true)

  const userTasks = pendingTasks.filter(
    t => t.externalUserId === user.customerId || t.externalUserId === user.id
  )

  const sendMessageToApi = async (body: string, direction: 'inbound' | 'outbound' | 'system') => {
    await authFetch(`/users/${user.id}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ direction, body, channel: 'whatsapp' })
    })
  }

  const [lastInboundAt, setLastInboundAt] = useState<string | null>(null)

  const sandbox = useSandboxSimulation({
    user,
    messages,
    setMessages,
    sendMessageToApi
  })

  const manual = useManualMessaging({
    user,
    token,
    isSandbox,
    useWhatsapp: globalUseWhatsapp,
    setUseWhatsapp: () => {}, // Sidebar handles toggle now
    setMessages,
    sendMessageToApi
  })

  const voiceStatus = useVoiceStatus({ userId: user.id, token })

  const refreshData = useCallback(async () => {
    try {
      const [msgRes, sessionRes, windowRes] = await Promise.all([
        authFetch<{ messages: DbChatMessage[] }>(`/users/${user.id}/messages`, token),
        authFetch<{ ok: boolean; isAgentActive: boolean }>(`/users/${user.id}/session`, token),
        authFetch<{ lastInboundAt: string | null }>(`/users/${user.id}/session-window`, token)
      ])

      setMessages(msgRes.messages)
      if (sessionRes.ok) setIsAgentActive(sessionRes.isAgentActive)
      setLastInboundAt(windowRes.lastInboundAt)
    } catch (err) {
      console.error('Failed to refresh user data', err)
    }
  }, [user.id, token])

  useEffect(() => {
    setIsLoading(true)
    refreshData().finally(() => {
      setIsLoading(false)
    })

    const interval = setInterval(refreshData, 5000)
    voiceStatus.refreshVoiceStatus()

    return () => {
      clearInterval(interval)
    }
  }, [refreshData, voiceStatus.refreshVoiceStatus])

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    try {
      await authFetch(`/users/${user.id}/stage`, token, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStatus })
      })
      onStatusChange(user.id, newStatus)
      voiceStatus.refreshVoiceStatus()
    } catch {
      alert('Failed to update status')
    }
  }

  const handleAgentToggle = async () => {
    const newState = !isAgentActive
    setIsAgentActive(newState)
    try {
      await authFetch(`/users/${user.id}/agent-active`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isAgentActive: newState })
      })
    } catch {
      setIsAgentActive(!newState)
      alert('Failed to update agent status')
    }
  }

  return {
    isSandbox,
    messages,
    isLoading,
    isAgentActive,
    userTasks,
    handleStatusChange,
    handleAgentToggle,
    sandbox,
    manual,
    voiceStatus,
    lastInboundAt
  }
}
