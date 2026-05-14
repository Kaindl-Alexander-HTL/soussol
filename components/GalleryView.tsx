'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Photo = {
  id: string
  url: string
  caption: string | null
}

async function downloadPhoto(url: string, caption: string | null) {
  const res = await fetch(url)
  const blob = await res.blob()
  const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const name = caption ? `${caption.replace(/\s+/g, '-').toLowerCase()}.${ext}` : `soussol-${Date.now()}.${ext}`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

const SWIPE_THRESHOLD = 50

export function GalleryView({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const swipe = useRef<{ startX: number; startY: number } | null>(null)

  async function handleDownload(e: React.MouseEvent, url: string, caption: string | null, key: string) {
    e.stopPropagation()
    if (downloading === key) return
    setDownloading(key)
    await downloadPhoto(url, caption)
    setDownloading(null)
  }

  const open = useCallback((i: number) => setLightbox(i), [])
  const close = useCallback(() => setLightbox(null), [])
  const prev = useCallback(() => setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)), [photos.length])
  const next = useCallback(() => setLightbox((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length])

  // Touch swipe handlers for lightbox
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipe.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipe.current) return
    const dx = e.changedTouches[0].clientX - swipe.current.startX
    const dy = e.changedTouches[0].clientY - swipe.current.startY
    swipe.current = null
    // Only horizontal swipes (dx dominates)
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) next()
    else prev()
  }, [next, prev])

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, close, prev, next])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightbox !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  return (
    <>
      {/* ── Magazine Grid (Masonry, natürliche Proportionen) ─────────── */}
      <div className="px-6 sm:px-12 md:px-20 lg:px-32">
        <div className="columns-1 gap-3 sm:columns-2 md:columns-3 [column-gap:12px]">
          {photos.map((photo, i) => (
            <div key={photo.id} className="mb-3 break-inside-avoid">
              <div className="group relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  onClick={() => open(i)}
                  className="block w-full h-auto cursor-pointer transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                  loading={i < 4 ? 'eager' : 'lazy'}
                  draggable={false}
                />
                {/* Hover overlay — non-interactive */}
                <div
                  onClick={() => open(i)}
                  className="absolute inset-0 cursor-pointer bg-ink/0 transition-colors duration-500 group-hover:bg-ink/15"
                />
                {/* Download button */}
                <button
                  onClick={(e) => handleDownload(e, photo.url, photo.caption, photo.id)}
                  className="absolute left-3 top-3 font-sans text-[9px] tracking-[0.2em] text-white/0 uppercase transition-colors duration-300 group-hover:text-white/50 hover:!text-white"
                  aria-label="Foto herunterladen"
                >
                  {downloading === photo.id ? '...' : '↓'}
                </button>
                {/* Index */}
                <span className="absolute bottom-3 right-3 font-sans text-[10px] tracking-[0.2em] text-white/0 transition-colors duration-300 group-hover:text-white/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              {/* Caption außerhalb des Bildes */}
              {photo.caption && (
                <p className="mt-2 font-sans text-[10px] tracking-[0.12em] text-mist">
                  {photo.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="lb-bg"
              className="fixed inset-0 z-[60] bg-ink/95"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={close}
            />

            {/* Content — swipeable on touch */}
            <motion.div
              key="lb-wrap"
              className="fixed inset-0 z-[61] flex flex-col items-center justify-center p-4 sm:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Top bar */}
              <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
                <span className="font-sans text-[10px] tracking-[0.3em] text-mist">
                  {String(lightbox + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-6">
                  <button
                    onClick={(e) => handleDownload(e, photos[lightbox].url, photos[lightbox].caption, `lb-${lightbox}`)}
                    className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark"
                  >
                    {downloading === `lb-${lightbox}` ? '...' : '↓ Download'}
                  </button>
                  <button
                    onClick={close}
                    className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark"
                  >
                    Schließen ✕
                  </button>
                </div>
              </div>

              {/* Image */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightbox}
                  className="relative w-full max-w-5xl"
                  style={{ maxHeight: 'calc(100vh - 160px)' }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={photos[lightbox].url}
                    alt={photos[lightbox].caption ?? ''}
                    className="mx-auto block max-h-[calc(100vh-160px)] w-auto max-w-full object-contain"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Caption + nav */}
              <div className="mt-5 flex w-full max-w-5xl items-center gap-8" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={prev}
                  className="shrink-0 font-sans text-[11px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark"
                  aria-label="Vorheriges Foto"
                >
                  ← Prev
                </button>

                <p className="flex-1 text-center font-serif italic text-[clamp(0.85rem,1.5vw,1rem)] text-paper/60">
                  {photos[lightbox].caption ?? ''}
                </p>

                <button
                  onClick={next}
                  className="shrink-0 font-sans text-[11px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark"
                  aria-label="Nächstes Foto"
                >
                  Next →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
