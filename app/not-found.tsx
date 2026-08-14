import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings, text } from '@/lib/settings'

export const metadata: Metadata = {
  title: '404',
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  const settings = await getSettings(['not_found_text'])
  const notFoundText = text(settings, 'not_found_text', 'Nicht gefunden')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-6">
      <span
        className="select-none font-serif italic leading-none text-spark/8"
        style={{ fontSize: 'clamp(8rem, 30vw, 18rem)' }}
        aria-hidden="true"
      >
        404
      </span>
      <p className="mt-2 font-sans text-[11px] tracking-[0.35em] text-mist uppercase">
        {notFoundText}
      </p>
      <Link
        href="/"
        className="mt-10 font-sans text-[10px] tracking-[0.3em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← Zurück
      </Link>
    </main>
  )
}
