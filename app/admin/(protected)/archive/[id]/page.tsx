import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MementoForm } from '@/components/admin/MementoForm'

export const metadata: Metadata = { title: 'Memento bearbeiten — SOUS SOL Admin' }

export default async function EditMementoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: memento }, { data: events }] = await Promise.all([
    supabase.from('mementos').select('*').eq('id', id).single(),
    supabase.from('events').select('id, title').order('starts_at', { ascending: false }),
  ])

  if (!memento) notFound()

  return (
    <div className="max-w-xl">
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/admin/archive"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Archive
        </Link>
        <h1 className="font-serif italic text-3xl text-spark">Memento</h1>
      </div>
      <MementoForm
        events={events ?? []}
        initial={{
          id: memento.id,
          kind: memento.kind,
          image_url: memento.image_url ?? '',
          caption: memento.caption ?? '',
          body: memento.body ?? '',
          date_label: memento.date_label ?? '',
          event_id: memento.event_id ?? '',
          is_visible: memento.is_visible,
        }}
      />
    </div>
  )
}
