import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyCookie } from '@/lib/access-cookie'

export function proxy(request: NextRequest) {
  const cookieValue = request.cookies.get('sous_pass')?.value

  if (!cookieValue) {
    const next = encodeURIComponent(request.nextUrl.pathname)
    return NextResponse.redirect(new URL(`/enter?next=${next}`, request.url))
  }

  const { valid } = verifyCookie(cookieValue)
  if (!valid) {
    const next = encodeURIComponent(request.nextUrl.pathname)
    return NextResponse.redirect(new URL(`/enter?next=${next}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/archive/:path*', '/galerie/:path*'],
}
