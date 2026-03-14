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

const resolvePendingDocument = (user: DbUser): string => {
  const metadata = user.metadata as Record<string, unknown> | undefined
  const fromMetadata = metadata?.pending_document
  if (typeof fromMetadata === 'string' && fromMetadata.trim().length > 0) {
    return fromMetadata
  }

  const normalized = (user.currentStage ?? '').toLowerCase()
  if (['journey_started', 'offer', 'fresh_loan', 'document_upload'].includes(normalized)) {
    return 'Pending Document'
  }

  return resolvePendingStep(user.currentStage)
}

export const buildTemplateVariables = (user: DbUser, variableOrder: string[]): Record<string, string> => {
  const parsedAmount = typeof user.loanAmount === 'number' ? user.loanAmount : Number(user.loanAmount)
  const values: Record<string, string> = {
    user_name: user.fullName ?? 'Customer',
    loan_amount: Number.isFinite(parsedAmount) ? parsedAmount.toLocaleString('en-IN') : '0',
    pending_step: resolvePendingStep(user.currentStage),
    application_id: user.partnerCaseId ?? user.externalUserId,
    pending_document: resolvePendingDocument(user),
    disbursement_amount: Number.isFinite(parsedAmount) ? parsedAmount.toLocaleString('en-IN') : '0'
  }

  const ordered: Record<string, string> = {}
  for (const key of variableOrder) {
    ordered[key] = values[key] ?? ''
  }

  if (variableOrder.length === 0) return values
  return ordered
}
