export const buildUtilitiesContext = (
  compactFacts: Record<string, unknown>,
  stageContext: string
): string => {
  const appDateStr = compactFacts.application_created_at
  const appDate =
    appDateStr && !Number.isNaN(Date.parse(String(appDateStr))) ? new Date(String(appDateStr)) : new Date()
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24))

  const factsEntries = Object.entries(compactFacts)
    .filter(
      ([key]) =>
        ![
          'mobile_number',
          'user_name',
          'user_city',
          'user_state',
          'application_created_at',
          'application_updated_at'
        ].includes(key)
    )
    .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${value}`)
    .join('\n')

  return `
[Utilities Context]
- Current Date: ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
- Days Since Applied: ${diffDays}
- Original Application Date: ${appDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
- Last Update Date: ${compactFacts.application_updated_at ? new Date(String(compactFacts.application_updated_at)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}
- Current Stage: ${stageContext}
${factsEntries}
`.trim()
}
