import type { SendMessageRequest } from '@nudges/domain'

export type GupshupClientConfig = {
  apiKey: string
  appName: string
  baseUrl: string
  source?: string // Actual phone number
}

export const sendWhatsAppMessage = async (
  config: GupshupClientConfig,
  request: SendMessageRequest
): Promise<{ providerMessageId: string; status: string }> => {
  const cleanSource = (config.source || config.appName).replace(/^\+/, '')
  const cleanDestination = request.toPhoneE164.replace(/^\+/, '')

  const isTemplate = !!request.templateName
  const endpoint = isTemplate ? `${config.baseUrl}/wa/api/v1/template/msg` : `${config.baseUrl}/wa/api/v1/msg`

  const bodyParams = new URLSearchParams({
    channel: 'whatsapp',
    source: cleanSource,
    destination: cleanDestination,
    'src.name': config.appName
  })

  if (isTemplate) {
    bodyParams.append(
      'template',
      JSON.stringify({
        id: request.templateName,
        params: request.templateParams ?? (request.variables ? Object.values(request.variables) : [])
      })
    )
  } else if (request.whatsappPayload?.type === 'cta_url') {
    bodyParams.append(
      'message',
      JSON.stringify({
        type: 'cta_url',
        body: request.whatsappPayload.body,
        display_text: request.whatsappPayload.display_text,
        url: request.whatsappPayload.url,
        footer: request.whatsappPayload.footer
      })
    )
  } else if (request.whatsappPayload?.type === 'quick_reply') {
    bodyParams.append(
      'message',
      JSON.stringify({
        type: 'quick_reply',
        content: {
          type: 'text',
          text: request.whatsappPayload.body,
          caption: request.whatsappPayload.footer,
          header: request.whatsappPayload.header
        },
        options: (request.whatsappPayload.quickReplies ?? []).map(qr => ({
          title: qr.title,
          postbackText: qr.postbackText ?? qr.title
        }))
      })
    )
  } else {
    bodyParams.append(
      'message',
      JSON.stringify({
        type: 'text',
        text: request.body || request.whatsappPayload?.body || ''
      })
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: config.apiKey
    },
    body: bodyParams
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gupshup send failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as { messageId?: string; status?: string }
  return {
    providerMessageId: data.messageId ?? crypto.randomUUID(),
    status: data.status ?? 'submitted'
  }
}

export const markMessageAsRead = async (config: GupshupClientConfig, messageId: string): Promise<boolean> => {
  const response = await fetch(`${config.baseUrl}/wa/api/v1/msg/${config.appName}/read/${messageId}`, {
    method: 'PUT',
    headers: {
      apikey: config.apiKey
    }
  })

  return response.ok
}

export const sendTypingIndicator = async (
  config: GupshupClientConfig,
  messageId: string
): Promise<boolean> => {
  // Gupshup allows sending typing indicator via a similar PUT endpoint
  const response = await fetch(`${config.baseUrl}/wa/api/v1/msg/${config.appName}/typing/${messageId}`, {
    method: 'PUT',
    headers: {
      apikey: config.apiKey
    }
  })

  return response.ok
}

export type InboundWebhook = {
  app: string
  timestamp: number
  version: number
  type: string
  payload: {
    id: string
    source: string
    type: string
    payload?: {
      text?: string
      type?: string
      postbackText?: string
    }
    sender: {
      phone: string
      name?: string
    }
    text?: string
  }
}

export const parseInboundWebhook = (
  input: InboundWebhook
): { phone: string; text: string; providerMessageId?: string } => {
  const text = input.payload.text ?? input.payload.payload?.text ?? ''
  return {
    phone: input.payload.sender.phone,
    text,
    providerMessageId: input.payload.id
  }
}
