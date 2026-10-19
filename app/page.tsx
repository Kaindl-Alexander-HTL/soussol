import { getSettings } from '@/lib/settings'
import { LandingPage } from '@/components/LandingPage'

export default async function HomePage() {
  const settings = await getSettings(['manifest', 'instagram_url', 'strava_club_url', 'footer_credit'])

  const manifest = (settings.manifest as { content: string } | null)?.content ?? ''
  const instagramUrl = (settings.instagram_url as string | null) ?? ''
  const stravaUrl = (settings.strava_club_url as string | null) ?? ''
  // Kein Fallback: ein leerer Footer-Credit blendet die Zeile aus.
  const footerCredit = ((settings.footer_credit as string | null) ?? '').trim()

  const paragraphs = manifest
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <LandingPage
      paragraphs={paragraphs}
      instagramUrl={instagramUrl}
      stravaUrl={stravaUrl}
      footerCredit={footerCredit}
    />
  )
}
