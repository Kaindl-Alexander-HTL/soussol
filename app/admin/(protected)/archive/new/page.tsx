import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MementoForm } from '@/components/admin/MementoForm'

export const metadata: Metadata = { title: 'Neues Memento — SOUS SOL Admin' }

export default async function NewMementoPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .order('starts_at', { ascending: false })

  return (
    <div className="max-w-xl">
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/admin/archive"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Archive
        </Link>
        <h1 className="font-serif italic text-3xl text-spark">Neues Memento</h1>
      </div>
      <MementoForm events={events ?? []} />
    </div>
  )
}
