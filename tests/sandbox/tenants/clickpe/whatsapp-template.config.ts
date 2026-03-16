export type TenantWhatsAppTemplate = {
  templateId: string
  variableOrder: string[]
}

export type TenantWhatsAppConfig = {
  defaultTemplateKey: string
  appName: string
  source: string
  ctaBaseUrl?: string
  templates: Record<string, TenantWhatsAppTemplate>
}

/**
 * Available Variables for Templates:
 * - user_name: Full name of the user
 * - loan_amount: Formatted loan amount (e.g. 50,000)
 * - pending_step: Human readable step (e.g. document upload)
 * - application_id: External or internal partner ID
 * - pending_document: Name of the missing document
 * - disbursement_amount: Same as loan_amount
 * - mob_num: E164 phone number
 */
const whatsappTemplateConfig: TenantWhatsAppConfig = {
  appName: 'Clickpe',
  source: '15558996079', // TODO: Update with actual Gupshup WhatsApp number
  defaultTemplateKey: 'step_completion_document_required',
  ctaBaseUrl: 'https://los-prod.dailype.in/muthoot/session-link?utm_source=muthoot_follow_up&utm_medium=whatsapp&utm_campaign=ronit_follow_up',
  templates: {
    step_completion_document_required: {
      templateId: '9269aa1f-122d-4dd3-9550-1865884d5b3f',
      variableOrder: ['application_id', 'disbursement_amount', 'pending_document', 'mob_num']
    }
  }
}

export default whatsappTemplateConfig
