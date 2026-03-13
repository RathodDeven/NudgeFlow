import type pg from 'pg'
import type { ChatMessage } from './types'

export const saveMessage = async (
  pool: pg.Pool,
  sessionId: string,
  direction: 'inbound' | 'outbound' | 'system',
  body: string,
  channel = 'whatsapp',
  providerMessageId?: string,
  language?: string
): Promise<void> => {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO message_events (id, session_id, channel, direction, body, provider_message_id, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, sessionId, channel, direction, body, providerMessageId ?? null, language ?? null]
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
