import type pg from 'pg'
import type { CallAttemptInsert, CallAttemptRow, InteractionEventInsert, InteractionEventRow } from './types'

export const insertInteractionEvent = async (
  pool: pg.Pool,
  interaction: InteractionEventInsert
): Promise<string> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO interaction_events
     (id, session_id, channel, direction, event_type, transcript, summary, call_disposition, call_duration_seconds,
      consent_flag, handoff_flag, provider_id, provider_timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      interaction.sessionId,
      interaction.channel,
      interaction.direction,
      interaction.eventType,
      interaction.transcript ?? null,
      interaction.summary ?? null,
      interaction.callDisposition ?? null,
      interaction.callDurationSeconds ?? null,
      interaction.consentFlag ?? null,
      interaction.handoffFlag ?? null,
      interaction.providerId ?? null,
      interaction.providerTimestamp ?? null
    ]
  )
  return id
}

export const insertCallAttempt = async (pool: pg.Pool, call: CallAttemptInsert): Promise<string> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO call_attempts
     (id, session_id, interaction_event_id, disposition, duration_seconds, provider_call_id, provider_timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      call.sessionId,
      call.interactionEventId,
      call.disposition ?? null,
      call.durationSeconds ?? null,
      call.providerCallId ?? null,
      call.providerTimestamp ?? null
    ]
  )
  return id
}

export const listInteractionEventsBySession = async (
  pool: pg.Pool,
  sessionId: string,
  limit = 200
): Promise<InteractionEventRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       channel,
       direction,
       event_type AS "eventType",
       transcript,
       summary,
       call_disposition AS "callDisposition",
       call_duration_seconds AS "callDurationSeconds",
       consent_flag AS "consentFlag",
       handoff_flag AS "handoffFlag",
       provider_id AS "providerId",
       provider_timestamp AS "providerTimestamp",
       created_at AS "createdAt"
     FROM interaction_events
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as InteractionEventRow[]
}

export const listRecentCallSummaries = async (
  pool: pg.Pool,
  sessionId: string,
  limit = 5
): Promise<InteractionEventRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       channel,
       direction,
       event_type AS "eventType",
       transcript,
       summary,
       call_disposition AS "callDisposition",
       call_duration_seconds AS "callDurationSeconds",
       consent_flag AS "consentFlag",
       handoff_flag AS "handoffFlag",
       provider_id AS "providerId",
       provider_timestamp AS "providerTimestamp",
       created_at AS "createdAt"
     FROM interaction_events
     WHERE session_id = $1
       AND summary IS NOT NULL
       AND event_type IN ('call_summary', 'call_attempt')
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as InteractionEventRow[]
}

export const listCallAttemptsBySession = async (
  pool: pg.Pool,
  sessionId: string,
  limit = 20
): Promise<CallAttemptRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       interaction_event_id AS "interactionEventId",
       disposition,
       duration_seconds AS "durationSeconds",
       provider_call_id AS "providerCallId",
       provider_timestamp AS "providerTimestamp",
       created_at AS "createdAt"
     FROM call_attempts
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as CallAttemptRow[]
}

export const countRecentFailedCallAttempts = async (
  pool: pg.Pool,
  sessionId: string,
  sinceIso: string
): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM call_attempts
     WHERE session_id = $1
       AND created_at >= $2
       AND disposition IN ('no_answer', 'busy', 'failed')`,
    [sessionId, sinceIso]
  )
  return result.rows[0]?.count ?? 0
}
