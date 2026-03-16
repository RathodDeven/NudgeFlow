export const detectInboundLanguage = async (inboundText: string): Promise<string> => {
  const isStrictEnglish =
    /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(inboundText) &&
    !/(kya|loan|bhai|karna|hai|hum|aap|tame|kon|chho|naamu|hu|kem|nathi)/i.test(inboundText)
  const hasDevanagari = /[\u0900-\u097F]/.test(inboundText)

  if (inboundText.length < 30 && hasDevanagari && !inboundText.includes('?')) {
    return 'hi-IN'
  }

  if (inboundText.length < 15 && isStrictEnglish && !/(tame|kon|chho|hai|kya|aap)/i.test(inboundText)) {
    return 'en-IN'
  }

  // Fallback to en-IN (Hinglish/English hybrid) as OpenAI handles switching natively
  return 'en-IN'
}

export const normalizePreferredLanguage = (inboundLanguage: string): 'english' | 'hindi' | 'hinglish' => {
  if (inboundLanguage === 'hi-IN') return 'hindi'
  if (inboundLanguage === 'en-IN') return 'english'
  return 'hinglish'
}
