import type { SettingsMap } from '@/lib/settings'

export const LEGAL_ADDRESS = {
  name: 'Tim Tanzer',
  street: 'Großambergstraße 31a',
  postalCode: '4048',
  city: 'Puchenau',
  country: 'Austria',
} as const

export function legalContactEmail(settings: SettingsMap): string | null {
  const value = settings.contact_email
  if (typeof value !== 'string') return null
  const email = value.trim()
  return email || null
}
