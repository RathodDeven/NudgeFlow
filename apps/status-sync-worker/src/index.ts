import { loadEnv } from '@nudges/config'
import { loanStageSchema } from '@nudges/domain'
import Fastify from 'fastify'

const env = loadEnv()
const app = Fastify({ logger: true, disableRequestLogging: true })

app.get('/health', async () => ({ ok: true, service: 'status-sync-worker' }))

app.post('/status-sync/poll', async (request, reply) => {
  const body = request.body as {
    partnerCaseId: string
    previousStage: string
  }

  const response = await fetch(`${env.LENDER_STATUS_API_BASE_URL}/cases/${body.partnerCaseId}/status`, {
    headers: {
      Authorization: `Bearer ${env.LENDER_STATUS_API_KEY ?? ''}`
    }
  }).catch(() => undefined)

  let polledStage = body.previousStage

  if (response?.ok) {
    const payload = (await response.json()) as { stage?: string }
    polledStage = payload.stage ?? body.previousStage
  }

  const parsedStage = loanStageSchema.parse(polledStage)
  const previous = loanStageSchema.parse(body.previousStage)

  return reply.send({
    partnerCaseId: body.partnerCaseId,
    previousStage: previous,
    polledStage: parsedStage,
    progressed: parsedStage !== previous,
    polledAt: new Date().toISOString()
  })
})

app
  .listen({ host: '0.0.0.0', port: 3030 })
  .then(() => app.log.info('status-sync-worker listening on 3030'))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
