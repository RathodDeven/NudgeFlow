import { ensureSession, getLastInboundTimestamp, getUserById, getUserMessages } from '@nudges/db'
import type { FastifyInstance } from 'fastify'
import { dbPool, getTenantId, protectedHandler } from '../context'
import { recordMessageInteraction } from '../services/interactions'
import { applyMessageMemoryUpdate } from '../services/memory'
import { loadTenantTemplateConfig } from '../services/tenant-channel'
import { eventLogger } from '../state'

export const registerUserMessageRoutes = (app: FastifyInstance): void => {
  app.get('/users/:id/messages', { preHandler: protectedHandler }, async request => {
    const userId = (request.params as { id: string }).id
    const messages = await getUserMessages(dbPool, userId)
    return { messages }
  })

  app.get('/users/:id/session-window', { preHandler: protectedHandler }, async request => {
    const userId = (request.params as { id: string }).id
    const lastInboundAt = await getLastInboundTimestamp(dbPool, userId)
    return { lastInboundAt }
  })

  app.post('/users/:id/messages', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const body = request.body as {
      direction: 'inbound' | 'outbound' | 'system'
      body: string
      channel?: string
    }
    if (!body?.direction || !body?.body) {
      return reply.status(400).send({ error: 'direction and body are required' })
    }

    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)

    await recordMessageInteraction(dbPool, {
      sessionId,
      direction: body.direction,
      body: body.body,
      channel: body.channel || 'whatsapp'
    })
    await applyMessageMemoryUpdate(dbPool, sessionId, body.body)

    return { ok: true }
  })

  app.post('/users/:id/send-whatsapp', { preHandler: protectedHandler }, async (request, reply) => {
    const userId = (request.params as { id: string }).id
    const body = request.body as { message?: string; templateName?: string; variables?: Record<string, unknown> }
    
    if (!body?.message && !body?.templateName) {
      return reply.status(400).send({ error: 'message or templateName is required' })
    }

    const user = await getUserById(dbPool, userId)
    if (!user) {
      return reply.status(404).send({ error: 'user_not_found' })
    }

    const tid = await getTenantId()
    const sessionId = await ensureSession(dbPool, userId, tid)
    const tConfig = await loadTenantTemplateConfig(body.templateName)

    if (!tConfig) {
      return reply.status(500).send({ error: 'tenant_config_load_failed' })
    }

    // Comprehensive Phone Normalization for Gupshup/India
    const rawDigits = user.phoneE164.replace(/[^\d]/g, '')
    const raw10 = rawDigits.slice(-10)
    let toPhone = rawDigits
    if (toPhone.length === 10) {
      toPhone = `91${toPhone}`
    } else if (toPhone.length === 12 && toPhone.startsWith('91')) {
      // already has 91
    }

    // Resolve template params if needed
    let resolvedParams: string[] | undefined = undefined
    let templateId = body.templateName

    if (body.templateName) {
      templateId = tConfig.template.templateId
      const varMap: Record<string, string> = {
        user_name: user.fullName || 'User',
        loan_amount: user.loanAmount?.toLocaleString('en-IN') || '0',
        pending_step: user.currentStage || 'current step',
        application_id: user.partnerCaseId || 'N/A',
        pending_document: (body.variables?.pending_document as string) || 'required documents',
        disbursement_amount: user.loanAmount?.toLocaleString('en-IN') || '0',
        mob_num: raw10,
        ...(body.variables as Record<string, string> || {})
      }
      resolvedParams = tConfig.template.variableOrder.map(key => varMap[key] || '')
    }

    app.log.info({
      msg: 'Dispatching manual WhatsApp message',
      userId,
      appName: tConfig.appName,
      source: tConfig.source,
      templateId,
      toPhone
    })

    const res = await fetch('http://localhost:3040/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        toPhoneE164: toPhone,
        body: body.message,
        templateName: templateId,
        templateParams: resolvedParams,
        appName: tConfig.appName,
        source: tConfig.source
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return reply.status(500).send({ error: 'whatsapp_send_failed', details: err })
    }

    const gupshupRes = (await res.json()) as { providerMessageId: string }

    await recordMessageInteraction(dbPool, {
      sessionId,
      direction: 'outbound',
      body: body.message || `[Template: ${body.templateName}]`,
      channel: 'whatsapp',
      providerMessageId: gupshupRes.providerMessageId
    })
    await applyMessageMemoryUpdate(dbPool, sessionId, body.message || `[Template: ${body.templateName}]`)

    eventLogger.log({
      event: 'manual_whatsapp_sent',
      level: 'info',
      payload: { userId, providerId: gupshupRes.providerMessageId }
    })

    return { ok: true, providerMessageId: gupshupRes.providerMessageId }
  })
}
