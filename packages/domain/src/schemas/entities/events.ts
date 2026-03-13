import { z } from 'zod'
import { loanStageSchema } from './core'

export const dropoffEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  loanCaseId: z.string().uuid(),
  droppedAtStage: loanStageSchema,
  droppedAt: z.string().datetime(),
  reason: z.string().optional(),
  source: z.enum(['excel', 'api_poll', 'manual']).default('excel')
})

export const consentRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  source: z.enum(['partner_claim', 'explicit_user_opt_in']),
  evidenceRef: z.string().optional(),
  grantedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional()
})

export const handoffEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  changedBy: z.string(),
  mode: z.enum(['human_takeover', 'agent_resume']),
  reason: z.string().optional(),
  createdAt: z.string().datetime()
})

export const statusPollResultSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  loanCaseId: z.string().uuid(),
  previousStage: loanStageSchema,
  polledStage: loanStageSchema,
  progressed: z.boolean(),
  providerRef: z.string().optional(),
  polledAt: z.string().datetime()
})

export const experimentAssignmentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  experimentKey: z.string(),
  variant: z.string(),
  assignedAt: z.string().datetime()
})

export type DropoffEvent = z.infer<typeof dropoffEventSchema>
export type ConsentRecord = z.infer<typeof consentRecordSchema>
export type HandoffEvent = z.infer<typeof handoffEventSchema>
export type StatusPollResult = z.infer<typeof statusPollResultSchema>
export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>
