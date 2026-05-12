import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/access-cookie'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRegistrationNotification } from '@/lib/email'

const schema = z.object({
  event_id: z.string().uuid(),
  guest_name: z.string().min(1).max(200),
  instagram_handle: z.string().max(100).transform((v) => v.replace(/^@/, '')).optional(),
  strava_handle: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (d) => d.instagram_handle || d.strava_handle || d.phone || d.email,
  { message: 'Mindestens eine Kontaktmöglichkeit angeben.' }
)

async function isGated(): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sous_pass')?.value
  if (!cookieValue) return false
  const { valid, code } = verifyCookie(cookieValue)
  if (!valid) return false
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'access_code')
    .single()
  const current = (data?.value as { code: string } | null)?.code
  return code === current
}

export async function POST(request: NextRequest) {
  if (!(await isGated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { event_id, guest_name, instagram_handle, strava_handle, phone, email, notes } = parsed.data

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, title, starts_at, registration_enabled, max_participants, status')
    .eq('id', event_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 })
  }

  if (!event.registration_enabled || event.status !== 'upcoming') {
    return NextResponse.json({ error: 'Anmeldung nicht möglich.' }, { status: 409 })
  }

  let is_waitlist = false

  if (event.max_participants !== null) {
    const { count } = await supabaseAdmin
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id)
      .eq('is_waitlist', false)

    is_waitlist = (count ?? 0) >= event.max_participants
  }

  const { error: insertError } = await supabaseAdmin.from('registrations').insert({
    event_id,
    guest_name,
    instagram_handle: instagram_handle ?? null,
    strava_handle: strava_handle ?? null,
    phone: phone ?? null,
    email: email ?? null,
    notes: notes ?? null,
    is_waitlist,
  })

  if (insertError) {
    return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 })
  }

  // Fire-and-forget — email failure doesn't block the response
  sendRegistrationNotification({
    guestName: guest_name,
    instagramHandle: instagram_handle,
    stravaHandle: strava_handle,
    phone,
    email,
    eventTitle: event.title,
    startsAt: event.starts_at,
    isWaitlist: is_waitlist,
  }).catch(() => {})

  return NextResponse.json({ ok: true, is_waitlist })
}
