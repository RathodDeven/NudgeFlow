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
  },
  disableRequestLogging: true
})

app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

const TENANT_ID = process.env.TENANT_ID ?? 'clickpe'
const promptContext = await loadPromptContext(TENANT_ID)

if (!promptContext.agentPrompt) {
  throw new Error(`[agent-runtime] Critical: No agent instructions found for ${TENANT_ID}`)
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

  const replyResult = await generateAgentReply({
    tenantId: TENANT_ID,
    env,
    session,
    inboundText,
    boundedHistory,
    fallbackText: buildFallbackReply('recovery', 'Please continue your application.'),
    promptContext
  })

  const guardrail = guardOutboundMessage(replyResult.llmText)
  const sanitizedLlmText = guardrail.sanitizedMessage ?? replyResult.llmText
  const payloadPlainText = guardrail.sanitizedMessage
    ? replyResult.payloadPlainText.replace(replyResult.llmText, guardrail.sanitizedMessage)
    : replyResult.payloadPlainText

  const memoryDelta = {
    summaryState: session.summaryState,
    compactFactsDelta: {},
    tokenEstimate: estimateTokens(inboundText, payloadPlainText)
  }

  if (replyResult.isEscalated) {
    return generateReplyOutputSchema.parse({
      body: 'I am connecting you to a human specialist for better assistance.',
      confidence: 0.9,
      usedModel: replyResult.usedModel,
      route: 'handoff',
      guardrailNotes: ['risk_or_complexity_trigger_detected_by_llm'],
      memoryDelta
    })
  }

  const finalWhatsappPayload = replyResult.whatsappPayload
    ? { ...replyResult.whatsappPayload, body: sanitizedLlmText }
    : undefined

  return generateReplyOutputSchema.parse({
    body: payloadPlainText,
    confidence: 0.82,
    usedModel: replyResult.usedModel,
    route: guardrail.allowed && !replyResult.isRejected ? replyResult.route : 'reject',
    guardrailNotes: guardrail.reasons,
    memoryDelta,
    whatsappPayload: finalWhatsappPayload
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
