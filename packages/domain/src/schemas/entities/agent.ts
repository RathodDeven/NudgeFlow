import { z } from 'zod'
import { channelSchema } from './core'

export const agentDecisionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  trigger: z.string(),
  route: z.string(),
  confidence: z.number().min(0).max(1),
  guardrailNotes: z.array(z.string()).default([]),
  suggestedNextFollowupAt: z.string().datetime().optional(),
  modelName: z.string(),
  createdAt: z.string().datetime()
})

export const interactionEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  channel: channelSchema,
  direction: z.enum(['inbound', 'outbound', 'system']),
  eventType: z.string(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  callDisposition: z.string().optional(),
  callDurationSeconds: z.number().int().nonnegative().optional(),
  consentFlag: z.boolean().optional(),
  handoffFlag: z.boolean().optional(),
  providerId: z.string().optional(),
  providerTimestamp: z.string().datetime().optional(),
  createdAt: z.string().datetime()
})

export const callAttemptSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  interactionEventId: z.string().uuid(),
  disposition: z.string().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  providerCallId: z.string().optional(),
  providerTimestamp: z.string().datetime().optional(),
  createdAt: z.string().datetime()
})

export const scheduledActionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  actionType: z.string(),
  actionSubtype: z.string().optional(),
  dueAt: z.string().datetime(),
  status: z.string(),
  retryCount: z.number().int().nonnegative(),
  idempotencyKey: z.string(),
  lastError: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export const policyEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  decision: z.string(),
  reasonCodes: z.array(z.string()).default([]),
  createdAt: z.string().datetime()
})

export type AgentDecision = z.infer<typeof agentDecisionSchema>
export type InteractionEvent = z.infer<typeof interactionEventSchema>
export type CallAttempt = z.infer<typeof callAttemptSchema>
export type ScheduledAction = z.infer<typeof scheduledActionSchema>
export type PolicyEvent = z.infer<typeof policyEventSchema>
