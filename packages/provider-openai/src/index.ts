import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { z } from 'zod'

export type OpenAIChatMessage = {
  role: 'developer' | 'system' | 'user' | 'assistant'
  content: string
}

export type OpenAIChatRequest = {
  apiKey: string
  model: string
  instructions: string
  input: OpenAIChatMessage[] | string
}

export const generateWithOpenAI = async (
  request: OpenAIChatRequest
): Promise<{ text: string | null; model: string }> => {
  const client = new OpenAI({ apiKey: request.apiKey })
  const response = await client.responses.create({
    model: request.model,
    instructions: request.instructions,
    input: request.input
  })

  return {
    text: response.output_text,
    model: response.model
  }
}

export type OpenAIChatStructuredRequest<T> = OpenAIChatRequest & {
  schema: z.ZodTypeAny
  schemaName: string
}

export const generateStructuredWithOpenAI = async <T>(
  request: OpenAIChatStructuredRequest<T>
): Promise<{ data: T; model: string }> => {
  const client = new OpenAI({ apiKey: request.apiKey })

  const zFormat = zodResponseFormat(request.schema, request.schemaName)

  const response = await client.responses.create({
    model: request.model,
    instructions: request.instructions,
    input: request.input,
    text: {
      format: {
        type: 'json_schema',
        name: zFormat.json_schema.name,
        strict: zFormat.json_schema.strict ?? true,
        schema: zFormat.json_schema.schema as Record<string, unknown>
      }
    }
  })

  if (!response.output_text) {
    throw new Error('Failed to parse structured response from OpenAI (Response text missing)')
  }

  return {
    data: JSON.parse(response.output_text) as T,
    model: response.model
  }
}
