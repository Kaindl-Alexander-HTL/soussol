import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRegistrationNotification } from '@/lib/email'
import { RequestBodyError, readJsonBody } from '@/lib/request-body'
import { checkRateLimits, rateLimited, rateLimitUnavailable } from '@/lib/rate-limit'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'

const schema = z.object({
  event_id: z.guid(),
  guest_name: z.string().min(1).max(200),
  instagram_handle: z.string().max(100).transform((v) => v.replace(/^@/, '')).optional(),
  strava_handle: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (d) => d.instagram_handle || d.strava_handle || d.phone || d.email,
  { message: 'Provide at least one contact method.' }
)

export async function POST(request: NextRequest) {
  // Events sind öffentlich — die Anmeldung zu offenen Events ist bewusst nicht gated.
  try {
    const limit = await checkRateLimits(request, [
      { bucket: 'register:ip', maxRequests: 20, windowSeconds: 10 * 60 },
    ])
    if (!limit.allowed) return rateLimited(limit.retryAfter)
  } catch (error) {
    console.error('[register] Rate-Limit fehlgeschlagen:', error)
    return rateLimitUnavailable()
  }

  let body: unknown
  try {
    body = await readJsonBody(request, 8 * 1024)
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400
    return NextResponse.json({ error: 'Invalid request.' }, { status })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { event_id, guest_name, instagram_handle, strava_handle, phone, email, notes } = parsed.data

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, title, starts_at, registration_enabled, max_participants, status, visibility')
    .eq('id', event_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  }

  if (event.visibility === 'outer' && !hasArchiveAccess(await getCurrentMember())) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  }

  if (!event.registration_enabled || event.status !== 'upcoming') {
    return NextResponse.json({ error: 'Registration is not available.' }, { status: 409 })
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
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  }

  // Sent after the response via after() — a bare promise is cut off when Vercel
  // freezes the function. Email failure doesn't block the response, but is logged.
  after(() =>
    sendRegistrationNotification({
      guestName: guest_name,
      instagramHandle: instagram_handle,
      stravaHandle: strava_handle,
      phone,
      email,
      eventTitle: event.title,
      startsAt: event.starts_at,
      isWaitlist: is_waitlist,
    }).catch((e) =>
      console.error('[register] Benachrichtigung an Admin fehlgeschlagen:', e?.message ?? e)
    )
  )

  return NextResponse.json({ ok: true, is_waitlist })
}
