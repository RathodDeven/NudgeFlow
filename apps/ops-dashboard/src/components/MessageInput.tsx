import type { FormEvent } from 'react'

interface MessageInputProps {
  message: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  message,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type a message...'
}: MessageInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled) return
    onSend()
  }

  return (
    <form onSubmit={handleSubmit} className="row gap-sm">
      <input
        type="text"
        value={message}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1 }}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !message.trim()}>
        Send
      </button>
    </form>
  )
}
