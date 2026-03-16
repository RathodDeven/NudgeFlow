import { z } from 'zod'
import { loanStageSchema } from './core'

export const loanCaseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  partnerCaseId: z.string(),
  currentStage: loanStageSchema,
  loanAmount: z.number().optional().nullable(),
  tenureMonths: z.number().int().optional().nullable(),
  annualInterestRate: z.number().optional().nullable(),
  processingFee: z.number().optional().nullable(),
  isReactivated: z.boolean().default(false),
  deepLink: z.string().url().optional(),
  updatedAt: z.string().datetime()
})

export type LoanCase = z.infer<typeof loanCaseSchema>
