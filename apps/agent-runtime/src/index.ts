import fastifyCors from '@fastify/cors'
import { loadEnv } from '@nudges/config'
import {
  generateReplyInputSchema,
  generateReplyOutputSchema,
  summarizeCallInputSchema,
  summarizeCallOutputSchema
} from '@nudges/domain'
import { guardOutboundMessage } from '@nudges/safety-compliance'
import Fastify from 'fastify'
import { generateAgentReply } from './agent-reply'
import { summarizeCall } from './call-summary'
import { buildFallbackReply } from './fallback'
import { capRecentHistory, estimateTokens } from './history'
import { detectInboundLanguage, normalizePreferredLanguage } from './language'
import { loadPromptContext } from './prompt-context'

const env = loadEnv()
const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  }
})

app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

const TENANT_ID = process.env.TENANT_ID ?? 'clickpe'
const promptContext = await loadPromptContext(TENANT_ID)

if (!promptContext.tenantChannel && !promptContext.globalConstraints) {
  throw new Error(`[agent-runtime] Critical: No channel rules found or loaded for ${TENANT_ID}`)
}

console.info(`[agent-runtime] Loaded Global Prompts and Tenant: ${TENANT_ID}`)

app.get('/health', async () => ({
  ok: true,
  service: 'agent-runtime',
  architecture: 'generalized-markdown'
}))

app.post('/agent/respond', async (request, reply) => {
  const parsed = generateReplyInputSchema.safeParse(request.body)
  if (!parsed.success) {
    const errorBody = parsed.error.flatten()
    app.log.error({ msg: 'Agent Runtime payload validation failed', error: errorBody.fieldErrors })
    return reply.status(400).send({ error: errorBody })
  }

  const { session, lastInboundMessage, chatHistory, callSummaries } = parsed.data
  const history = chatHistory ?? []
  type HistoryItem = (typeof history)[number]
  const isChatMessage = (
    message: HistoryItem
  ): message is HistoryItem & { direction: 'inbound' | 'outbound' } => message.direction !== 'system'

  const boundedHistory = capRecentHistory(
    history.filter(isChatMessage).map(message => ({ direction: message.direction, body: message.body }))
  )
  const inboundText = lastInboundMessage?.body ?? ''

  const inboundLanguage = await detectInboundLanguage(inboundText, env.SARVAM_API_KEY, env.SARVAM_BASE_URL)
  app.log.info({ msg: 'Language Detection completed', inboundLanguage })

  const replyResult = await generateAgentReply({
    tenantId: TENANT_ID,
    env,
    session,
    inboundText,
    inboundLanguage,
    boundedHistory,
    callSummaries,
    fallbackText: buildFallbackReply('recovery', 'Please continue your application.'),
    promptContext
  })

  const guardrail = guardOutboundMessage(replyResult.llmText)
  const payloadPlainText = guardrail.sanitizedMessage
    ? replyResult.payloadPlainText.replace(replyResult.llmText, guardrail.sanitizedMessage)
    : replyResult.payloadPlainText

  const memoryDelta = {
    summaryState: { ...session.summaryState, preferredLanguage: normalizePreferredLanguage(inboundLanguage) },
    compactFactsDelta: {},
    tokenEstimate: estimateTokens(inboundText, payloadPlainText)
  }

  if (replyResult.isEscalated) {
    return generateReplyOutputSchema.parse({
      body: 'I am connecting you to a human specialist for better assistance.',
      language: inboundLanguage,
      confidence: 0.9,
      usedModel: replyResult.usedModel,
      route: 'handoff',
      guardrailNotes: ['risk_or_complexity_trigger_detected_by_llm'],
      memoryDelta
    })
  }

  return generateReplyOutputSchema.parse({
    body: payloadPlainText,
    language: inboundLanguage,
    confidence: 0.82,
    usedModel: replyResult.usedModel,
    route: guardrail.allowed && !replyResult.isRejected ? replyResult.route : 'reject',
    guardrailNotes: guardrail.reasons,
    memoryDelta
  })
})

app.post('/agent/summarize-call', async (request, reply) => {
  const parsed = summarizeCallInputSchema.safeParse(request.body)
  if (!parsed.success) {
    const errorBody = parsed.error.flatten()
    app.log.error({ msg: 'Call summary payload validation failed', error: errorBody.fieldErrors })
    return reply.status(400).send({ error: errorBody })
  }

  const result = await summarizeCall({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL_ROUTINE,
    transcript: parsed.data.transcript,
    summaryState: parsed.data.summaryState,
    compactFacts: parsed.data.compactFacts
  })

  return summarizeCallOutputSchema.parse(result)
})

app
  .listen({ host: '0.0.0.0', port: 3010 })
  .then(() => app.log.info('agent-runtime listening on 3010'))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
