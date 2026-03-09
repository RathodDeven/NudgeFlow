import { canonicalIngestionRowSchema, ingestExcelRequestSchema } from '@nudges/domain'
import Fastify from 'fastify'

const app = Fastify({ logger: true })

type MappingProfile = {
  fields: Record<string, string>
}

const mapRowToCanonical = (row: Record<string, unknown>, mapping: MappingProfile) => {
  // Map specific CSV columns to our canonical domain model
  const dropoffMap: Record<string, string> = {
    FRESH_LOAN: 'fresh_loan',
    UNDER_REVIEW: 'under_review',
    CREDIT_DECISIONING: 'credit_decisioning'
  }

  const rawStage = String(row[mapping.fields.dropoffStage] ?? 'login')
  const mappedStage = dropoffMap[rawStage] || 'login'

  const normalized = {
    externalUserId: String(row[mapping.fields.externalUserId] ?? ''),
    phoneE164: `+91${String(row[mapping.fields.phoneE164] ?? '').replace(/\D/g, '')}`,
    dropoffStage: mappedStage,
    lastStageAt: String(row[mapping.fields.lastStageAt] ?? new Date().toISOString()),
    localeHint: row[mapping.fields.localeHint] ? String(row[mapping.fields.localeHint]) : undefined,
    consentFlag: String(row[mapping.fields.consentFlag] ?? 'false').toLowerCase() === 'true',
    partnerCaseId: String(row[mapping.fields.partnerCaseId] ?? crypto.randomUUID()),
    deepLink: row[mapping.fields.deepLink] ? String(row[mapping.fields.deepLink]) : undefined,
    metadata: {
      name: String(row.name || ''),
      loan_amount: String(row.loan_amount || '')
    }
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

  // MVP Mock: We bypass actual database connection here, but assume we map them
  // and push them into the followup queue, marked as "drafting_required"

  const accepted = payload.data.rows.map(row => ({
    externalUserId: row.externalUserId,
    phoneE164: row.phoneE164,
    stage: row.dropoffStage,
    status: 'drafting_required', // Admin must approve before sending
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // Wait 6 hours
  }))

  return {
    accepted: accepted.length,
    rejected: 0,
    errors: [],
    simulatedQueue: accepted
  }
})

app
  .listen({ host: '0.0.0.0', port: 3020 })
  .then(() => app.log.info('ingestion-worker listening on 3020'))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
