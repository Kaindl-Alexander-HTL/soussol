'use client'

import { useEffect, useRef } from 'react'

export function GrainOverlay() {
  const turbRef = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    let seed = 0
    let lastTime = 0
    let rafId: number
    const FPS = 18

    function update(time: number) {
      if (time - lastTime > 1000 / FPS) {
        lastTime = time
        seed = (seed + 1) % 999
        turbRef.current?.setAttribute('seed', String(seed))
      }
      rafId = requestAnimationFrame(update)
    }

    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.42]"
      style={{ mixBlendMode: 'overlay' }}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            ref={turbRef}
            type="fractalNoise"
            baseFrequency="0.68"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  )
}
