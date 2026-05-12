import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GalleryView } from '@/components/GalleryView'

export const metadata: Metadata = { title: 'Galerie — SOUS SOL' }

export default async function GaleriePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: memento }, { data: photos }] = await Promise.all([
    supabase
      .from('mementos')
      .select('id, caption, date_label, is_visible')
      .eq('id', id)
      .single(),
    supabase
      .from('gallery_photos')
      .select('id, url, caption')
      .eq('memento_id', id)
      .order('sort_order', { ascending: true }),
  ])

  if (!memento || !memento.is_visible) notFound()
  if (!photos?.length) notFound()

  return (
    <div className="min-h-screen bg-ink">

      {/* ── Editorial Header ────────────────────────────────────────── */}
      <header className="px-6 pb-10 pt-16 sm:px-12 md:px-20 lg:px-32">
        <Link
          href={`/archive/${id}`}
          className="mb-10 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Zurück
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {memento.caption && (
              <h1
                className="opsz-display font-serif italic leading-none text-paper"
                style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}
              >
                {memento.caption}
              </h1>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {memento.date_label && (
              <span className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
                {memento.date_label}
              </span>
            )}
            <span className="font-sans text-[10px] tracking-[0.25em] text-white/20 uppercase">
              {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px bg-white/8" />
      </header>

      {/* ── Gallery Grid ─────────────────────────────────────────────── */}
      <div className="pb-4 pt-10">
        <GalleryView photos={photos} />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="px-6 py-16 sm:px-12 md:px-20 lg:px-32">
        <Link
          href={`/archive/${id}`}
          className="group inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.3em] text-mist uppercase transition-colors hover:text-spark"
        >
          <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1.5">←</span>
          <span>Zurück zum Memento</span>
        </Link>
      </div>
    </div>
  )
}
