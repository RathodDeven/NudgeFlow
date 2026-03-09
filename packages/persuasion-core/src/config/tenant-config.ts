/**
 * Tenant Configuration Type & Utilities
 *
 * This module defines the TenantConfig contract and utility functions.
 * The actual config values live in `tenants/<TENANT_ID>/config.ts` — not here.
 * This keeps the core package company-agnostic and reusable.
 */

export type TenantConfig = {
  /** Full deep link URL template. Use {{MOB_NUM}}, {{UTM_SOURCE}}, {{UTM_MEDIUM}}, {{UTM_CAMPAIGN}} as placeholders. */
  deepLinkTemplate: string
  /** UTM source tag for tracking */
  utmSource: string
  /** UTM medium tag (e.g., whatsapp, sms) */
  utmMedium: string
  /** UTM campaign name */
  utmCampaign: string
  /** The text label shown on the WhatsApp CTA button */
  ctaButtonLabel: string
}

/**
 * Build a user-specific trackable deep link URL.
 * Interpolates mobile number and UTM params from the TenantConfig.
 */
export const buildDeepLink = (mobileNumber: string, config: TenantConfig): string => {
  return config.deepLinkTemplate
    .replace('{{MOB_NUM}}', mobileNumber)
    .replace('{{UTM_SOURCE}}', config.utmSource)
    .replace('{{UTM_MEDIUM}}', config.utmMedium)
    .replace('{{UTM_CAMPAIGN}}', config.utmCampaign)
}
