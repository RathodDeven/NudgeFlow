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

  const handleSendManualMessage = async (textOverride?: string, templateName?: string) => {
    const text = textOverride ?? agentInputMessage
    if (!text.trim() && !templateName) return

    if (!textOverride) setAgentInputMessage('')
    setIsManualSending(true)
    setManualStatus('')

    try {
      if (!isSandbox || useWhatsapp) {
        await authFetch(`/users/${user.id}/send-whatsapp`, token, {
          method: 'POST',
          body: JSON.stringify({
            message: text.trim() || undefined,
            templateName
          })
        })
        setManualStatus(templateName ? '✅ Template Sent' : '✅ Sent via WhatsApp API')
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sessionId: 'manual',
            channel: 'whatsapp',
            direction: 'outbound',
            body: templateName ? `[Sent Template: ${templateName}]` : text,
            createdAt: new Date().toISOString()
          }
        ])
      } else {
        // Simulator mode doesn't really support templates yet, just send text
        const simBody = templateName ? `[Template: ${templateName}]` : text
        await sendMessageToApi(simBody, 'outbound')
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sessionId: 'sim',
            channel: 'sandbox',
            direction: 'outbound',
            body: simBody,
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
