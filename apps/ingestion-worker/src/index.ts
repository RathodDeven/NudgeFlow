import { canonicalIngestionRowSchema, ingestExcelRequestSchema } from '@nudges/domain'
import Fastify from 'fastify'

const app = Fastify({ logger: true })

type MappingProfile = {
  fields: Record<string, string>
}

const mapRowToCanonical = (row: Record<string, unknown>, mapping: MappingProfile) => {
  const normalized = {
    externalUserId: String(row[mapping.fields.externalUserId] ?? ''),
    phoneE164: String(row[mapping.fields.phoneE164] ?? ''),
    dropoffStage: String(row[mapping.fields.dropoffStage] ?? 'login'),
    lastStageAt: String(row[mapping.fields.lastStageAt] ?? new Date().toISOString()),
    localeHint: row[mapping.fields.localeHint] ? String(row[mapping.fields.localeHint]) : undefined,
    consentFlag: String(row[mapping.fields.consentFlag] ?? 'false').toLowerCase() === 'true',
    partnerCaseId: String(row[mapping.fields.partnerCaseId] ?? crypto.randomUUID()),
    deepLink: row[mapping.fields.deepLink] ? String(row[mapping.fields.deepLink]) : undefined,
    metadata: {}
  }

  return canonicalIngestionRowSchema.parse(normalized)
}

app.get('/health', async () => ({ ok: true, service: 'ingestion-worker' }))

app.post('/ingestion/normalize', async (request, reply) => {
  const body = request.body as {
    rows: Array<Record<string, unknown>>
    mapping: MappingProfile
  }

  const accepted = body.rows.map(row => mapRowToCanonical(row, body.mapping))
  return { accepted }
})

app.post('/ingestion/excel', async (request, reply) => {
  const payload = ingestExcelRequestSchema.safeParse(request.body)
  if (!payload.success) {
    return reply.status(400).send({ error: payload.error.flatten() })
  }

  return {
    accepted: payload.data.rows.length,
    rejected: 0,
    errors: []
  }
})

app
  .listen({ host: '0.0.0.0', port: 3020 })
  .then(() => app.log.info('ingestion-worker listening on 3020'))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
