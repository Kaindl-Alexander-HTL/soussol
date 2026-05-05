import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SettingsPage } from '@/components/admin/SettingsPage'

export const metadata: Metadata = { title: 'Settings — SOUS SOL Admin' }

// Fallback only — used when no access_code row exists yet
const THIRTY_DAYS_MS = 30 * 86_400_000

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('settings')
    .select('key, value')

  const get = (key: string) => rows?.find((r) => r.key === key)?.value

  const accessCode = (get('access_code') as { code: string; valid_until: string }) ?? {
    code: '',
    // eslint-disable-next-line react-hooks/purity
    valid_until: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
  }
  const manifest = (get('manifest') as { content: string }) ?? { content: '' }
  const instagramUrl = (get('instagram_url') as string) ?? ''
  const stravaClubUrl = (get('strava_club_url') as string) ?? ''
  const contactEmail = (get('contact_email') as string) ?? ''

  return (
    <SettingsPage
      accessCode={accessCode}
      manifest={manifest}
      instagramUrl={instagramUrl}
      stravaClubUrl={stravaClubUrl}
      contactEmail={contactEmail}
    />
  )
}
