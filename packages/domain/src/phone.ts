/**
 * Normalizes a phone number for WhatsApp outreach in India.
 * Ensures the number is prefixed with '91'.
 *
 * @param phone The raw phone number string
 * @returns The normalized phone number string (e.g., '919876543210')
 */
export const normalizeWhatsAppPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')

  // If it's already 12 digits starting with 91, keep it
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits
  }

  // If it's 10 digits, prefix with 91
  if (digits.length === 10) {
    return `91${digits}`
  }

  // Fallback: return digits and hope Gupshup/Provider handles it or it fails gracefully
  return digits
}
