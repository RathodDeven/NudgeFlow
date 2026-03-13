import { MessageInput } from './MessageInput'

export type SandboxPanelProps = {
  userName: string
  status: string
  isSending: boolean
  message: string
  onChange: (value: string) => void
  onSend: () => void
}

export const SandboxPanel = ({
  userName,
  status,
  isSending,
  message,
  onChange,
  onSend
}: SandboxPanelProps) => {
  return (
    <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginTop: 0 }}>🧪 Sandbox Simulator</h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        Interact as the <strong>USER</strong> directly to test agent behavior.
      </p>

      <div style={{ marginTop: 'auto' }}>
        {status && (
          <p
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: status.startsWith('✅') ? '#dcf8c6' : '#fee2e2',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {status}
          </p>
        )}
        <MessageInput
          message={message}
          onChange={onChange}
          onSend={onSend}
          disabled={isSending}
          placeholder={`Type as ${userName}...`}
        />
      </div>
    </div>
  )
}
