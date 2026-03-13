import type pg from 'pg'
import type { ScheduledActionInsert, ScheduledActionRow } from './types'

export const createScheduledAction = async (
  pool: pg.Pool,
  action: ScheduledActionInsert
): Promise<string> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO scheduled_actions
     (id, session_id, action_type, action_subtype, due_at, status, retry_count, idempotency_key, last_error, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      action.sessionId,
      action.actionType,
      action.actionSubtype ?? null,
      action.dueAt,
      action.status,
      action.retryCount ?? 0,
      action.idempotencyKey,
      action.lastError ?? null,
      action.metadata ?? {}
    ]
  )
  return id
}

export const listOverdueScheduledActions = async (
  pool: pg.Pool,
  nowIso: string,
  limit = 100
): Promise<ScheduledActionRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       action_type AS "actionType",
       action_subtype AS "actionSubtype",
       due_at AS "dueAt",
       status,
       retry_count AS "retryCount",
       idempotency_key AS "idempotencyKey",
       last_error AS "lastError",
       metadata,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM scheduled_actions
     WHERE status = 'pending'
       AND due_at <= $1
     ORDER BY due_at ASC
     LIMIT $2`,
    [nowIso, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as ScheduledActionRow[]
}

export const markScheduledActionProcessing = async (pool: pg.Pool, actionId: string): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE scheduled_actions
     SET status = 'processing', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [actionId]
  )
  return (result.rowCount ?? 0) > 0
}

export const updateScheduledActionStatus = async (
  pool: pg.Pool,
  params: { actionId: string; status: string; lastError?: string; retryCount?: number }
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE scheduled_actions
     SET status = $1,
         last_error = $2,
         retry_count = COALESCE($3, retry_count),
         updated_at = NOW()
     WHERE id = $4`,
    [params.status, params.lastError ?? null, params.retryCount ?? null, params.actionId]
  )
  return (result.rowCount ?? 0) > 0
}

export const updateScheduledActionMetadata = async (
  pool: pg.Pool,
  params: { actionId: string; metadata: Record<string, unknown>; status?: string }
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE scheduled_actions
     SET metadata = metadata || $1::jsonb,
         status = COALESCE($2, status),
         updated_at = NOW()
     WHERE id = $3`,
    [params.metadata, params.status ?? null, params.actionId]
  )
  return (result.rowCount ?? 0) > 0
}

export const getScheduledActionById = async (
  pool: pg.Pool,
  actionId: string
): Promise<ScheduledActionRow | null> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       action_type AS "actionType",
       action_subtype AS "actionSubtype",
       due_at AS "dueAt",
       status,
       retry_count AS "retryCount",
       idempotency_key AS "idempotencyKey",
       last_error AS "lastError",
       metadata,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM scheduled_actions
     WHERE id = $1`,
    [actionId]
  )
  return (result.rows[0] as ScheduledActionRow) ?? null
}

export const getScheduledActionByExecutionId = async (
  pool: pg.Pool,
  executionId: string
): Promise<ScheduledActionRow | null> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       action_type AS "actionType",
       action_subtype AS "actionSubtype",
       due_at AS "dueAt",
       status,
       retry_count AS "retryCount",
       idempotency_key AS "idempotencyKey",
       last_error AS "lastError",
       metadata,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM scheduled_actions
     WHERE metadata->>'execution_id' = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [executionId]
  )
  return (result.rows[0] as ScheduledActionRow) ?? null
}

export const listScheduledActionsBySession = async (
  pool: pg.Pool,
  sessionId: string,
  limit = 50
): Promise<ScheduledActionRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       action_type AS "actionType",
       action_subtype AS "actionSubtype",
       due_at AS "dueAt",
       status,
       retry_count AS "retryCount",
       idempotency_key AS "idempotencyKey",
       last_error AS "lastError",
       metadata,
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM scheduled_actions
     WHERE session_id = $1
     ORDER BY due_at DESC
     LIMIT $2`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as ScheduledActionRow[]
}

export const cancelScheduledActionsForSession = async (
  pool: pg.Pool,
  params: { sessionId: string; actionType?: string; reason?: string }
): Promise<number> => {
  const result = await pool.query(
    `UPDATE scheduled_actions
     SET status = 'cancelled',
         last_error = $3,
         updated_at = NOW()
     WHERE session_id = $1
       AND status IN ('pending', 'scheduled', 'processing')
       AND ($2::text IS NULL OR action_type = $2)`,
    [params.sessionId, params.actionType ?? null, params.reason ?? null]
  )
  return result.rowCount ?? 0
}
