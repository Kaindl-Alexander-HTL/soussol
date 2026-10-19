import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { signMementoMedia } from '@/lib/archive-media'
import { AdminCanvas } from '@/components/admin/AdminCanvas'
import type { Memento } from '@/lib/types'

export const metadata: Metadata = { title: 'Canvas Layout — SOUS SOL Admin' }

export default async function AdminCanvasPage() {
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const [{ data }, { data: connData }] = await Promise.all([
    supabase
      .from('mementos')
      .select('id, kind, image_url, caption, body, date_label, event_id, x, y, rotation, scale, z_index, is_visible')
      .order('z_index', { ascending: true }),
    supabase
      .from('memento_connections')
      .select('id, from_memento_id, to_memento_id'),
  ])

  const mementos = await signMementoMedia((data ?? []) as Memento[])
  const connections = connData ?? []

  if (!mementos.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
        <p className="font-serif italic text-2xl text-mist">No mementos yet.</p>
          <Link
            href="/admin/archive/new"
            className="mt-6 inline-block font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
          >
            Create the first memento →
          </Link>
        </div>
      </div>
    )
  }

  return <AdminCanvas mementos={mementos} initialConnections={connections} />
}
