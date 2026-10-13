const ALLOWED_GATED_PATHS = ['/archive', '/upcoming', '/event/']

export function safeGatedRedirect(value?: string): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/archive'

  try {
    const url = new URL(value, 'https://soussol.invalid')
    const path = `${url.pathname}${url.search}${url.hash}`
    const allowed = ALLOWED_GATED_PATHS.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(prefix)
    )
    return allowed ? path : '/archive'
  } catch {
    return '/archive'
  }
}
