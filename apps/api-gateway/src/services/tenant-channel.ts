import { access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { TENANT_KEY, env } from '../context'

export type TenantTemplateConfig = {
  templateId: string
  variableOrder: string[]
}

export type TenantWhatsAppConfig = {
  source: string // registered WhatsApp number
  defaultTemplateKey: string
  ctaBaseUrl?: string
  templates: Record<string, TenantTemplateConfig>
}

export type TenantTemplateModule = TenantWhatsAppConfig & {
  appName: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isTemplateConfig = (value: unknown): value is TenantTemplateConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.templateId === 'string' &&
    Array.isArray(record.variableOrder) &&
    record.variableOrder.every(v => typeof v === 'string')
  )
}

const isTemplateModule = (value: unknown): value is TenantTemplateModule => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (typeof record.appName !== 'string') return false
  if (typeof record.source !== 'string') return false
  if (typeof record.defaultTemplateKey !== 'string') return false
  if (!record.templates || typeof record.templates !== 'object' || Array.isArray(record.templates))
    return false

  return Object.values(record.templates as Record<string, unknown>).every(isTemplateConfig)
}

const getConfigFilePath = async (): Promise<string | null> => {
  // Find monorepo root relative to this file (apps/api-gateway/src/services/tenant-channel.ts)
  const monorepoRoot = path.resolve(__dirname, '../../../../')
  const roots = [path.join(monorepoRoot, 'tenants', TENANT_KEY)]
  if (env.VITE_ENABLE_SANDBOX) {
    roots.unshift(path.join(monorepoRoot, 'tests', 'sandbox', 'tenants', TENANT_KEY))
  }

  const candidates: string[] = []
  for (const root of roots) {
    candidates.push(path.join(root, 'whatsapp-template.config.ts'))
    candidates.push(path.join(root, 'whatsapp-template.config.js'))
  }

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {}
  }

  return null
}

export const loadTenantTemplateConfig = async (
  templateKey?: string
): Promise<{
  appName: string
  source: string
  ctaBaseUrl?: string
  template: TenantTemplateConfig
} | null> => {
  try {
    const filePath = await getConfigFilePath()
    if (!filePath) {
      console.warn(`[tenant-channel] No config file found for tenant: ${TENANT_KEY}`)
      return null
    }

    // Use query parameter to bust ESM import cache during development
    const fileUrl = `${pathToFileURL(filePath).href}?t=${Date.now()}`
    const loaded = await import(fileUrl)
    const configModule = loaded.default as unknown

    if (!isTemplateModule(configModule)) {
      console.error(`[tenant-channel] Invalid config module structure for ${filePath}`, configModule)
      return null
    }

    const resolvedKey = templateKey ?? configModule.defaultTemplateKey
    const template = configModule.templates[resolvedKey]
    if (!template) {
      console.warn(`[tenant-channel] Template '${resolvedKey}' not found in ${filePath}`)
      return null
    }

    return {
      appName: configModule.appName,
      source: configModule.source,
      ctaBaseUrl: configModule.ctaBaseUrl,
      template
    }
  } catch (err) {
    console.error(`[tenant-channel] Failed to load config for ${TENANT_KEY}:`, err)
    return null
  }
}
