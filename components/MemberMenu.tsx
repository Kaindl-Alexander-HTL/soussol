'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Nur die Initialen im Kreis. Der Name steht im Dropdown, nicht in der Leiste —
// dort kostet er Platz und sagt niemandem etwas, der ohnehin weiß, wer er ist.
export function MemberMenu({ name }: { name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials =
    parts
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '·'

  // Klick daneben und Escape schließen das Menü.
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function leave() {
    setOpen(false)
    await fetch('/api/leave', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Eingeloggt als ${name}`}
        className={`flex h-8 w-8 items-center justify-center rounded-full border font-sans text-[9px] tracking-[0.02em] transition-colors ${
          open
            ? 'border-white/50 text-paper'
            : 'border-white/25 text-paper/80 hover:border-white/45'
        }`}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 min-w-44 border border-white/10 bg-ink/95 backdrop-blur-sm"
        >
          <div className="border-b border-white/8 px-4 py-3">
            <p className="font-sans text-[10px] tracking-[0.2em] text-white/25 uppercase">
              Eingeloggt als
            </p>
            <p className="mt-1 font-serif italic text-base text-paper">{name}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={leave}
            className="block w-full px-4 py-3 text-left font-sans text-[10px] tracking-[0.25em] text-smoke uppercase transition-colors hover:bg-white/[0.04] hover:text-paper"
          >
            Leave
          </button>
        </div>
      )}
    </div>
  )
}
