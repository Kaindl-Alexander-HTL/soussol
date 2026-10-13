import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendMemberAccessReminder } from '@/lib/email'
import { RequestBodyError, readJsonBody } from '@/lib/request-body'
import { checkRateLimits, rateLimitUnavailable } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email().max(200),
})

export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimits(request, [
      { bucket: 'recover:ip', maxRequests: 10, windowSeconds: 60 * 60 },
    ])
    if (!limit.allowed) return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[recover-access] Rate-Limit fehlgeschlagen:', error)
    return rateLimitUnavailable()
  }

  let body: unknown
  try {
    body = await readJsonBody(request, 2 * 1024)
  } catch (error) {
    if (error instanceof RequestBodyError && error.status === 413) {
      return NextResponse.json({ ok: true }, { status: 413 })
    }
    body = null
  }
  const parsed = schema.safeParse(body)

  // Immer dieselbe Antwort — auch bei ungültiger Eingabe. Sonst ließe sich über
  // die Fehlermeldungen herausfinden, welche Adressen Mitglieder sind.
  const ok = NextResponse.json({ ok: true })
  if (!parsed.success) return ok

  const email = parsed.data.email.toLowerCase().trim()
  try {
    const limit = await checkRateLimits(request, [
      { bucket: 'recover:email', identity: email, maxRequests: 3, windowSeconds: 60 * 60 },
    ])
    if (!limit.allowed) return ok
  } catch (error) {
    console.error('[recover-access] Ziel-Rate-Limit fehlgeschlagen:', error)
    return rateLimitUnavailable()
  }

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('name, email, role, access_token, is_active')
    .ilike('email', email)
    .single()

  // Kein Mitglied, deaktiviert oder ohne Archivzugang: still aussteigen.
  if (
    !member ||
    !member.is_active ||
    (member.role !== 'outer' && member.role !== 'inner')
  ) {
    return ok
  }

  await sendMemberAccessReminder({
    name: member.name,
    email: member.email,
    accessToken: member.access_token,
  }).catch((e) =>
    console.error('[recover-access] Mail fehlgeschlagen:', e?.message ?? e)
  )

  return ok
}
