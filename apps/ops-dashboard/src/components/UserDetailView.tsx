import { useEffect, useState } from 'react'
import { authFetch } from '../api/client'
import type { CsvUser, DbChatMessage, PendingHITLTask } from '../types'
import { ChatBubble } from './ChatBubble'
import { MessageInput } from './MessageInput'

interface UserDetailViewProps {
  user: CsvUser
  token: string
  onClose: () => void
  onStatusChange: (userId: string, newStatus: string) => void
  pendingTasks: PendingHITLTask[]
  onApprove: (taskId: string) => void
  onReject: (taskId: string) => void
}

export function UserDetailView({
  user,
  token,
  onClose,
  onStatusChange,
  pendingTasks,
  onApprove,
  onReject
}: UserDetailViewProps) {
  const isSandbox = import.meta.env.VITE_ENABLE_SANDBOX === 'true'
  const [messages, setMessages] = useState<DbChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sandboxStatus, setSandboxStatus] = useState('')
  const [isAgentActive, setIsAgentActive] = useState(true)
  const [useWhatsapp, setUseWhatsapp] = useState(false)

  const [agentInputMessage, setAgentInputMessage] = useState('')
  const [isManualSending, setIsManualSending] = useState(false)
  const [manualStatus, setManualStatus] = useState('')

  const userTasks = pendingTasks.filter(
    t => t.externalUserId === user.customerId || t.externalUserId === user.id
  )

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

    // Load Agent Status
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

    return () => {
      mounted = false
    }
  }, [user.id, token])

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    try {
      await authFetch(`/users/${user.id}/stage`, token, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStatus })
      })
      onStatusChange(user.id, newStatus)
    } catch (err) {
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
      // Revert on failure
      setIsAgentActive(!newState)
      alert('Failed to update agent status')
    }
  }

  const sendMessageToApi = async (body: string, direction: 'inbound' | 'outbound' | 'system') => {
    await authFetch(`/users/${user.id}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ direction, body, channel: 'whatsapp' })
    })
  }

  const handleSimulateMessage = async () => {
    if (!inputMessage.trim()) return

    const text = inputMessage
    setInputMessage('')
    setIsSending(true)

    console.log('[dashboard] Simulating message for user:', user)
    console.log('[dashboard] application_created_at:', user.applicationCreatedAt)

    try {
      // 1. Save user message
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

      // 2. Call agent runtime
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

      // Simulate response from Runtime
      if (!response.ok) throw new Error('Agent failed')
      const data = await response.json()

      // 3. Save agent reply
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

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div
        className="row"
        style={{
          borderBottom: '1px solid #eee',
          paddingBottom: '1rem',
          marginBottom: '1rem',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" className="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>
            ← Back
          </button>
          <h2 style={{ margin: 0 }}>{user.name}</h2>
          <span className="badge info">{user.status}</span>
        </div>
        <div className="row gap-sm" style={{ alignItems: 'center' }}>
          <label htmlFor="status-override" className="muted" style={{ fontSize: '0.85rem' }}>
            Override Status:
          </label>
          <select
            id="status-override"
            value={user.status.toLowerCase()}
            onChange={handleStatusChange}
            style={{ padding: '4px 8px', fontSize: '0.9rem' }}
          >
            <option value="journey_started">Journey Started</option>
            <option value="offer">Offer</option>
            <option value="fresh_loan">Fresh Loan</option>
            <option value="document_upload">Document Upload</option>
            <option value="loan_detail_submitted">Loan Detail Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="credit_decisioning">Credit Decisioning</option>
            <option value="approved">Approved</option>
            <option value="disbursal">Disbursal</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f8fafc',
          borderRadius: '8px'
        }}
      >
        <div>
          <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
            Mobile
          </p>
          <p style={{ margin: 0 }}>
            <strong>{user.mobile}</strong>
          </p>
        </div>
        <div>
          <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
            Customer ID
          </p>
          <p style={{ margin: 0 }}>
            <code>{user.customerId}</code>
          </p>
        </div>
        <div>
          <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
            Loan Amount
          </p>
          <p style={{ margin: 0 }}>
            <strong>₹{user.loanAmount.toLocaleString('en-IN')}</strong>
          </p>
        </div>
        {user.firmName && (
          <div>
            <p className="muted" style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}>
              Firm Name
            </p>
            <p style={{ margin: 0 }}>
              <strong>{user.firmName}</strong>
            </p>
          </div>
        )}
      </div>

      {userTasks.length > 0 && (
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px'
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#b45309' }}>⏸️ AI Pending Approval</h3>
          {userTasks.map(task => (
            <div
              key={task.id}
              style={{
                background: '#fff',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                border: '1px solid #fef3c7'
              }}
            >
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>Message Draft:</strong>
              </p>
              <pre
                style={{
                  margin: '0 0 1rem 0',
                  whiteSpace: 'pre-wrap',
                  background: '#f9f9f9',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}
              >
                {task.messageBody}
              </pre>
              <div className="row gap-sm">
                <button
                  type="button"
                  onClick={() => onApprove(task.id)}
                  style={{ background: '#10b981', color: 'white', border: 'none' }}
                >
                  Approve & Send
                </button>
                <button type="button" onClick={() => onReject(task.id)} className="secondary">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}
          >
            <h3 style={{ margin: 0 }}>💬 Chat as Neha (Agent)</h3>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                background: isAgentActive ? '#dcf8c6' : '#fee2e2',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              <input type="checkbox" checked={isAgentActive} onChange={handleAgentToggle} />
              <strong>AI Auto-Reply Active</strong>
            </label>
          </div>
          <div
            style={{
              height: '400px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: '#ece5dd'
            }}
          >
            {isLoading ? (
              <p className="muted" style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
                Loading messages...
              </p>
            ) : messages.length === 0 ? (
              <p className="muted" style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
                No message history found.
              </p>
            ) : (
              messages.map(msg => (
                <ChatBubble
                  key={msg.id}
                  msg={{
                    role: msg.direction === 'inbound' ? 'user' : 'agent',
                    text: msg.body
                  }}
                  userName={user.name}
                />
              ))
            )}
            {isSending && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#fff',
                  padding: '10px 14px',
                  borderRadius: '8px'
                }}
              >
                <span className="muted">Simulated User is typing...</span>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: '1rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  handleSendManualMessage(
                    `Namaste ${user.name}!\n\nWe saw you dropped off during the ${user.status} step. Do you need any help?`
                  )
                }
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                disabled={isManualSending}
              >
                Insert & Send Template
              </button>
              {isSandbox && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useWhatsapp}
                    onChange={e => setUseWhatsapp(e.target.checked)}
                  />
                  Test with Real WhatsApp API
                </label>
              )}
            </div>
            {manualStatus && (
              <p
                style={{
                  fontSize: '0.85rem',
                  marginBottom: '0.5rem',
                  color: manualStatus.includes('❌') ? 'red' : 'green'
                }}
              >
                {manualStatus}
              </p>
            )}
            <MessageInput
              message={agentInputMessage}
              onChange={setAgentInputMessage}
              onSend={() => handleSendManualMessage()}
              disabled={isManualSending}
              placeholder="Type message as Neha (Agent)..."
            />
          </div>
        </div>

        {isSandbox && (
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0 }}>🧪 Sandbox Simulator</h3>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Interact as the <strong>USER</strong> directly to test agent behavior.
            </p>

            <div style={{ marginTop: 'auto' }}>
              {sandboxStatus && (
                <p
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: sandboxStatus.startsWith('✅') ? '#dcf8c6' : '#fee2e2',
                    fontSize: '0.85rem',
                    marginBottom: '1rem'
                  }}
                >
                  {sandboxStatus}
                </p>
              )}
              <MessageInput
                message={inputMessage}
                onChange={setInputMessage}
                onSend={handleSimulateMessage}
                disabled={isSending}
                placeholder={`Type as ${user.name}...`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
