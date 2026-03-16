import { cn } from '@/lib/utils'
import { Bot, ExternalLink, User } from 'lucide-react'
import type { ChatMessage } from '../types'

type WhatsAppButtonMessage = {
  text: string
  buttonLabel?: string
  buttonUrl?: string
  imageUrl?: string
}

export const parseWhatsAppMessage = (text: string): WhatsAppButtonMessage => {
  const buttonMatch = text.match(/🔗 (.+?): (https?:\/\/\S+)/)
  const imageMatch = text.match(/🖼️ Image: (https?:\/\/\S+)/)

  let body = text
  let buttonLabel: string | undefined
  let buttonUrl: string | undefined
  let imageUrl: string | undefined

  if (buttonMatch) {
    buttonLabel = buttonMatch[1]
    buttonUrl = buttonMatch[2]
    body = body.split('\n\n🔗')[0].trim()
  }

  if (imageMatch) {
    imageUrl = imageMatch[1]
    body = body.replace(/🖼️ Image: \S+/, '').trim()
  }

  return { text: body, buttonLabel, buttonUrl, imageUrl }
}

interface ChatBubbleProps {
  msg: ChatMessage
  userName: string
}

export function ChatBubble({ msg, userName }: ChatBubbleProps) {
  const isUser = msg.role === 'user'
  const isAgent = msg.role === 'agent'
  const parsed = isAgent ? parseWhatsAppMessage(msg.text) : null

  return (
    <div
      className={cn('flex flex-col max-w-[85%]', isUser ? 'self-end items-end' : 'self-start items-start')}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
        <span>{isUser ? userName : isAgent ? 'Neha' : 'System'}</span>
      </div>

      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 shadow-sm text-sm overflow-hidden',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-background border rounded-tl-none'
        )}
      >
        {isAgent && parsed?.imageUrl && (
          <div className="mb-3 -mx-4 -mt-2.5 overflow-hidden">
            <img src={parsed.imageUrl} alt="Promo" className="w-full h-auto object-cover max-h-48" />
          </div>
        )}

        <p className="whitespace-pre-wrap leading-relaxed">{parsed ? parsed.text : msg.text}</p>

        {parsed?.buttonLabel && parsed?.buttonUrl && (
          <a
            href={parsed.buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-md border bg-muted/50 hover:bg-muted py-2 text-xs font-semibold transition-colors no-underline text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            {parsed.buttonLabel}
          </a>
        )}
      </div>
    </div>
  )
}
