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
    <div className="px-6 pb-24 pt-24 sm:px-12 md:px-20 lg:px-32">
      {!events?.length ? (
        <p className="font-serif italic text-2xl text-mist">Bald.</p>
      ) : (
        <div className="flex flex-col gap-20">
          {groups.map(({ month, events: monthEvents }) => (
            <section key={month.toISOString()}>
              {/* Month header */}
              <h2 className="mb-10 font-serif italic text-[clamp(3rem,8vw,6rem)] leading-none text-spark/20">
                {format(month, 'MMMM', { locale: de })}
              </h2>

              {/* Events */}
              <div className="flex flex-col gap-0 divide-y divide-white/5">
                {monthEvents!.map((event) => (
                  <Link
                    key={event.id}
                    href={`/event/${event.slug}`}
                    className="group flex flex-col gap-2 py-8 transition-colors sm:flex-row sm:items-baseline sm:gap-12"
                  >
                    {/* Date */}
                    <span className="shrink-0 font-sans text-[11px] tracking-[0.2em] text-mist uppercase sm:w-28">
                      {format(new Date(event.starts_at), 'eeee, d. MMM', { locale: de })}
                    </span>

                    {/* Title + meta */}
                    <div className="flex flex-1 flex-col gap-1.5">
                      <span className="font-serif italic text-[clamp(1.4rem,3vw,2rem)] leading-tight text-spark transition-opacity group-hover:opacity-70">
                        {event.title}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase">
                          {SPORT_LABELS[event.sport] ?? event.sport}
                        </span>
                        {event.meeting_point && (
                          <>
                            <span className="text-white/15">·</span>
                            <span className="font-sans text-[10px] text-white/30">
                              {event.meeting_point}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="font-sans text-[11px] text-white/20 transition-colors group-hover:text-white/50 sm:self-center">
                      →
                    </span>
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
