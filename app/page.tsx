import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/LandingPage'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['manifest', 'instagram_url'])

  const get = (key: string) => rows?.find((r) => r.key === key)?.value

  const manifest = (get('manifest') as { content: string } | null)?.content ?? ''
  const instagramUrl = (get('instagram_url') as string | null) ?? ''

  const paragraphs = manifest
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return <LandingPage paragraphs={paragraphs} instagramUrl={instagramUrl} />
}
