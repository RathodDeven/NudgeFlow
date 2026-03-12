import { promises as fs } from 'node:fs'
import path from 'node:path'
import fastifyCors from '@fastify/cors'
import { loadEnv } from '@nudges/config'
import { generateReplyInputSchema, generateReplyOutputSchema } from '@nudges/domain'
import { generateStructuredWithOpenAI } from '@nudges/provider-openai'
import { detectLanguage } from '@nudges/provider-sarvam'
import { guardOutboundMessage } from '@nudges/safety-compliance'
import Fastify from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { type LoadedSkill, loadSkills } from './skill-loader'

type AgentState = {
  route: 'recovery' | 'support' | 'reject' | 'handoff' | 'proactive_nudge'
  body: string
  language: string
  confidence: number
}

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

// Enable CORS for dashboard local simulator
app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})

const skills = loadSkills(env.AGENT_SKILLS_DIR)

import { fileURLToPath } from 'node:url'

// --- Tenant Loading ---
// All company-specific content (persona, knowledge, config) lives in tenants/<TENANT_ID>/
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TENANT_ID = process.env.TENANT_ID ?? 'clickpe'
const tenantRoot = path.resolve(__dirname, '../../../tenants', TENANT_ID)

const readTenantFile = async (filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(tenantRoot, filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] tenant file not found: tenants/${TENANT_ID}/${filename}`)
    return ''
  }
}

const soulContent = await readTenantFile('SOUL.md')
const staticKnowledgeBase = await readTenantFile('knowledge-base.md')

const channelRulesContent = await readTenantFile('channel-rules.md')
// NOTE: call-playbook.md and daily-ops.md are not loaded from the tenant folder as they are only meant for ops team documentation, not LLM context injection.

if (!channelRulesContent) {
  throw new Error(`[agent-runtime] Critical: No channel rules found or loaded for ${TENANT_ID}`)
}

console.info(`[agent-runtime] Loaded tenant: ${TENANT_ID} from ${tenantRoot}`)

const graph = {
  invoke: async (_state: AgentState): Promise<void> => undefined
}

const getSkill = (name: string): LoadedSkill =>
  skills[name] ?? {
    name,
    description: '',
    body: '',
    sourcePath: 'missing'
  }

const buildSystemPrompt = (route: string): string => {
  const supervisor = getSkill('supervisor-agent')
  const specialist = route === 'support' ? getSkill('support-specialist') : getSkill('recovery-specialist')
  const compliance = getSkill('compliance-guard')
  const tooling = getSkill('tooling-policy')
  const persuasion = getSkill('persuasion-policy')

  // Stage-router is always useful for per-user decisions
  const stageRouter = getSkill('stage-router')
  // Call-escalation helps decide if a call is needed
  const callEscalation = getSkill('call-escalation')

  const initialOutreachContext = `
--- INITIAL OUTREACH CONTEXT ---
If this is the start of the conversation, the user has just received our "Initial Outreach" template:
"Namaste {{Applicant Name}}! Aapka {{Loan Amount}} ka business loan offer expire hone wala hai. Sirf 1 aakhri step bacha hai: Please upload your {{Pending Document}}. Aapne pehle hi process start kar diya hai, ise miss mat kijiye. Ye funds aapke business growth ke liye block kiye gaye hain. Neeche diye button par click karein aur 2 minute mein process poora karein."
The user may be responding with one of these quick-replies: "Bill mismatch" or "Call me".
-------------------------------`

  return [
    soulContent
      ? `--- AGENT SOUL ---\n${soulContent}\n--- END SOUL ---`
      : `ROLE: ${getSkill('persona-agent').body}`,
    `ROLE: ${supervisor.name}\n${supervisor.description}\n${supervisor.body}`,
    `ROLE: ${specialist.name}\n${specialist.description}\n${specialist.body}`,
    `ROLE: ${compliance.name}\n${compliance.description}\n${compliance.body}`,
    `ROLE: ${tooling.name}\n${tooling.description}\n${tooling.body}`,
    `ROLE: ${persuasion.name}\n${persuasion.description}\n${persuasion.body}`,
    stageRouter.body ? `ROLE: ${stageRouter.name}\n${stageRouter.description}\n${stageRouter.body}` : '',
    callEscalation.body
      ? `ROLE: ${callEscalation.name}\n${callEscalation.description}\n${callEscalation.body}`
      : '',
    initialOutreachContext,
    `--- KNOWLEDGE BASE ---\n${staticKnowledgeBase}\n--- END KNOWLEDGE BASE ---`,
    `--- CHANNEL RULES ---\n${channelRulesContent}\n--- END CHANNEL RULES ---`,
    'Hard constraints: keep response body under 400 chars, informational only, one CTA button maximum, no fabricated claims.'
  ]
    .filter(Boolean)
    .join('\n\n')
}

const buildFallbackReply = (
  route: 'recovery' | 'support' | 'reject' | 'proactive_nudge',
  seeded: string,
  supportContext: string
): string => {
  if (route === 'support') {
    return 'Let me review the documentation regarding your request. I can also help you complete the next loan step now.'
  }
  if (route === 'reject') {
    return 'I can help only with your loan application steps, status, and required documents.'
  }
  return seeded
}

app.get('/health', async () => ({
  ok: true,
  service: 'agent-runtime',
  skillsLoaded: Object.keys(skills).length
}))

app.post('/agent/respond', async (request, reply) => {
  const parsed = generateReplyInputSchema.safeParse(request.body)
  if (!parsed.success) {
    const errorBody = parsed.error.flatten()
    app.log.error({ msg: 'Agent Runtime payload validation failed', error: errorBody.fieldErrors })
    return reply.status(400).send({ error: errorBody })
  }

  const { session, lastInboundMessage, trigger, chatHistory } = parsed.data
  const inboundText = lastInboundMessage?.body ?? ''

  let route = 'recovery'
  let isEscalated = false
  let llmText = buildFallbackReply('recovery', 'Please continue your application.', '')
  let usedModel = 'deterministic'
  let isRejected = false

  let payloadPlainText = llmText
  const footer = 'ClickPe | Powered by NudgeFlow'

  if (env.OPENAI_API_KEY) {
    usedModel = env.OPENAI_MODEL_ROUTINE

    const responseSchema = z.object({
      intent: z
        .enum(['recovery', 'support', 'reject', 'handoff'])
        .describe('The classified intent of the user.'),
      requiresEscalation: z
        .boolean()
        .describe('True if the user is asking for legal, complaint, human agent, or is very confused.'),
      isOutOfScope: z
        .boolean()
        .describe('True if the user is asking about politics, crypto, jokes, or things unrelated to loans.'),
      whatsappPayload: z
        .object({
          body: z
            .string()
            .describe('The final crafted message text to send to the user, keeping under 450 chars.'),
          button: z
            .object({
              buttonLabel: z.string().describe('The label for the CTA button according to channel rules.'),
              url: z.string().describe('The constructed deep link URL according to channel rules algorithm.')
            })
            .nullable()
            .optional()
            .describe('Provide if the nudge logic requires a deep-link CTA.')
        })
        .describe('The entire payload to issue to the user.')
    })

    const startTimeOpenAI = Date.now()
    const renderedUserPrompt = [
      '--- Chat History ---',
      chatHistory && chatHistory.length > 0
        ? chatHistory.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.body}`).join('\n')
        : '(No previous messages)',
      '--------------------',
      `Current Inbound message: ${inboundText || '(none)'}`,
      `Session summary: ${JSON.stringify(session.summaryState)}`,
      `Stage: ${session.summaryState.stageContext}`,
      `Exact mobile number: ${session.compactFacts.mobile_number || 'unknown'}`,
      'Task: Analyze the Chat History above so you do not repeat yourself. Address any specific questions the user asks. Then classify intent, review compliance, and generate a contextual response payload adhering to channel rules.'
    ].join('\n')

    const systemPrompt = buildSystemPrompt('recovery') // Use general support/recovery prompt

    app.log.info({
      msg: `=== Dispatching AI Prompt (System) ===\n${systemPrompt}\n=============================`
    })
    app.log.info({
      msg: `=== Dispatching AI Prompt (User) ===\n${renderedUserPrompt}\n=============================`
    })

    const response = await generateStructuredWithOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model: usedModel,
      schema: responseSchema,
      schemaName: 'AgentResponse',
      systemPrompt,
      userPrompt: renderedUserPrompt
    })
    const timeOpenAI = Date.now() - startTimeOpenAI
    app.log.info({ msg: 'OpenAI execution completed', timeMs: timeOpenAI })

    const { intent, requiresEscalation, isOutOfScope, whatsappPayload } = response.data as z.infer<
      typeof responseSchema
    >

    llmText = whatsappPayload.body
    usedModel = response.model

    if (whatsappPayload.button) {
      payloadPlainText = `${whatsappPayload.body}\n\n🔗 ${whatsappPayload.button.buttonLabel}: ${whatsappPayload.button.url}\n\n_${footer}_`
    } else {
      payloadPlainText = `${whatsappPayload.body}\n\n_${footer}_`
    }

    if (requiresEscalation) {
      isEscalated = true
      route = 'handoff'
    } else if (isOutOfScope) {
      isRejected = true
      route = 'reject'
    } else {
      route = intent
    }
  }

  if (isEscalated) {
    return generateReplyOutputSchema.parse({
      body: 'I am connecting you to a human specialist for better assistance.',
      language: session.summaryState.preferredLanguage ?? 'hinglish',
      confidence: 0.9,
      usedModel,
      route: 'handoff',
      guardrailNotes: ['risk_or_complexity_trigger_detected_by_llm']
    })
  }

  const guardrail = guardOutboundMessage(llmText)
  const startSarvam = Date.now()
  const language = await detectLanguage(inboundText || llmText, env.SARVAM_API_KEY, env.SARVAM_BASE_URL)
  app.log.info({ msg: 'Sarvam Language Detection completed', timeMs: Date.now() - startSarvam })

  // If the guardrail intercepts, we must rebuild the payload
  if (guardrail.sanitizedMessage) {
    // If it was modified, likely a PII issue, we just replace the body block in the final payload
    payloadPlainText = payloadPlainText.replace(llmText, guardrail.sanitizedMessage)
  }

  await graph.invoke({
    route: guardrail.allowed && !isRejected ? (route as AgentState['route']) : 'reject',
    body: payloadPlainText,
    language,
    confidence: 0.82
  })

  return generateReplyOutputSchema.parse({
    body: payloadPlainText,
    language,
    confidence: 0.82,
    usedModel,
    route: guardrail.allowed && !isRejected ? (route as AgentState['route']) : 'reject',
    guardrailNotes: guardrail.reasons
  })
})

app
  .listen({ host: '0.0.0.0', port: 3010 })
  .then(() => app.log.info('agent-runtime listening on 3010'))
  .catch(error => {
    app.log.error(error)
    process.exit(1)
  })
