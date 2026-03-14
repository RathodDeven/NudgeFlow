export type TenantWhatsAppTemplate = {
  templateId: string
  variableOrder: string[]
}

export type TenantWhatsAppConfig = {
  defaultTemplateKey: string
  templates: Record<string, TenantWhatsAppTemplate>
}

const whatsappTemplateConfig: TenantWhatsAppConfig = {
  defaultTemplateKey: 'application_status_action_required',
  templates: {
    application_status_action_required: {
      templateId: 'REPLACE_WITH_GUPSHUP_TEMPLATE_ID',
      variableOrder: ['application_id', 'pending_document', 'disbursement_amount']
    }
  }
}

export default whatsappTemplateConfig
