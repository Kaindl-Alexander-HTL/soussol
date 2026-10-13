import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'

export const metadata: Metadata = { title: 'Galerien — SOUS SOL Admin' }

export default async function GalerienPage() {
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const { data: mementos } = await supabase
    .from('mementos')
    .select('id, kind, caption, date_label, event_id')
    .order('created_at', { ascending: false })

  const { data: counts } = await supabase
    .from('gallery_photos')
    .select('memento_id')

  const countMap = (counts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.memento_id] = (acc[r.memento_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-2xl">
      <h1 className="mb-8 font-serif italic text-3xl text-paper">Galerien</h1>

      {!mementos?.length ? (
        <p className="font-sans text-sm text-mist">Noch keine Mementos.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {mementos.map((m) => (
            <Link
              key={m.id}
              href={`/admin/galerien/${m.id}`}
              className="group flex items-center gap-6 py-4 transition-colors"
            >
              <span className="flex-1 font-sans text-sm font-light text-ash transition-colors group-hover:text-spark">
                {m.caption ?? `${m.kind} — ${m.id.slice(0, 8)}`}
              </span>
              {m.date_label && (
                <span className="font-sans text-[10px] text-white/25">{m.date_label}</span>
              )}
              <span className="font-sans text-[11px] text-mist">
                {countMap[m.id] ?? 0} Fotos
              </span>
              <span className="font-sans text-[11px] text-white/20 group-hover:text-white/40 transition-colors">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
