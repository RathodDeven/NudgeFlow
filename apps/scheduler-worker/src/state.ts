import { loadEnv } from '@nudges/config'
import { getPool } from '@nudges/db'

export const env = loadEnv()
export const dbPool = getPool(env.DATABASE_URL)
