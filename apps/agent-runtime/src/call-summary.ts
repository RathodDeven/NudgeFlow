import type { SummaryState } from '@nudges/domain'
import { generateStructuredWithOpenAI } from '@nudges/provider-openai'
import { z } from 'zod'

export type CallSummaryInput = {
  apiKey?: string
  model: string
  transcript: string
  summaryState: SummaryState
  compactFacts: Record<string, unknown>
}

export type CallSummaryOutput = {
  summary: string
  suggestedNextCallAt?: string
  updatedSummaryState?: SummaryState
}

const responseSchema = z.object({
  summary: z.string(),
  suggestedNextCallAt: z.string().datetime().optional(),
  updatedSummaryState: z
    .object({
      sessionIntent: z.string(),
      userObjections: z.array(z.string()),
      stageContext: z.string(),
      persuasionPath: z.string(),
      commitments: z.array(z.string()),
      nextAction: z.string(),
      preferredLanguage: z.string().optional()
    })
    .optional()
})

export const summarizeCall = async (input: CallSummaryInput): Promise<CallSummaryOutput> => {
  if (!input.apiKey) {
    return { summary: input.transcript.slice(0, 280) }
  }

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    {
      role: 'user',
      content: [
        `Transcript: ${input.transcript}`,
        `Summary state: ${JSON.stringify(input.summaryState)}`,
        `Compact facts: ${JSON.stringify(input.compactFacts)}`
      ].join('\n')
    }
  ]

  const response = await generateStructuredWithOpenAI({
    apiKey: input.apiKey,
    model: input.model,
    schema: responseSchema,
    schemaName: 'CallSummary',
    instructions:
      'You are summarizing a loan recovery call. Provide a concise summary (1-3 sentences) and extract a follow-up call datetime if the user agreed on one. Return ISO 8601 in suggestedNextCallAt. If no follow-up time mentioned, omit it.',
    input: messages
  })

  const data = response.data as z.infer<typeof responseSchema>
  return {
    summary: data.summary,
    suggestedNextCallAt: data.suggestedNextCallAt,
    updatedSummaryState: data.updatedSummaryState ? (data.updatedSummaryState as SummaryState) : undefined
  }
}
