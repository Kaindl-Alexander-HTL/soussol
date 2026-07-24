import { createHmac, timingSafeEqual } from 'crypto'

export function signCookie(memberId: string): string {
  const sig = createHmac('sha256', process.env.ACCESS_COOKIE_SECRET!)
    .update(memberId)
    .digest('hex')
  return `${memberId}.${sig}`
}

export function verifyCookie(cookieValue: string): { valid: boolean; memberId: string } {
  const lastDot = cookieValue.lastIndexOf('.')
  if (lastDot === -1) return { valid: false, memberId: '' }

  const memberId = cookieValue.slice(0, lastDot)
  const sig = cookieValue.slice(lastDot + 1)

  const expected = createHmac('sha256', process.env.ACCESS_COOKIE_SECRET!)
    .update(memberId)
    .digest('hex')

  let valid = false
  try {
    valid = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    valid = false
  }

  return { valid, memberId }
}
