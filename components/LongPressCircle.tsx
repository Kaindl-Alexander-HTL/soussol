'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 1100

// Kreis rechts oben: gedrückt halten füllt den Ring (CSS-Transition); bei voll → Navigation
// (Default /apply). Ein bewusst verstecktes „Anklopfen"-Ritual, passend zum Underground-Konzept.
export function LongPressCircle({ href = '/apply' }: { href?: string }) {
  const router = useRouter()
  const [filling, setFilling] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  function begin() {
    setFilling(true)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      router.push(href)
    }, HOLD_MS)
  }

  function cancel() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setFilling(false)
  }

  const R = 13
  const CIRC = 2 * Math.PI * R

  return (
    <button
      type="button"
      aria-label="Halten zum Bewerben"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className="fixed top-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full text-mist transition-colors hover:text-ash sm:top-8 sm:right-8"
      style={{ touchAction: 'none' }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r={R} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
        <circle
          cx="16"
          cy="16"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={CIRC}
          strokeDashoffset={filling ? 0 : CIRC}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset ${filling ? HOLD_MS : 300}ms ${filling ? 'linear' : 'ease'}`,
          }}
        />
      </svg>
      <span className="absolute h-1 w-1 rounded-full bg-current" />
    </button>
  )
}
