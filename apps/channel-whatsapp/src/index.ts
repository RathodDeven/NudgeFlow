import { parseInboundWebhook, sendWhatsAppMessage } from '@nudges/channel-gupshup'
import { loadEnv } from '@nudges/config'
import { sendMessageRequestSchema } from '@nudges/domain'
import Fastify from 'fastify'

const env = loadEnv()
const app = Fastify({ logger: true })

app.get('/health', async () => ({ ok: true, service: 'channel-whatsapp' }))

app.post('/webhooks/whatsapp/gupshup', async request => {
  const parsed = parseInboundWebhook(request.body as never)
  return { ok: true, parsed }
})

app.post('/whatsapp/send', async (request, reply) => {
  const payload = sendMessageRequestSchema.safeParse(request.body)
  if (!payload.success) {
    return reply.status(400).send({ error: payload.error.flatten() })
  }

  if (!env.GUPSHUP_API_KEY || !env.GUPSHUP_APP_NAME) {
    return reply.send({
      status: 'mock_sent',
      providerMessageId: crypto.randomUUID()
    })
  }

  const response = await sendWhatsAppMessage(
    {
      apiKey: env.GUPSHUP_API_KEY,
      appName: env.GUPSHUP_APP_NAME,
      baseUrl: env.GUPSHUP_BASE_URL
    },
    payload.data
  )

  return reply.send(response)
})

app
  .listen({ host: '0.0.0.0', port: 3040 })
  .then(() => app.log.info('channel-whatsapp listening on 3040'))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
