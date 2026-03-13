import type { DbPool, InteractionEventRow, SessionContext } from '@nudges/db'
import { listRecentCallSummaries } from '@nudges/db'

const formatStageLabel = (stage: string | null): string => {
  if (!stage) return 'current'
  return stage
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const resolvePendingStep = (stage: string | null): string => {
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

const formatZonedTime = (iso: string, timeZone: string): string => {
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

export type VoiceUserData = {
  customer_name: string
  loan_stage: string
  pending_step: string
  loan_amount: string
  firm_name: string
  partner_case_id: string
  application_created_at: string
  application_updated_at: string
  call_reason: string
  last_call_summary: string
  last_call_time: string
  last_call_disposition: string
  timezone: string
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

  const parsedAmount =
    typeof params.session.loanAmount === 'number'
      ? params.session.loanAmount
      : Number(params.session.loanAmount)
  const loanAmount = Number.isFinite(parsedAmount) ? `₹${parsedAmount.toLocaleString('en-IN')}` : 'Unknown'
  const firmName = params.session.firmName ?? 'Unknown'
  const lastCallTime = lastCall?.createdAt
    ? formatZonedTime(lastCall.createdAt, params.session.tenantTimezone)
    : 'N/A'

  return {
    userData: {
      customer_name: params.session.fullName ?? 'Unknown',
      loan_stage: formatStageLabel(params.session.currentStage),
      pending_step: resolvePendingStep(params.session.currentStage),
      loan_amount: loanAmount,
      firm_name: firmName,
      partner_case_id: params.session.partnerCaseId ?? 'Unknown',
      application_created_at: params.session.applicationCreatedAt ?? 'Unknown',
      application_updated_at: params.session.applicationUpdatedAt ?? 'Unknown',
      call_reason: params.callReason,
      last_call_summary: lastCall?.summary ?? 'No prior call summary',
      last_call_time: lastCallTime,
      last_call_disposition: lastCall?.callDisposition ?? 'N/A',
      timezone: params.session.tenantTimezone
    },
    lastCall
  }
}
