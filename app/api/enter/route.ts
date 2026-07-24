import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signCookie } from '@/lib/access-cookie'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = request.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(new URL('/enter', origin))
  }

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, is_active, role')
    .eq('access_token', token)
    .single()

  if (!member || !member.is_active || (member.role !== 'outer' && member.role !== 'inner')) {
    return NextResponse.redirect(new URL('/enter', origin))
  }

  const signed = signCookie(member.id)
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const response = NextResponse.redirect(new URL('/archive', origin))
  response.cookies.set('sous_pass', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })
  return response
}
