import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { EventForm } from '@/components/admin/EventForm'
import { formatVienna } from '@/lib/date-time'

export const metadata: Metadata = { title: 'Edit event — SOUS SOL Admin' }

function csvCell(value: string): string {
  const protectedValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${protectedValue.replaceAll('"', '""')}"`
}

function csvExport(registrations: { guest_name: string; instagram_handle: string | null; strava_handle: string | null; phone: string | null; email: string | null; is_waitlist: boolean; notes: string | null; created_at: string }[]) {
  const rows = [
    ['Name', 'Instagram', 'Strava', 'Phone', 'Email', 'Waitlist', 'Note', 'Registered at'],
    ...registrations.map((r) => [
      r.guest_name,
      r.instagram_handle ? `@${r.instagram_handle}` : '',
      r.strava_handle ?? '',
      r.phone ?? '',
      r.email ?? '',
      r.is_waitlist ? 'Yes' : 'No',
      r.notes ?? '',
      formatVienna(r.created_at, 'dd/MM/yyyy HH:mm'),
    ]),
  ]
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

export default async function EventEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const [{ data: event }, { data: registrations }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase
        .from('registrations')
        .select('id, guest_name, instagram_handle, strava_handle, phone, email, is_waitlist, notes, created_at')
        .eq('event_id', id)
        .order('created_at', { ascending: true }),
    ])

  if (!event) notFound()

  const csvData = csvExport(registrations ?? [])
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`

  return (
    <div className="max-w-xl">
      <div className="mb-10 flex items-center gap-4">
        <Link
          href="/admin/events"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Events
        </Link>
        <h1 className="font-serif italic text-3xl text-paper">{event.title}</h1>
      </div>

      <EventForm
        initial={{
          id: event.id,
          title: event.title,
          sport: event.sport,
          starts_at: event.starts_at,
          ends_at: event.ends_at ?? '',
          meeting_point: event.meeting_point ?? '',
          description: event.description ?? '',
          max_participants: event.max_participants?.toString() ?? '',
          registration_enabled: event.registration_enabled,
          external_signup_url: event.external_signup_url ?? '',
          status: event.status,
          visibility: event.visibility ?? 'public',
        }}
      />

      {/* Registrations */}
      {event.registration_enabled && (
        <div className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
              Registrations ({registrations?.length ?? 0})
            </h2>
            {(registrations?.length ?? 0) > 0 && (
              <a
                href={csvHref}
                download={`${event.slug}-registrations.csv`}
                className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
              >
                CSV ↓
              </a>
            )}
          </div>

          {!registrations?.length ? (
            <p className="font-sans text-sm text-mist">No registrations yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {registrations.map((r) => (
                <div key={r.id} className="flex items-center gap-4 py-3">
                  <span className="flex-1 font-sans text-sm font-light text-ash">
                    {r.guest_name}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-[11px] text-mist">
                    {r.instagram_handle && <span>@{r.instagram_handle}</span>}
                    {r.strava_handle && <span>Strava: {r.strava_handle}</span>}
                    {r.phone && <span>{r.phone}</span>}
                    {r.email && <span>{r.email}</span>}
                  </span>
                  {r.is_waitlist && (
                    <span className="font-sans text-[9px] tracking-[0.2em] text-white/30 uppercase">
                      Waitlist
                    </span>
                  )}
                  <span className="font-sans text-[10px] text-white/20">
                    {formatVienna(r.created_at, 'd MMM')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
