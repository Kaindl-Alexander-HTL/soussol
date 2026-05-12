'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Photo = {
  id: string
  url: string
  caption: string | null
}

export function GalleryView({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const open = useCallback((i: number) => setLightbox(i), [])
  const close = useCallback(() => setLightbox(null), [])
  const prev = useCallback(() => setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)), [photos.length])
  const next = useCallback(() => setLightbox((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length])

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
              <button
                onClick={() => open(i)}
                className="group relative block w-full overflow-hidden focus:outline-none"
                aria-label={photo.caption ?? `Foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? ''}
                  className="block w-full h-auto transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                  loading={i < 4 ? 'eager' : 'lazy'}
                  draggable={false}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/15" />
                {/* Index */}
                <span className="absolute bottom-3 right-3 font-sans text-[10px] tracking-[0.2em] text-white/0 transition-colors duration-300 group-hover:text-white/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </button>
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

            {/* Content */}
            <motion.div
              key="lb-wrap"
              className="fixed inset-0 z-[61] flex flex-col items-center justify-center p-4 sm:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Top bar */}
              <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
                <span className="font-sans text-[10px] tracking-[0.3em] text-mist">
                  {String(lightbox + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                </span>
                <button
                  onClick={close}
                  className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark"
                >
                  Schließen ✕
                </button>
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
