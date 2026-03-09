/**
 * Muthoot / ClickPe Tenant Campaign Configuration
 *
 * All company-specific settings for the Muthoot deployment live here.
 * To adapt this agent for a different company, create a new tenant folder and add
 * a config.ts there with that company's values.
 */

// TenantConfig type is defined inline here to keep tenants/ self-contained
// and avoid circular dep on @nudges/persuasion-core at tenant config load time.
export type TenantConfig = {
  deepLinkTemplate: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  ctaButtonLabel: string
}

const config: TenantConfig = {
  deepLinkTemplate:
    'https://los-prod.dailype.in/muthoot/session-link?mob_num={{MOB_NUM}}&utm_source={{UTM_SOURCE}}&utm_medium={{UTM_MEDIUM}}&utm_campaign={{UTM_CAMPAIGN}}',
  utmSource: 'muthoot_follow_up',
  utmMedium: 'whatsapp',
  utmCampaign: 'nudge_sandbox',
  ctaButtonLabel: 'Apply Karo Abhi 🚀'
}

export default config
