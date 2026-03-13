import { z } from 'zod'

export const loanStageSchema = z.enum([
  'journey_started',
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
  'loan_detail_submitted',
  'under_review',
  'vkyc',
  'vpd',
  'credit_decisioning',
  'approved',
  'disbursal',
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

export const summaryStateSchema = z.object({
  sessionIntent: z.string(),
  userObjections: z.array(z.string()),
  stageContext: loanStageSchema,
  persuasionPath: z.string(),
  commitments: z.array(z.string()).default([]),
  nextAction: z.string(),
  preferredLanguage: languageSchema.optional()
})

export type LoanStage = z.infer<typeof loanStageSchema>
export type SummaryState = z.infer<typeof summaryStateSchema>
