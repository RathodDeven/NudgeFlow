import type { ChatMessage } from '../types'

import type { ReactNode } from 'react'

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
  const parsed = msg.role === 'agent' ? parseWhatsAppMessage(msg.text) : null

  return (
    <div
      style={{
        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '80%'
      }}
    >
      {msg.role === 'agent' && parsed ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,.15)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '10px 14px' }}>
            <strong
              style={{ fontSize: '0.75rem', color: '#128C7E', display: 'block', marginBottom: '4px' }}
            >
              Neha
            </strong>
            {parsed.imageUrl && (
              <img
                src={parsed.imageUrl}
                alt="Promo"
                style={{ width: '100%', borderRadius: '4px', marginBottom: '8px', display: 'block' }}
              />
            )}
            <span style={{ whiteSpace: 'pre-wrap', color: '#111' }}>{parsed.text}</span>
          </div>
          {parsed.buttonLabel && parsed.buttonUrl ? (
            <a
              href={parsed.buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                borderTop: '1px solid #e0e0e0',
                color: '#128C7E',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              🔗 {parsed.buttonLabel}
            </a>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            background: msg.role === 'user' ? '#dcf8c6' : '#ffebee',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,.1)'
          }}
        >
          <strong
            style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '4px' }}
          >
            {msg.role === 'user' ? `You (${userName})` : 'System'}
          </strong>
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
        </div>
      )}
    </div>
  )
}
