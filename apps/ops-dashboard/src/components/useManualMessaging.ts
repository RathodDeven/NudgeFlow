import { useState } from 'react'
import { authFetch } from '../api/client'
import type { CsvUser, DbChatMessage } from '../types'

type ManualMessagingParams = {
  user: CsvUser
  token: string
  isSandbox: boolean
  useWhatsapp: boolean
  setUseWhatsapp: (value: boolean) => void
  setMessages: React.Dispatch<React.SetStateAction<DbChatMessage[]>>
  sendMessageToApi: (body: string, direction: 'inbound' | 'outbound' | 'system') => Promise<void>
}

export const useManualMessaging = ({
  user,
  token,
  isSandbox,
  useWhatsapp,
  setUseWhatsapp,
  setMessages,
  sendMessageToApi
}: ManualMessagingParams) => {
  const [agentInputMessage, setAgentInputMessage] = useState('')
  const [isManualSending, setIsManualSending] = useState(false)
  const [manualStatus, setManualStatus] = useState('')

  const handleSendManualMessage = async (textOverride?: string) => {
    const text = textOverride ?? agentInputMessage
    if (!text.trim()) return

    if (!textOverride) setAgentInputMessage('')
    setIsManualSending(true)
    setManualStatus('')

    try {
      if (!isSandbox || useWhatsapp) {
        await authFetch(`/users/${user.id}/send-whatsapp`, token, {
          method: 'POST',
          body: JSON.stringify({ message: text })
        })
        setManualStatus('✅ Sent via WhatsApp API')
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sessionId: 'manual',
            channel: 'whatsapp',
            direction: 'outbound',
            body: text,
            createdAt: new Date().toISOString()
          }
        ])
      } else {
        await sendMessageToApi(text, 'outbound')
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sessionId: 'sim',
            channel: 'sandbox',
            direction: 'outbound',
            body: text,
            createdAt: new Date().toISOString()
          }
        ])
        setManualStatus('✅ Saved as Agent (Sandbox)')
      }
    } catch (err: unknown) {
      setManualStatus(`❌ Send Error: ${(err as Error).message}`)
    } finally {
      setIsManualSending(false)
      setTimeout(() => setManualStatus(''), 4000)
    }
  }

  return {
    agentInputMessage,
    setAgentInputMessage,
    isManualSending,
    manualStatus,
    useWhatsapp,
    setUseWhatsapp,
    handleSendManualMessage
  }
}
