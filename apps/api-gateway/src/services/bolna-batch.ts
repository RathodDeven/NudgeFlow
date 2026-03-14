import type { DbPool, DbUser } from '@nudges/db'
import { ensureSession, getSessionContext } from '@nudges/db'
import {
  type BolnaCreateBatchResponse,
  type BolnaScheduleBatchResponse,
  bolnaAgentVariables,
  createBolnaBatch,
  scheduleBolnaBatch
} from '@nudges/provider-bolna'
import { formatVoiceLoanAmount, formatVoiceLoanStage, resolveVoicePendingStep } from './voice-context'

const bolnaBatchRetryConfig: Record<string, unknown> = {
  enabled: true,
  max_retries: 2,
  retry_intervals_minutes: [30, 60]
}

const toCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

const toBolnaContactNumber = (raw: unknown): string => {
  const normalized = String(raw ?? '').replace(/\s+/g, '')
  const digitsOnly = normalized.replace(/\D/g, '')

  if (digitsOnly.length === 10) return `+91${digitsOnly}`
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`
  if (normalized.startsWith('+')) return normalized
  if (digitsOnly.length > 0) return `+${digitsOnly}`
  return ''
}

const getStringValue = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

const getCurrentTimeInZone = (timeZone: string): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date())
  } catch {
    return new Date().toISOString()
  }
}

const resolveFromPhoneNumbers = (fromPhoneNumber?: string): string[] => {
  if (!fromPhoneNumber) return []
  return fromPhoneNumber
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

const BOLNA_MIN_SCHEDULE_LEAD_MS = 2 * 60 * 1000
const BOLNA_SCHEDULE_BUFFER_MS = 10 * 1000
const BOLNA_RUN_NOW_DELAY_MS = 10 * 1000

const toMinimumAllowedScheduleTime = (date: Date): Date => {
  const minimum = new Date(Date.now() + BOLNA_MIN_SCHEDULE_LEAD_MS + BOLNA_SCHEDULE_BUFFER_MS)
  return date.getTime() < minimum.getTime() ? minimum : date
}

const toOffsetIsoString = (date: Date): string => date.toISOString().replace('Z', '+00:00')

const resolveScheduledAt = (params: { runMode: 'run_now' | 'schedule'; scheduledAt?: string }): Date => {
  if (params.runMode === 'run_now') {
    return toMinimumAllowedScheduleTime(new Date(Date.now() + BOLNA_RUN_NOW_DELAY_MS))
  }
  if (!params.scheduledAt) {
    throw new Error('scheduled_at_required')
  }

  const parsed = new Date(params.scheduledAt)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('scheduled_at_invalid')
  }
  return toMinimumAllowedScheduleTime(parsed)
}

const isIsoFormatError = (error: unknown): boolean => {
  const message = String((error as Error)?.message ?? '')
  return /invalid isoformat string/i.test(message)
}

export const createAndScheduleBolnaBatch = async (
  pool: DbPool,
  params: {
    tenantId: string
    users: DbUser[]
    bolna: {
      baseUrl: string
      apiKey: string
      agentId: string
      fromPhoneNumber?: string
    }
    runMode: 'run_now' | 'schedule'
    scheduledAt?: string
  }
): Promise<{
  total: number
  csvRows: number
  batch: BolnaCreateBatchResponse
  schedule: BolnaScheduleBatchResponse
  scheduledAt: string
}> => {
  const headers = ['contact_number', ...bolnaAgentVariables]
  const lines = [headers.join(',')]

  for (const user of params.users) {
    const sessionId = await ensureSession(pool, user.id, params.tenantId)
    const session = await getSessionContext(pool, sessionId)
    if (!session) continue

    const variableValues: Record<string, string> = {
      timezone: getStringValue(session.tenantTimezone, 'Asia/Kolkata'),
      application_created_at: getStringValue(session.applicationCreatedAt, 'Unknown'),
      loan_amount: formatVoiceLoanAmount(session.loanAmount),
      loan_stage: formatVoiceLoanStage(session.currentStage),
      pending_step: resolveVoicePendingStep(session.currentStage),
      customer_name: getStringValue(session.fullName, 'Unknown'),
      firm_name: getStringValue(session.firmName, 'Unknown'),
      time: getCurrentTimeInZone(session.tenantTimezone)
    }

    const row = [
      toBolnaContactNumber(user.phoneE164),
      ...bolnaAgentVariables.map(variable => variableValues[variable] ?? '')
    ]

    lines.push(row.map(toCsvValue).join(','))
  }

  const csvRows = Math.max(0, lines.length - 1)
  if (csvRows === 0) {
    throw new Error('no_valid_users_for_batch')
  }

  const csvContent = `${lines.join('\n')}\n`
  const batch = await createBolnaBatch({
    baseUrl: params.bolna.baseUrl,
    apiKey: params.bolna.apiKey,
    request: {
      agentId: params.bolna.agentId,
      csvContent,
      fileName: 'untouched-users-batch.csv',
      fromPhoneNumbers: resolveFromPhoneNumbers(params.bolna.fromPhoneNumber),
      retryConfig: bolnaBatchRetryConfig
    }
  })

  const scheduledAtDate = resolveScheduledAt({
    runMode: params.runMode,
    scheduledAt: params.scheduledAt
  })
  const bypassCallGuardrails = params.runMode === 'run_now'

  let scheduledAt = scheduledAtDate.toISOString()
  let schedule: BolnaScheduleBatchResponse

  try {
    schedule = await scheduleBolnaBatch({
      baseUrl: params.bolna.baseUrl,
      apiKey: params.bolna.apiKey,
      batchId: batch.batchId,
      scheduledAt,
      bypassCallGuardrails
    })
  } catch (error) {
    if (!isIsoFormatError(error)) {
      throw error
    }

    scheduledAt = toOffsetIsoString(scheduledAtDate)
    schedule = await scheduleBolnaBatch({
      baseUrl: params.bolna.baseUrl,
      apiKey: params.bolna.apiKey,
      batchId: batch.batchId,
      scheduledAt,
      bypassCallGuardrails
    })
  }

  return {
    total: params.users.length,
    csvRows,
    batch,
    schedule,
    scheduledAt
  }
}
