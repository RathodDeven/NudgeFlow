import type pg from 'pg'
import type { AgentDecisionInsert, AgentDecisionRow } from './types'

export const insertAgentDecision = async (pool: pg.Pool, decision: AgentDecisionInsert): Promise<string> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO agent_decisions
     (id, session_id, trigger, route, confidence, guardrail_notes, suggested_next_followup_at, model_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      decision.sessionId,
      decision.trigger,
      decision.route,
      decision.confidence,
      JSON.stringify(decision.guardrailNotes ?? []),
      decision.suggestedNextFollowupAt ?? null,
      decision.modelName
    ]
  )
  return id
}

export const listAgentDecisionsBySession = async (
  pool: pg.Pool,
  sessionId: string,
  limit = 100
): Promise<AgentDecisionRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       session_id AS "sessionId",
       trigger,
       route,
       confidence,
       guardrail_notes AS "guardrailNotes",
       suggested_next_followup_at AS "suggestedNextFollowupAt",
       model_name AS "modelName",
       created_at AS "createdAt"
     FROM agent_decisions
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, Math.max(1, Math.trunc(limit))]
  )
  return result.rows as AgentDecisionRow[]
}
