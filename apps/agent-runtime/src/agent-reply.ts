import { generateStructuredWithOpenAI } from '@nudges/provider-openai'
import { generateChatWithSarvam } from '@nudges/provider-sarvam'
import { z } from 'zod'
import { buildHistoryBlock } from './history'
import { type PromptContext, buildSystemPrompt } from './prompt-context'
import { buildUtilitiesContext } from './utilities'

export type AgentReplyInput = {
  tenantId: string
  env: {
    OPENAI_API_KEY?: string
    OPENAI_MODEL_ROUTINE: string
    SARVAM_API_KEY?: string
    SARVAM_BASE_URL?: string
  }
  session: {
    summaryState: { stageContext: string }
    compactFacts: Record<string, unknown>
  }
  inboundText: string
  inboundLanguage: string
  boundedHistory: { direction: 'inbound' | 'outbound'; body: string }[]
  callSummaries?: {
    summary: string
    disposition?: string
    durationSeconds?: number
    providerId?: string
    occurredAt?: string
  }[]
  fallbackText: string
  promptContext: PromptContext
}

export type AgentReplyResult = {
  payloadPlainText: string
  llmText: string
  usedModel: string
  route: 'recovery' | 'support' | 'reject' | 'handoff'
  isEscalated: boolean
  isRejected: boolean
  whatsappPayload?: {
    body: string
    type?: 'cta_url'
    display_text?: string
    url?: string
    footer?: string
  }
}

const responseSchema = z.object({
  intent: z.enum(['recovery', 'support', 'reject', 'handoff']),
  requiresEscalation: z.boolean(),
  isOutOfScope: z.boolean(),
  isRegionalRequired: z.boolean(),
  regionalResponseStrategy: z.string().nullable(),
  whatsappPayload: z.object({
    body: z.string(),
    button: z
      .object({
        buttonLabel: z.string(),
        url: z.string()
      })
      .nullable()
      .optional()
  })
})

export const generateAgentReply = async (input: AgentReplyInput): Promise<AgentReplyResult> => {
  let route: AgentReplyResult['route'] = 'recovery'
  let llmText = input.fallbackText
  let usedModel = 'deterministic'
  let isRejected = false
  let isEscalated = false
  let payloadPlainText = llmText

  if (!input.env.OPENAI_API_KEY) {
    return { payloadPlainText, llmText, usedModel, route, isEscalated, isRejected }
  }

  usedModel = input.env.OPENAI_MODEL_ROUTINE

  const summaries = input.callSummaries ?? []
  const callSummaryBlock = summaries.length
    ? summaries
        .map(summary => {
          const meta = [
            summary.disposition ? `disposition=${summary.disposition}` : null,
            summary.durationSeconds ? `duration=${summary.durationSeconds}s` : null,
            summary.providerId ? `providerId=${summary.providerId}` : null,
            summary.occurredAt ? `at=${summary.occurredAt}` : null
          ]
            .filter(Boolean)
            .join(', ')
          return `- ${summary.summary}${meta ? ` (${meta})` : ''}`
        })
        .join('\n')
    : '(No call summaries)'

  const renderedUserPrompt = [
    '--- Chat History ---',
    buildHistoryBlock(input.boundedHistory),
    '--------------------',
    '--- Call Summaries (do not assume full transcripts) ---',
    callSummaryBlock,
    '--------------------',
    `Current Inbound message: ${input.inboundText || '(none)'}`,
    `Detected incoming language: ${input.inboundLanguage || 'en-IN'}`,
    `Persisted summary state: ${JSON.stringify(input.session.summaryState)}`,
    `Compact facts: ${JSON.stringify(input.session.compactFacts)}`,
    `Stage: ${input.session.summaryState.stageContext}`,
    `Exact 10-digit mobile number: ${(input.session.compactFacts.mobile_number as string || '').slice(-10)}`,
    'Task: 1. Review the "Chat History" and "Current Inbound message". 2. If the user is just greeting (e.g., "Hi", "Hello", "Hey"), respond with a VERY SHORT, friendly greeting (e.g., "Hi! How can I help you today?"). 3. CRITICAL: For a simple greeting, DO NOT mention loans, reserved amounts, or pending steps. 4. If they ask a specific support question, answer it concisely. 5. Only if they ask about their status or if the conversation has already moved past greetings, provide a nudge about their current stage. 6. Classify intent and decide if a CTA button is helpful now. NEVER include a CTA button for a simple greeting.'
  ].join('\n')

  const utilitiesContext = buildUtilitiesContext(
    input.session.compactFacts,
    input.session.summaryState.stageContext
  )
  const systemPrompt = buildSystemPrompt(input.promptContext, utilitiesContext)

  console.log(`[agent-runtime] System Prompt for ${input.tenantId}:\n${systemPrompt}`)
  console.log(`[agent-runtime] User Prompt:\n${renderedUserPrompt}`)

  const response = await generateStructuredWithOpenAI({
    apiKey: input.env.OPENAI_API_KEY,
    model: usedModel,
    schema: responseSchema,
    schemaName: 'AgentResponse',
    systemPrompt,
    userPrompt: renderedUserPrompt
  })

  console.log(`[agent-runtime] LLM Raw Response:`, JSON.stringify(response.data, null, 2))

  const {
    intent,
    requiresEscalation,
    isOutOfScope,
    isRegionalRequired,
    regionalResponseStrategy,
    whatsappPayload
  } = response.data as z.infer<typeof responseSchema>


  llmText = whatsappPayload.body
  usedModel = response.model

  if (input.env.SARVAM_API_KEY && isRegionalRequired && regionalResponseStrategy) {
    try {
      const sarvamRes = await generateChatWithSarvam({
        apiKey: input.env.SARVAM_API_KEY,
        messages: [
          {
            role: 'system',
            content: `You are a helpful loan recovery assistant for ${input.tenantId}.
Generate a natural, friendly, and concise response in ${input.inboundLanguage} based on this strategy:
${regionalResponseStrategy}

Return ONLY the response text. Do not include any prefixes like "Assistant:" or "Response:".`
          },
          { role: 'user', content: input.inboundText }
        ]
      })
      llmText = sarvamRes.content
      usedModel = `hybrid(${usedModel} + sarvam)`
    } catch (err) {
      console.warn('[agent-runtime] Sarvam Generation failed, falling back to OpenAI translation/text', err)
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

  return {
    payloadPlainText,
    llmText,
    usedModel,
    route,
    isEscalated,
    isRejected,
    whatsappPayload: {
      body: llmText,
      type: whatsappPayload.button ? 'cta_url' : undefined,
      display_text: whatsappPayload.button?.buttonLabel,
      url: whatsappPayload.button?.url,
    }
  }
}
