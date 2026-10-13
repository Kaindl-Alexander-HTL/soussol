import 'server-only'

import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type RateLimitRule = {
  bucket: string
  maxRequests: number
  windowSeconds: number
  identity?: string
}

export type RateLimitResult = {
  allowed: boolean
  retryAfter: number
}

function clientAddress(request: NextRequest): string {
  const forwarded =
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown'

  return forwarded.split(',')[0].trim().slice(0, 128) || 'unknown'
}

function identityHash(kind: 'ip' | 'target', value: string): string {
  const secret = process.env.ACCESS_COOKIE_SECRET
  if (!secret) throw new Error('ACCESS_COOKIE_SECRET fehlt')

  return createHmac('sha256', secret)
    .update(`${kind}:${value.trim().toLowerCase()}`)
    .digest('hex')
}

export async function checkRateLimits(
  request: NextRequest,
  rules: RateLimitRule[]
): Promise<RateLimitResult> {
  let retryAfter = 1

  for (const rule of rules) {
    const usesTarget = rule.identity !== undefined
    const value = usesTarget ? rule.identity! : clientAddress(request)
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_bucket: rule.bucket,
      p_key_hash: identityHash(usesTarget ? 'target' : 'ip', value),
      p_window_seconds: rule.windowSeconds,
      p_max_requests: rule.maxRequests,
    })

    if (error) throw new Error(`Rate-Limit nicht verfügbar: ${error.message}`)

    const row = Array.isArray(data) ? data[0] : data
    if (!row || typeof row.allowed !== 'boolean') {
      throw new Error('Rate-Limit lieferte keine gültige Antwort')
    }

    retryAfter = Math.max(retryAfter, Number(row.retry_after_seconds) || 1)
    if (!row.allowed) return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter }
}

export function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

export function rateLimitUnavailable() {
  return NextResponse.json(
    { error: 'Dienst vorübergehend nicht verfügbar.' },
    { status: 503, headers: { 'Retry-After': '60' } }
  )
}
