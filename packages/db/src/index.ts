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
  isReactivated?: boolean
  metadata?: Record<string, unknown>
  loanCreatedAt?: string
  loanUpdatedAt?: string
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
  createdAt?: string
  metadata?: Record<string, unknown>
}

export type ChatMessage = {
  id: string
  sessionId: string
  channel: string
  direction: 'inbound' | 'outbound' | 'system'
  body: string
  createdAt: string
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

      // Check if user was actually inserted (vs skipped due to conflict)
      const userResult = await pool.query(
        'SELECT id FROM user_profiles WHERE tenant_id = $1 AND external_user_id = $2',
        [tenantId, row.externalUserId]
      )
      const actualUserId = userResult.rows[0]?.id as string

      await pool.query(
        `INSERT INTO loan_cases (id, tenant_id, user_id, partner_case_id, current_stage, loan_amount, firm_name, created_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tenant_id, partner_case_id) DO UPDATE SET
           current_stage = $5,
           loan_amount = $6,
           firm_name = $7,
           created_at = COALESCE($8, loan_cases.created_at),
           metadata = loan_cases.metadata || EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          loanCaseId,
          tenantId,
          actualUserId,
          row.partnerCaseId,
          row.currentStage,
          row.loanAmount ?? null,
          row.firmName ?? null,
          row.createdAt ?? new Date().toISOString(),
          JSON.stringify(row.metadata ?? {})
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
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt"
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
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt"
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
       lc.metadata, lc.created_at AS "loanCreatedAt", lc.updated_at AS "loanUpdatedAt"
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

// --- Chat History ---

export const ensureSession = async (pool: pg.Pool, userId: string, tenantId: string): Promise<string> => {
  const result = await pool.query(
    'SELECT id FROM conversation_sessions WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
    [tenantId, userId]
  )
  if (result.rows.length > 0) return result.rows[0].id as string

  const caseResult = await pool.query(
    'SELECT id FROM loan_cases WHERE tenant_id = $1 AND user_id = $2 ORDER BY updated_at DESC LIMIT 1',
    [tenantId, userId]
  )
  if (caseResult.rows.length === 0) throw new Error('No loan case found for user')

  const loanCaseId = caseResult.rows[0].id as string
  const sessionId = crypto.randomUUID()

  await pool.query(
    `INSERT INTO conversation_sessions (id, tenant_id, user_id, loan_case_id, summary_state)
     VALUES ($1, $2, $3, $4, '{}'::jsonb)`,
    [sessionId, tenantId, userId, loanCaseId]
  )
  return sessionId
}

export const saveMessage = async (
  pool: pg.Pool,
  sessionId: string,
  direction: 'inbound' | 'outbound' | 'system',
  body: string,
  channel = 'whatsapp'
): Promise<void> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO message_events (id, session_id, channel, direction, body)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, sessionId, channel, direction, body]
  )
}

export const getUserMessages = async (pool: pg.Pool, userId: string): Promise<ChatMessage[]> => {
  const result = await pool.query(
    `SELECT me.id, me.session_id AS "sessionId", me.channel, me.direction, me.body, me.created_at AS "createdAt"
     FROM message_events me
     JOIN conversation_sessions cs ON me.session_id = cs.id
     WHERE cs.user_id = $1
     ORDER BY me.created_at ASC`,
    [userId]
  )
  return result.rows as ChatMessage[]
}

export type UserSessionInfo = {
  sessionId: string
  isAgentActive: boolean
}

export const getUserSessionInfo = async (
  pool: pg.Pool,
  userId: string,
  tenantId: string
): Promise<UserSessionInfo | null> => {
  const result = await pool.query(
    `SELECT id AS "sessionId", is_agent_active AS "isAgentActive"
     FROM conversation_sessions
     WHERE tenant_id = $1 AND user_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, userId]
  )
  if (result.rows.length === 0) return null
  return result.rows[0] as UserSessionInfo
}

export const updateAgentActive = async (
  pool: pg.Pool,
  sessionId: string,
  isAgentActive: boolean
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE conversation_sessions
     SET is_agent_active = $1, updated_at = NOW()
     WHERE id = $2`,
    [isAgentActive, sessionId]
  )
  return (result.rowCount ?? 0) > 0
}

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
