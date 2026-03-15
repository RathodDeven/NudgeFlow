import { loadEnv } from '@nudges/config'
import { ensureTenant, getPool } from '@nudges/db'
import { requireAdminAuth } from './auth'

export const env = loadEnv()
export const dbPool = getPool(env.DATABASE_URL)

// Handle idle connection errors to prevent service crash
dbPool.on('error', (err) => {
  console.error('[api-gateway] Database pool error:', err.message)
})

export const TENANT_KEY = process.env.TENANT_ID ?? 'clickpe'

let tenantUUID: string | null = null

export const getTenantId = async (): Promise<string> => {
  if (tenantUUID) return tenantUUID

  const resolved = await ensureTenant(dbPool, TENANT_KEY)
  tenantUUID = resolved
  console.info(`[api-gateway] Tenant '${TENANT_KEY}' → ${tenantUUID}`)
  return resolved
}

export const protectedHandler = requireAdminAuth(env)
