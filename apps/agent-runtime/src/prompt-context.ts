import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type PromptContext = {
  tenantId: string
  agentPrompt: string
  tenantKnowledge: string
  whatsappPrompt: string
  systemPrompt: string
  constraintsPrompt: string
  utilitiesPrompt: string
  workflowsPrompt: string
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

const readGlobalPrompt = async (filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(__dirname, '../../../prompts', filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] Global prompt not found: prompts/${filename}`)
    return ''
  }
}

export const loadPromptContext = async (tenantId: string): Promise<PromptContext> => {
  const [
    agentPrompt,
    tenantKnowledge,
    whatsappPrompt,
    systemPrompt,
    constraintsPrompt,
    utilitiesPrompt,
    workflowsPrompt
  ] = await Promise.all([
    readTenantFile(tenantId, 'AGENT.md'),
    readTenantFile(tenantId, 'KNOWLEDGE.md'),
    readGlobalPrompt('WHATSAPP.md'),
    readGlobalPrompt('SYSTEM.md'),
    readGlobalPrompt('CONSTRAINTS.md'),
    readGlobalPrompt('UTILITIES.md'),
    readGlobalPrompt('WORKFLOWS.md')
  ])

  return {
    tenantId,
    agentPrompt,
    tenantKnowledge,
    whatsappPrompt,
    systemPrompt,
    constraintsPrompt,
    utilitiesPrompt,
    workflowsPrompt
  }
}

export const buildSystemPrompt = (context: PromptContext, utilitiesContext: string): string => {
  return [
    '# GLOBAL POLICIES',
    `--- GOVERNANCE & SAFETY ---\n${context.systemPrompt}\n--- END GOVERNANCE ---`,
    `--- WHATSAPP FORMATTING ---\n${context.whatsappPrompt}\n--- END WHATSAPP FORMATTING ---`,
    `--- CHANNEL CONSTRAINTS ---\n${context.constraintsPrompt}\n--- END CONSTRAINTS ---`,
    '',
    '# AGENT & PRODUCT LOGIC',
    `--- AGENT INSTRUCTIONS ---\n${context.agentPrompt}\n--- END INSTRUCTIONS ---`,
    `--- GLOBAL WORKFLOWS ---\n${context.workflowsPrompt}\n--- END WORKFLOWS ---`,
    `--- KNOWLEDGE BASE ---\n${context.tenantKnowledge}\n--- END KNOWLEDGE BASE ---`,
    '',
    '# CONTEXT & UTILITIES',
    `--- REASONING UTILITIES ---\n${context.utilitiesPrompt}\n--- END UTILITIES ---`,
    `--- DYNAMIC CONTEXT ---\n${utilitiesContext}\n--- END DYNAMIC CONTEXT ---`
  ]
    .filter(Boolean)
    .join('\n\n')
}
