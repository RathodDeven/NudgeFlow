import type { DbPool, InteractionEventRow, SessionContext } from '@nudges/db'
import { listRecentCallSummaries } from '@nudges/db'
import { bolnaAgentVariables } from '@nudges/provider-bolna'

export const formatVoiceLoanStage = (stage: string | null): string => {
  if (!stage) return 'current'
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const resolveVoicePendingStep = (stage: string | null): string => {
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

export const formatZonedTime = (iso: string, timeZone: string): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export const formatVoiceLoanAmount = (amount: number | string | null | undefined): string => {
  const parsedAmount = typeof amount === 'number' ? amount : Number(amount)
  return Number.isFinite(parsedAmount) ? `₹${parsedAmount.toLocaleString('en-IN')}` : 'Unknown'
}

export type VoiceUserData = Record<string, string>

const pickBolnaUserData = (source: Record<string, string>): VoiceUserData => {
  const mapped: VoiceUserData = {}
  for (const variable of bolnaAgentVariables) {
    mapped[variable] = source[variable] ?? ''
  }
  return mapped
}

export const buildVoiceUserData = async (
  pool: DbPool,
  params: {
    session: SessionContext
    callReason: string
  }
): Promise<{ userData: VoiceUserData; lastCall: InteractionEventRow | null }> => {
  const lastCalls = await listRecentCallSummaries(pool, params.session.sessionId, 1)
  const lastCall = lastCalls[0] ?? null
  const firmName = params.session.firmName ?? 'Unknown'
  const currentTime = formatZonedTime(new Date().toISOString(), params.session.tenantTimezone)

  const allUserData: Record<string, string> = {
    timezone: params.session.tenantTimezone,
    application_created_at: params.session.applicationCreatedAt
      ? formatZonedTime(params.session.applicationCreatedAt, params.session.tenantTimezone)
      : 'Unknown',
    loan_amount: formatVoiceLoanAmount(params.session.loanAmount),
    loan_stage: formatVoiceLoanStage(params.session.currentStage),
    pending_step: resolveVoicePendingStep(params.session.currentStage),
    customer_name: params.session.fullName ?? 'Unknown',
    firm_name: firmName,
    tenure: String(params.session.tenureMonths ?? ''),
    annual_interest: String(params.session.annualInterestRate ?? ''),
    processing_fee: String(params.session.processingFee ?? ''),
    emi_amount: String(params.session.emiAmount ?? ''),
    time: currentTime
  }

  return {
    userData: pickBolnaUserData(allUserData),
    lastCall
  }
}
