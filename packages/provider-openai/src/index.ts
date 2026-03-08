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
