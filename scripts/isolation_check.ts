import path from 'node:path'
import dotenv from 'dotenv'
import { loadEnv } from '../packages/config/src/index'
import { closePool, ensureTenant, getPool, insertUsers, listUsers } from '../packages/db/src/index'

async function verifyIsolation() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
  const env = loadEnv()
  const pool = getPool(env.DATABASE_URL)

  console.log('--- Starting Tenant Isolation Verification ---')

  try {
    const tenantAKey = `test_tenant_a_${Date.now()}`
    const tenantBKey = `test_tenant_b_${Date.now()}`

    console.log(`Creating tenants: ${tenantAKey} and ${tenantBKey}`)
    const tenantAId = await ensureTenant(pool, tenantAKey)
    const tenantBId = await ensureTenant(pool, tenantBKey)

    const testUsers = [
      {
        externalUserId: 'user_a_1',
        fullName: 'Tenant A User',
        phoneE164: '9999999991',
        currentStage: 'fresh_loan',
        partnerCaseId: 'case_a_1',
        loanAmount: 50000,
        firmName: 'A Corp'
      }
    ]

    console.log(`Inserting user into ${tenantAKey}...`)
    await insertUsers(pool, tenantAId, testUsers)

    console.log('Verifying isolation...')

    const usersInA = await listUsers(pool, tenantAId)
    const usersInB = await listUsers(pool, tenantBId)

    console.log(`Tenant A Users: ${usersInA.length}`)
    console.log(`Tenant B Users: ${usersInB.length}`)

    if (usersInA.length === 1 && usersInB.length === 0) {
      console.log('✅ SUCCESS: Data is isolated between tenants.')
    } else {
      console.error('❌ FAILURE: Data leakage or insertion error detected.')
      process.exit(1)
    }
  } catch (error) {
    console.error('Error during verification:', error)
    process.exit(1)
  } finally {
    await closePool()
    console.log('--- Verification Finished ---')
  }
}

verifyIsolation()
