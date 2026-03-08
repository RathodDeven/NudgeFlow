import path from 'node:path'
import { loadEnv } from '@nudges/config'
import { generateReplyInputSchema, generateReplyOutputSchema } from '@nudges/domain'
import { loadKnowledgeSet, queryKnowledge } from '@nudges/knowledge-runtime'
import { buildNudgeMessage } from '@nudges/persuasion-core'
import { generateWithOpenAI } from '@nudges/provider-openai'
import { detectLanguage } from '@nudges/provider-sarvam'
import { guardOutboundMessage, shouldEscalateToHuman } from '@nudges/safety-compliance'
import Fastify from 'fastify'
import { type LoadedSkill, loadSkills } from './skill-loader'

type AgentState = {
  route: 'recovery' | 'support' | 'reject' | 'handoff'
  body: string
  language: string
  confidence: number
}

const env = loadEnv()
const app = Fastify({ logger: true })
const skills = loadSkills(env.AGENT_SKILLS_DIR)
const knowledgeRoot = path.resolve(process.cwd(), 'tests/sandbox/knowledge')
const knowledgeDocs = await loadKnowledgeSet(knowledgeRoot).catch(() => [])

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

const buildSystemPrompt = (route: 'recovery' | 'support' | 'reject'): string => {
  const supervisor = getSkill('supervisor-agent')
  const specialist = route === 'support' ? getSkill('support-specialist') : getSkill('recovery-specialist')
  const compliance = getSkill('compliance-guard')
  const tooling = getSkill('tooling-policy')

  return [
    `ROLE: ${supervisor.name}\n${supervisor.description}\n${supervisor.body}`,
    `ROLE: ${specialist.name}\n${specialist.description}\n${specialist.body}`,
    `ROLE: ${compliance.name}\n${compliance.description}\n${compliance.body}`,
    `ROLE: ${tooling.name}\n${tooling.description}\n${tooling.body}`,
    'Hard constraints: keep response under 450 chars, informational only, one CTA, no fabricated claims.'
  ].join('\n\n')
}

const buildFallbackReply = (
  route: 'recovery' | 'support' | 'reject',
  seeded: string,
  supportContext: string
): string => {
  if (route === 'support' && supportContext) {
    return `Here is what I found: ${supportContext}. I can also help you complete the next loan step now.`
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

  const { session, lastInboundMessage } = parsed.data
  const inboundText = lastInboundMessage?.body ?? ''
  const route = classifyIntent(inboundText)

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
    style: /rate|interest|charge|expensive/i.test(inboundText) ? 'help' : 'progress',
    deepLink: 'https://loan.example/resume',
    userName: undefined
  })

  const supportDocs = route === 'support' ? queryKnowledge(knowledgeDocs, inboundText, 2) : []
  const supportContext = supportDocs.map(doc => doc.content.slice(0, 160)).join(' ')

  let llmText = buildFallbackReply(route, seeded, supportContext)
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
        `Support snippets: ${supportContext || 'none'}`,
        `Suggested draft: ${seeded}`
      ].join('\n'),
      temperature: 0.3
    })

    llmText = response.text || llmText
    usedModel = response.model
  }

  const guardrail = guardOutboundMessage(llmText)
  const language = detectLanguage(inboundText || llmText)

  await graph.invoke({
    route: guardrail.allowed ? route : 'reject',
    body: guardrail.sanitizedMessage ?? seeded,
    language,
    confidence: 0.82
  })

  return generateReplyOutputSchema.parse({
    body: guardrail.sanitizedMessage ?? seeded,
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
