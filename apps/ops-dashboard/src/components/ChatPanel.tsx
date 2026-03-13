import type { DbChatMessage } from '../types'
import { ChatBubble } from './ChatBubble'

export type ChatPanelProps = {
  isLoading: boolean
  isSending: boolean
  isAgentActive: boolean
  messages: DbChatMessage[]
  userName: string
  onToggleAgent: () => void
  manualPanel: React.ReactNode
}

export const ChatPanel = ({
  isLoading,
  isSending,
  isAgentActive,
  messages,
  userName,
  onToggleAgent,
  manualPanel
}: ChatPanelProps) => {
  return (
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
          <input type="checkbox" checked={isAgentActive} onChange={onToggleAgent} />
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
              userName={userName}
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
      {manualPanel}
    </div>
  )
}
