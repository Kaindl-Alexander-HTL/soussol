const FALLBACK_PATH = '/archive'

function isAllowedPath(pathname: string): boolean {
  return (
    pathname === '/archive' ||
    pathname.startsWith('/archive/') ||
    pathname === '/upcoming' ||
    pathname.startsWith('/event/') ||
    pathname.startsWith('/galerie/')
  )
}

export function safeAppRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return FALLBACK_PATH

  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return FALLBACK_PATH
  }

  if (decoded.includes('\\') || decoded.startsWith('//')) return FALLBACK_PATH

  try {
    const base = new URL('https://soussol.invalid')
    const target = new URL(value, base)
    if (target.origin !== base.origin || !isAllowedPath(target.pathname)) return FALLBACK_PATH
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return FALLBACK_PATH
  }
}
