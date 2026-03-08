export type SarvamTranslationRequest = {
  apiKey: string
  baseUrl: string
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
}

export const detectLanguage = (text: string): string => {
  if (/\p{Script=Gujarati}/u.test(text)) return 'gujarati'
  if (/\p{Script=Devanagari}/u.test(text)) return 'hindi'
  if (/[a-zA-Z]/.test(text) && /(kya|loan|bhai|karna|hai)/i.test(text)) return 'hinglish'
  return 'english'
}

export const translateWithSarvam = async (
  request: SarvamTranslationRequest
): Promise<{ translatedText: string; provider: string }> => {
  const response = await fetch(`${request.baseUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`
    },
    body: JSON.stringify({
      input: request.sourceText,
      source_language: request.sourceLanguage,
      target_language: request.targetLanguage
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Sarvam translation failed: ${response.status} ${body}`)
  }

  const payload = (await response.json()) as { translated_text?: string }
  return {
    translatedText: payload.translated_text ?? request.sourceText,
    provider: 'sarvam'
  }
}
