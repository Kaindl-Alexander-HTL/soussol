import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signCookie } from '@/lib/access-cookie'
import { RequestBodyError, readJsonBody } from '@/lib/request-body'
import { checkRateLimits, rateLimited, rateLimitUnavailable } from '@/lib/rate-limit'

const schema = z.object({
  token: z.string().min(1).max(64),
})

export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimits(request, [
      { bucket: 'verify-code:ip', maxRequests: 20, windowSeconds: 10 * 60 },
    ])
    if (!limit.allowed) return rateLimited(limit.retryAfter)
  } catch (error) {
    console.error('[verify-code] Rate-Limit fehlgeschlagen:', error)
    return rateLimitUnavailable()
  }

  let body: unknown
  try {
    body = await readJsonBody(request, 2 * 1024)
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400
    return NextResponse.json({ ok: false }, { status })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { token } = parsed.data

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, is_active, role')
    .eq('access_token', token)
    .single()

  // Gleiche Prüfung wie im Link-Weg (/api/enter): nur outer/inner bekommen ein
  // Cookie. Ohne die Rollenprüfung käme ein 'surrounding'-Token hier durch,
  // während der Link ihn abweist.
  if (!member || !member.is_active || (member.role !== 'outer' && member.role !== 'inner')) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const signed = signCookie(member.id)
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sous_pass', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })

  return response
}
