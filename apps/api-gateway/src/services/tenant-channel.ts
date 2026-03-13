import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { TENANT_KEY } from '../context'

export type TenantTemplateConfig = {
  templateId: string
  variableOrder: string[]
}

const TEMPLATE_ID_RE = /Template ID:\s*`([^`]+)`/i
const TEMPLATE_VARS_RE = /Template Variables[^`]*`([^`]+)`/i

export const loadTenantTemplateConfig = async (): Promise<TenantTemplateConfig | null> => {
  try {
    const filePath = path.join(process.cwd(), 'tenants', TENANT_KEY, 'CHANNEL.md')
    const content = await readFile(filePath, 'utf-8')
    const templateMatch = content.match(TEMPLATE_ID_RE)
    if (!templateMatch) return null

    const varsMatch = content.match(TEMPLATE_VARS_RE)
    const variableOrder = varsMatch
      ? varsMatch[1]
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      : []

    return {
      templateId: templateMatch[1],
      variableOrder
    }
  } catch {
    return null
  }
}
