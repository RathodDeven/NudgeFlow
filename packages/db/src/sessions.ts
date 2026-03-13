import type pg from 'pg'
import type { SessionDispatchContext, SessionMemoryState, SessionSummaryRow, UserSessionInfo } from './types'

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

export const getSessionMemoryState = async (
  pool: pg.Pool,
  sessionId: string
): Promise<SessionMemoryState | null> => {
  const result = await pool.query(
    `SELECT
       summary_state AS "summaryState",
       compact_facts AS "compactFacts",
       message_count AS "messageCount",
       token_estimate AS "tokenEstimate"
     FROM conversation_sessions
     WHERE id = $1
     LIMIT 1`,
    [sessionId]
  )

  if (result.rows.length === 0) return null
  return result.rows[0] as SessionMemoryState
}

export const updateSessionMemoryState = async (
  pool: pg.Pool,
  params: {
    sessionId: string
    summaryState: Record<string, unknown>
    compactFacts: Record<string, unknown>
    messageCount: number
    tokenEstimate: number
  }
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE conversation_sessions
     SET summary_state = $1,
         compact_facts = $2,
         message_count = $3,
         token_estimate = $4,
         updated_at = NOW()
     WHERE id = $5`,
    [params.summaryState, params.compactFacts, params.messageCount, params.tokenEstimate, params.sessionId]
  )
  return (result.rowCount ?? 0) > 0
}

export const getSessionRecentMessages = async (
  pool: pg.Pool,
  sessionId: string,
  limit: number
): Promise<
  { id: string; sessionId: string; channel: string; direction: string; body: string; createdAt: string }[]
> => {
  const result = await pool.query(
    `SELECT id, "sessionId", channel, direction, body, "createdAt"
     FROM (
       SELECT
         me.id,
         me.session_id AS "sessionId",
         me.channel,
         me.direction,
         me.body,
         me.created_at AS "createdAt"
       FROM message_events me
       WHERE me.session_id = $1
       ORDER BY me.created_at DESC
       LIMIT $2
     ) recent
     ORDER BY "createdAt" ASC`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )

  return result.rows as {
    id: string
    sessionId: string
    channel: string
    direction: string
    body: string
    createdAt: string
  }[]
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

export const listRecentSessions = async (pool: pg.Pool, limit = 50): Promise<SessionSummaryRow[]> => {
  const result = await pool.query(
    `SELECT
       id AS "sessionId",
       user_id AS "userId",
       tenant_id AS "tenantId",
       is_agent_active AS "isAgentActive",
       updated_at AS "updatedAt"
     FROM conversation_sessions
     ORDER BY updated_at DESC
     LIMIT $1`,
    [Math.max(1, Math.trunc(limit))]
  )
  return result.rows as SessionSummaryRow[]
}

export const getSessionDispatchContext = async (
  pool: pg.Pool,
  sessionId: string
): Promise<SessionDispatchContext | null> => {
  const result = await pool.query(
    `SELECT\n       cs.id AS \"sessionId\",\n       cs.is_agent_active AS \"isAgentActive\",\n       cs.channel AS \"channel\",\n       t.timezone AS \"tenantTimezone\"\n     FROM conversation_sessions cs\n     JOIN tenants t ON cs.tenant_id = t.id\n     WHERE cs.id = $1\n     LIMIT 1`,
    [sessionId]
  )
  if (result.rows.length === 0) return null
  return result.rows[0] as SessionDispatchContext
}
