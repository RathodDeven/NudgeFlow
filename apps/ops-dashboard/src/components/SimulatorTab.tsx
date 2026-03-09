import { type FormEvent, useState } from 'react'
import type { ChatMessage } from '../types'

type WhatsAppButtonMessage = {
  text: string
  buttonLabel?: string
  buttonUrl?: string
}

const parseWhatsAppMessage = (text: string): WhatsAppButtonMessage => {
  // Parse formatted plainText from agent-runtime
  // The format is: <body>\n\n🔗 <label>: <url>\n\n_<footer>_
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
  const [simMobile, setSimMobile] = useState<string>('9876543210')
  const [simIsLoading, setSimIsLoading] = useState<boolean>(false)

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
            userProfileId: 'sim_user',
            contactIdentifier: simMobile,
            summaryState: { stageContext: simUserStage, preferredLanguage: 'hinglish' },
            compactFacts: {
              mobile_number: simMobile,
              user_name: 'Sandbox User'
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
            userProfileId: 'sim_user',
            contactIdentifier: simMobile,
            summaryState: { stageContext: simUserStage, preferredLanguage: 'hinglish' },
            compactFacts: {
              mobile_number: simMobile,
              user_name: 'Sandbox User'
            }
          },
          trigger: 'scheduled_followup'
        })
      })
      if (!response.ok) throw new Error('Failed to reach agent-runtime')
      const data = await response.json()
      setSimHistory(prev => [...prev, { role: 'agent', text: `[Proactive Nudge]\n${data.body}` }])
    } catch (err: unknown) {
      setSimHistory(prev => [...prev, { role: 'system', text: `ERROR: ${(err as Error).message}` }])
    } finally {
      setSimIsLoading(false)
    }
  }

  return (
    <section className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Sandbox Chat Simulator</h2>
      <p className="muted">
        Test agent responses exactly as a WhatsApp user would see them — including deep link buttons.
      </p>

      <div
        className="row gap-sm"
        style={{
          marginBottom: '1rem',
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <label>
          Stage:
          <select
            value={simUserStage}
            onChange={e => setSimUserStage(e.target.value)}
            style={{ marginLeft: '8px' }}
          >
            <option value="login">login</option>
            <option value="fresh_loan">fresh_loan</option>
            <option value="document_upload">document_upload</option>
            <option value="loan_detail_submitted">loan_detail_submitted</option>
            <option value="under_review">under_review</option>
            <option value="credit_decisioning">credit_decisioning</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Mobile:
          <input
            type="text"
            value={simMobile}
            onChange={e => setSimMobile(e.target.value)}
            style={{ width: '140px', marginLeft: '4px' }}
            placeholder="User phone number"
          />
        </label>
        <button type="button" className="secondary" onClick={simulateProactiveNudge} disabled={simIsLoading}>
          Trigger Proactive Nudge
        </button>
        <button type="button" className="secondary" onClick={() => setSimHistory([])}>
          Clear Chat
        </button>
      </div>

      <div
        style={{
          height: '440px',
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
            No messages yet. Trigger a nudge or type below.
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
                    {msg.role === 'user' ? 'You' : 'System'}
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
          placeholder="Type a message as the user..."
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
