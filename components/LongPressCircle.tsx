'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 1150 // halten bis „voll"
const REVEAL_MS = 850 // Ink-Expansion, die die Seite verschluckt
const REVEAL_HOLD_MS = 420 // Pause auf Ink, bevor navigiert wird

type Phase = 'idle' | 'holding' | 'revealing'

// Kreis rechts oben. Gedrückt halten → Ring füllt sich und wächst → bei voll
// expandiert ein Ink-Kreis über die ganze Seite (verschluckt sie), kurze Pause,
// dann erscheint die Bewerbungsseite. Bewusst als verstecktes „Anklopfen"-Ritual.
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
      navTimer.current = setTimeout(() => router.push(href), REVEAL_MS + REVEAL_HOLD_MS)
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
  const revealing = phase === 'revealing'

  const R = 15
  const CIRC = 2 * Math.PI * R
  const offset = active ? 0 : CIRC

  return (
    <>
      <button
        type="button"
        aria-label="Halten zum Bewerben"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        className="group fixed right-5 top-5 z-40 flex h-12 w-12 items-center justify-center rounded-full text-paper outline-none sm:right-8 sm:top-8"
        style={{ touchAction: 'none' }}
      >
        {/* weicher Glow, baut sich beim Halten auf */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(closest-side, rgba(240,232,222,0.16), transparent)',
            opacity: active ? 1 : 0,
            transform: `scale(${active ? 2.4 : 0.6})`,
            transition: `opacity ${phase === 'holding' ? HOLD_MS : 500}ms ease, transform ${
              phase === 'holding' ? HOLD_MS : 500
            }ms cubic-bezier(0.16,1,0.3,1)`,
          }}
        />

        {/* der wachsende Kreis */}
        <span
          className="relative block"
          style={{
            transform: `scale(${revealing ? 1.7 : phase === 'holding' ? 1.45 : 1})`,
            transition: `transform ${
              phase === 'holding' ? HOLD_MS : revealing ? 200 : 450
            }ms cubic-bezier(0.16,1,0.3,1)`,
          }}
        >
          <svg width="38" height="38" viewBox="0 0 38 38" className="block -rotate-90">
            <circle
              cx="19"
              cy="19"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.22"
              strokeWidth="1"
              className="transition-[stroke-opacity] duration-500 group-hover:[stroke-opacity:0.4]"
            />
            <circle
              cx="19"
              cy="19"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{
                transition: `stroke-dashoffset ${phase === 'holding' ? HOLD_MS : 420}ms ${
                  phase === 'holding' ? 'linear' : 'cubic-bezier(0.22,1,0.36,1)'
                }`,
              }}
            />
          </svg>

          {/* Mittelpunkt — atmet in Ruhe, dehnt sich beim Halten */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[3px] w-[3px] rounded-full bg-paper"
            style={{
              animation: phase === 'idle' ? 'sous-breathe 3.2s ease-in-out infinite' : undefined,
              transform: `translate(-50%,-50%) scale(${active ? 2.6 : 1})`,
              transition: `transform ${phase === 'holding' ? HOLD_MS : 450}ms cubic-bezier(0.16,1,0.3,1)`,
            }}
          />
        </span>
      </button>

      {/* Ink-Overlay, das die Seite verschluckt */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[45] bg-ink"
        style={{
          clipPath: revealing
            ? 'circle(150vmax at calc(100% - 2.6rem) 2.6rem)'
            : 'circle(0px at calc(100% - 2.6rem) 2.6rem)',
          transition: `clip-path ${REVEAL_MS}ms cubic-bezier(0.83,0,0.17,1)`,
        }}
      />

      <style>{`@keyframes sous-breathe { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }`}</style>
    </>
  )
}
