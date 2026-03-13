import { z } from 'zod'
import { languageSchema } from './core'

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  externalUserId: z.string(),
  fullName: z.string().optional(),
  phoneE164: z.string(),
  localeHint: languageSchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  consentProvided: z.boolean().default(false),
  createdAt: z.string().datetime()
})

export type UserProfile = z.infer<typeof userProfileSchema>
