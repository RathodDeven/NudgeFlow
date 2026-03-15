import type { DbChatMessage } from '../types'
import { ChatBubble } from './ChatBubble'
import { MessageSquare, Bot } from 'lucide-react'
import { cn } from "@/lib/utils"

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
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Conversation History</h3>
        </div>
        
        <button
          type="button"
          onClick={onToggleAgent}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all border",
            isAgentActive 
              ? "bg-green-50 text-green-700 border-green-200" 
              : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
          )}
        >
          <Bot className={cn("h-3.5 w-3.5", isAgentActive ? "animate-pulse" : "")} />
          {isAgentActive ? "AI Agent Active" : "AI Agent Paused"}
        </button>
      </div>

      <div className="flex-1 min-h-[400px] overflow-y-auto rounded-xl border bg-muted/30 p-4 shadow-inner flex flex-col gap-4">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground animate-pulse">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground italic">No message history found.</p>
          </div>
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
          <div className="self-start bg-background p-3 rounded-2xl rounded-tl-none border shadow-sm max-w-[80%]">
            <p className="text-xs text-muted-foreground animate-pulse leading-none flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </span>
              User is typing...
            </p>
          </div>
        )}
      </div>

      {manualPanel}
    </div>
  )
}
