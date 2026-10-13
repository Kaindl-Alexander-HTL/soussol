import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'

const BUCKET = 'mementos'
const SIGNED_URL_TTL_SECONDS = 60 * 60
const STORAGE_MARKERS = [
  `/storage/v1/object/public/${BUCKET}/`,
  `/storage/v1/object/sign/${BUCKET}/`,
]

export function archiveObjectPath(value: string | null | undefined): string | null {
  if (!value) return null

  let candidate = value
  try {
    const parsed = new URL(value)
    const marker = STORAGE_MARKERS.find((item) => parsed.pathname.includes(item))
    if (!marker) return null
    candidate = decodeURIComponent(parsed.pathname.split(marker)[1] ?? '')
  } catch {
    // New uploads are stored as bucket-relative object paths, not public URLs.
  }

  const normalized = candidate.replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\\')) return null
  return normalized
}

export function normalizeArchiveMediaRef(value: string | null | undefined): string | null {
  if (!value) return null

  const path = archiveObjectPath(value)
  if (path) return path

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

async function signedUrlMap(values: Array<string | null | undefined>): Promise<Map<string, string>> {
  const paths = [...new Set(values.map(archiveObjectPath).filter((path): path is string => Boolean(path)))]
  if (paths.length === 0) return new Map()

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error('[archive-media] Signed URLs konnten nicht erstellt werden:', error.message)
    return new Map()
  }

  const urls = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return urls
}

function resolvedUrl(value: string | null, urls: Map<string, string>): string | null {
  const path = archiveObjectPath(value)
  if (path) return urls.get(path) ?? null

  // Preserve explicitly configured external HTTPS media. Privacy for those
  // objects remains the responsibility of their external host.
  try {
    const parsed = new URL(value ?? '')
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export async function signMementoMedia<T extends { image_url: string | null }>(rows: T[]): Promise<T[]> {
  const urls = await signedUrlMap(rows.map((row) => row.image_url))
  return rows.map((row) => ({ ...row, image_url: resolvedUrl(row.image_url, urls) }))
}

export async function signGalleryMedia<T extends { url: string }>(rows: T[]): Promise<T[]> {
  const urls = await signedUrlMap(rows.map((row) => row.url))
  return rows.map((row) => ({ ...row, url: resolvedUrl(row.url, urls) ?? '' }))
}

export async function createArchiveSignedUrl(path: string): Promise<string | null> {
  const normalized = archiveObjectPath(path)
  if (!normalized) return null

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(normalized, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error('[archive-media] Upload-Vorschau konnte nicht signiert werden:', error.message)
    return null
  }

  return data.signedUrl
}
