'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Memento } from '@/lib/types'

const KIND_LABELS: Record<string, string> = {
  polaroid: 'Polaroid',
  note: 'Note',
  stamp: 'Stamp',
  scan: 'Scan',
  strava: 'Strava',
  other: 'Other',
}

export function Modal({
  memento,
  onClose,
}: {
  memento: Memento | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!memento) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memento, onClose])

  return (
    <AnimatePresence>
      {memento && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="pointer-events-auto relative w-full max-w-lg bg-ink border border-white/8 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 48px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-5 top-5 font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="p-8 pt-10">
                {/* Meta */}
                <div className="mb-5 flex items-center gap-4">
                  <span className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
                    {KIND_LABELS[memento.kind] ?? memento.kind}
                  </span>
                  {memento.date_label && (
                    <>
                      <span className="text-white/15">·</span>
                      <span className="font-hand text-[13px] text-mist">
                        {memento.date_label}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                {memento.caption && (
                  <h2 className="opsz-heading mb-5 font-serif italic text-[clamp(1.5rem,4vw,2.2rem)] leading-tight text-paper">
                    {memento.caption}
                  </h2>
                )}

                {/* Image */}
                {memento.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={memento.image_url}
                    alt={memento.caption ?? ''}
                    className="mb-6 w-full object-cover"
                    style={{
                      maxHeight: 340,
                      filter: 'grayscale(1) contrast(1.1)',
                    }}
                  />
                )}

                {/* Body */}
                {memento.body && (
                  <div className="text-sm font-light leading-relaxed text-ash font-sans whitespace-pre-line">
                    {memento.body}
                  </div>
                )}

                {/* Detail link */}
                <div className="mt-8 border-t border-white/8 pt-5">
                  <Link
                    href={`/archive/${memento.id}`}
                    className="group inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.3em] text-mist uppercase transition-colors hover:text-spark"
                  >
                    <span>Galerie & Details</span>
                    <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
