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
  whatsappPayload?: {
    body: string
    type?: 'cta_url' | 'quick_reply'
    display_text?: string
    url?: string
    footer?: string
    header?: string
    quickReplies?: { title: string; postbackText?: string }[]
  }
}

const responseSchema = z.object({
  intent: z.enum(['recovery', 'support', 'reject', 'handoff']),
  requiresEscalation: z.boolean(),
  isOutOfScope: z.boolean(),
  whatsappPayload: z.object({
    body: z.string(),
    footer: z.string().optional(),
    header: z.string().optional(),
    button: z
      .object({
        buttonLabel: z.string(),
        url: z.string()
      })
      .nullable()
      .optional(),
    quickReplies: z.array(z.string()).max(3).optional()
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

  const renderedUserPrompt = [
    '--- Recent Chat History ---',
    buildHistoryBlock(input.boundedHistory),
    '---------------------------',
    `Current Inbound message: ${input.inboundText || '(none)'}`,
    `Session Context: ${JSON.stringify(input.session.summaryState)}`,
    `Customer Facts: ${JSON.stringify(input.session.compactFacts)}`,
    `Mobile: ${((input.session.compactFacts.mobile_number as string) || '').slice(-10)}`,
    'Task Constraints: NEVER include raw URLs (http/https) in the message body. All links must be in the CTA button logic.'
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

  console.log('[agent-runtime] LLM Raw Response:', JSON.stringify(response.data, null, 2))

  const { intent, requiresEscalation, isOutOfScope, whatsappPayload } = response.data as z.infer<
    typeof responseSchema
  >

  llmText = whatsappPayload.body
  usedModel = response.model

  if (whatsappPayload.button) {
    // URL is sent in the CTA button, do NOT append it to the plain text body (per technical requirement)
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
  if (whatsappPayload.button) {
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
      type: finalType,
      display_text: whatsappPayload.button?.buttonLabel,
      url: whatsappPayload.button?.url,
      footer: whatsappPayload.footer,
      header: whatsappPayload.header,
      quickReplies: whatsappPayload.quickReplies?.map(title => ({ title }))
    }
  }
}
