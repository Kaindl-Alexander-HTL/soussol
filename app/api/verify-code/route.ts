import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signCookie } from '@/lib/access-cookie'

const schema = z.object({
  code: z.string().min(1).max(64),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { code } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'access_code')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const setting = data.value as { code: string; valid_until: string }

  if (code !== setting.code) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const signed = signCookie(code)
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
