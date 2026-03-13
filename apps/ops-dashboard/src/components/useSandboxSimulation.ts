import { useState } from 'react'
import type { CsvUser, DbChatMessage } from '../types'

type SandboxSimulationParams = {
  user: CsvUser
  messages: DbChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DbChatMessage[]>>
  sendMessageToApi: (body: string, direction: 'inbound' | 'outbound' | 'system') => Promise<void>
}

export const useSandboxSimulation = ({
  user,
  messages,
  setMessages,
  sendMessageToApi
}: SandboxSimulationParams) => {
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sandboxStatus, setSandboxStatus] = useState('')

  const handleSimulateMessage = async () => {
    if (!inputMessage.trim()) return

    const text = inputMessage
    setInputMessage('')
    setIsSending(true)

    try {
      await sendMessageToApi(text, 'inbound')
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sessionId: 'sim',
          channel: 'sandbox',
          direction: 'inbound',
          body: text,
          createdAt: new Date().toISOString()
        }
      ])

      const nowStr = new Date().toISOString()
      const mockUuid = '00000000-0000-0000-0000-000000000000'
      const response = await fetch('http://localhost:3010/agent/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: {
            id: mockUuid,
            tenantId: mockUuid,
            userId: mockUuid,
            loanCaseId: mockUuid,
            isAgentActive: true,
            channel: 'whatsapp',
            summaryState: {
              sessionIntent: 'recovery',
              userObjections: [],
              stageContext: user.status.toLowerCase(),
              persuasionPath: 'default',
              commitments: [],
              nextAction: 'continue',
              preferredLanguage: 'hinglish'
            },
            compactFacts: {
              mobile_number: user.mobile,
              user_name: user.name,
              application_created_at: user.applicationCreatedAt,
              application_updated_at: user.applicationUpdatedAt ?? user.applicationCreatedAt,
              loan_amount: user.loanAmount,
              ...(user.metadata as Record<string, unknown>)
            },
            messageCount: messages.length + 1,
            tokenEstimate: 0,
            createdAt: nowStr,
            updatedAt: nowStr
          },
          lastInboundMessage: {
            id: mockUuid,
            sessionId: mockUuid,
            channel: 'whatsapp',
            direction: 'inbound',
            body: text,
            createdAt: nowStr
          },
          chatHistory: messages.slice(-10).map(m => ({
            id: mockUuid,
            sessionId: mockUuid,
            channel: 'whatsapp',
            direction: m.direction || 'inbound',
            body: m.body || '',
            createdAt: m.createdAt || nowStr
          })),
          trigger: 'inbound_reply'
        })
      })

      if (!response.ok) throw new Error('Agent failed')
      const data = await response.json()

      await sendMessageToApi(data.body, 'outbound')
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sessionId: 'sim',
          channel: 'sandbox',
          direction: 'outbound',
          body: data.body,
          createdAt: new Date().toISOString()
        }
      ])
      setSandboxStatus('✅ Agent Replied (Simulator)')
    } catch (err: unknown) {
      setSandboxStatus(`❌ Agent Error: ${(err as Error).message}`)
    } finally {
      setIsSending(false)
      setTimeout(() => setSandboxStatus(''), 5000)
    }
  }

  return {
    inputMessage,
    setInputMessage,
    isSending,
    sandboxStatus,
    handleSimulateMessage
  }
}
