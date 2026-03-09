import { promises as fs } from 'node:fs'
import path from 'node:path'
import fastifyCors from '@fastify/cors'
import { loadEnv } from '@nudges/config'
import { generateReplyInputSchema, generateReplyOutputSchema } from '@nudges/domain'
import { buildDeepLink, buildNudgeMessage, buildWhatsAppMessage } from '@nudges/persuasion-core'
import type { TenantConfig } from '@nudges/persuasion-core'
import { generateWithOpenAI } from '@nudges/provider-openai'
import { detectLanguage } from '@nudges/provider-sarvam'
import { guardOutboundMessage, shouldEscalateToHuman } from '@nudges/safety-compliance'
import Fastify from 'fastify'
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

// --- Tenant Loading ---
// All company-specific content (persona, knowledge, config) lives in tenants/<TENANT_ID>/
const TENANT_ID = process.env.TENANT_ID ?? 'muthoot'
const tenantRoot = path.resolve(process.cwd(), 'tenants', TENANT_ID)

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

// Dynamically import the tenant config (defaults to muthoot if TENANT_ID is unknown)
let tenantConfig: TenantConfig
try {
  const mod = await import(path.join(tenantRoot, 'config.ts'))
  tenantConfig = mod.default as TenantConfig
} catch {
  console.warn(`[agent-runtime] Could not load tenant config for "${TENANT_ID}". Using fallback.`)
  tenantConfig = {
    deepLinkTemplate:
      'https://los-prod.dailype.in/muthoot/session-link?mob_num={{MOB_NUM}}&utm_source={{UTM_SOURCE}}&utm_medium={{UTM_MEDIUM}}&utm_campaign={{UTM_CAMPAIGN}}',
    utmSource: 'nudge_follow_up',
    utmMedium: 'whatsapp',
    utmCampaign: 'nudge_agent',
    ctaButtonLabel: 'Resume Application 🚀'
  }
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

const classifyIntent = (text: string): 'recovery' | 'support' | 'reject' => {
  if (!text.trim()) return 'recovery'
  if (/(status|eligibility|rate|interest|charge|tenure|document|kyc|why|how)/i.test(text)) {
    return 'support'
  }
  if (/(continue|resume|upload|done|complete|ok|yes)/i.test(text)) {
    return 'recovery'
  }
  if (/(politics|religion|stock|crypto|joke|poem)/i.test(text)) {
    return 'reject'
  }
  return 'recovery'
}

const buildSystemPrompt = (route: 'recovery' | 'support' | 'reject' | 'proactive_nudge'): string => {
  const supervisor = getSkill('supervisor-agent')
  const specialist = route === 'support' ? getSkill('support-specialist') : getSkill('recovery-specialist')
  const compliance = getSkill('compliance-guard')
  const tooling = getSkill('tooling-policy')

  return [
    // Tenant SOUL.md takes precedence over the generic persona skill
    soulContent
      ? `--- AGENT SOUL ---\n${soulContent}\n--- END SOUL ---`
      : `ROLE: ${getSkill('persona-agent').body}`,
    `ROLE: ${supervisor.name}\n${supervisor.description}\n${supervisor.body}`,
    `ROLE: ${specialist.name}\n${specialist.description}\n${specialist.body}`,
    `ROLE: ${compliance.name}\n${compliance.description}\n${compliance.body}`,
    `ROLE: ${tooling.name}\n${tooling.description}\n${tooling.body}`,
    `--- KNOWLEDGE BASE ---\n${staticKnowledgeBase}\n--- END KNOWLEDGE BASE ---`,
    'Hard constraints: keep response under 450 chars, informational only, one CTA, no fabricated claims.'
  ].join('\n\n')
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

  // If the trigger is explicitly proactive and there's no latest chat, use proactive routing
  const route =
    (trigger === 'scheduled_followup' || trigger === 'manual_retry') && !inboundText
      ? 'proactive_nudge'
      : classifyIntent(inboundText)

  if (shouldEscalateToHuman(session, inboundText)) {
    return generateReplyOutputSchema.parse({
      body: 'I am connecting you to a human specialist for better assistance.',
      language: session.summaryState.preferredLanguage ?? 'hinglish',
      confidence: 0.9,
      usedModel: 'deterministic',
      route: 'handoff',
      guardrailNotes: ['risk_or_complexity_trigger']
    })
  }

  const seeded = buildNudgeMessage({
    stage: session.summaryState.stageContext,
    style:
      route === 'proactive_nudge'
        ? 'progress'
        : /rate|interest|charge|expensive/i.test(inboundText)
          ? 'help'
          : 'progress',
    deepLink: session.compactFacts.deep_link ?? 'https://clickpe.auth/resume',
    userName: session.compactFacts.user_name ?? undefined
  })

  // Build a user-specific trackable deep link using the tenant config
  const mobileNumber = (session.compactFacts.mobile_number as string | undefined) ?? ''
  const resolvedDeepLink = mobileNumber
    ? buildDeepLink(mobileNumber, tenantConfig)
    : ((session.compactFacts.deep_link as string | undefined) ?? 'https://clickpe.auth/resume')

  let llmText = buildFallbackReply(route, seeded, '')
  let usedModel = 'deterministic'

  if (env.OPENAI_API_KEY) {
    const model = /complaint|legal|confused|not clear|disagree/i.test(inboundText)
      ? env.OPENAI_MODEL_COMPLEX
      : env.OPENAI_MODEL_ROUTINE

    const response = await generateWithOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model,
      systemPrompt: buildSystemPrompt(route),
      userPrompt: [
        `Inbound message: ${inboundText || '(none)'}`,
        `Session summary: ${JSON.stringify(session.summaryState)}`,
        `Stage: ${session.summaryState.stageContext}`,
        `Suggested draft: ${seeded}`
      ].join('\n'),
      temperature: 0.3
    })

    llmText = response.text || llmText
    usedModel = response.model
  }

  const guardrail = guardOutboundMessage(llmText)
  const language = await detectLanguage(inboundText || llmText, env.SARVAM_API_KEY, env.SARVAM_BASE_URL)
  const finalBody = guardrail.sanitizedMessage ?? seeded

  // Build the structured WhatsApp message with the trackable CTA button
  const whatsappPayload = buildWhatsAppMessage(finalBody, resolvedDeepLink, tenantConfig)

  await graph.invoke({
    route: guardrail.allowed ? route : 'reject',
    body: whatsappPayload.plainText,
    language,
    confidence: 0.82
  })

  return generateReplyOutputSchema.parse({
    body: whatsappPayload.plainText,
    language,
    confidence: 0.82,
    usedModel,
    route: guardrail.allowed ? route : 'reject',
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
