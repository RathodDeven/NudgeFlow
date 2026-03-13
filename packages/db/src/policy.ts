import type pg from 'pg'
import type { PolicyEventInsert, PolicyEventRow, PolicyStateRow } from './types'

export const getPolicyState = async (pool: pg.Pool, sessionId: string): Promise<PolicyStateRow | null> => {
  const result = await pool.query(
    `SELECT
       session_id AS "sessionId",
       blocked,
       opted_out AS "optedOut",
       non_responsive AS "nonResponsive",
       attempts_in_window AS "attemptsInWindow",
       window_start_at AS "windowStartAt",
       last_attempt_at AS "lastAttemptAt"
     FROM policy_states
     WHERE session_id = $1`,
    [sessionId]
  )
  return (result.rows[0] as PolicyStateRow) ?? null
}

export const upsertPolicyState = async (
  pool: pg.Pool,
  params: {
    sessionId: string
    blocked: boolean
    optedOut: boolean
    nonResponsive: boolean
    attemptsInWindow: number
    windowStartAt: string
    lastAttemptAt?: string | null
  }
): Promise<boolean> => {
  const result = await pool.query(
    `INSERT INTO policy_states
     (session_id, blocked, opted_out, non_responsive, attempts_in_window, window_start_at, last_attempt_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (session_id) DO UPDATE SET
       blocked = EXCLUDED.blocked,
       opted_out = EXCLUDED.opted_out,
       non_responsive = EXCLUDED.non_responsive,
       attempts_in_window = EXCLUDED.attempts_in_window,
       window_start_at = EXCLUDED.window_start_at,
       last_attempt_at = EXCLUDED.last_attempt_at`,
    [
      params.sessionId,
      params.blocked,
      params.optedOut,
      params.nonResponsive,
      params.attemptsInWindow,
      params.windowStartAt,
      params.lastAttemptAt ?? null
    ]
  )
  return (result.rowCount ?? 0) > 0
}

export const recordPolicyEvent = async (pool: pg.Pool, event: PolicyEventInsert): Promise<string> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO policy_events (id, session_id, decision, reason_codes)
     VALUES ($1, $2, $3, $4)`,
    [id, event.sessionId, event.decision, JSON.stringify(event.reasonCodes ?? [])]
  )
  return id
}

export const listPolicyEventsBySession = async (
  pool: pg.Pool,
  sessionId: string,
  limit = 100
): Promise<PolicyEventRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       decision,
       reason_codes AS "reasonCodes",
       created_at AS "createdAt"
     FROM policy_events
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as PolicyEventRow[]
}
