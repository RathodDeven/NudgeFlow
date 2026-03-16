import { FlaskConical } from 'lucide-react'
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
    <div className="flex flex-col gap-4 rounded-xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-purple-500" />
        <h3 className="text-sm font-semibold tracking-tight">Simulator (Control Console)</h3>
      </div>

      <p className="text-[11px] text-muted-foreground leading-tight">
        Interact as the <strong className="text-foreground font-bold">USER ({userName})</strong> to test agent
        behavior.
      </p>

      <div className="mt-auto space-y-3">
        {status && (
          <div
            className={`text-[11px] font-medium px-2 py-1.5 rounded ${
              status.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {status}
          </div>
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
