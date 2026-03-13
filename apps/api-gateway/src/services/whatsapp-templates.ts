import type { DbUser } from '@nudges/db'

const resolvePendingStep = (stage?: string): string => {
  switch ((stage ?? '').toLowerCase()) {
    case 'journey_started':
    case 'offer':
    case 'fresh_loan':
    case 'document_upload':
      return 'document upload'
    case 'loan_detail_submitted':
      return 'loan detail submission'
    case 'under_review':
      return 'verification review'
    case 'credit_decisioning':
      return 'credit decisioning'
    case 'approved':
      return 'disbursal formalities'
    case 'disbursal':
      return 'disbursal confirmation'
    default:
      return 'document upload'
  }
}

export const buildTemplateVariables = (user: DbUser, variableOrder: string[]): Record<string, string> => {
  const parsedAmount = typeof user.loanAmount === 'number' ? user.loanAmount : Number(user.loanAmount)
  const values: Record<string, string> = {
    user_name: user.fullName ?? 'Customer',
    loan_amount: Number.isFinite(parsedAmount) ? parsedAmount.toLocaleString('en-IN') : '0',
    pending_step: resolvePendingStep(user.currentStage)
  }

  const ordered: Record<string, string> = {}
  for (const key of variableOrder) {
    ordered[key] = values[key] ?? ''
  }

  if (variableOrder.length === 0) return values
  return ordered
}
