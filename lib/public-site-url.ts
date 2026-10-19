export function publicSiteUrl(configured: string | undefined, browserOrigin: string): string {
  const fallback = normalizeHttpOrigin(browserOrigin)
  return normalizeHttpOrigin(configured) ?? fallback ?? 'http://localhost:3000'
}

function normalizeHttpOrigin(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}
