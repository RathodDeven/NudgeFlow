import { ingestExcelRequestSchema } from '@nudges/domain'
import type { FastifyInstance } from 'fastify'
import { eventLogger } from '../state'

export const registerIngestionRoutes = (app: FastifyInstance): void => {
  app.post('/ingestion/excel', async (request, reply) => {
    const payload = ingestExcelRequestSchema.safeParse(request.body)
    if (!payload.success) {
      const errorBody = payload.error.flatten()
      app.log.error({ msg: 'API Gateway: Ingestion Payload Validation Failed', error: errorBody.fieldErrors })
      return reply.status(400).send({ error: errorBody })
    }

    eventLogger.log({
      event: 'ingestion_request_received',
      level: 'info',
      tenantId: payload.data.tenantId,
      payload: { rows: payload.data.rows.length }
    })

    return {
      accepted: payload.data.rows.length,
      rejected: 0,
      errors: []
    }
  })
}
