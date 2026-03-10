import { type FormEvent, useState } from 'react'
import type { ChatMessage, CsvUser } from '../types'
import { UserPicker } from './UserPicker'

const SANDBOX_WHATSAPP_NUMBER = '9484812168'

type WhatsAppButtonMessage = {
  text: string
  buttonLabel?: string
  buttonUrl?: string
}

const parseWhatsAppMessage = (text: string): WhatsAppButtonMessage => {
  const buttonMatch = text.match(/🔗 (.+?): (https?:\/\/\S+)/)
  if (buttonMatch) {
    const [, buttonLabel, buttonUrl] = buttonMatch
    const body = text.split('\n\n🔗')[0].trim()
    return { text: body, buttonLabel, buttonUrl }
  }
  return { text }
}

export function SimulatorTab() {
  const [simMessage, setSimMessage] = useState<string>('')
  const [simHistory, setSimHistory] = useState<ChatMessage[]>([])
  const [simUserStage, setSimUserStage] = useState<string>('fresh_loan')
  const [simMobile, setSimMobile] = useState<string>(SANDBOX_WHATSAPP_NUMBER)
  const [simUserName, setSimUserName] = useState<string>('Sandbox User')
  const [simIsLoading, setSimIsLoading] = useState<boolean>(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState<boolean>(false)
  const [whatsAppStatus, setWhatsAppStatus] = useState<string>('')

  const handleUserSelect = (user: CsvUser) => {
    setSelectedUserId(user.id)
    setSimMobile(user.mobile)
    setSimUserName(user.name)
    setSimUserStage(user.status.toLowerCase())
  }

  const sendToWhatsApp = async (body: string) => {
    try {
      const response = await fetch('http://localhost:3040/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          toPhoneE164: `91${SANDBOX_WHATSAPP_NUMBER}`,
          body
        })
      })
      if (!response.ok) throw new Error(`WhatsApp send failed: ${response.status}`)
      const data = await response.json()
      setWhatsAppStatus(`✅ Sent via WhatsApp (${data.status ?? 'submitted'})`)
    } catch (err) {
      setWhatsAppStatus(`❌ WhatsApp send failed: ${(err as Error).message}`)
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

  const simulateProactiveNudge = async () => {
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
          trigger: 'scheduled_followup'
        })
      })
      if (!response.ok) throw new Error('Failed to reach agent-runtime')
      const data = await response.json()
      setSimHistory(prev => [...prev, { role: 'agent', text: `[Proactive Nudge]\n${data.body}` }])

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

  return (
    <section className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2>🧪 Sandbox Simulator</h2>
      <p className="muted">
        Test agent responses and send real WhatsApp messages to your test number ({SANDBOX_WHATSAPP_NUMBER}).
      </p>

      <UserPicker onSelect={handleUserSelect} selectedUserId={selectedUserId} />

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

        <div
          style={{
            width: '1px',
            height: '24px',
            background: '#ccc'
          }}
        />

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
        <button type="button" className="secondary" onClick={simulateProactiveNudge} disabled={simIsLoading}>
          🔔 Trigger Proactive Nudge
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
        {simHistory.map((msg, i) => {
          const parsed = msg.role === 'agent' ? parseWhatsAppMessage(msg.text) : null
          return (
            <div
              key={`${msg.role}-${i}`}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              {msg.role === 'agent' && parsed ? (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,.15)',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '10px 14px' }}>
                    <strong
                      style={{ fontSize: '0.75rem', color: '#128C7E', display: 'block', marginBottom: '4px' }}
                    >
                      Neha
                    </strong>
                    <span style={{ whiteSpace: 'pre-wrap', color: '#111' }}>{parsed.text}</span>
                  </div>
                  {parsed.buttonLabel && parsed.buttonUrl ? (
                    <a
                      href={parsed.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '10px',
                        borderTop: '1px solid #e0e0e0',
                        color: '#128C7E',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem'
                      }}
                    >
                      🔗 {parsed.buttonLabel}
                    </a>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{
                    background: msg.role === 'user' ? '#dcf8c6' : '#ffebee',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,.1)'
                  }}
                >
                  <strong
                    style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '4px' }}
                  >
                    {msg.role === 'user' ? `You (${simUserName})` : 'System'}
                  </strong>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                </div>
              )}
            </div>
          )
        })}
        {simIsLoading && (
          <div
            style={{ alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '8px' }}
          >
            <span className="muted">Neha is typing...</span>
          </div>
        )}
      </div>

      <form onSubmit={sendSimMessage} className="row gap-sm">
        <input
          type="text"
          value={simMessage}
          onChange={e => setSimMessage(e.target.value)}
          placeholder={`Type a message as ${simUserName}...`}
          style={{ flex: 1 }}
          disabled={simIsLoading}
        />
        <button type="submit" disabled={simIsLoading || !simMessage.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}
