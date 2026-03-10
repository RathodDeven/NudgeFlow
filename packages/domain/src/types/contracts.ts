import { z } from 'zod'
import {
  canonicalIngestionRowSchema,
  conversationSessionSchema,
  messageEventSchema
} from '../schemas/entities'

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
  trigger: z.enum(['inbound_reply', 'scheduled_followup', 'manual_retry'])
})

export const generateReplyOutputSchema = z.object({
  body: z.string(),
  language: z.string(),
  confidence: z.number().min(0).max(1),
  usedModel: z.string(),
  route: z.enum(['recovery', 'support', 'reject', 'handoff']),
  guardrailNotes: z.array(z.string()).default([]),
  suggestedNextFollowupAt: z.string().datetime().optional()
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
export type IngestExcelRequest = z.infer<typeof ingestExcelRequestSchema>
export type IngestExcelResponse = z.infer<typeof ingestExcelResponseSchema>
export type HandoffRequest = z.infer<typeof handoffRequestSchema>
export type MetricsResponse = z.infer<typeof metricsResponseSchema>
