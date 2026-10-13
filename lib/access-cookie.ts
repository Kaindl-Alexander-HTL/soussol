import { createHmac, timingSafeEqual } from 'crypto'

export type AccessSetting = {
  code: string
  valid_until?: string | null
}

export function isAccessSettingActive(setting: AccessSetting | null | undefined): setting is AccessSetting {
  if (!setting?.code) return false
  if (!setting.valid_until) return true

  const validUntil = Date.parse(setting.valid_until)
  return Number.isFinite(validUntil) && validUntil > Date.now()
}

export function signCookie(code: string): string {
  const sig = createHmac('sha256', process.env.ACCESS_COOKIE_SECRET!)
    .update(code)
    .digest('hex')
  return `${code}.${sig}`
}

export function verifyCookie(cookieValue: string): { valid: boolean; code: string } {
  const lastDot = cookieValue.lastIndexOf('.')
  if (lastDot === -1) return { valid: false, code: '' }

  const code = cookieValue.slice(0, lastDot)
  const sig = cookieValue.slice(lastDot + 1)

  const expected = createHmac('sha256', process.env.ACCESS_COOKIE_SECRET!)
    .update(code)
    .digest('hex')

  let valid = false
  try {
    valid = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    valid = false
  }

  return { valid, code }
}
