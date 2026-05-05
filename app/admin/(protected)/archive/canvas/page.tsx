import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminCanvas } from '@/components/admin/AdminCanvas'
import type { Memento } from '@/lib/types'

export const metadata: Metadata = { title: 'Canvas Layout — SOUS SOL Admin' }

export default async function AdminCanvasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('mementos')
    .select('id, kind, image_url, caption, body, date_label, event_id, x, y, rotation, scale, z_index, is_visible')
    .order('z_index', { ascending: true })

  const mementos = (data ?? []) as Memento[]

  if (!mementos.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-serif italic text-2xl text-mist">Noch keine Mementos.</p>
          <Link
            href="/admin/archive/new"
            className="mt-6 inline-block font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
          >
            Erstes Memento erstellen →
          </Link>
        </div>
      </div>
    )
  }

  return <AdminCanvas mementos={mementos} />
}
