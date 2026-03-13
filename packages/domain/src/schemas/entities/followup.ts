import { z } from 'zod'

export const followupTaskSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  dueAt: z.string().datetime(),
  attemptNumber: z.number().int().positive(),
  status: z.enum(['scheduled', 'processing', 'completed', 'cancelled', 'failed']),
  reason: z.enum(['initial', 'no_response', 'objection', 'manual_retry']),
  experimentArm: z.string().optional()
})

export type FollowupTask = z.infer<typeof followupTaskSchema>
