import { useEffect, useState } from 'react'
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
}

export const useUserDetailState = ({ user, token, pendingTasks, onStatusChange }: UserDetailStateParams) => {
  const isSandbox = import.meta.env.VITE_ENABLE_SANDBOX === 'true'
  const [messages, setMessages] = useState<DbChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAgentActive, setIsAgentActive] = useState(true)
  const [useWhatsapp, setUseWhatsapp] = useState(false)

  const userTasks = pendingTasks.filter(
    t => t.externalUserId === user.customerId || t.externalUserId === user.id
  )

  const sendMessageToApi = async (body: string, direction: 'inbound' | 'outbound' | 'system') => {
    await authFetch(`/users/${user.id}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ direction, body, channel: 'whatsapp' })
    })
  }

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
    useWhatsapp,
    setUseWhatsapp,
    setMessages,
    sendMessageToApi
  })

  const voiceStatus = useVoiceStatus({ userId: user.id, token })

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    authFetch<{ messages: DbChatMessage[] }>(`/users/${user.id}/messages`, token)
      .then(res => {
        if (mounted) {
          setMessages(res.messages)
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load messages', err)
      })

    authFetch<{ ok: boolean; isAgentActive: boolean }>(`/users/${user.id}/session`, token)
      .then(res => {
        if (mounted && res.ok) setIsAgentActive(res.isAgentActive)
      })
      .catch((err: unknown) => {
        console.error('Failed to load agent status', err)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    voiceStatus.refreshVoiceStatus()

    return () => {
      mounted = false
    }
  }, [token, user.id, voiceStatus.refreshVoiceStatus])

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
    voiceStatus
  }
}
