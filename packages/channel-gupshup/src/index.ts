import type { SendMessageRequest } from '@nudges/domain'

export type GupshupClientConfig = {
  apiKey: string
  appName: string
  baseUrl: string
}

export const toTemplatePayload = (request: SendMessageRequest) => ({
  channel: 'whatsapp',
  source: 'NudgeFlow',
  destination: request.toPhoneE164,
  message: {
    type: 'text',
    text: request.body
  },
  src: 'nudgeflow-mvp'
})

export const sendWhatsAppMessage = async (
  config: GupshupClientConfig,
  request: SendMessageRequest
): Promise<{ providerMessageId: string; status: string }> => {
  const payload = toTemplatePayload(request)
  const response = await fetch(`${config.baseUrl}/sm/api/v1/msg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: config.apiKey
    },
    body: new URLSearchParams({
      channel: 'whatsapp',
      source: config.appName,
      destination: request.toPhoneE164,
      message: JSON.stringify(payload.message)
    })
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

export type InboundWebhook = {
  app: string
  source: string
  type: string
  payload: {
    sender: {
      phone: string
    }
    text?: string
    id?: string
  }
}

export const parseInboundWebhook = (
  input: InboundWebhook
): { phone: string; text: string; providerMessageId?: string } => ({
  phone: input.payload.sender.phone,
  text: input.payload.text ?? '',
  providerMessageId: input.payload.id
})
