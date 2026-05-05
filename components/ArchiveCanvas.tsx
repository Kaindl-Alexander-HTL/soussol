'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { MementoCard } from './MementoCard'
import { Modal } from './Modal'
import type { Memento } from '@/lib/types'

const STAGE_W = 4000
const STAGE_H = 3000
const DRAG_THRESHOLD = 5

export function ArchiveCanvas({ mementos }: { mementos: Memento[] }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState<Memento | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  // All drag state as refs — never causes re-renders during drag
  const drag = useRef({
    active: false,
    moved: false,
    startClient: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
  })
  // Mirror of offset state for reading in handlers without stale closures
  const offsetRef = useRef({ x: 0, y: 0 })

  // Fade hint after 6s
  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), 6000)
    return () => clearTimeout(t)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      active: true,
      moved: false,
      startClient: { x: e.clientX, y: e.clientY },
      startOffset: { ...offsetRef.current },
    }
    window.dispatchEvent(new CustomEvent('cursor-state', { detail: 'grabbing' }))
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.startClient.x
    const dy = e.clientY - drag.current.startClient.y

    if (!drag.current.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      drag.current.moved = true
      setHintVisible(false)
    }

    if (drag.current.moved) {
      const next = {
        x: drag.current.startOffset.x + dx,
        y: drag.current.startOffset.y + dy,
      }
      offsetRef.current = next
      setOffset(next)
    }
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current.active = false
    window.dispatchEvent(new CustomEvent('cursor-state', { detail: 'grab' }))
  }, [])

  const openModal = useCallback((m: Memento) => {
    // Only open if the pointer didn't move (click, not drag-end)
    if (!drag.current.moved) setSelected(m)
  }, [])

  const resetView = useCallback(() => {
    setTransitioning(true)
    offsetRef.current = { x: 0, y: 0 }
    setOffset({ x: 0, y: 0 })
    setTimeout(() => setTransitioning(false), 800)
  }, [])

  return (
    <>
      {/* Viewport */}
      <div
        data-cursor="grab"
        className="fixed inset-0 overflow-hidden select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Stage */}
        <div
          style={{
            position: 'absolute',
            width: STAGE_W,
            height: STAGE_H,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            transition: transitioning
              ? 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
            willChange: 'transform',
          }}
        >
          {mementos.map((m) => {
            // Deterministic float values from id — no randomness on re-render
            const h = m.id.charCodeAt(0) + m.id.charCodeAt(2) + m.id.charCodeAt(4)
            const duration = 3.2 + (h % 22) * 0.1
            const delay = -((h % 30) * 0.1)
            const yAmp = 4 + (h % 5)

            return (
              // Outer: position + float (Y only)
              <div
                key={m.id}
                style={{
                  position: 'absolute',
                  left: STAGE_W / 2 + m.x,
                  top: STAGE_H / 2 + m.y,
                  zIndex: m.z_index,
                  animation: `memento-float ${duration}s ease-in-out ${delay}s infinite alternate`,
                  '--float-y': `${yAmp}px`,
                } as React.CSSProperties}
              >
                {/* Inner: center + rotate + scale */}
                <button
                  onClick={() => openModal(m)}
                  className="block focus:outline-none"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${m.scale})`,
                  }}
                  aria-label={m.caption ?? m.kind}
                >
                  <MementoCard memento={m} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={resetView}
        className="fixed right-6 z-40 font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-spark sm:right-12"
        style={{ top: 72 }}
        aria-label="Ansicht zurücksetzen"
      >
        Reset
      </button>

      {/* Drag hint */}
      {hintVisible && (
        <div
          className="pointer-events-none fixed bottom-10 left-1/2 z-40 -translate-x-1/2 font-sans text-[10px] tracking-[0.35em] text-mist uppercase transition-opacity duration-1000"
          aria-hidden="true"
        >
          Drag to explore
        </div>
      )}

      {/* Detail modal */}
      <Modal memento={selected} onClose={() => setSelected(null)} />
    </>
  )
}
