import type pg from 'pg'

export type SessionContext = {
  sessionId: string
  tenantId: string
  tenantTimezone: string
  userId: string
  phoneE164: string
  fullName: string | null
  loanCaseId: string
  partnerCaseId: string | null
  currentStage: string | null
  loanAmount: number | string | null
  tenureMonths: number | null
  annualInterestRate: number | null
  processingFee: number | null
  emiAmount: number | null
  firmName: string | null
  loanMetadata: Record<string, unknown> | null
  applicationCreatedAt: string | null
  applicationUpdatedAt: string | null
  channel: string
  isAgentActive: boolean
  summaryState: Record<string, unknown>
  compactFacts: Record<string, unknown>
  messageCount: number
  tokenEstimate: number
  inferredIntent: string | null
  highIntentFlag: string | null
  lastCallAt: string | null
  lastCallDisposition: string | null
  followUpAt: string | null
  callSummaryLatest: string | null
  callNotesLatest: string | null
  inferenceExtractedData: Record<string, unknown>
  inferenceContextDetails: Record<string, unknown>
}

export const getSessionContext = async (pool: pg.Pool, sessionId: string): Promise<SessionContext | null> => {
  const result = await pool.query(
    `SELECT
       cs.id AS "sessionId",
       cs.tenant_id AS "tenantId",
       t.timezone AS "tenantTimezone",
       cs.user_id AS "userId",
       up.phone_e164 AS "phoneE164",
       up.full_name AS "fullName",
       cs.loan_case_id AS "loanCaseId",
       lc.partner_case_id AS "partnerCaseId",
       lc.current_stage AS "currentStage",
       lc.loan_amount AS "loanAmount",
       lc.tenure_months AS "tenureMonths",
       lc.annual_interest_rate AS "annualInterestRate",
       lc.processing_fee AS "processingFee",
       lc.emi_amount AS "emiAmount",
       lc.firm_name AS "firmName",
       lc.metadata AS "loanMetadata",
       lc.application_created_at AS "applicationCreatedAt",
       lc.application_updated_at AS "applicationUpdatedAt",
       cs.channel AS "channel",
       cs.is_agent_active AS "isAgentActive",
       cs.summary_state AS "summaryState",
       cs.compact_facts AS "compactFacts",
       cs.token_estimate AS "tokenEstimate",
       lc.inferred_intent AS "inferredIntent",
       lc.high_intent_flag AS "highIntentFlag",
       lc.last_call_at AS "lastCallAt",
       lc.last_call_disposition AS "lastCallDisposition",
       lc.follow_up_at AS "followUpAt",
       lc.call_summary_latest AS "callSummaryLatest",
       lc.call_notes_latest AS "callNotesLatest",
       lc.inference_extracted_data AS "inferenceExtractedData",
       lc.inference_context_details AS "inferenceContextDetails"
     FROM conversation_sessions cs
     JOIN tenants t ON cs.tenant_id = t.id
     JOIN user_profiles up ON cs.user_id = up.id
     JOIN loan_cases lc ON cs.loan_case_id = lc.id
     WHERE cs.id = $1
     LIMIT 1`,
    [sessionId]
  )

  if (result.rows.length === 0) return null
  return result.rows[0] as SessionContext
}
