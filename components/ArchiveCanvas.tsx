'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { MementoCard } from './MementoCard'
import { Modal } from './Modal'
import type { Memento } from '@/lib/types'

const STAGE_W = 4000
const STAGE_H = 3000
const DRAG_THRESHOLD = 5

type PosMap = Record<string, { x: number; y: number }>

export function ArchiveCanvas({ mementos }: { mementos: Memento[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [stageOffset, setStageOffset] = useState({ x: 0, y: 0 })
  const [positions, setPositions] = useState<PosMap>(() =>
    Object.fromEntries(mementos.map((m) => [m.id, { x: m.x, y: m.y }]))
  )
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Memento | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  const stageOffsetRef = useRef({ x: 0, y: 0 })
  const positionsRef = useRef<PosMap>(positions)
  useEffect(() => { positionsRef.current = positions }, [positions])

  const stageDrag = useRef({ active: false, moved: false, startClient: { x: 0, y: 0 }, startOffset: { x: 0, y: 0 } })
  const memDrag = useRef({ active: false, moved: false, id: '', startClient: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } })

  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), 6000)
    return () => clearTimeout(t)
  }, [])

  // ── Memento pointer down ────────────────────────────────────────────────────
  const onMementoPointerDown = useCallback((e: React.PointerEvent, m: Memento) => {
    e.stopPropagation()
    viewportRef.current?.setPointerCapture(e.pointerId)
    const pos = positionsRef.current[m.id]
    memDrag.current = {
      active: true,
      moved: false,
      id: m.id,
      startClient: { x: e.clientX, y: e.clientY },
      startPos: { x: pos.x, y: pos.y },
    }
    setDraggingId(m.id)
    setHintVisible(false)
    document.body.classList.add('dragging')
  }, [])

  // ── Stage pointer down ──────────────────────────────────────────────────────
  const onViewportPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (memDrag.current.active) return
    viewportRef.current?.setPointerCapture(e.pointerId)
    stageDrag.current = {
      active: true,
      moved: false,
      startClient: { x: e.clientX, y: e.clientY },
      startOffset: { ...stageOffsetRef.current },
    }
    setHintVisible(false)
    document.body.classList.add('dragging')
  }, [])

  // ── Pointer move ────────────────────────────────────────────────────────────
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Memento drag
    if (memDrag.current.active) {
      const dx = e.clientX - memDrag.current.startClient.x
      const dy = e.clientY - memDrag.current.startClient.y
      if (!memDrag.current.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        memDrag.current.moved = true
      }
      if (memDrag.current.moved) {
        const id = memDrag.current.id
        const prev = memDrag.current.startPos
        setPositions((p) => ({ ...p, [id]: { x: Math.round(prev.x + dx), y: Math.round(prev.y + dy) } }))
      }
      return
    }

    // Stage drag
    if (!stageDrag.current.active) return
    const dx = e.clientX - stageDrag.current.startClient.x
    const dy = e.clientY - stageDrag.current.startClient.y
    if (!stageDrag.current.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      stageDrag.current.moved = true
    }
    if (stageDrag.current.moved) {
      const next = { x: stageDrag.current.startOffset.x + dx, y: stageDrag.current.startOffset.y + dy }
      stageOffsetRef.current = next
      setStageOffset(next)
    }
  }, [])

  // ── Pointer up ──────────────────────────────────────────────────────────────
  const onPointerUp = useCallback(() => {
    document.body.classList.remove('dragging')

    if (memDrag.current.active) {
      if (!memDrag.current.moved) {
        // Short tap → open modal
        const m = mementos.find((m) => m.id === memDrag.current.id)
        if (m) setSelected({ ...m, x: positionsRef.current[m.id].x, y: positionsRef.current[m.id].y })
      }
      memDrag.current.active = false
      setDraggingId(null)
      return
    }

    stageDrag.current.active = false
  }, [mementos])

  const resetView = useCallback(() => {
    setTransitioning(true)
    stageOffsetRef.current = { x: 0, y: 0 }
    setStageOffset({ x: 0, y: 0 })
    setTimeout(() => setTransitioning(false), 800)
  }, [])

  return (
    <>
      {/* Viewport */}
      <div
        ref={viewportRef}
        className="canvas-viewport fixed inset-0 overflow-hidden select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onViewportPointerDown}
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
            transform: `translate(calc(-50% + ${stageOffset.x}px), calc(-50% + ${stageOffset.y}px))`,
            transition: transitioning ? 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {mementos.map((m) => {
            const pos = positions[m.id]
            const isDragging = draggingId === m.id
            const h = m.id.charCodeAt(0) + m.id.charCodeAt(2) + m.id.charCodeAt(4)
            const duration = 3.2 + (h % 22) * 0.1
            const delay = -((h % 30) * 0.1)
            const yAmp = 4 + (h % 5)

            return (
              <div
                key={m.id}
                onPointerDown={(e) => onMementoPointerDown(e, m)}
                style={{
                  position: 'absolute',
                  left: STAGE_W / 2 + pos.x,
                  top: STAGE_H / 2 + pos.y,
                  zIndex: isDragging ? 9999 : m.z_index,
                  animation: isDragging ? 'none' : `memento-float ${duration}s ease-in-out ${delay}s infinite alternate`,
                  '--float-y': `${yAmp}px`,
                  transition: isDragging ? 'none' : undefined,
                  filter: isDragging ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.7))' : undefined,
                } as React.CSSProperties}
              >
                <div
                  className="focus:outline-none"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${isDragging ? m.scale * 1.04 : m.scale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  aria-label={m.caption ?? m.kind}
                >
                  <MementoCard memento={m} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={resetView}
        className="fixed right-6 z-40 font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-paper sm:right-12"
        style={{ top: 72 }}
        aria-label="Ansicht zurücksetzen"
      >
        Reset
      </button>

      {/* Hint */}
      {hintVisible && (
        <div
          className="pointer-events-none fixed bottom-10 left-1/2 z-40 -translate-x-1/2 font-sans text-[10px] tracking-[0.35em] text-mist uppercase"
          aria-hidden="true"
        >
          Drag to explore
        </div>
      )}

      <Modal memento={selected} onClose={() => setSelected(null)} />
    </>
  )
}
