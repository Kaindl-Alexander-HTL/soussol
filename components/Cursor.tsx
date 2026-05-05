'use client'

import { useEffect, useRef, useState } from 'react'

type CursorState = 'default' | 'link' | 'grab' | 'grabbing'

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<CursorState>('default')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only activate for mouse/trackpad users
    if (!window.matchMedia('(pointer: fine)').matches) return

    const mouse = { x: -200, y: -200 }
    const ring = { x: -200, y: -200 }
    let rafId: number

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function tick() {
      ring.x = lerp(ring.x, mouse.x, 0.1)
      ring.y = lerp(ring.y, mouse.y, 0.1)

      const dx = `calc(${mouse.x}px - 50%)`
      const dy = `calc(${mouse.y}px - 50%)`
      const rx = `calc(${ring.x}px - 50%)`
      const ry = `calc(${ring.y}px - 50%)`

      dotRef.current?.style.setProperty('transform', `translate(${dx}, ${dy})`)
      ringRef.current?.style.setProperty('transform', `translate(${rx}, ${ry})`)

      rafId = requestAnimationFrame(tick)
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      if (!visible) setVisible(true)
    }

    function onOver(e: MouseEvent) {
      const target = e.target as Element
      const dataCursor = target.closest('[data-cursor]')?.getAttribute('data-cursor')
      if (dataCursor) {
        setState(dataCursor as CursorState)
      } else if (target.closest('a, button, [role="button"], label, select')) {
        setState('link')
      } else {
        setState('default')
      }
    }

    function onLeave() { setVisible(false) }
    function onEnter() { setVisible(true) }

    // Custom event from canvas during drag
    function onCursorEvent(e: Event) {
      setState((e as CustomEvent<CursorState>).detail)
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    window.addEventListener('cursor-state', onCursorEvent)
    rafId = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      window.removeEventListener('cursor-state', onCursorEvent)
      cancelAnimationFrame(rafId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dotSize =
    state === 'link'     ? 'h-2 w-2' :
    state === 'grabbing' ? 'h-3 w-3' :
    state === 'grab'     ? 'h-[3px] w-[3px]' :
                           'h-[5px] w-[5px]'

  const ringSize =
    state === 'link'     ? 'h-11 w-11 border-white/50' :
    state === 'grab'     ? 'h-6 w-6 border-white/20' :
    state === 'grabbing' ? 'h-4 w-4 border-white/40' :
                           'h-7 w-7 border-white/25'

  return (
    <div
      className="pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
      aria-hidden="true"
    >
      {/* Dot — instant follow */}
      <div
        ref={dotRef}
        className="fixed left-0 top-0 z-[9999] pointer-events-none"
        style={{ willChange: 'transform' }}
      >
        <div
          className={`rounded-full bg-white transition-all duration-200 ${dotSize}`}
        />
      </div>

      {/* Ring — lagged follow */}
      <div
        ref={ringRef}
        className="fixed left-0 top-0 z-[9999] pointer-events-none"
        style={{ willChange: 'transform' }}
      >
        <div
          className={`rounded-full border transition-all duration-300 ${ringSize}`}
        />
      </div>
    </div>
  )
}
