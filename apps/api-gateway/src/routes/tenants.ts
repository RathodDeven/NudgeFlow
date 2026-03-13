import { loadKnowledgeSet } from '@nudges/knowledge-runtime'
import type { FastifyInstance } from 'fastify'
import { protectedHandler } from '../context'
import { eventLogger } from '../state'

export const registerTenantRoutes = (app: FastifyInstance): void => {
  app.post('/tenants/:id/knowledge/publish', { preHandler: protectedHandler }, async (request, reply) => {
    const tenantId = (request.params as { id: string }).id
    const body = request.body as { knowledgePath?: string }

    if (!body?.knowledgePath) {
      return reply.status(400).send({ error: 'knowledgePath is required' })
    }

    const docs = await loadKnowledgeSet(body.knowledgePath)
    eventLogger.log({
      event: 'knowledge_published',
      level: 'info',
      tenantId,
      payload: { docs: docs.length, knowledgePath: body.knowledgePath }
    })

    return { ok: true, tenantId, documents: docs.length }
  })
}
