import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export const getPool = (databaseUrl?: string): pg.Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl ?? process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000
    })
  }
  return pool
}

// --- Types ---

export type DbUser = {
  id: string
  tenantId: string
  externalUserId: string
  fullName: string | null
  phoneE164: string
  localeHint: string | null
  city: string | null
  state: string | null
  consentProvided: boolean
  createdAt: string
  // Joined from loan_cases
  currentStage?: string
  partnerCaseId?: string
  loanCaseId?: string
  loanAmount?: number
  firmName?: string
}

export type InsertUserRow = {
  externalUserId: string
  fullName: string
  phoneE164: string
  currentStage: string
  partnerCaseId: string
  loanAmount?: number
  firmName?: string
  city?: string
  state?: string
}

// --- Tenant ---

export const ensureTenant = async (pool: pg.Pool, tenantKey: string): Promise<string> => {
  const existing = await pool.query('SELECT id FROM tenants WHERE key = $1', [tenantKey])
  if (existing.rows.length > 0) {
    return existing.rows[0].id as string
  }

  const id = crypto.randomUUID()
  await pool.query('INSERT INTO tenants (id, key, display_name, knowledge_path) VALUES ($1, $2, $3, $4)', [
    id,
    tenantKey,
    tenantKey,
    `tenants/${tenantKey}`
  ])
  return id
}

// --- User CRUD ---

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
        `INSERT INTO user_profiles (id, tenant_id, external_user_id, full_name, phone_e164, city, state, consent_provided)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (tenant_id, external_user_id) DO NOTHING`,
        [
          userId,
          tenantId,
          row.externalUserId,
          row.fullName,
          row.phoneE164,
          row.city ?? null,
          row.state ?? null
        ]
      )

      // Check if user was actually inserted (vs skipped due to conflict)
      const userResult = await pool.query(
        'SELECT id FROM user_profiles WHERE tenant_id = $1 AND external_user_id = $2',
        [tenantId, row.externalUserId]
      )
      const actualUserId = userResult.rows[0]?.id as string

      await pool.query(
        `INSERT INTO loan_cases (id, tenant_id, user_id, partner_case_id, current_stage, loan_amount, firm_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, partner_case_id) DO UPDATE SET current_stage = $5, loan_amount = $6, firm_name = $7`,
        [
          loanCaseId,
          tenantId,
          actualUserId,
          row.partnerCaseId,
          row.currentStage,
          row.loanAmount ?? null,
          row.firmName ?? null
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
       lc.id AS "loanCaseId", lc.loan_amount AS "loanAmount", lc.firm_name AS "firmName"
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
       lc.id AS "loanCaseId", lc.loan_amount AS "loanAmount", lc.firm_name AS "firmName"
     FROM user_profiles up
     LEFT JOIN loan_cases lc ON lc.user_id = up.id AND lc.tenant_id = up.tenant_id
     WHERE up.id = $1`,
    [userId]
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

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
