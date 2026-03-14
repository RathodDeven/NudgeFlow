import { access } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { TENANT_KEY } from '../context'

export type TenantTemplateConfig = {
  templateId: string
  variableOrder: string[]
}

type TenantTemplateModule = {
  defaultTemplateKey: string
  templates: Record<string, TenantTemplateConfig>
}

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
  if (typeof record.defaultTemplateKey !== 'string') return false
  if (!record.templates || typeof record.templates !== 'object' || Array.isArray(record.templates))
    return false

  return Object.values(record.templates as Record<string, unknown>).every(isTemplateConfig)
}

const getConfigFilePath = async (): Promise<string | null> => {
  const root = path.join(process.cwd(), 'tenants', TENANT_KEY)
  const candidates = [
    path.join(root, 'whatsapp-template.config.ts'),
    path.join(root, 'whatsapp-template.config.js')
  ]

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
): Promise<TenantTemplateConfig | null> => {
  try {
    const filePath = await getConfigFilePath()
    if (!filePath) return null

    const loaded = await import(pathToFileURL(filePath).href)
    const configModule = loaded.default as unknown
    if (!isTemplateModule(configModule)) return null

    const resolvedKey = templateKey ?? configModule.defaultTemplateKey
    return configModule.templates[resolvedKey] ?? null
  } catch {
    return null
  }
}
