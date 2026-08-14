import { getSettings, text } from '@/lib/settings'
import { LandingPage } from '@/components/LandingPage'

export default async function HomePage() {
  const settings = await getSettings(['manifest', 'instagram_url', 'footer_credit'])

  const manifest = (settings.manifest as { content: string } | null)?.content ?? ''
  const instagramUrl = (settings.instagram_url as string | null) ?? ''
  const footerCredit = text(settings, 'footer_credit', 'Made by Studioaix')

  const paragraphs = manifest
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <LandingPage
      paragraphs={paragraphs}
      instagramUrl={instagramUrl}
      footerCredit={footerCredit}
    />
  )
}
