import { MessageInput } from './MessageInput'

export type ManualMessagePanelProps = {
  isSandbox: boolean
  useWhatsapp: boolean
  onToggleWhatsapp: (next: boolean) => void
  onInsertTemplate: () => void
  status: string
  isSending: boolean
  message: string
  onChange: (value: string) => void
  onSend: () => void
}

export const ManualMessagePanel = ({
  isSandbox,
  useWhatsapp,
  onToggleWhatsapp,
  onInsertTemplate,
  status,
  isSending,
  message,
  onChange,
  onSend
}: ManualMessagePanelProps) => {
  return (
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
          onClick={onInsertTemplate}
          style={{ fontSize: '0.8rem', padding: '4px 8px' }}
          disabled={isSending}
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
            <input type="checkbox" checked={useWhatsapp} onChange={e => onToggleWhatsapp(e.target.checked)} />
            Test with Real WhatsApp API
          </label>
        )}
      </div>
      {status && (
        <p
          style={{
            fontSize: '0.85rem',
            marginBottom: '0.5rem',
            color: status.includes('❌') ? 'red' : 'green'
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
        placeholder="Type message as Neha (Agent)..."
      />
    </div>
  )
}
