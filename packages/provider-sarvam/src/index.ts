import { SarvamAIClient } from 'sarvamai'

export type TranslationRequest = {
  apiKey: string
  baseUrl?: string
  sourceText: string
  sourceLanguage?: string
  targetLanguage: string
}

export type LanguageDetectionResult = {
  languageCode: string
  scriptCode: string
  provider: 'sarvam'
}

export type TranslationResult = {
  translatedText: string
  provider: 'sarvam'
}

const getSarvamClient = (apiKey: string): SarvamAIClient => new SarvamAIClient({ apiSubscriptionKey: apiKey })

/**
 * Detect the language and script of a given text using the Sarvam AI Language Identification API.
 * Returns a locale code like `hi-IN`, `en-IN`, `gu-IN` etc.
 */
export const detectLanguageWithSarvam = async (
  text: string,
  apiKey: string
): Promise<LanguageDetectionResult> => {
  const client = getSarvamClient(apiKey)
  const result = await client.text.identifyLanguage({ input: text })
  return {
    languageCode: result.language_code ?? 'en-IN',
    scriptCode: result.script_code ?? 'Latin',
    provider: 'sarvam'
  }
}

/**
 * Translate text using the Sarvam AI Translation API.
 * Use `source_language_code: "auto"` to automatically detect the source language.
 */
export const translateWithSarvam = async (request: TranslationRequest): Promise<TranslationResult> => {
  const client = getSarvamClient(request.apiKey)
  const result = await client.text.translate({
    input: request.sourceText,
    // biome-ignore lint/suspicious/noExplicitAny: sarvamai SDK uses a wide string union type
    source_language_code: (request.sourceLanguage ?? 'auto') as any,
    // biome-ignore lint/suspicious/noExplicitAny: sarvamai SDK uses a wide string union type
    target_language_code: request.targetLanguage as any
  })
  return {
    translatedText: result.translated_text ?? request.sourceText,
    provider: 'sarvam'
  }
}

/**
 * Convenience wrapper used by the agent-runtime.
 * When a Sarvam API key is available, uses the real API.
 * Falls back to a lightweight regex heuristic for sandbox/no-key mode.
 */
export const detectLanguage = async (text: string, apiKey?: string, _baseUrl?: string): Promise<string> => {
  if (apiKey) {
    try {
      const result = await detectLanguageWithSarvam(text, apiKey)
      return result.languageCode
    } catch {
      // fall through to heuristic
    }
  }
  // Heuristic fallback for sandbox / no-key mode
  if (/\p{Script=Gujarati}/u.test(text)) return 'gu-IN'
  if (/\p{Script=Devanagari}/u.test(text)) return 'hi-IN'
  if (/[a-zA-Z]/.test(text) && /(kya|loan|bhai|karna|hai|hum|aap)/i.test(text)) return 'hi-IN'
  return 'en-IN'
}
