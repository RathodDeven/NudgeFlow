import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type PromptContext = {
  tenantId: string
  agentPrompt: string
  tenantKnowledge: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const readTenantFile = async (tenantId: string, filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(__dirname, '../../../tenants', tenantId, filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] Tenant file not found: tenants/${tenantId}/${filename}`)
    return ''
  }
}

export const loadPromptContext = async (tenantId: string): Promise<PromptContext> => {
  const [agentPrompt, tenantKnowledge] = await Promise.all([
    readTenantFile(tenantId, 'AGENT.md'),
    readTenantFile(tenantId, 'KNOWLEDGE.md')
  ])

  return {
    tenantId,
    agentPrompt,
    tenantKnowledge
  }
}

export const buildSystemPrompt = (context: PromptContext, utilitiesContext: string): string => {
  return [
    `--- AGENT INSTRUCTIONS ---\n${context.agentPrompt}\n--- END INSTRUCTIONS ---`,
    `--- KNOWLEDGE BASE ---\n${context.tenantKnowledge}\n--- END KNOWLEDGE BASE ---`,
    `--- CONTEXT & UTILITIES ---\n${utilitiesContext}\n--- END UTILITIES ---`
  ]
    .filter(Boolean)
    .join('\n\n')
}
