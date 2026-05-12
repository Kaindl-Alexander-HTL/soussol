import type { Metadata } from 'next'
import Link from 'next/link'
import { EventForm } from '@/components/admin/EventForm'

export const metadata: Metadata = { title: 'Neuer Event — SOUS SOL Admin' }

export default function NewEventPage() {
  return (
    <div className="max-w-xl">
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/admin/events"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Events
        </Link>
        <h1 className="font-serif italic text-3xl text-paper">Neuer Event</h1>
      </div>
      <EventForm />
    </div>
  )
}
