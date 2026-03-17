import { generateStructuredWithOpenAI } from '@nudges/provider-openai'
import { z } from 'zod'
import { buildHistoryBlock } from './history'
import { type PromptContext, buildSystemPrompt } from './prompt-context'
import { buildUtilitiesContext } from './utilities'

export type AgentReplyInput = {
  tenantId: string
  env: {
    OPENAI_API_KEY?: string
    OPENAI_MODEL_ROUTINE: string
  }
  session: {
    summaryState: { stageContext: string }
    compactFacts: Record<string, unknown>
  }
  inboundText: string
  boundedHistory: { direction: 'inbound' | 'outbound'; body: string }[]
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
  whatsappPayload: {
    body: string
    type: 'cta_url' | 'quick_reply' | null
    includeCta: boolean
    display_text: string | null
    url: string | null
    footer: string | null
    header: string | null
    quickReplies: { title: string; postbackText: string | null }[] | null
  } | null
}

const responseSchema = z.object({
  intent: z.enum(['recovery', 'support', 'reject', 'handoff']),
  requiresEscalation: z.boolean(),
  isOutOfScope: z.boolean(),
  whatsappPayload: z.object({
    body: z.string(),
    footer: z.string().nullable(),
    header: z.string().nullable(),
    includeCta: z.boolean().nullable().default(false),
    buttonLabel: z.string().nullable(),
    quickReplies: z.array(z.string()).max(3).nullable()
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
    return {
      payloadPlainText,
      llmText,
      usedModel,
      route,
      isEscalated,
      isRejected,
      whatsappPayload: null
    }
  }

  usedModel = input.env.OPENAI_MODEL_ROUTINE

  const utilitiesContext = buildUtilitiesContext(
    input.session.compactFacts,
    input.session.summaryState.stageContext
  )
  const systemPrompt = buildSystemPrompt(input.promptContext, utilitiesContext)

  // Move dynamic context into instructions (system prompt)
  const expandedInstructions = [
    systemPrompt,
    '',
    '--- CURRENT SESSION STATE ---',
    JSON.stringify(input.session.summaryState, null, 2),
    '-------------------------------'
  ].join('\n')

  const messages: { role: 'user' | 'assistant'; content: string }[] = []

  // Add history
  for (const m of input.boundedHistory) {
    messages.push({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body
    })
  }

  // CURRENT SESSION CONTEXT is already in the boundedHistory from the gateway.
  // No need to push input.inboundText separately as it causes duplication.

  console.log(`[agent-runtime] System Instructions for ${input.tenantId} (includes facts)`)
  console.log(`[agent-runtime] Sending ${messages.length} clean chat messages in input to LLM`)

  console.log(`[agent-runtime] Input Messages: ${JSON.stringify(messages, null, 2)}`)

  const response = await generateStructuredWithOpenAI({
    apiKey: input.env.OPENAI_API_KEY,
    model: usedModel,
    schema: responseSchema,
    schemaName: 'AgentResponse',
    instructions: expandedInstructions,
    input: messages
  })

  console.log('[agent-runtime] LLM Raw Response:', JSON.stringify(response.data, null, 2))

  const { intent, requiresEscalation, isOutOfScope, whatsappPayload } = response.data as z.infer<
    typeof responseSchema
  >

  llmText = whatsappPayload.body
  usedModel = response.model

  if (whatsappPayload.includeCta) {
    payloadPlainText = llmText
  } else if (whatsappPayload.quickReplies?.length) {
    payloadPlainText = `${llmText}\n\n${whatsappPayload.quickReplies.map(qr => `[ ${qr} ]`).join(' ')}`
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

  let finalType: 'cta_url' | 'quick_reply' | undefined = undefined
  if (whatsappPayload.includeCta) {
    finalType = 'cta_url'
  } else if (whatsappPayload.quickReplies?.length) {
    finalType = 'quick_reply'
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
      type: finalType ?? null,
      includeCta: whatsappPayload.includeCta ?? false,
      display_text: whatsappPayload.buttonLabel ?? null,
      url: null, // Gateway resolves this
      footer: whatsappPayload.footer ?? null,
      header: whatsappPayload.header ?? null,
      quickReplies: whatsappPayload.quickReplies?.map(title => ({ title, postbackText: null })) ?? null
    }
  }
}
