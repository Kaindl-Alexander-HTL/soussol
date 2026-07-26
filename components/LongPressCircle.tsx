'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 1600 // Halten: Paper-Kreis wächst, bis die Seite voll ist
const INK_MS = 600 // danach: Ink flutet über das Paper
const HOLD_ON_INK_MS = 1050 // Ink voll → „SOUS SOL" erscheint kurz → dann Navigation
const RETRACT_MS = 520 // Zurückziehen bei frühem Loslassen

type Phase = 'idle' | 'holding' | 'inking'

// Kreis rechts oben mit „SOUS SOL" als Kreis-Schrift. Gedrückt halten → ein heller
// Paper-Kreis expandiert sichtbar von rechts oben über die ganze Seite, gekoppelt an
// die Haltedauer. Ist die Seite voll: Ink flutet zurück, kurze Pause, dann /apply.
// Früh loslassen → der Kreis zieht sich zurück.
export function LongPressCircle({ href = '/apply' }: { href?: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
      if (navTimer.current) clearTimeout(navTimer.current)
    }
  }, [])

  function begin() {
    if (phase === 'inking') return
    setPhase('holding')
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => {
      setPhase('inking')
      navTimer.current = setTimeout(() => router.push(href), INK_MS + HOLD_ON_INK_MS)
    }, HOLD_MS)
  }

  function cancel() {
    if (phase !== 'holding') return
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setPhase('idle')
  }

  const active = phase !== 'idle'
  const origin = 'calc(100% - 3.7rem) 3.7rem'

  return (
    <>
      <button
        type="button"
        aria-label="Halten zum Bewerben"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        className={`group fixed right-6 top-6 z-50 flex h-16 w-16 items-center justify-center rounded-full outline-none transition-colors duration-300 sm:right-9 sm:top-9 ${
          active ? 'text-ink' : 'text-paper'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Skalierung beim Halten (getrennt von der Rotation) */}
        <span
          className="block"
          style={{
            transform: `scale(${phase === 'holding' ? 1.08 : 1})`,
            transition: 'transform 600ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* rotierender Kreis mit SOUS-SOL-Schrift */}
          <span
            className="block"
            style={{ animation: `sous-spin ${phase === 'holding' ? '4s' : '16s'} linear infinite` }}
          >
            <svg width="64" height="64" viewBox="0 0 64 64" className="block">
              <defs>
                <path id="sous-ring" d="M 6 32 A 26 26 0 1 1 58 32 A 26 26 0 1 1 6 32" fill="none" />
              </defs>
              {/* dicker, deutlicher Ring */}
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="2"
                className="transition-[stroke-opacity] duration-500 group-hover:[stroke-opacity:0.85]"
              />
              {/* SOUS SOL als Kreis-Schrift */}
              <text
                fill="currentColor"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '7px', letterSpacing: '2.5px', textTransform: 'uppercase' }}
              >
                <textPath href="#sous-ring" startOffset="0%">
                  SOUS SOL · SOUS SOL ·
                </textPath>
              </text>
            </svg>
          </span>
        </span>

        {/* Mittelpunkt — atmet in Ruhe, folgt der Ringfarbe */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
          style={{ animation: phase === 'idle' ? 'sous-breathe 3.2s ease-in-out infinite' : undefined }}
        />
      </button>

      {/* Paper-Kreis: expandiert sichtbar mit der Haltedauer über die ganze Seite */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[44] bg-paper"
        style={{
          clipPath: `circle(${active ? '150vmax' : '0px'} at ${origin})`,
          transition:
            phase === 'holding'
              ? `clip-path ${HOLD_MS}ms linear`
              : phase === 'idle'
                ? `clip-path ${RETRACT_MS}ms cubic-bezier(0.83,0,0.17,1)`
                : 'none',
        }}
      />

      {/* Ink flutet über das volle Paper, dann Navigation */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[46] bg-ink"
        style={{
          clipPath: `circle(${phase === 'inking' ? '150vmax' : '0px'} at ${origin})`,
          transition: phase === 'inking' ? `clip-path ${INK_MS}ms cubic-bezier(0.83,0,0.17,1)` : 'none',
        }}
      />

      {/* „SOUS SOL" — erscheint kurz, sobald das Ink die Seite voll bedeckt */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[47] flex items-center justify-center"
        style={{
          opacity: phase === 'inking' ? 1 : 0,
          transition: phase === 'inking' ? `opacity 500ms ease ${INK_MS - 150}ms` : 'opacity 200ms ease',
        }}
      >
        <span className="font-serif text-[13px] tracking-[0.55em] text-paper uppercase">SOUS SOL</span>
      </div>

      <style>{`
        @keyframes sous-breathe { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
        @keyframes sous-spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
