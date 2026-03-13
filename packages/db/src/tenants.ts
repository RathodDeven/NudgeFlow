import type pg from 'pg'

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
