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
    <div className="px-6 pb-32 pt-16 sm:pt-24 sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/upcoming"
        className="mb-8 sm:mb-12 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← Upcoming
      </Link>

      {/* Meta */}
      <div className="mb-5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
        <span className="font-sans text-[10px] tracking-[0.22em] text-smoke uppercase">
          {SPORT_LABELS[event.sport] ?? event.sport}
        </span>
        <span className="font-sans text-[10px] tracking-[0.15em] text-ash">
          {dateStr} · {timeStr}{endsStr ? `–${endsStr}` : ''}
        </span>
        {event.meeting_point && (
          <span className="font-sans text-[10px] text-smoke">{event.meeting_point}</span>
        )}
      </div>

      {/* Title */}
      <h1 className="opsz-display mb-8 sm:mb-10 font-serif italic text-[clamp(1.8rem,6vw,4.5rem)] leading-[1.1] text-paper">
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

      {/* Capacity hint — nur beim internen RSVP-Flow */}
      {!event.external_signup_url && registrationOpen && spotsLeft !== null && (
        <p className="mb-8 font-sans text-[11px] tracking-[0.15em] text-mist uppercase">
          {spotsLeft === 0 ? 'Ausgebucht — Warteliste möglich' : `${spotsLeft} Plätze verfügbar`}
        </p>
      )}

      {/* Signup: externer Partner (z.B. Turnier) > internes RSVP > keine Anmeldung */}
      {event.external_signup_url ? (
        <div className="border-t border-white/8 pt-10">
          <a
            href={event.external_signup_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.35em] text-ash uppercase transition-colors duration-500 hover:text-spark"
          >
            <span>Anmelden</span>
            <span
              className="inline-block transition-transform duration-500 group-hover:translate-x-1.5"
              aria-hidden="true"
            >
              →
            </span>
          </a>
          <p className="mt-4 font-sans text-[11px] text-mist">
            Die Anmeldung läuft über unseren Partner.
          </p>
        </div>
      ) : registrationOpen ? (
        <RegistrationForm eventId={event.id} />
      ) : (
        <p className="border-t border-white/8 pt-10 font-sans text-sm text-mist">
          Keine Anmeldung notwendig.
        </p>
      )}
    </div>
  )
}
