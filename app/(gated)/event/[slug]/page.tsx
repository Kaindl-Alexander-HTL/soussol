import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RegistrationForm } from '@/components/RegistrationForm'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const SPORT_LABELS: Record<string, string> = {
  running: 'Running',
  cycling: 'Rennrad',
  volleyball: 'Volleyball',
  other: 'Other',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('title').eq('slug', slug).single()
  return { title: data ? `${data.title} — SOUS SOL` : 'SOUS SOL' }
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'upcoming')
    .single()

  if (!event) notFound()

  const registrationOpen = event.registration_enabled

  let spotsLeft: number | null = null
  if (registrationOpen && event.max_participants !== null) {
    const { count } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('is_waitlist', false)
    spotsLeft = Math.max(0, event.max_participants - (count ?? 0))
  }

  const dateStr = format(new Date(event.starts_at), 'eeee, d. MMMM yyyy', { locale: de })
  const timeStr = format(new Date(event.starts_at), 'HH:mm')
  const endsStr = event.ends_at ? format(new Date(event.ends_at), 'HH:mm') : null

  return (
    <div className="px-6 pb-32 pt-24 sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/upcoming"
        className="mb-12 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← Upcoming
      </Link>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="font-sans text-[11px] tracking-[0.2em] text-mist uppercase">
          {SPORT_LABELS[event.sport] ?? event.sport}
        </span>
        <span className="font-sans text-[11px] text-white/25">
          {dateStr} · {timeStr}{endsStr ? `–${endsStr}` : ''}
        </span>
        {event.meeting_point && (
          <span className="font-sans text-[11px] text-white/25">{event.meeting_point}</span>
        )}
      </div>

      {/* Title */}
      <h1 className="mb-10 font-serif italic text-[clamp(2rem,6vw,4.5rem)] leading-[1.1] text-spark">
        {event.title}
      </h1>

      {/* Description */}
      {event.description && (
        <div className="mb-16 max-w-xl">
          {event.description.split('\n\n').map((para: string, i: number) => (
            <p key={i} className="mb-5 font-sans text-sm font-light leading-relaxed text-ash last:mb-0">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Capacity hint */}
      {registrationOpen && spotsLeft !== null && (
        <p className="mb-8 font-sans text-[11px] tracking-[0.15em] text-mist uppercase">
          {spotsLeft === 0 ? 'Ausgebucht — Warteliste möglich' : `${spotsLeft} Plätze verfügbar`}
        </p>
      )}

      {/* Registration */}
      {registrationOpen ? (
        <RegistrationForm eventId={event.id} />
      ) : (
        <p className="border-t border-white/8 pt-10 font-sans text-sm text-mist">
          Keine Anmeldung notwendig.
        </p>
      )}
    </div>
  )
}
