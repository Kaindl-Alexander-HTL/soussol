import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { signGalleryMedia } from '@/lib/archive-media'
import { GalleryUploader } from '@/components/admin/GalleryUploader'

export const metadata: Metadata = { title: 'Galerie — SOUS SOL Admin' }

export default async function GalerieEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const [{ data: memento }, { data: photos }] = await Promise.all([
    supabase.from('mementos').select('id, kind, caption, date_label').eq('id', id).single(),
    supabase
      .from('gallery_photos')
      .select('id, url, caption, sort_order')
      .eq('memento_id', id)
      .order('sort_order', { ascending: true }),
  ])

  if (!memento) notFound()
  const signedPhotos = await signGalleryMedia(photos ?? [])

  return (
    <div className="max-w-2xl">
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/admin/galerien"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Galerien
        </Link>
        <h1 className="font-serif italic text-3xl text-paper">
          {memento.caption ?? `${memento.kind}`}
        </h1>
      </div>

      {memento.date_label && (
        <p className="mb-6 font-sans text-[11px] text-mist">{memento.date_label}</p>
      )}

      <GalleryUploader
        mementoId={memento.id}
        initialPhotos={signedPhotos}
      />
    </div>
  )
}
