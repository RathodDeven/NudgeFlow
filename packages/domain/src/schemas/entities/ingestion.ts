import { z } from 'zod'
import { languageSchema, loanStageSchema } from './core'

export const canonicalIngestionRowSchema = z.object({
  externalUserId: z.string(),
  phoneE164: z.string(),
  dropoffStage: loanStageSchema,
  lastStageAt: z.string().datetime(),
  localeHint: languageSchema.optional(),
  consentFlag: z.boolean(),
  partnerCaseId: z.string(),
  deepLink: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).default({})
})

export const ingestionMappingProfileSchema = z.object({
  id: z.string(),
  fields: z.object({
    externalUserId: z.string(),
    phoneE164: z.string(),
    dropoffStage: z.string(),
    lastStageAt: z.string(),
    localeHint: z.string(),
    consentFlag: z.string(),
    partnerCaseId: z.string(),
    deepLink: z.string()
  })
})

export type CanonicalIngestionRow = z.infer<typeof canonicalIngestionRowSchema>
export type IngestionMappingProfile = z.infer<typeof ingestionMappingProfileSchema>
