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
      <div className="columns-2 gap-px sm:columns-3 md:columns-4 [column-gap:1px]">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => open(i)}
            className="group relative mb-px block w-full overflow-hidden bg-white/[0.03] focus:outline-none break-inside-avoid"
            aria-label={photo.caption ?? `Foto ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ?? ''}
              className="block w-full h-auto transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              loading={i < 6 ? 'eager' : 'lazy'}
              draggable={false}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-ink/0 transition-colors duration-300 group-hover:bg-ink/20" />
            {/* Index */}
            <span className="absolute bottom-2.5 right-2.5 font-sans text-[10px] tracking-[0.2em] text-white/0 transition-colors duration-300 group-hover:text-white/50">
              {String(i + 1).padStart(2, '0')}
            </span>
          </button>
        ))}
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
