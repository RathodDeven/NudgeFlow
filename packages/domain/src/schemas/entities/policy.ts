import { z } from 'zod'

export const policyStateSchema = z.object({
  sessionId: z.string().uuid(),
  blocked: z.boolean().default(false),
  optedOut: z.boolean().default(false),
  nonResponsive: z.boolean().default(false),
  attemptsInWindow: z.number().int().nonnegative().default(0),
  windowStartAt: z.string().datetime(),
  lastAttemptAt: z.string().datetime().nullable().optional()
})

export type PolicyState = z.infer<typeof policyStateSchema>
