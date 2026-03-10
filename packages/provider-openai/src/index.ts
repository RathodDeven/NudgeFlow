import OpenAI from 'openai'

export type OpenAIChatRequest = {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
}

export const generateWithOpenAI = async (
  request: OpenAIChatRequest
): Promise<{ text: string; model: string }> => {
  const client = new OpenAI({ apiKey: request.apiKey })
  const response = await client.responses.create({
    model: request.model,
    input: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt }
    ],
    temperature: request.temperature ?? 0.4
  })

  return {
    text: response.output_text,
    model: response.model
  }
}

export type OpenAIChatStructuredRequest<T> = OpenAIChatRequest & {
  schema: Record<string, unknown>
  schemaName: string
}

import { zodResponseFormat } from 'openai/helpers/zod'
import type { z } from 'zod'

export const generateStructuredWithOpenAI = async <T>(
  request: OpenAIChatStructuredRequest<T>
): Promise<{ data: T; model: string }> => {
  const client = new OpenAI({ apiKey: request.apiKey })
  const response = await client.beta.chat.completions.parse({
    model: request.model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt }
    ],
    temperature: 0,
    response_format: zodResponseFormat(request.schema as unknown as z.ZodTypeAny, request.schemaName)
  })

  if (!response.choices[0]?.message.parsed) {
    throw new Error('Failed to parse structured response from OpenAI')
  }

  return {
    data: response.choices[0].message.parsed as T,
    model: response.model
  }
}
