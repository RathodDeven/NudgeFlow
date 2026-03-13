import type pg from 'pg'

export const updateInteractionSummary = async (
  pool: pg.Pool,
  interactionId: string,
  summary: string,
  callDisposition?: string,
  callDurationSeconds?: number
): Promise<boolean> => {
  const result = await pool.query(
    `UPDATE interaction_events
     SET summary = $1,
         call_disposition = COALESCE($2, call_disposition),
         call_duration_seconds = COALESCE($3, call_duration_seconds)
     WHERE id = $4`,
    [summary, callDisposition ?? null, callDurationSeconds ?? null, interactionId]
  )
  return (result.rowCount ?? 0) > 0
}
