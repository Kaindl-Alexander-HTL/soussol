import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Events — SOUS SOL Admin' }

type Tab = 'upcoming' | 'past' | 'cancelled'

const TABS: { value: Tab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SPORT_LABELS: Record<string, string> = {
  running: 'Running',
  cycling: 'Rennrad',
  volleyball: 'Volleyball',
  other: 'Other',
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab: Tab = (tab === 'past' || tab === 'cancelled') ? tab : 'upcoming'

  const supabase = await createClient()

  const [{ data: events }, { data: regCounts }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, sport, starts_at, registration_enabled, status')
      .eq('status', activeTab)
      .order('starts_at', { ascending: activeTab === 'upcoming' }),
    supabase
      .from('registrations')
      .select('event_id'),
  ])

  const countMap = (regCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.event_id] = (acc[r.event_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif italic text-3xl text-paper">Events</h1>
        <Link
          href="/admin/events/new"
          className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
        >
          + Neu
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-6 border-b border-white/8 pb-px">
        {TABS.map(({ value, label }) => (
          <Link
            key={value}
            href={`/admin/events?tab=${value}`}
            className={`pb-3 font-sans text-[10px] tracking-[0.25em] uppercase transition-colors ${
              activeTab === value
                ? 'border-b border-spark text-spark'
                : 'text-mist hover:text-ash'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* List */}
      {!events?.length ? (
        <p className="font-sans text-sm text-mist">Keine Events.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/events/${event.id}`}
              className="group flex items-center gap-6 py-4 transition-colors hover:bg-white/2"
            >
              <span className="w-28 shrink-0 font-sans text-[11px] text-mist">
                {format(new Date(event.starts_at), 'd. MMM yyyy', { locale: de })}
              </span>
              <span className="flex-1 font-sans text-sm font-light text-ash group-hover:text-spark transition-colors">
                {event.title}
              </span>
              <span className="font-sans text-[10px] tracking-[0.15em] text-white/30 uppercase">
                {SPORT_LABELS[event.sport] ?? event.sport}
              </span>
              {event.registration_enabled && (
                <span className="font-sans text-[11px] text-mist">
                  {countMap[event.id] ?? 0} Anm.
                </span>
              )}
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
