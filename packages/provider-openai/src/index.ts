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
    instructions: request.systemPrompt,
    input: request.userPrompt,
    temperature: request.temperature ?? 0.4
  })

  return {
    text: response.output_text,
    model: response.model
  }
}

import type { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

export type OpenAIChatStructuredRequest<T> = OpenAIChatRequest & {
  schema: z.ZodTypeAny
  schemaName: string
}

export const generateStructuredWithOpenAI = async <T>(
  request: OpenAIChatStructuredRequest<T>
): Promise<{ data: T; model: string }> => {
  const client = new OpenAI({ apiKey: request.apiKey })
  
  // zodResponseFormat returns { type: 'json_schema', json_schema: { name, strict, schema } }
  // We extract the inner json_schema object to pass into text.format as required by the Responses API.
  const zFormat = zodResponseFormat(request.schema, request.schemaName)
  
  const response = await client.responses.create({
    model: request.model,
    instructions: request.systemPrompt,
    input: request.userPrompt,
    temperature: 0,
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
