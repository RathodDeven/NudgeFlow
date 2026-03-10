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
const app = Fastify({ logger: true })

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
const tenantRoot = path.resolve(__dirname, '../../../../tenants', TENANT_ID)

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
const callPlaybookContent = await readTenantFile('call-playbook.md')
const dailyOpsContent = await readTenantFile('daily-ops.md')

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

  // NOTE: daily-ops-loop is a batch-workflow skill, NOT needed per-user.
  // NOTE: call-playbook and daily-ops tenant files are ops-team guides, not per-message context.
  // NOTE: persona-agent is overridden by tenant SOUL.md, so never injected when SOUL exists.

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
    `--- KNOWLEDGE BASE ---\n${staticKnowledgeBase}\n--- END KNOWLEDGE BASE ---`,
    `--- CHANNEL RULES ---\n${channelRulesContent}\n--- END CHANNEL RULES ---`,
    'Hard constraints: keep response body under 450 chars, informational only, one CTA button maximum, no fabricated claims.'
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
    return reply.status(400).send({ error: parsed.error.flatten() })
  }

  const { session, lastInboundMessage, trigger } = parsed.data
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
            .optional()
            .describe('Provide if the nudge logic requires a deep-link CTA.')
        })
        .describe('The entire payload to issue to the user.')
    })

    const responseFormat = zodToJsonSchema(responseSchema, 'AgentResponse')

    const response = await generateStructuredWithOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model: usedModel,
      schema: responseFormat as unknown as Record<string, unknown>,
      schemaName: 'AgentResponse',
      systemPrompt: buildSystemPrompt('support'), // Use general support/recovery prompt
      userPrompt: [
        `Inbound message: ${inboundText || '(none)'}`,
        `Session summary: ${JSON.stringify(session.summaryState)}`,
        `Stage: ${session.summaryState.stageContext}`,
        `Exact mobile number: ${session.compactFacts.mobile_number || 'unknown'}`,
        'Task: Classify intent, review compliance, and generate a contextual response payload adhering to channel rules.'
      ].join('\n')
    })

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
  const language = await detectLanguage(inboundText || llmText, env.SARVAM_API_KEY, env.SARVAM_BASE_URL)

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
