import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArchiveCanvas } from '@/components/ArchiveCanvas'
import { MementoCard } from '@/components/MementoCard'
import { getArchiveClient } from '@/lib/member'
import { signMementoMedia } from '@/lib/archive-media'
import type { Memento } from '@/lib/types'

export const metadata: Metadata = { title: 'Archive — SOUS SOL' }

function isMobileUA(ua: string) {
  return /iPhone|Android|Mobile|BlackBerry|IEMobile/i.test(ua)
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const headersList = await headers()
  const ua = headersList.get('user-agent') ?? ''
  // Mobile devices default to grid; explicit ?view=canvas overrides
  const isGrid = view === 'grid' || (isMobileUA(ua) && view !== 'canvas')

  const supabase = await getArchiveClient()
  if (!supabase) redirect('/enter')

  const [{ data }, { data: connData }] = await Promise.all([
    supabase
      .from('mementos')
      .select('id, kind, image_url, caption, body, date_label, event_id, x, y, rotation, scale, z_index, is_visible')
      .eq('is_visible', true)
      .order('z_index', { ascending: true }),
    supabase
      .from('memento_connections')
      .select('id, from_memento_id, to_memento_id'),
  ])

  const mementos = await signMementoMedia((data ?? []) as Memento[])
  const connections = connData ?? []

  if (isGrid) {
    return (
      <div className="px-6 pb-24 pt-8 sm:px-12 md:px-20 lg:px-32">
        <div className="mb-8 flex items-center justify-between">
          <p className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            {mementos.length} Mementos
          </p>
          <Link
            href="/archive?view=canvas"
            className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
          >
            Canvas →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-3 md:grid-cols-4">
          {mementos.map((m) => (
            <Link
              key={m.id}
              href={`/archive/${m.id}`}
              className="flex justify-center transition-opacity hover:opacity-80 overflow-hidden"
            >
              <div className="[zoom:0.72] sm:[zoom:1] origin-top-left">
                <MementoCard memento={m} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Canvas view
  return (
    <>
      {mementos.length === 0 ? (
        <div className="flex h-screen items-center justify-center">
          <p className="font-serif italic text-2xl text-mist">Bald.</p>
        </div>
      ) : (
        <ArchiveCanvas mementos={mementos} connections={connections} />
      )}
    </>
  )
}
