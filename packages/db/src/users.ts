import type pg from 'pg'
import type { DbUser, InsertUserRow } from './types'

export const insertUsers = async (
  pool: pg.Pool,
  tenantId: string,
  rows: InsertUserRow[]
): Promise<{ inserted: number; skipped: number }> => {
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const userId = crypto.randomUUID()
    const loanCaseId = crypto.randomUUID()

    try {
      await pool.query(
        `INSERT INTO user_profiles (id, tenant_id, external_user_id, full_name, phone_e164, city, state, created_at, consent_provided)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (tenant_id, external_user_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone_e164 = EXCLUDED.phone_e164,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           created_at = COALESCE(EXCLUDED.created_at, user_profiles.created_at)`,
        [
          userId,
          tenantId,
          row.externalUserId,
          row.fullName,
          row.phoneE164,
          row.city ?? null,
          row.state ?? null,
          row.createdAt ?? new Date().toISOString()
        ]
      )

      const userResult = await pool.query(
        'SELECT id FROM user_profiles WHERE tenant_id = $1 AND external_user_id = $2',
        [tenantId, row.externalUserId]
      )
      const actualUserId = userResult.rows[0]?.id as string

      await pool.query(
        `INSERT INTO loan_cases (id, tenant_id, user_id, partner_case_id, current_stage, loan_amount, firm_name, created_at, application_created_at, application_updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $10, $11, $9)
         ON CONFLICT (tenant_id, partner_case_id) DO UPDATE SET
           current_stage = $5,
           loan_amount = $6,
           firm_name = $7,
           created_at = COALESCE($8, loan_cases.created_at),
           application_created_at = COALESCE($10, loan_cases.application_created_at),
           application_updated_at = COALESCE($11, loan_cases.application_updated_at),
           updated_at = NOW(),
           metadata = loan_cases.metadata || EXCLUDED.metadata`,
        [
          loanCaseId,
          tenantId,
          actualUserId,
          row.partnerCaseId,
          row.currentStage,
          row.loanAmount ?? null,
          row.firmName ?? null,
          row.createdAt ?? new Date().toISOString(),
          JSON.stringify(row.metadata ?? {}),
          row.applicationCreatedAt ?? null,
          row.applicationUpdatedAt ?? null
        ]
      )

      inserted++
    } catch (err) {
      console.warn(`[db] Skipped row ${row.externalUserId}:`, (err as Error).message)
      skipped++
    }
  }

  return { inserted, skipped }
}

export const listUsers = async (pool: pg.Pool, tenantId: string): Promise<DbUser[]> => {
  const result = await pool.query(
    `SELECT
       up.id, up.tenant_id AS "tenantId", up.external_user_id AS "externalUserId",
       up.full_name AS "fullName", up.phone_e164 AS "phoneE164",
       up.locale_hint AS "localeHint", up.city, up.state,
       up.consent_provided AS "consentProvided", up.created_at AS "createdAt",
       lc.current_stage AS "currentStage", lc.partner_case_id AS "partnerCaseId",
       lc.id AS "loanCaseId", lc.loan_amount AS "loanAmount", lc.firm_name AS "firmName",
       lc.is_reactivated AS "isReactivated",
      lc.inferred_intent AS "inferredIntent",
      lc.high_intent_flag AS "highIntentFlag",
      lc.follow_up_at AS "followUpAt",
      lc.call_summary_latest AS "callSummaryLatest",
      lc.call_notes_latest AS "callNotesLatest",
      lc.inference_extracted_data AS "inferenceExtractedData",
      lc.inference_context_details AS "inferenceContextDetails",
      lc.last_call_at AS "lastCallAt",
      lc.last_call_disposition AS "lastCallDisposition",
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt",
       lc.application_created_at AS "applicationCreatedAt", lc.application_updated_at AS "applicationUpdatedAt"
     FROM user_profiles up
     LEFT JOIN loan_cases lc ON lc.user_id = up.id AND lc.tenant_id = up.tenant_id
     WHERE up.tenant_id = $1
     ORDER BY up.created_at DESC`,
    [tenantId]
  )
  return result.rows as DbUser[]
}

export const getUserById = async (pool: pg.Pool, userId: string): Promise<DbUser | null> => {
  const result = await pool.query(
    `SELECT
       up.id, up.tenant_id AS "tenantId", up.external_user_id AS "externalUserId",
       up.full_name AS "fullName", up.phone_e164 AS "phoneE164",
       up.locale_hint AS "localeHint", up.city, up.state,
       up.consent_provided AS "consentProvided", up.created_at AS "createdAt",
       lc.current_stage AS "currentStage", lc.partner_case_id AS "partnerCaseId",
       lc.id AS "loanCaseId", lc.loan_amount AS "loanAmount", lc.firm_name AS "firmName",
       lc.is_reactivated AS "isReactivated",
      lc.inferred_intent AS "inferredIntent",
      lc.high_intent_flag AS "highIntentFlag",
      lc.follow_up_at AS "followUpAt",
      lc.call_summary_latest AS "callSummaryLatest",
      lc.call_notes_latest AS "callNotesLatest",
      lc.inference_extracted_data AS "inferenceExtractedData",
      lc.inference_context_details AS "inferenceContextDetails",
      lc.last_call_at AS "lastCallAt",
      lc.last_call_disposition AS "lastCallDisposition",
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt",
       lc.application_created_at AS "applicationCreatedAt", lc.application_updated_at AS "applicationUpdatedAt"
     FROM user_profiles up
     LEFT JOIN loan_cases lc ON lc.user_id = up.id AND lc.tenant_id = up.tenant_id
     WHERE up.id = $1`,
    [userId]
  )
  return (result.rows[0] as DbUser) ?? null
}

export const getUserByPhoneE164 = async (
  pool: pg.Pool,
  tenantId: string,
  phoneE164: string
): Promise<DbUser | null> => {
  const result = await pool.query(
    `SELECT
       up.id, up.tenant_id AS "tenantId", up.external_user_id AS "externalUserId",
       up.full_name AS "fullName", up.phone_e164 AS "phoneE164",
       up.locale_hint AS "localeHint", up.city, up.state,
       up.consent_provided AS "consentProvided", up.created_at AS "createdAt",
       lc.current_stage AS "currentStage", lc.partner_case_id AS "partnerCaseId",
       lc.id AS "loanCaseId", lc.loan_amount AS "loanAmount", lc.firm_name AS "firmName",
       lc.is_reactivated AS "isReactivated",
      lc.inferred_intent AS "inferredIntent",
      lc.high_intent_flag AS "highIntentFlag",
      lc.follow_up_at AS "followUpAt",
      lc.call_summary_latest AS "callSummaryLatest",
      lc.call_notes_latest AS "callNotesLatest",
      lc.inference_extracted_data AS "inferenceExtractedData",
      lc.inference_context_details AS "inferenceContextDetails",
      lc.last_call_at AS "lastCallAt",
      lc.last_call_disposition AS "lastCallDisposition",
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt",
       lc.application_created_at AS "applicationCreatedAt", lc.application_updated_at AS "applicationUpdatedAt"
     FROM user_profiles up
     LEFT JOIN loan_cases lc ON lc.user_id = up.id AND lc.tenant_id = up.tenant_id
     WHERE up.tenant_id = $1 AND up.phone_e164 = $2`,
    [tenantId, phoneE164]
  )
  return (result.rows[0] as DbUser) ?? null
}

export const updateUserStage = async (pool: pg.Pool, userId: string, newStage: string): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE loan_cases SET current_stage = $1, updated_at = NOW()
     WHERE user_id = $2`,
    [newStage, userId]
  )
  return (result.rowCount ?? 0) > 0
}

export const listUntouchedUsers = async (pool: pg.Pool, tenantId: string, limit = 500): Promise<DbUser[]> => {
  const result = await pool.query(
    `SELECT
       up.id, up.tenant_id AS "tenantId", up.external_user_id AS "externalUserId",
       up.full_name AS "fullName", up.phone_e164 AS "phoneE164",
       up.locale_hint AS "localeHint", up.city, up.state,
       up.consent_provided AS "consentProvided", up.created_at AS "createdAt",
       lc.current_stage AS "currentStage", lc.partner_case_id AS "partnerCaseId",
       lc.id AS "loanCaseId", lc.loan_amount AS "loanAmount", lc.firm_name AS "firmName",
       lc.is_reactivated AS "isReactivated",
      lc.inferred_intent AS "inferredIntent",
      lc.high_intent_flag AS "highIntentFlag",
      lc.follow_up_at AS "followUpAt",
      lc.call_summary_latest AS "callSummaryLatest",
      lc.call_notes_latest AS "callNotesLatest",
      lc.inference_extracted_data AS "inferenceExtractedData",
      lc.inference_context_details AS "inferenceContextDetails",
      lc.last_call_at AS "lastCallAt",
      lc.last_call_disposition AS "lastCallDisposition",
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt",
       lc.application_created_at AS "applicationCreatedAt", lc.application_updated_at AS "applicationUpdatedAt"
     FROM user_profiles up
     LEFT JOIN loan_cases lc ON lc.user_id = up.id AND lc.tenant_id = up.tenant_id
     WHERE up.tenant_id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM conversation_sessions cs
         JOIN message_events me ON me.session_id = cs.id
         WHERE cs.user_id = up.id
           AND me.direction = 'outbound'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM conversation_sessions cs
         JOIN call_attempts ca ON ca.session_id = cs.id
         WHERE cs.user_id = up.id
       )
     ORDER BY up.created_at DESC
     LIMIT $2`,
    [tenantId, Math.max(1, Math.trunc(limit))]
  )

  return result.rows as DbUser[]
}

export const countUntouchedUsers = async (pool: pg.Pool, tenantId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM user_profiles up
     WHERE up.tenant_id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM conversation_sessions cs
         JOIN message_events me ON me.session_id = cs.id
         WHERE cs.user_id = up.id
           AND me.direction = 'outbound'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM conversation_sessions cs
         JOIN call_attempts ca ON ca.session_id = cs.id
         WHERE cs.user_id = up.id
       )`,
    [tenantId]
  )

  return result.rows[0]?.count ?? 0
}

export const updateLoanCaseInferenceSnapshot = async (
  pool: pg.Pool,
  params: {
    loanCaseId: string
    inferred: Record<string, unknown>
  }
): Promise<void> => {
  const inferredIntent =
    typeof params.inferred.inferred_intent === 'string' ? params.inferred.inferred_intent : null
  const highIntentFlag =
    typeof params.inferred.high_intent_flag === 'string'
      ? params.inferred.high_intent_flag
      : typeof params.inferred.high_intent_flag === 'number'
        ? params.inferred.high_intent_flag > 0
          ? 'yes'
          : 'no'
        : typeof params.inferred.high_intent_flag === 'boolean'
          ? params.inferred.high_intent_flag
            ? 'yes'
            : 'no'
          : null
  const lastCallDisposition =
    typeof params.inferred.last_call_disposition === 'string' ? params.inferred.last_call_disposition : null
  const lastCallAt = typeof params.inferred.last_call_at === 'string' ? params.inferred.last_call_at : null
  const followUpAt =
    typeof params.inferred.suggested_next_call_at === 'string'
      ? params.inferred.suggested_next_call_at
      : typeof params.inferred.follow_up_at === 'string'
        ? params.inferred.follow_up_at
        : null
  const callSummaryLatest =
    typeof params.inferred.last_call_summary === 'string' ? params.inferred.last_call_summary : null
  const callNotesLatest =
    typeof params.inferred.notes_for_agent === 'string' ? params.inferred.notes_for_agent : null
  const extractedData =
    params.inferred.extracted_data && typeof params.inferred.extracted_data === 'object'
      ? params.inferred.extracted_data
      : {}
  const contextDetails =
    params.inferred.context_details && typeof params.inferred.context_details === 'object'
      ? params.inferred.context_details
      : {}
  const lastBolnaExecutionId =
    typeof params.inferred.bolna_execution_id === 'string' ? params.inferred.bolna_execution_id : null
  const lastBolnaBatchId =
    typeof params.inferred.bolna_batch_id === 'string' ? params.inferred.bolna_batch_id : null
  const lastCallRecordingUrl =
    typeof params.inferred.recording_url === 'string' ? params.inferred.recording_url : null

  await pool.query(
    `UPDATE loan_cases
     SET metadata = metadata || jsonb_build_object('call_inference', $2::jsonb),
         inferred_intent = $3,
         high_intent_flag = $4,
         last_call_disposition = $5,
         last_call_at = $6,
         follow_up_at = $7,
         call_summary_latest = $8,
         call_notes_latest = $9,
         inference_extracted_data = COALESCE($10::jsonb, '{}'::jsonb),
         inference_context_details = COALESCE($11::jsonb, '{}'::jsonb),
         last_bolna_execution_id = $12,
         last_bolna_batch_id = $13,
         last_call_recording_url = $14,
         updated_at = NOW()
     WHERE id = $1`,
    [
      params.loanCaseId,
      JSON.stringify(params.inferred),
      inferredIntent,
      highIntentFlag,
      lastCallDisposition,
      lastCallAt,
      followUpAt,
      callSummaryLatest,
      callNotesLatest,
      JSON.stringify(extractedData),
      JSON.stringify(contextDetails),
      lastBolnaExecutionId,
      lastBolnaBatchId,
      lastCallRecordingUrl
    ]
  )
}

export type InferredUserExportRow = {
  userId: string
  externalUserId: string
  fullName: string | null
  phoneE164: string
  city: string | null
  state: string | null
  partnerCaseId: string | null
  currentStage: string | null
  loanAmount: number | null
  firmName: string | null
  applicationCreatedAt: string | null
  applicationUpdatedAt: string | null
  tenantTimezone: string
  inferred: Record<string, unknown>
}

export const listLatestInferredUsers = async (
  pool: pg.Pool,
  tenantId: string,
  limit = 1000,
  filters?: {
    intent?: string
    highIntentFlag?: string
  }
): Promise<InferredUserExportRow[]> => {
  const conditions: string[] = []
  const values: unknown[] = [tenantId]

  if (filters?.intent) {
    values.push(filters.intent)
    conditions.push(`lc.inferred_intent = $${values.length}`)
  }

  if (filters?.highIntentFlag) {
    values.push(filters.highIntentFlag)
    conditions.push(`lc.high_intent_flag = $${values.length}`)
  }

  values.push(Math.max(1, Math.trunc(limit)))

  const result = await pool.query(
    `SELECT
       up.id AS "userId",
       up.external_user_id AS "externalUserId",
       up.full_name AS "fullName",
       up.phone_e164 AS "phoneE164",
       up.city,
       up.state,
       lc.partner_case_id AS "partnerCaseId",
       lc.current_stage AS "currentStage",
       lc.loan_amount AS "loanAmount",
       lc.firm_name AS "firmName",
       lc.application_created_at AS "applicationCreatedAt",
       lc.application_updated_at AS "applicationUpdatedAt",
       t.timezone AS "tenantTimezone",
       (
         COALESCE(lc.metadata->'call_inference', '{}'::jsonb)
         || jsonb_build_object(
           'inferred_intent', lc.inferred_intent,
           'high_intent_flag', lc.high_intent_flag,
           'last_call_disposition', lc.last_call_disposition,
           'last_call_at', lc.last_call_at,
           'suggested_next_call_at', lc.follow_up_at,
           'last_call_summary', lc.call_summary_latest,
           'notes_for_agent', lc.call_notes_latest,
           'extracted_data', lc.inference_extracted_data,
           'context_details', lc.inference_context_details,
           'bolna_execution_id', lc.last_bolna_execution_id,
           'bolna_batch_id', lc.last_bolna_batch_id,
           'recording_url', lc.last_call_recording_url
         )
       ) AS inferred
     FROM user_profiles up
     JOIN loan_cases lc ON lc.user_id = up.id AND lc.tenant_id = up.tenant_id
     JOIN tenants t ON t.id = up.tenant_id
     WHERE up.tenant_id = $1
       AND (
         lc.inferred_intent IS NOT NULL
         OR lc.last_call_at IS NOT NULL
         OR lc.high_intent_flag IS NOT NULL
         OR (lc.metadata ? 'call_inference')
       )
       ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}
     ORDER BY lc.updated_at DESC
     LIMIT $${values.length}`,
    values
  )

  return result.rows as InferredUserExportRow[]
}
