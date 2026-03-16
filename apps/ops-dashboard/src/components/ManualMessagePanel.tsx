import { cn } from '@/lib/utils'
import { Clock, LayoutPanelTop, MessageCircle, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MessageInput } from './MessageInput'

export type ManualMessagePanelProps = {
  isSandbox: boolean
  useWhatsapp: boolean
  onInsertTemplate: () => void
  status: string
  isSending: boolean
  message: string
  onChange: (value: string) => void
  onSend: () => void
  lastInboundAt?: string | null
}

export const ManualMessagePanel = ({
  isSandbox,
  useWhatsapp,
  onInsertTemplate,
  status,
  isSending,
  message,
  onChange,
  onSend,
  lastInboundAt
}: ManualMessagePanelProps) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    if (!lastInboundAt) {
      setTimeLeft('No Session')
      return
    }

    const interval = setInterval(() => {
      const lastAt = new Date(lastInboundAt).getTime()
      const expiry = lastAt + 24 * 60 * 60 * 1000
      const now = Date.now()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        clearInterval(interval)
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m left`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastInboundAt])

  const sessionDisabled = (timeLeft === 'Expired' || timeLeft === 'No Session') && (!isSandbox || useWhatsapp)

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold tracking-tight">Chat as Neha (Agent)</h3>
          </div>
          {timeLeft && timeLeft !== 'No Session' && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full w-fit border',
                timeLeft === 'Expired'
                  ? 'bg-red-50 text-red-600 border-red-100'
                  : 'bg-blue-50 text-blue-600 border-blue-100'
              )}
            >
              <Clock className="h-3 w-3" />
              <span>Session Window: {timeLeft}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onInsertTemplate}
            disabled={isSending}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent text-[11px] font-medium h-7 px-2.5 transition-colors disabled:opacity-50"
          >
            <LayoutPanelTop className="h-3.5 w-3.5" />
            Template
          </button>

          {isSandbox && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Smartphone
                className={cn('h-3 w-3', useWhatsapp ? 'text-green-600' : 'text-muted-foreground')}
              />
              {useWhatsapp ? 'Global WhatsApp API' : 'Simulator Mode'}
            </div>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`text-[11px] font-medium px-2 py-1 rounded ${
            status.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {status}
        </div>
      )}

      {sessionDisabled && (
        <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
          ⚠️ WhatsApp Window closed. You must send a Template to start or resume.
        </div>
      )}

      <MessageInput
        message={message}
        onChange={onChange}
        onSend={onSend}
        disabled={isSending || sessionDisabled}
        placeholder={sessionDisabled ? 'Window closed. Use Template button.' : 'Type message as Neha...'}
      />
    </div>
  )
}
