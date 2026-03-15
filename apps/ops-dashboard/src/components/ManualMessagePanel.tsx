import { LayoutPanelTop, MessageCircle, Send, Smartphone } from 'lucide-react'
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
    <div className="flex flex-col gap-4 rounded-xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold tracking-tight">Chat as Neha (Agent)</h3>
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
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={useWhatsapp} 
                  onChange={e => onToggleWhatsapp(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-4 w-7 rounded-full bg-muted transition-colors peer-checked:bg-green-500" />
                <div className="absolute left-0.5 h-3 w-3 rounded-full bg-white transition-transform peer-checked:translate-x-3" />
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                <Smartphone className="h-3 w-3" />
                Real WhatsApp
              </div>
            </label>
          )}
        </div>
      </div>

      {status && (
        <div className={`text-[11px] font-medium px-2 py-1 rounded ${
          status.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {status}
        </div>
      )}

      <MessageInput
        message={message}
        onChange={onChange}
        onSend={onSend}
        disabled={isSending}
        placeholder="Type message as Neha..."
      />
    </div>
  )
}
