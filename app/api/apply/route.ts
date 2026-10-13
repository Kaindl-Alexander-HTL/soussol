import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendApplicationNotification, sendApplicationConfirmation } from '@/lib/email'
import { RequestBodyError, readJsonBody } from '@/lib/request-body'
import { checkRateLimits, rateLimited, rateLimitUnavailable } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimits(request, [
      { bucket: 'apply:ip', maxRequests: 10, windowSeconds: 60 * 60 },
    ])
    if (!limit.allowed) return rateLimited(limit.retryAfter)
  } catch (error) {
    console.error('[apply] Rate-Limit fehlgeschlagen:', error)
    return rateLimitUnavailable()
  }

  let body: unknown
  try {
    body = await readJsonBody(request, 8 * 1024)
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, message } = parsed.data

  try {
    const limit = await checkRateLimits(request, [
      { bucket: 'apply:email', identity: email, maxRequests: 3, windowSeconds: 24 * 60 * 60 },
    ])
    if (!limit.allowed) return rateLimited(limit.retryAfter)
  } catch (error) {
    console.error('[apply] Ziel-Rate-Limit fehlgeschlagen:', error)
    return rateLimitUnavailable()
  }

  const { error } = await supabaseAdmin.from('applications').insert({
    name,
    email,
    message: message ?? null,
  })

  if (error) {
    // Ursache mitloggen — sonst steht im Log nur "500" und die eigentliche
    // Meldung (fehlende Spalte, RLS, Netzwerk) ist weg.
    console.error('[apply] insert failed:', error.message)
    return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 })
  }

  // Fire-and-forget: die Bewerbung ist gespeichert, ein Mailfehler darf sie
  // nicht scheitern lassen. Aber er wird geloggt — ein stiller Ausfall (z.B.
  // nicht verifizierte Absender-Domain) wäre sonst unsichtbar.
  sendApplicationNotification({ name, email, message }).catch((e) =>
    console.error('[apply] Benachrichtigung an Admin fehlgeschlagen:', e?.message ?? e)
  )
  sendApplicationConfirmation({ name, email }).catch((e) =>
    console.error('[apply] Bestätigung an Bewerber fehlgeschlagen:', e?.message ?? e)
  )

  return NextResponse.json({ ok: true })
}
