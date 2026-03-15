import { Send } from 'lucide-react'
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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 w-10 shrink-0 transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-sm"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}
