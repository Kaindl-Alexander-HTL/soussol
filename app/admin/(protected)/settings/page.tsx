import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { SettingsPage } from '@/components/admin/SettingsPage'
import { FONT_THEMES, DEFAULT_FONT_THEME } from '@/lib/fonts'

export const metadata: Metadata = { title: 'Settings — SOUS SOL Admin' }

export default async function AdminSettingsPage() {
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const { data: rows } = await supabase
    .from('settings')
    .select('key, value')

  const get = (key: string) => rows?.find((r) => r.key === key)?.value

  const manifest = (get('manifest') as { content: string }) ?? { content: '' }
  const instagramUrl = (get('instagram_url') as string) ?? ''
  const stravaClubUrl = (get('strava_club_url') as string) ?? ''
  const contactEmail = (get('contact_email') as string) ?? ''

  // Nur die Metadaten der Font-Paare ins Client-Bundle — lib/fonts.ts selbst
  // lädt next/font und gehört in den Server-Graph.
  const fontThemes = FONT_THEMES.map(({ id, label, note, serif, sans }) => ({
    id,
    label,
    note,
    serif,
    sans,
  }))
  const fontTheme = (get('font_theme') as string) ?? DEFAULT_FONT_THEME.id

  return (
    <SettingsPage
      manifest={manifest}
      instagramUrl={instagramUrl}
      stravaClubUrl={stravaClubUrl}
      contactEmail={contactEmail}
      fontThemes={fontThemes}
      fontTheme={fontTheme}
      applyHeadline={(get('apply_headline') as string) ?? ''}
      applyIntro={(get('apply_intro') as string) ?? ''}
      notFoundText={(get('not_found_text') as string) ?? ''}
      footerCredit={(get('footer_credit') as string) ?? ''}
    />
  )
}
