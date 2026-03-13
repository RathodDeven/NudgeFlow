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
