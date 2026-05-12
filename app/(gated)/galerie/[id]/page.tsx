import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    <main className="min-h-screen bg-ink px-6 pb-32 pt-16 sm:px-12 md:px-20 lg:px-32">
      <div className="mb-12 flex items-baseline gap-6">
        <Link
          href={`/archive/${id}`}
          className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Memento
        </Link>
        {memento.caption && (
          <h1 className="font-serif italic text-[clamp(1.4rem,3vw,2rem)] text-paper">
            {memento.caption}
          </h1>
        )}
        {memento.date_label && (
          <span className="font-sans text-[10px] text-mist">{memento.date_label}</span>
        )}
      </div>

      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
        {photos.map((photo) => (
          <div key={photo.id} className="mb-3 break-inside-avoid overflow-hidden bg-white/5">
            <Image
              src={photo.url}
              alt={photo.caption ?? ''}
              width={600}
              height={600}
              className="w-full object-cover"
              style={{ display: 'block' }}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
            {photo.caption && (
              <p className="px-2 pb-2 pt-1.5 font-sans text-[10px] text-mist">
                {photo.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
