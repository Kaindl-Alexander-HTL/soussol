import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArchiveCanvas } from '@/components/ArchiveCanvas'
import { MementoCard } from '@/components/MementoCard'
import type { Memento } from '@/lib/types'

export const metadata: Metadata = { title: 'Archive — SOUS SOL' }

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const isGrid = view === 'grid'

  const supabase = await createClient()
  const { data } = await supabase
    .from('mementos')
    .select('id, kind, image_url, caption, body, date_label, event_id, x, y, rotation, scale, z_index, is_visible')
    .eq('is_visible', true)
    .order('z_index', { ascending: true })

  const mementos = (data ?? []) as Memento[]

  if (isGrid) {
    return (
      <div className="px-6 pb-24 pt-8 sm:px-12 md:px-20 lg:px-32">
        <div className="mb-8 flex items-center justify-between">
          <p className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            {mementos.length} Mementos
          </p>
          <Link
            href="/archive"
            className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
          >
            Canvas →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {mementos.map((m) => (
            <Link key={m.id} href={`/archive/${m.id}`} className="flex justify-center transition-opacity hover:opacity-80">
              <MementoCard memento={m} />
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Canvas view (default)
  return (
    <>
      {/* Mobile fallback link */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-30 sm:hidden">
        <Link
          href="/archive?view=grid"
          className="pointer-events-auto font-sans text-[9px] tracking-[0.25em] text-mist uppercase"
        >
          Grid ↗
        </Link>
      </div>

      {mementos.length === 0 ? (
        <div className="flex h-screen items-center justify-center">
          <p className="font-serif italic text-2xl text-mist">Bald.</p>
        </div>
      ) : (
        <ArchiveCanvas mementos={mementos} />
      )}
    </>
  )
}
