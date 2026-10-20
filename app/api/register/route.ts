import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRegistrationNotification } from '@/lib/email'
import { RequestBodyError, readJsonBody } from '@/lib/request-body'
import { checkRateLimits, rateLimited, rateLimitUnavailable } from '@/lib/rate-limit'
import { getCurrentMember, hasArchiveAccess, type CurrentMember } from '@/lib/member'
import { expirePastEvents } from '@/lib/expire-events'
import { findRegistrationByEmail, registrationSchema, type GuestRegistration } from '@/lib/registration'

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
  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Members register with their profile; guests with what they typed.
  let member: CurrentMember | null = null
  let registrant: Omit<GuestRegistration, 'event_id' | 'as_member'>
  if ('as_member' in parsed.data) {
    member = await getCurrentMember()
    if (!member) {
      return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })
    }
    registrant = { guest_name: member.name, email: member.email }
  } else {
    registrant = parsed.data
  }

  const { event_id } = parsed.data
  const { guest_name, instagram_handle, strava_handle, phone, email, notes } = registrant

  await expirePastEvents()
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, title, starts_at, registration_enabled, max_participants, status, visibility')
    .eq('id', event_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  }

  if (event.visibility === 'outer' && !hasArchiveAccess(member ?? await getCurrentMember())) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  }

  if (!event.registration_enabled || event.status !== 'upcoming') {
    return NextResponse.json({ error: 'Registration is not available.' }, { status: 409 })
  }

  if (member) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('registrations')
      .select('email, is_waitlist')
      .eq('event_id', event_id)
      .not('email', 'is', null)
    if (existingError) {
      return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
    }
    const already = findRegistrationByEmail(existing ?? [], member.email)
    if (already) {
      return NextResponse.json({ ok: true, is_waitlist: already.is_waitlist, already_registered: true })
    }
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
