import { z } from 'zod'
import {
  canonicalIngestionRowSchema,
  channelSchema,
  conversationSessionSchema,
  messageEventSchema,
  summaryStateSchema
} from '../schemas/entities'

export const callDispositionSchema = z.enum(['answered', 'no_answer', 'busy', 'failed'])
export const interactionEventTypeSchema = z.enum([
  'message',
  'call_attempt',
  'call_summary',
  'status_update',
  'handoff',
  'consent',
  'system'
])

export const interactionEventPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  channel: channelSchema,
  direction: z.enum(['inbound', 'outbound', 'system']),
  eventType: interactionEventTypeSchema,
  transcript: z.string().optional(),
  summary: z.string().optional(),
  callDisposition: callDispositionSchema.optional(),
  callDurationSeconds: z.number().int().nonnegative().optional(),
  consentFlag: z.boolean().optional(),
  handoffFlag: z.boolean().optional(),
  providerId: z.string().optional(),
  providerTimestamp: z.string().datetime().optional()
})

export const callSummarySchema = z.object({
  summary: z.string(),
  disposition: callDispositionSchema.optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  providerId: z.string().optional(),
  occurredAt: z.string().datetime().optional()
})

export const sendMessageRequestSchema = z.object({
  sessionId: z.string().uuid(),
  toPhoneE164: z.string(),
  taskId: z.string().uuid().optional(),
  body: z.string(),
  language: z.string().optional(),
  templateName: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional()
})

export const generateReplyInputSchema = z.object({
  session: conversationSessionSchema,
  lastInboundMessage: messageEventSchema.optional(),
  chatHistory: z.array(messageEventSchema).optional(),
  callSummaries: z.array(callSummarySchema).optional(),
  trigger: z.enum(['inbound_reply', 'scheduled_followup', 'manual_retry'])
})

export const memoryDeltaSchema = z.object({
  summaryState: summaryStateSchema,
  compactFactsDelta: z.record(z.string(), z.unknown()).default({}),
  tokenEstimate: z.number().int().nonnegative()
})

export const generateReplyOutputSchema = z.object({
  body: z.string(),
  language: z.string(),
  confidence: z.number().min(0).max(1),
  usedModel: z.string(),
  route: z.enum(['recovery', 'support', 'reject', 'handoff']),
  guardrailNotes: z.array(z.string()).default([]),
  suggestedNextFollowupAt: z.string().datetime().optional(),
  memoryDelta: memoryDeltaSchema
})

export const summarizeCallInputSchema = z.object({
  sessionId: z.string().uuid(),
  summaryState: summaryStateSchema,
  compactFacts: z.record(z.string(), z.unknown()),
  transcript: z.string().min(20)
})

export const summarizeCallOutputSchema = z.object({
  summary: z.string(),
  suggestedNextCallAt: z.string().datetime().optional(),
  updatedSummaryState: summaryStateSchema.optional()
})

export const ingestExcelRequestSchema = z.object({
  tenantId: z.string().uuid(),
  mappingProfileId: z.string(),
  rows: z.array(canonicalIngestionRowSchema)
})

export const ingestExcelResponseSchema = z.object({
  accepted: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  errors: z.array(z.string())
})

export const handoffRequestSchema = z.object({
  reason: z.string().optional(),
  changedBy: z.string()
})

export const metricsResponseSchema = z.object({
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  reached: z.number().int().nonnegative(),
  replied: z.number().int().nonnegative(),
  resumed: z.number().int().nonnegative(),
  progressed: z.number().int().nonnegative(),
  converted: z.number().int().nonnegative()
})

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>
export type GenerateReplyInput = z.infer<typeof generateReplyInputSchema>
export type GenerateReplyOutput = z.infer<typeof generateReplyOutputSchema>
export type InteractionEventPayload = z.infer<typeof interactionEventPayloadSchema>
export type CallSummary = z.infer<typeof callSummarySchema>
export type MemoryDelta = z.infer<typeof memoryDeltaSchema>
export type SummarizeCallInput = z.infer<typeof summarizeCallInputSchema>
export type SummarizeCallOutput = z.infer<typeof summarizeCallOutputSchema>
export type IngestExcelRequest = z.infer<typeof ingestExcelRequestSchema>
export type IngestExcelResponse = z.infer<typeof ingestExcelResponseSchema>
export type HandoffRequest = z.infer<typeof handoffRequestSchema>
export type MetricsResponse = z.infer<typeof metricsResponseSchema>
