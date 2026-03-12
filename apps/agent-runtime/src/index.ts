import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyCors from '@fastify/cors'
import { loadEnv } from '@nudges/config'
import { generateReplyInputSchema, generateReplyOutputSchema } from '@nudges/domain'
import { generateStructuredWithOpenAI } from '@nudges/provider-openai'
import { detectLanguage, generateChatWithSarvam } from '@nudges/provider-sarvam'
import { guardOutboundMessage } from '@nudges/safety-compliance'
import Fastify from 'fastify'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TENANT_ID = process.env.TENANT_ID ?? 'clickpe'

// --- Prompt Loading Helpers ---
const PROMPTS_ROOT = path.resolve(__dirname, '../../../prompts')
const TENANT_ROOT = path.resolve(__dirname, '../../../tenants', TENANT_ID)

const readPromptFile = async (filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(PROMPTS_ROOT, filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] Global prompt file not found: prompts/${filename}`)
    return ''
  }
}

const readTenantFile = async (filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(TENANT_ROOT, filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] Tenant file not found: tenants/${TENANT_ID}/${filename}`)
    return ''
  }
}

// Load Global Prompts
const globalIdentity = await readPromptFile('IDENTITY.md')
const globalWorkflows = await readPromptFile('WORKFLOWS.md')
const globalConstraints = await readPromptFile('CONSTRAINTS.md')
const globalSystem = await readPromptFile('SYSTEM.md')
const globalUtilities = await readPromptFile('UTILITIES.md')
const universalKnowledge = await readPromptFile('KNOWLEDGE.md')

// Load Tenant Prompts (Deeply Generalized)
const tenantProfile = await readTenantFile('PROFILE.md')
const tenantChannel = await readTenantFile('CHANNEL.md')
const tenantWorkflows = await readTenantFile('WORKFLOWS.md')
const tenantKnowledge = await readTenantFile('KNOWLEDGE.md')

if (!tenantChannel && !globalConstraints) {
  throw new Error(`[agent-runtime] Critical: No channel rules found or loaded for ${TENANT_ID}`)
}

console.info(`[agent-runtime] Loaded Global Prompts and Tenant: ${TENANT_ID}`)

const graph = {
  invoke: async (_state: AgentState): Promise<void> => undefined
}

const buildSystemPrompt = (_route: string, utilitiesContext: string): string => {
  const initialOutreachContext = `
--- INITIAL OUTREACH CONTEXT ---
If this is the start of the conversation, the user has just received our "Initial Outreach" template.
(Refer to CHANNEL.md for exact content and buttons).
The user may be responding with session-specific quick-replies (refer to tenant WORKFLOWS.md for handling).
-------------------------------`

  app.log.info({
    msg: '=== Assembling System Prompt (Deeply Generalized) ===',
    tenant: TENANT_ID,
    hasGlobalIdentity: !!globalIdentity,
    hasTenantWorkflows: !!tenantWorkflows
  })

  // REORDERED FOR PROMPT CACHING: Static files first, Dynamic context last.
  return [
    `--- AGENT IDENTITY ---\n${globalIdentity}\n--- END IDENTITY ---`,
    `--- SYSTEM RULES ---\n${globalSystem}\n--- END SYSTEM ---`,
    `--- CHANNEL & CONSTRAINTS ---\n${globalConstraints}\n${tenantChannel}\n--- END CHANNEL ---`,
    `--- UNIVERSAL KNOWLEDGE ---\n${universalKnowledge}\n--- END UNIVERSAL KNOWLEDGE ---`,
    `--- TENANT KNOWLEDGE ---\n${tenantKnowledge}\n--- END TENANT KNOWLEDGE ---`,
    `--- TENANT PROFILE ---\n${tenantProfile}\n--- END PROFILE ---`,
    `--- GENERAL WORKFLOWS ---\n${globalWorkflows}\n--- END GENERAL WORKFLOWS ---`,
    `--- TENANT WORKFLOWS ---\n${tenantWorkflows}\n--- END TENANT WORKFLOWS ---`,
    initialOutreachContext,
    `--- TIME & CONTEXT UTILITIES ---\n${globalUtilities}\n${utilitiesContext}\n--- END UTILITIES ---`
  ]
    .filter(Boolean)
    .join('\n\n')
}

const buildFallbackReply = (
  route: 'recovery' | 'support' | 'reject' | 'proactive_nudge',
  seeded: string,
  _supportContext: string
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
  architecture: 'generalized-markdown'
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

  // 1. Detect language EARLY to inform the LLM and setup translation
  const startLanguageDetection = Date.now()

  // Fast-path: Detect Hindi Devanagari locally to skip remote API latency
  let detectedLanguage: string | null = null
  const isStrictEnglish = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(inboundText) && !/(kya|loan|bhai|karna|hai|hum|aap|tame|kon|chho|naamu|hu|kem|nathi)/i.test(inboundText)
  const hasDevanagari = /[\u0900-\u097F]/.test(inboundText)

  if (inboundText.length < 30 && hasDevanagari && !inboundText.includes('?')) {
    detectedLanguage = 'hi-IN'
  } else if (inboundText.length < 15 && isStrictEnglish && !/(tame|kon|chho|hai|kya|aap)/i.test(inboundText)) {
    // Only trust fast-path English if it's very short AND doesn't look like Hinglish/Gujarati particles
    detectedLanguage = 'en-IN'
  } else {
    detectedLanguage = await detectLanguage(inboundText, env.SARVAM_API_KEY, env.SARVAM_BASE_URL)
  }

  const inboundLanguage = detectedLanguage || 'en-IN'
  app.log.info({
    msg: 'Language Detection completed',
    inboundLanguage,
    isFastPath: !!detectedLanguage && inboundLanguage !== 'en-IN', // True if we matched a non-English fast-path
    timeMs: Date.now() - startLanguageDetection
  })

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
      isRegionalRequired: z
        .boolean()
        .describe(
          'True if the detected language is an Indic language (Hindi, Marathi, etc.) or Hinglish and requires Sarvam AI for a natural regional response.'
        ),
      regionalResponseStrategy: z
        .string()
        .nullable()
        .describe(
          'The exact instructions and key points for Sarvam AI to use when generating the regional message. Include tone, specific loan facts, and the next step.'
        ),
      whatsappPayload: z
        .object({
          body: z
            .string()
            .describe(
              'The English version of the message text. If isRegionalRequired is false, this is used as the final message.'
            ),
          button: z
            .object({
              buttonLabel: z.string().describe('The label for the CTA button according to channel rules.'),
              url: z.string().describe('The constructed deep link URL according to channel rules algorithm.')
            })
            .nullable()
            .optional()
            .describe(
              'Provide ONLY if intent is RECOVERY and a deep-link CTA is required to move the loan forward. For SUPPORT, this MUST be null.'
            )
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
      `Detected incoming language: ${inboundLanguage || 'en-IN'}`,
      `Session summary: ${JSON.stringify(session.summaryState)}`,
      `Stage: ${session.summaryState.stageContext}`,
      `Exact mobile number: ${session.compactFacts.mobile_number || 'unknown'}`,
      'Task: 1. Review the "Chat History" to understand exactly what was just said. 2. If the user asks a meta-question (e.g., "What was our last topic?", "What did you say?"), answer it based ONLY on the history. 3. Address any specific support questions concisely. 4. Classify intent and generate a contextual response. Do not repeat introductions if already done.'
    ].join('\n')

    // 2. Compute Contextual Utilities (Current Date, Days Since Applied)
    const appDateStr = session.compactFacts.application_created_at
    console.log(`[agent-runtime] Received application_created_at: "${appDateStr}"`)
    const appDate = (appDateStr && !Number.isNaN(Date.parse(String(appDateStr)))) ? new Date(String(appDateStr)) : new Date()
    console.log(`[agent-runtime] Parsed appDate: ${appDate?.toISOString()} (fallback used: ${!appDateStr || Number.isNaN(Date.parse(String(appDateStr)))})`)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24))

    const factsEntries = Object.entries(session.compactFacts)
      .filter(([key]) => !['mobile_number', 'user_name', 'user_city', 'user_state', 'application_created_at', 'application_updated_at'].includes(key))
      .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${value}`)
      .join('\n')

    const utilitiesContext = `
[Utilities Context]
- Current Date: ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
- Days Since Applied: ${diffDays}
- Original Application Date: ${appDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
- Last Update Date: ${session.compactFacts.application_updated_at ? new Date(session.compactFacts.application_updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}
${factsEntries}
`.trim()

    const systemPrompt = buildSystemPrompt('recovery', utilitiesContext)

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

    const { intent, requiresEscalation, isOutOfScope, isRegionalRequired, regionalResponseStrategy, whatsappPayload } =
      response.data as z.infer<typeof responseSchema>

    llmText = whatsappPayload.body
    usedModel = response.model

    // 3. REGIONAL GENERATION (Switch to Sarvam if required)
    if (env.SARVAM_API_KEY && isRegionalRequired && regionalResponseStrategy) {
      try {
        const startTimeSarvam = Date.now()
        const sarvamRes = await generateChatWithSarvam({
          apiKey: env.SARVAM_API_KEY,
          messages: [
            {
              role: 'system',
              content: `You are a helpful loan recovery assistant for ${TENANT_ID}.
Generate a natural, friendly, and concise response in ${inboundLanguage} based on this strategy:
${regionalResponseStrategy}

Return ONLY the response text. Do not include any prefixes like "Assistant:" or "Response:".`
            },
            {
              role: 'user',
              content: inboundText
            }
          ]
        })
        llmText = sarvamRes.content
        usedModel = `hybrid(${usedModel} + sarvam)`
        app.log.info({
          msg: 'Sarvam Regional Generation completed',
          language: inboundLanguage,
          timeMs: Date.now() - startTimeSarvam
        })
      } catch (err) {
        app.log.warn({ msg: 'Sarvam Generation failed, falling back to OpenAI translation/text', err })
      }
    }

    // 4. Fallback Translation (Legacy) if regional generation wasn't used but language is non-English
    if (
      env.SARVAM_API_KEY &&
      !['en-IN', 'hi-IN'].includes(inboundLanguage) &&
      !llmText.includes(inboundLanguage) && // heuristic to check if it's already regional
      !isRegionalRequired
    ) {
      try {
        const apiKey = env.SARVAM_API_KEY
        const startTranslation = Date.now()
        const translation = await import('@nudges/provider-sarvam').then(m =>
          m.translateWithSarvam({
            apiKey,
            sourceText: llmText,
            targetLanguage: inboundLanguage
          })
        )
        llmText = translation.translatedText
        app.log.info({
          msg: 'Sarvam Translation applied',
          targetLanguage: inboundLanguage,
          timeMs: Date.now() - startTranslation
        })
      } catch (err) {
        app.log.warn({ msg: 'Sarvam Translation failed, falling back to LLM text', err })
      }
    }

    if (whatsappPayload.button) {
      payloadPlainText = `${llmText}\n\n🔗 ${whatsappPayload.button.buttonLabel}: ${whatsappPayload.button.url}`
    } else {
      payloadPlainText = llmText
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
      language: inboundLanguage,
      confidence: 0.9,
      usedModel,
      route: 'handoff',
      guardrailNotes: ['risk_or_complexity_trigger_detected_by_llm']
    })
  }

  const guardrail = guardOutboundMessage(llmText)

  // If the guardrail intercepts, we must rebuild the payload
  if (guardrail.sanitizedMessage) {
    payloadPlainText = payloadPlainText.replace(llmText, guardrail.sanitizedMessage)
  }

  await graph.invoke({
    route: guardrail.allowed && !isRejected ? (route as AgentState['route']) : 'reject',
    body: payloadPlainText,
    language: inboundLanguage,
    confidence: 0.82
  })

  return generateReplyOutputSchema.parse({
    body: payloadPlainText,
    language: inboundLanguage,
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
