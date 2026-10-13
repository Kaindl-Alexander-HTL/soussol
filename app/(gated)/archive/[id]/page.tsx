import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MementoCard } from '@/components/MementoCard'
import type { Memento } from '@/lib/types'

export const metadata: Metadata = { title: 'Memento — SOUS SOL' }

export default async function MementoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ data: memento }, { data: photos }] = await Promise.all([
    supabaseAdmin
      .from('mementos')
      .select('id, kind, image_url, caption, body, date_label, event_id, x, y, rotation, scale, z_index, is_visible')
      .eq('id', id)
      .eq('is_visible', true)
      .single(),
    supabaseAdmin
      .from('gallery_photos')
      .select('id, url, caption')
      .eq('memento_id', id)
      .order('sort_order', { ascending: true })
      .limit(4),
  ])

  if (!memento) notFound()

  const hasGallery = (photos?.length ?? 0) > 0

  return (
    <main className="min-h-screen bg-ink px-6 pb-32 pt-16 sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/archive"
        className="mb-16 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← Archive
      </Link>

      {/* Memento Card — centered */}
      <div className="mb-16 flex justify-center">
        <MementoCard memento={memento as Memento} />
      </div>

      {/* Body text */}
      {memento.body && (
        <div className="mx-auto mb-16 max-w-lg">
          <p className="font-serif italic text-[clamp(1.1rem,2vw,1.4rem)] leading-relaxed text-paper/80">
            {memento.body}
          </p>
        </div>
      )}

      {/* Gallery preview + link */}
      {hasGallery && (
        <div className="mx-auto max-w-lg">
          <div className="mb-4 grid grid-cols-4 gap-2">
            {photos!.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden bg-white/5">
                <Image
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  fill
                  className="object-cover opacity-80 transition-opacity hover:opacity-100"
                  sizes="(max-width: 640px) 25vw, 128px"
                />
              </div>
            ))}
          </div>
          <Link
            href={`/galerie/${id}`}
            className="group inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
          >
            <span>Mehr Fotos</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
              →
            </span>
          </Link>
        </div>
      )}
    </main>
  )
}
