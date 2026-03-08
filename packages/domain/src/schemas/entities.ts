import { z } from 'zod'

export const loanStageSchema = z.enum([
  'login',
  'otp_verify',
  'pan',
  'personal_details',
  'email_otp',
  'udyam',
  'business_details',
  'offer',
  'offer_accept',
  'fresh_loan',
  'document_upload',
  'under_review',
  'vkyc',
  'vpd',
  'credit_decisioning',
  'boost_offer',
  'converted',
  'inactive'
])

export const languageSchema = z.enum([
  'english',
  'hinglish',
  'hindi',
  'gujarati',
  'marathi',
  'bengali',
  'tamil',
  'telugu',
  'kannada',
  'malayalam',
  'punjabi'
])

export const channelSchema = z.enum(['whatsapp', 'voice', 'email', 'sms'])

export const tenantSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(2),
  displayName: z.string().min(2),
  timezone: z.string().default('Asia/Kolkata'),
  knowledgePath: z.string(),
  createdAt: z.string().datetime()
})

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

export const loanCaseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  partnerCaseId: z.string(),
  currentStage: loanStageSchema,
  isReactivated: z.boolean().default(false),
  deepLink: z.string().url().optional(),
  updatedAt: z.string().datetime()
})

export const dropoffEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  loanCaseId: z.string().uuid(),
  droppedAtStage: loanStageSchema,
  droppedAt: z.string().datetime(),
  reason: z.string().optional(),
  source: z.enum(['excel', 'api_poll', 'manual']).default('excel')
})

export const messageEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  channel: channelSchema,
  direction: z.enum(['inbound', 'outbound']),
  providerMessageId: z.string().optional(),
  body: z.string(),
  language: languageSchema.optional(),
  createdAt: z.string().datetime()
})

export const summaryStateSchema = z.object({
  sessionIntent: z.string(),
  userObjections: z.array(z.string()),
  stageContext: loanStageSchema,
  persuasionPath: z.string(),
  commitments: z.array(z.string()).default([]),
  nextAction: z.string(),
  preferredLanguage: languageSchema.optional()
})

export const conversationSessionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  loanCaseId: z.string().uuid(),
  isAgentActive: z.boolean().default(true),
  channel: channelSchema.default('whatsapp'),
  summaryState: summaryStateSchema,
  compactFacts: z.record(z.string(), z.string()),
  messageCount: z.number().int().nonnegative(),
  tokenEstimate: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

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

export const policyStateSchema = z.object({
  sessionId: z.string().uuid(),
  blocked: z.boolean().default(false),
  optedOut: z.boolean().default(false),
  nonResponsive: z.boolean().default(false),
  attemptsInWindow: z.number().int().nonnegative().default(0),
  windowStartAt: z.string().datetime()
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

export type LoanStage = z.infer<typeof loanStageSchema>
export type CanonicalIngestionRow = z.infer<typeof canonicalIngestionRowSchema>
export type SummaryState = z.infer<typeof summaryStateSchema>
export type IngestionMappingProfile = z.infer<typeof ingestionMappingProfileSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
export type LoanCase = z.infer<typeof loanCaseSchema>
export type DropoffEvent = z.infer<typeof dropoffEventSchema>
export type ConversationSession = z.infer<typeof conversationSessionSchema>
export type MessageEvent = z.infer<typeof messageEventSchema>
export type FollowupTask = z.infer<typeof followupTaskSchema>
export type PolicyState = z.infer<typeof policyStateSchema>
export type ConsentRecord = z.infer<typeof consentRecordSchema>
export type HandoffEvent = z.infer<typeof handoffEventSchema>
export type StatusPollResult = z.infer<typeof statusPollResultSchema>
export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>
