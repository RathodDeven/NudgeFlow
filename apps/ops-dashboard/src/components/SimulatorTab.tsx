import { type FormEvent, useState } from 'react'
import type { ChatMessage, CsvUser } from '../types'
import { UserPicker } from './UserPicker'

interface SimulatorTabProps {
  users: CsvUser[]
}

const SANDBOX_WHATSAPP_NUMBER = '9484812168'

import { ChatBubble } from './ChatBubble'
import { MessageInput } from './MessageInput'

// Using the generated premium loan offer image
const LOAN_TEMPLATE_IMAGE = 'https://raw.githubusercontent.com/NudgeFlow/assets/main/promo.png'

export function SimulatorTab({ users }: SimulatorTabProps) {
  const [simMessage, setSimMessage] = useState<string>('')
  const [simHistory, setSimHistory] = useState<ChatMessage[]>([])
  const [simUserStage, setSimUserStage] = useState<string>('fresh_loan')
  const [simMobile, setSimMobile] = useState<string>(SANDBOX_WHATSAPP_NUMBER)
  const [simUserName, setSimUserName] = useState<string>('Sandbox User')
  const [simIsLoading, setSimIsLoading] = useState<boolean>(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState<boolean>(false)
  const [useRealApi, setUseRealApi] = useState<boolean>(false)
  const [whatsAppStatus, setWhatsAppStatus] = useState<string>('')

  const getHindiTemplate = (user: { name: string; loanAmount: number; status: string }) => {
    const pendingStep = user.status === 'fresh_loan' ? 'Bank Statement' : 'Document'
    return `Namaste ${user.name}! 🙏

Aapka ₹${user.loanAmount.toLocaleString('en-IN')} ka business loan offer expire hone wala hai. ⏳

Sirf 1 aakhri step bacha hai: Please upload your ${pendingStep}.

Aapne pehle hi process start kar diya hai, ise miss mat kijiye. Ye funds aapke business growth ke liye block kiye gaye hain.

Neeche diye button par click karein aur 2 minute mein process poora karein. 👇

🖼️ Image: ${LOAN_TEMPLATE_IMAGE}
🔗 Upload Documents: https://nudgeflow.io/upload`
  }

  const handleUserSelect = (user: CsvUser) => {
    setSelectedUserId(user.id)
    setSimMobile(user.mobile)
    setSimUserName(user.name)
    setSimUserStage(user.status.toLowerCase())
  }

  const sendToWhatsApp = async (body: string, toPhone?: string) => {
    const targetPhone = toPhone || simMobile
    try {
      const endpoint = useRealApi
        ? 'http://localhost:3000/webhooks/whatsapp/gupshup'
        : 'http://localhost:3040/whatsapp/send'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          toPhoneE164: `91${targetPhone}`,
          body,
          isRealApi: useRealApi
        })
      })
      if (!response.ok)
        throw new Error(`${useRealApi ? 'WhatsApp API' : 'Sandbox'} send failed: ${response.status}`)
      const data = await response.json()
      setWhatsAppStatus(
        `✅ Sent via ${useRealApi ? 'WhatsApp API' : 'Sandbox'} (${data.status ?? 'submitted'})`
      )
    } catch (err) {
      setWhatsAppStatus(`❌ Send failed: ${(err as Error).message}`)
    }
    setTimeout(() => setWhatsAppStatus(''), 5000)
  }

  const sendSimMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!simMessage.trim()) return

    const userText = simMessage
    setSimMessage('')
    setSimHistory(prev => [...prev, { role: 'user', text: userText }])
    setSimIsLoading(true)

    try {
      const response = await fetch('http://localhost:3010/agent/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: {
            tenantId: 'sim_tenant',
            sessionId: 'sim_session_123',
            userProfileId: selectedUserId ?? 'sim_user',
            contactIdentifier: simMobile,
            summaryState: { stageContext: simUserStage, preferredLanguage: 'hinglish' },
            compactFacts: {
              mobile_number: simMobile,
              user_name: simUserName
            }
          },
          lastInboundMessage: {
            messageId: Date.now().toString(),
            body: userText,
            timestamp: new Date().toISOString()
          },
          trigger: 'inbound_message'
        })
      })

      if (!response.ok) throw new Error('Failed to reach agent-runtime at port 3010')
      const data = await response.json()
      setSimHistory(prev => [...prev, { role: 'agent', text: data.body }])

      if (sendViaWhatsApp) {
        await sendToWhatsApp(data.body)
      }
    } catch (err: unknown) {
      setSimHistory(prev => [...prev, { role: 'system', text: `ERROR: ${(err as Error).message}` }])
    } finally {
      setSimIsLoading(false)
    }
  }

  const sendDirectWhatsApp = async () => {
    if (!simMessage.trim()) return
    const text = simMessage
    setSimMessage('')
    setSimHistory(prev => [...prev, { role: 'user', text: `[Direct WhatsApp] ${text}` }])
    await sendToWhatsApp(text)
  }

  const sendTemplateMessage = async () => {
    const user = users.find(u => u.id === selectedUserId)
    if (!user) {
      alert('Please select a user first')
      return
    }
    const template = getHindiTemplate(user)
    setSimHistory(prev => [...prev, { role: 'agent', text: template }])
    if (sendViaWhatsApp) {
      await sendToWhatsApp(template)
    }
  }

  const sendAllTemplates = async () => {
    if (users.length === 0) return
    if (!confirm(`Send template message to all ${users.length} users?`)) return

    setSimIsLoading(true)
    for (const user of users) {
      const template = getHindiTemplate(user)
      if (user === users[0]) {
        setSimHistory(prev => [
          ...prev,
          { role: 'system', text: `Sending bulk templates to ${users.length} users...` }
        ])
        setSimHistory(prev => [...prev, { role: 'agent', text: template }])
      }

      if (sendViaWhatsApp) {
        await sendToWhatsApp(template, user.mobile)
      }
      await new Promise(r => setTimeout(r, 500))
    }
    setSimIsLoading(false)
    setWhatsAppStatus(`✅ Bulk send complete for ${users.length} users`)
  }

  return (
    <section className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2>🧪 Sandbox Simulator</h2>
      <p className="muted">
        Test agent responses and send real WhatsApp messages to your test number ({SANDBOX_WHATSAPP_NUMBER}).
      </p>

      <UserPicker users={users} onSelect={handleUserSelect} selectedUserId={selectedUserId} />

      <div
        style={{
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Stage:
          <select value={simUserStage} onChange={e => setSimUserStage(e.target.value)}>
            <option value="login">login</option>
            <option value="fresh_loan">fresh_loan</option>
            <option value="document_upload">document_upload</option>
            <option value="loan_detail_submitted">loan_detail_submitted</option>
            <option value="under_review">under_review</option>
            <option value="credit_decisioning">credit_decisioning</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Mobile:
          <input
            type="text"
            value={simMobile}
            onChange={e => setSimMobile(e.target.value)}
            style={{ width: '130px' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          Name:
          <input
            type="text"
            value={simUserName}
            onChange={e => setSimUserName(e.target.value)}
            style={{ width: '150px' }}
          />
        </label>

        <div style={{ width: '1px', height: '24px', background: '#ccc' }} />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: sendViaWhatsApp ? '#dcf8c6' : 'transparent',
            padding: '4px 8px',
            borderRadius: '6px',
            border: sendViaWhatsApp ? '1px solid #25d366' : '1px solid #ccc'
          }}
        >
          <input
            type="checkbox"
            checked={sendViaWhatsApp}
            onChange={e => setSendViaWhatsApp(e.target.checked)}
          />
          📱 Send via WhatsApp ({SANDBOX_WHATSAPP_NUMBER})
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: useRealApi ? '#e0f2fe' : 'transparent',
            padding: '4px 8px',
            borderRadius: '6px',
            border: useRealApi ? '1px solid #0ea5e9' : '1px solid #ccc'
          }}
        >
          <input type="checkbox" checked={useRealApi} onChange={e => setUseRealApi(e.target.checked)} />🚀 Use
          WhatsApp API
        </label>
      </div>

      {whatsAppStatus && (
        <p
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: whatsAppStatus.startsWith('✅') ? '#dcf8c6' : '#fee2e2',
            fontSize: '0.85rem',
            marginBottom: '0.5rem'
          }}
        >
          {whatsAppStatus}
        </p>
      )}

      <div className="row gap-sm" style={{ marginBottom: '0.75rem' }}>
        <button type="button" onClick={sendTemplateMessage} disabled={simIsLoading || !selectedUserId}>
          📝 Send Hindi Template
        </button>
        <button
          type="button"
          className="secondary"
          onClick={sendAllTemplates}
          disabled={simIsLoading || users.length === 0}
        >
          📢 Send To All
        </button>
        <button
          type="button"
          className="secondary"
          onClick={sendDirectWhatsApp}
          disabled={!simMessage.trim()}
        >
          📱 Send Direct WhatsApp
        </button>
        <button type="button" className="secondary" onClick={() => setSimHistory([])}>
          Clear Chat
        </button>
      </div>

      <div
        style={{
          height: '400px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#ece5dd'
        }}
      >
        {simHistory.length === 0 ? (
          <p
            className="muted"
            style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', color: '#888' }}
          >
            No messages yet. Select a user, trigger a nudge, or type below.
          </p>
        ) : null}
        {simHistory.map((msg, i) => (
          <ChatBubble key={`${msg.role}-${i}`} msg={msg} userName={simUserName} />
        ))}
        {simIsLoading && (
          <div
            style={{ alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '8px' }}
          >
            <span className="muted">Neha is typing...</span>
          </div>
        )}
      </div>

      <MessageInput
        message={simMessage}
        onChange={setSimMessage}
        onSend={() => sendSimMessage(new Event('submit') as unknown as FormEvent)}
        disabled={simIsLoading}
        placeholder={`Type a message as ${simUserName}...`}
      />
    </section>
  )
}
