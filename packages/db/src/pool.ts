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

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
