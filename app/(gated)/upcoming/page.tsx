import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format, isSameMonth } from 'date-fns'
import { de } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Upcoming — SOUS SOL' }

const SPORT_LABELS: Record<string, string> = {
  running: 'Running',
  cycling: 'Rennrad',
  volleyball: 'Volleyball',
  other: 'Other',
}

export default async function UpcomingPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, slug, title, sport, starts_at, meeting_point, registration_enabled')
    .eq('status', 'upcoming')
    .order('starts_at', { ascending: true })

  // Group by month
  const groups: { month: Date; events: typeof events }[] = []
  for (const event of events ?? []) {
    const d = new Date(event.starts_at)
    const last = groups[groups.length - 1]
    if (last && isSameMonth(d, last.month)) {
      last.events!.push(event)
    } else {
      groups.push({ month: d, events: [event] })
    }
  }

  return (
    <div className="px-6 pb-32 pt-16 sm:px-12 md:px-20 lg:px-32">
      {!events?.length ? (
        <p className="font-serif italic text-2xl text-smoke">Bald.</p>
      ) : (
        <div className="flex flex-col gap-24">
          {groups.map(({ month, events: monthEvents }) => (
            <section key={month.toISOString()}>

              {/* Month header — paper/60, large, ghost-like but warm */}
              <h2
                className="opsz-display mb-6 font-serif italic leading-none text-paper/60 select-none"
                style={{ fontSize: 'clamp(4rem, 12vw, 9rem)' }}
              >
                {format(month, 'MMMM', { locale: de })}
              </h2>

              {/* Event list */}
              <div className="flex flex-col divide-y divide-white/[0.06]">
                {monthEvents!.map((event) => (
                  <Link
                    key={event.id}
                    href={`/event/${event.slug}`}
                    className="group py-7"
                  >
                    <div className="flex items-baseline gap-8 sm:gap-12">
                      {/* Date column — ash, always readable */}
                      <span
                        className="w-36 shrink-0 font-sans text-[10px] tracking-[0.22em] text-ash uppercase"
                      >
                        {format(new Date(event.starts_at), 'eeee, d. MMM', { locale: de })}
                      </span>

                      {/* Right: title + meta */}
                      <div className="flex flex-1 flex-col gap-2">
                        <span
                          className="opsz-heading font-serif italic leading-tight text-paper transition-opacity duration-300 group-hover:opacity-70"
                          style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
                        >
                          {event.title}
                        </span>

                        {/* Meta line — smoke, readable secondary */}
                        <div className="flex items-center gap-3">
                          <span className="font-sans text-[10px] tracking-[0.22em] text-smoke uppercase">
                            {SPORT_LABELS[event.sport] ?? event.sport}
                          </span>
                          {event.meeting_point && (
                            <>
                              <span className="text-mist">·</span>
                              <span className="font-sans text-[10px] tracking-[0.15em] text-smoke">
                                {event.meeting_point}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Arrow — paper on group hover */}
                      <span className="shrink-0 font-sans text-sm text-smoke transition-colors duration-300 group-hover:text-paper">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

            </section>
          ))}
        </div>
      )}
    </div>
  )
}
