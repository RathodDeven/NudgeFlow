import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type PromptContext = {
  tenantId: string
  globalIdentity: string
  globalWorkflows: string
  globalConstraints: string
  globalSystem: string
  globalUtilities: string
  universalKnowledge: string
  tenantProfile: string
  tenantChannel: string
  tenantWorkflows: string
  tenantKnowledge: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROMPTS_ROOT = path.resolve(__dirname, '../../../prompts')

const readPromptFile = async (filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(PROMPTS_ROOT, filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] Global prompt file not found: prompts/${filename}`)
    return ''
  }
}

const readTenantFile = async (tenantId: string, filename: string): Promise<string> => {
  try {
    return await fs.readFile(path.join(__dirname, '../../../tenants', tenantId, filename), 'utf-8')
  } catch {
    console.warn(`[agent-runtime] Tenant file not found: tenants/${tenantId}/${filename}`)
    return ''
  }
}

export const loadPromptContext = async (tenantId: string): Promise<PromptContext> => {
  const [
    globalIdentity,
    globalWorkflows,
    globalConstraints,
    globalSystem,
    globalUtilities,
    universalKnowledge,
    tenantProfile,
    tenantChannel,
    tenantWorkflows,
    tenantKnowledge
  ] = await Promise.all([
    readPromptFile('IDENTITY.md'),
    readPromptFile('WORKFLOWS.md'),
    readPromptFile('CONSTRAINTS.md'),
    readPromptFile('SYSTEM.md'),
    readPromptFile('UTILITIES.md'),
    readPromptFile('KNOWLEDGE.md'),
    readTenantFile(tenantId, 'PROFILE.md'),
    readTenantFile(tenantId, 'CHANNEL.md'),
    readTenantFile(tenantId, 'WORKFLOWS.md'),
    readTenantFile(tenantId, 'KNOWLEDGE.md')
  ])

  return {
    tenantId,
    globalIdentity,
    globalWorkflows,
    globalConstraints,
    globalSystem,
    globalUtilities,
    universalKnowledge,
    tenantProfile,
    tenantChannel,
    tenantWorkflows,
    tenantKnowledge
  }
}

export const buildSystemPrompt = (context: PromptContext, utilitiesContext: string): string => {
  const initialOutreachContext = `
--- INITIAL OUTREACH CONTEXT ---
If this is the start of the conversation, the user has just received our "Initial Outreach" template.
(Refer to CHANNEL.md for exact content and buttons).
The user may be responding with session-specific quick-replies (refer to tenant WORKFLOWS.md for handling).
-------------------------------`

  return [
    `--- AGENT IDENTITY ---\n${context.globalIdentity}\n--- END IDENTITY ---`,
    `--- SYSTEM RULES ---\n${context.globalSystem}\n--- END SYSTEM ---`,
    `--- CHANNEL & CONSTRAINTS ---\n${context.globalConstraints}\n${context.tenantChannel}\n--- END CHANNEL ---`,
    `--- UNIVERSAL KNOWLEDGE ---\n${context.universalKnowledge}\n--- END UNIVERSAL KNOWLEDGE ---`,
    `--- TENANT KNOWLEDGE ---\n${context.tenantKnowledge}\n--- END TENANT KNOWLEDGE ---`,
    `--- TENANT PROFILE ---\n${context.tenantProfile}\n--- END PROFILE ---`,
    `--- GENERAL WORKFLOWS ---\n${context.globalWorkflows}\n--- END GENERAL WORKFLOWS ---`,
    `--- TENANT WORKFLOWS ---\n${context.tenantWorkflows}\n--- END TENANT WORKFLOWS ---`,
    initialOutreachContext,
    `--- TIME & CONTEXT UTILITIES ---\n${context.globalUtilities}\n${utilitiesContext}\n--- END UTILITIES ---`
  ]
    .filter(Boolean)
    .join('\n\n')
}
