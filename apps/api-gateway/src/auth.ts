import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AppEnv } from '@nudges/config'
import type { FastifyReply, FastifyRequest } from 'fastify'

type AuthPayload = {
  sub: string
  exp: number
}

const toBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const fromBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4)
  return Buffer.from(`${normalized}${'='.repeat(padLength)}`, 'base64').toString('utf8')
}

const sign = (content: string, secret: string): string =>
  createHmac('sha256', secret).update(content).digest('base64url')

export const createAuthToken = (username: string, secret: string, ttlSeconds = 60 * 60 * 12): string => {
  const payload: AuthPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  const signature = sign(encoded, secret)
  return `${encoded}.${signature}`
}

export const verifyAuthToken = (token: string, secret: string): AuthPayload | null => {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) {
    return null
  }

  const expected = sign(encoded, secret)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as AuthPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export const requireAdminAuth =
  (env: AppEnv) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      await reply.status(401).send({ error: 'unauthorized' })
      return
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const payload = verifyAuthToken(token, env.DASHBOARD_AUTH_SECRET)
    if (!payload) {
      await reply.status(401).send({ error: 'invalid_or_expired_token' })
      return
    }
    ;(request as FastifyRequest & { adminUser?: string }).adminUser = payload.sub
  }
