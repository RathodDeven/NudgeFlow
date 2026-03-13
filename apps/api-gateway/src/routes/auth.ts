import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createAuthToken } from '../auth'
import { env, protectedHandler } from '../context'

export const registerAuthRoutes = (app: FastifyInstance): void => {
  app.post('/auth/login', async (request, reply) => {
    const body = request.body as { username?: string; password?: string }
    if (!body?.username || !body?.password) {
      return reply.status(400).send({ error: 'username and password are required' })
    }

    if (body.username !== env.ADMIN_USERNAME || body.password !== env.ADMIN_PASSWORD) {
      return reply.status(401).send({ error: 'invalid_credentials' })
    }

    const token = createAuthToken(body.username, env.DASHBOARD_AUTH_SECRET)
    return reply.send({
      token,
      expiresInSeconds: 43200
    })
  })

  app.get('/auth/me', { preHandler: protectedHandler }, async request => {
    const adminUser = (request as FastifyRequest & { adminUser?: string }).adminUser
    return { ok: true, username: adminUser }
  })
}
