'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { MementoCard } from './MementoCard'
import { Modal } from './Modal'
import type { Memento } from '@/lib/types'

const STAGE_W = 4000
const STAGE_H = 3000
const DRAG_THRESHOLD = 5

type PosMap = Record<string, { x: number; y: number }>
type Connection = { id: string; from_memento_id: string; to_memento_id: string }

function ropePath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const sag = dist * 0.13
  return `M ${x1} ${y1} Q ${mx} ${my + sag} ${x2} ${y2}`
}

export function ArchiveCanvas({ mementos, connections = [] }: { mementos: Memento[]; connections?: Connection[] }) {
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
    setPositions(Object.fromEntries(mementos.map((m) => [m.id, { x: m.x, y: m.y }])))
    setTimeout(() => setTransitioning(false), 800)
  }, [mementos])

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
          {/* ── Seile ────────────────────────────────────────────────── */}
          <svg style={{ position: 'absolute', inset: 0, width: STAGE_W, height: STAGE_H, pointerEvents: 'none', overflow: 'visible', zIndex: 5000 }}>
            {connections.map((conn) => {
              const from = positions[conn.from_memento_id]
              const to   = positions[conn.to_memento_id]
              if (!from || !to) return null
              const x1 = STAGE_W / 2 + from.x
              const y1 = STAGE_H / 2 + from.y
              const x2 = STAGE_W / 2 + to.x
              const y2 = STAGE_H / 2 + to.y
              return (
                <g key={conn.id}>
                  <path d={ropePath(x1, y1, x2, y2)} stroke="#F2EDE3" strokeWidth={1.5} strokeOpacity={0.35} fill="none" strokeLinecap="round" />
                  <circle cx={x1} cy={y1} r={4} fill="#F2EDE3" fillOpacity={0.4} />
                  <circle cx={x2} cy={y2} r={4} fill="#F2EDE3" fillOpacity={0.4} />
                </g>
              )
            })}
          </svg>

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
                  <div className="scale-[0.62] origin-center sm:scale-100">
                    <MementoCard memento={m} />
                  </div>
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
        aria-label="Reset view"
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
