export const buildFallbackReply = (
  route: 'recovery' | 'support' | 'reject' | 'proactive_nudge',
  seeded: string
): string => {
  if (route === 'support') {
    return 'Let me review the documentation regarding your request. I can also help you complete the next loan step now.'
  }
  if (route === 'reject') {
    return 'I can help only with your loan application steps, status, and required documents.'
  }
  return seeded
}
