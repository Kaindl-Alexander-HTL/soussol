import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { signMementoMedia } from '@/lib/archive-media'
import { MementoForm } from '@/components/admin/MementoForm'

export const metadata: Metadata = { title: 'Edit memento — SOUS SOL Admin' }

export default async function EditMementoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const [{ data: memento }, { data: events }] = await Promise.all([
    supabase.from('mementos').select('*').eq('id', id).single(),
    supabase.from('events').select('id, title').order('starts_at', { ascending: false }),
  ])

  if (!memento) notFound()
  const [signedMemento] = await signMementoMedia([memento])

  return (
    <div className="max-w-xl">
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/admin/archive"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Archive
        </Link>
        <h1 className="font-serif italic text-3xl text-paper">Memento</h1>
      </div>
      <MementoForm
        events={events ?? []}
        initial={{
          id: signedMemento.id,
          kind: signedMemento.kind,
          image_url: signedMemento.image_url ?? '',
          caption: signedMemento.caption ?? '',
          body: signedMemento.body ?? '',
          date_label: signedMemento.date_label ?? '',
          event_id: signedMemento.event_id ?? '',
          is_visible: signedMemento.is_visible,
        }}
      />
    </div>
  )
}
