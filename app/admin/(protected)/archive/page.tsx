import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { signMementoMedia } from '@/lib/archive-media'

export const metadata: Metadata = { title: 'Archive — SOUS SOL Admin' }

const KIND_LABELS: Record<string, string> = {
  polaroid: 'Polaroid',
  note: 'Note',
  stamp: 'Stamp',
  scan: 'Scan',
  strava: 'Strava',
  other: 'Other',
}

export default async function AdminArchivePage() {
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const { data: mementos } = await supabase
    .from('mementos')
    .select('id, kind, caption, date_label, image_url, is_visible, created_at')
    .order('created_at', { ascending: false })

  const signedMementos = await signMementoMedia(mementos ?? [])

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif italic text-3xl text-paper">Archive</h1>
        <div className="flex items-center gap-6">
          <Link
            href="/admin/archive/canvas"
            className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
          >
            Canvas-Layout →
          </Link>
          <Link
            href="/admin/archive/new"
            className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
          >
            + Neu
          </Link>
        </div>
      </div>

      {!signedMementos.length ? (
        <p className="font-sans text-sm text-mist">Noch keine Mementos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {signedMementos.map((m) => (
            <Link
              key={m.id}
              href={`/admin/archive/${m.id}`}
              className="group flex flex-col gap-2"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square overflow-hidden bg-white/5">
                {m.image_url ? (
                  <Image
                    src={m.image_url}
                    alt={m.caption ?? ''}
                    fill
                    className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase">
                      {KIND_LABELS[m.kind] ?? m.kind}
                    </span>
                  </div>
                )}
                {!m.is_visible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="font-sans text-[9px] tracking-[0.2em] text-white/40 uppercase">Versteckt</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-col gap-0.5 px-0.5">
                <span className="font-sans text-[10px] tracking-[0.15em] text-white/30 uppercase">
                  {KIND_LABELS[m.kind] ?? m.kind}
                </span>
                {(m.caption || m.date_label) && (
                  <span className="truncate font-sans text-[11px] text-mist">
                    {m.caption ?? m.date_label}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
