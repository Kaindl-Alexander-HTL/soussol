'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 1600 // Halten, bis der Ink alles gefüllt hat
const REVEAL_HOLD_MS = 360 // kurze Pause auf vollem Ink, dann Navigation
const RETRACT_MS = 520 // Zurückziehen, wenn zu früh losgelassen

type Phase = 'idle' | 'holding' | 'revealing'

// Kreis rechts oben mit „SOUS SOL" als Kreis-Schrift. Gedrückt halten → ein Ink-Kreis
// wächst von rechts oben diagonal nach links unten und füllt die ganze Seite, je länger
// man hält. Bei voll: kurze Pause, dann erscheint die Bewerbungsseite. Loslässt man
// früher, zieht sich der Ink zurück. Verstecktes „Anklopfen"-Ritual, premium.
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
    if (phase === 'revealing') return
    setPhase('holding')
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => {
      setPhase('revealing')
      navTimer.current = setTimeout(() => router.push(href), REVEAL_HOLD_MS)
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

  const active = phase === 'holding' || phase === 'revealing'

  // Ink-Radius wächst über die Haltedauer bis „alles gefüllt" (150vmax erreicht auch
  // die gegenüberliegende Ecke links unten). Loslassen → zurück auf 0.
  const inkRadius = active ? '150vmax' : '0px'
  const inkTransition =
    phase === 'holding'
      ? `clip-path ${HOLD_MS}ms linear`
      : `clip-path ${RETRACT_MS}ms cubic-bezier(0.83,0,0.17,1)`

  return (
    <>
      <button
        type="button"
        aria-label="Halten zum Bewerben"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        className="group fixed right-6 top-6 z-50 flex h-16 w-16 items-center justify-center rounded-full text-paper outline-none sm:right-9 sm:top-9"
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

        {/* Mittelpunkt — atmet in Ruhe */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
          style={{ animation: phase === 'idle' ? 'sous-breathe 3.2s ease-in-out infinite' : undefined }}
        />
      </button>

      {/* Ink, der die Seite von rechts oben nach links unten füllt */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[45] bg-ink"
        style={{
          clipPath: `circle(${inkRadius} at calc(100% - 3.7rem) 3.7rem)`,
          transition: inkTransition,
        }}
      />

      <style>{`
        @keyframes sous-breathe { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
        @keyframes sous-spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
