import { z } from 'zod'
import { channelSchema, summaryStateSchema } from './core'

export const messageEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  channel: channelSchema,
  direction: z.enum(['inbound', 'outbound', 'system']),
  providerMessageId: z.string().optional(),
  body: z.string(),
  language: z.string().optional(),
  createdAt: z.string().datetime()
})

export const conversationSessionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  loanCaseId: z.string().uuid(),
  isAgentActive: z.boolean().default(true),
  channel: channelSchema.default('whatsapp'),
  summaryState: summaryStateSchema,
  compactFacts: z.record(z.string(), z.unknown()),
  messageCount: z.number().int().nonnegative(),
  tokenEstimate: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export type ConversationSession = z.infer<typeof conversationSessionSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
