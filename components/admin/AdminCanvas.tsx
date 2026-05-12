'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { MementoCard } from '@/components/MementoCard'
import type { Memento } from '@/lib/types'

type Pos = { x: number; y: number; rotation: number; scale: number; z_index: number }
type PosMap = Record<string, Pos>
type Connection = { id: string; from_memento_id: string; to_memento_id: string }

const STAGE_W = 4000
const STAGE_H = 3000
const DRAG_THRESHOLD = 4

function initPositions(mementos: Memento[]): PosMap {
  return Object.fromEntries(
    mementos.map((m) => [
      m.id,
      { x: m.x, y: m.y, rotation: m.rotation, scale: m.scale, z_index: m.z_index },
    ])
  )
}

function ropePath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const sag = dist * 0.13
  return `M ${x1} ${y1} Q ${mx} ${my + sag} ${x2} ${y2}`
}

export function AdminCanvas({ mementos, initialConnections }: { mementos: Memento[]; initialConnections: Connection[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [stageOffset, setStageOffset] = useState({ x: 0, y: 0 })
  const [positions, setPositions] = useState<PosMap>(() => initPositions(mementos))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [ropeMode, setRopeMode] = useState(false)
  const [ropeStart, setRopeStart] = useState<string | null>(null)
  const [connections, setConnections] = useState<Connection[]>(initialConnections)

  // Drag refs — no re-renders during drag
  const stageOffsetRef = useRef({ x: 0, y: 0 })
  const positionsRef = useRef<PosMap>(positions)
  useEffect(() => { positionsRef.current = positions })

  const stageDrag = useRef({ active: false, moved: false, startClient: { x: 0, y: 0 }, startOffset: { x: 0, y: 0 } })
  const memDrag = useRef({ active: false, moved: false, id: '', startClient: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } })

  // ── Stage pointer handlers ──────────────────────────────────────────────────

  const onViewportPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (memDrag.current.active) return
    viewportRef.current?.setPointerCapture(e.pointerId)
    stageDrag.current = {
      active: true,
      moved: false,
      startClient: { x: e.clientX, y: e.clientY },
      startOffset: { ...stageOffsetRef.current },
    }
    setSelectedId(null)
    document.body.classList.add('dragging')
  }, [])

  const onViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // ── Memento drag ──
    if (memDrag.current.active) {
      const dx = e.clientX - memDrag.current.startClient.x
      const dy = e.clientY - memDrag.current.startClient.y

      if (!memDrag.current.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        memDrag.current.moved = true
      }

      if (memDrag.current.moved) {
        const id = memDrag.current.id
        const prev = memDrag.current.startPos
        setPositions((p) => ({
          ...p,
          [id]: { ...p[id], x: Math.round(prev.x + dx), y: Math.round(prev.y + dy) },
        }))
        setHasChanges(true)
      }
      return
    }

    // ── Stage drag ──
    if (!stageDrag.current.active) return
    const dx = e.clientX - stageDrag.current.startClient.x
    const dy = e.clientY - stageDrag.current.startClient.y

    if (!stageDrag.current.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      stageDrag.current.moved = true
    }

    if (stageDrag.current.moved) {
      const next = {
        x: stageDrag.current.startOffset.x + dx,
        y: stageDrag.current.startOffset.y + dy,
      }
      stageOffsetRef.current = next
      setStageOffset(next)
    }
  }, [])

  const onViewportPointerUp = useCallback(() => {
    document.body.classList.remove('dragging')

    if (memDrag.current.active) {
      if (!memDrag.current.moved) {
        // It was a tap → select
        setSelectedId(memDrag.current.id)
      }
      memDrag.current.active = false
      return
    }

    stageDrag.current.active = false
  }, [])

  // ── Memento pointer down (stop propagation → prevents stage drag) ───────────

  const ropeModeRef = useRef(false)
  const ropeStartRef = useRef<string | null>(null)
  useEffect(() => { ropeModeRef.current = ropeMode }, [ropeMode])
  useEffect(() => { ropeStartRef.current = ropeStart }, [ropeStart])

  const onMementoPointerDown = useCallback(
    async (e: React.PointerEvent, id: string) => {
      e.stopPropagation()

      // ── Seil-Modus ──────────────────────────────────────────────────────────
      if (ropeModeRef.current) {
        const start = ropeStartRef.current
        if (!start) {
          setRopeStart(id)
        } else if (start !== id) {
          // Create connection
          const res = await fetch('/api/admin/mementos/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_memento_id: start, to_memento_id: id }),
          })
          if (res.ok) {
            const conn = await res.json()
            setConnections((c) => [...c, conn])
          }
          setRopeStart(null)
        }
        return
      }

      // ── Drag-Modus ──────────────────────────────────────────────────────────
      viewportRef.current?.setPointerCapture(e.pointerId)
      const pos = positionsRef.current[id]
      memDrag.current = {
        active: true,
        moved: false,
        id,
        startClient: { x: e.clientX, y: e.clientY },
        startPos: { x: pos.x, y: pos.y },
      }
      document.body.classList.add('dragging')
    },
    []
  )

  async function deleteConnection(connId: string) {
    await fetch('/api/admin/mementos/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: connId }),
    })
    setConnections((c) => c.filter((x) => x.id !== connId))
  }

  // ── Controls ────────────────────────────────────────────────────────────────

  function adjustRotation(id: string, delta: number) {
    setPositions((p) => ({
      ...p,
      [id]: { ...p[id], rotation: Math.round(((p[id].rotation + delta + 180) % 360) - 180) },
    }))
    setHasChanges(true)
  }

  function adjustZIndex(id: string, delta: number) {
    setPositions((p) => ({
      ...p,
      [id]: { ...p[id], z_index: Math.max(0, p[id].z_index + delta) },
    }))
    setHasChanges(true)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function saveLayout() {
    if (saving) return
    setSaving(true)
    setSaveStatus('idle')

    const updates = Object.entries(positions).map(([id, pos]) => ({ id, ...pos }))

    const res = await fetch('/api/admin/mementos/positions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })

    setSaving(false)
    if (res.ok) {
      setHasChanges(false)
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } else {
      setSaveStatus('error')
    }
  }

  const selected = selectedId ? mementos.find((m) => m.id === selectedId) : null
  const selectedPos = selectedId ? positions[selectedId] : null

  return (
    <>
      {/* Viewport */}
      <div
        ref={viewportRef}
        className="fixed inset-0 overflow-hidden select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
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
            willChange: 'transform',
          }}
        >
          {/* ── Seil SVG-Overlay ─────────────────────────────────────── */}
          <svg
            style={{ position: 'absolute', inset: 0, width: STAGE_W, height: STAGE_H, pointerEvents: 'none', overflow: 'visible', zIndex: 5000 }}
          >
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
                  {/* Unsichtbarer dicker Klickbereich */}
                  <path
                    d={ropePath(x1, y1, x2, y2)}
                    stroke="transparent"
                    strokeWidth={18}
                    fill="none"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={() => deleteConnection(conn.id)}
                  />
                  {/* Sichtbares Seil */}
                  <path
                    d={ropePath(x1, y1, x2, y2)}
                    stroke="#F2EDE3"
                    strokeWidth={1.5}
                    strokeOpacity={0.45}
                    fill="none"
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Pins an den Enden */}
                  <circle cx={x1} cy={y1} r={4} fill="#F2EDE3" fillOpacity={0.5} style={{ pointerEvents: 'none' }} />
                  <circle cx={x2} cy={y2} r={4} fill="#F2EDE3" fillOpacity={0.5} style={{ pointerEvents: 'none' }} />
                </g>
              )
            })}
          </svg>

          {/* ── Mementos ─────────────────────────────────────────────── */}
          {mementos.map((m) => {
            const pos = positions[m.id]
            const isSelected = selectedId === m.id
            const isRopeStart = ropeStart === m.id
            return (
              <div
                key={m.id}
                onPointerDown={(e) => onMementoPointerDown(e, m.id)}
                style={{
                  position: 'absolute',
                  left: STAGE_W / 2 + pos.x,
                  top: STAGE_H / 2 + pos.y,
                  transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
                  zIndex: pos.z_index,
                  outline: isRopeStart
                    ? '2px dashed rgba(242,237,227,0.7)'
                    : isSelected
                    ? '2px solid rgba(255,255,255,0.4)'
                    : 'none',
                  outlineOffset: 6,
                  cursor: ropeMode ? 'crosshair' : undefined,
                }}
              >
                <MementoCard memento={{ ...m, ...pos }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-sm">
        <Link
          href="/admin/archive"
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          ← Archive
        </Link>

        <div className="flex items-center gap-6">
          <button
            onClick={() => { setRopeMode((v) => !v); setRopeStart(null) }}
            className={`font-sans text-[10px] tracking-[0.25em] uppercase transition-colors ${
              ropeMode ? 'text-spark' : 'text-mist hover:text-ash'
            }`}
          >
            {ropeMode ? (ropeStart ? 'Ziel wählen …' : 'Seil-Modus ✕') : 'Seil spannen'}
          </button>
        </div>

        <button
          onClick={saveLayout}
          disabled={!hasChanges || saving}
          className={`font-sans text-[11px] tracking-[0.3em] uppercase transition-colors ${
            saveStatus === 'ok'
              ? 'text-spark'
              : saveStatus === 'error'
              ? 'text-white/40'
              : hasChanges
              ? 'text-ash hover:text-spark'
              : 'text-white/20'
          } disabled:cursor-default`}
        >
          {saving ? '...' : saveStatus === 'ok' ? 'Gespeichert ✓' : saveStatus === 'error' ? 'Fehler' : 'Save Layout'}
        </button>
      </div>

      {/* Selected memento controls */}
      {selected && selectedPos && (
        <div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 flex items-center gap-6 border border-white/10 bg-ink/95 px-6 py-4 backdrop-blur-sm">
          <span className="max-w-[140px] truncate font-serif italic text-sm text-spark">
            {selected.caption ?? selected.kind}
          </span>

          {/* Rotation */}
          <div className="flex items-center gap-2">
            <span className="font-sans text-[9px] tracking-[0.2em] text-mist uppercase">Rot</span>
            <button
              onClick={() => adjustRotation(selected.id, -5)}
              className="font-sans text-sm text-mist transition-colors hover:text-spark"
            >
              ←
            </button>
            <span className="w-10 text-center font-sans text-[11px] text-ash">
              {selectedPos.rotation}°
            </span>
            <button
              onClick={() => adjustRotation(selected.id, 5)}
              className="font-sans text-sm text-mist transition-colors hover:text-spark"
            >
              →
            </button>
          </div>

          {/* Z-Index */}
          <div className="flex items-center gap-2">
            <span className="font-sans text-[9px] tracking-[0.2em] text-mist uppercase">Z</span>
            <button
              onClick={() => adjustZIndex(selected.id, -1)}
              className="font-sans text-sm text-mist transition-colors hover:text-spark"
            >
              ↓
            </button>
            <span className="w-8 text-center font-sans text-[11px] text-ash">
              {selectedPos.z_index}
            </span>
            <button
              onClick={() => adjustZIndex(selected.id, 1)}
              className="font-sans text-sm text-mist transition-colors hover:text-spark"
            >
              ↑
            </button>
          </div>

          <button
            onClick={() => setSelectedId(null)}
            className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-mist"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hint */}
      {mementos.length > 0 && (
        <div className="pointer-events-none fixed bottom-8 right-6 z-30 font-sans text-[9px] tracking-[0.2em] text-white/15 uppercase">
          {ropeMode ? 'Memento A → Memento B = Seil · Seil klicken = löschen' : 'Tap = auswählen · Drag = verschieben'}
        </div>
      )}
    </>
  )
}
