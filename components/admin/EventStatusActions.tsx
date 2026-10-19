'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type EventStatus = 'upcoming' | 'past' | 'cancelled'

// Wohin ein Event vom aktuellen Zustand aus verschoben werden kann.
// Bewusst nur die sinnvollen Ziele: aus "Past" zurück nach "Cancelled" zu
// gehen ergibt keinen Sinn, das wäre nur eine weitere Klickmöglichkeit.
const TARGETS: Record<EventStatus, { value: EventStatus; label: string }[]> = {
  upcoming: [
    { value: 'past', label: 'Move to past' },
    { value: 'cancelled', label: 'Absagen' },
  ],
  past: [{ value: 'upcoming', label: 'Move to upcoming' }],
  cancelled: [{ value: 'upcoming', label: 'Move to upcoming' }],
}

export function EventStatusActions({
  id,
  status,
}: {
  id: string
  status: EventStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function move(target: EventStatus) {
    if (busy) return
    setBusy(true)

    const res = await fetch('/api/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: target }),
    })

    if (!res.ok) {
      setBusy(false)
      return
    }

    // Das Event wandert damit in einen anderen Tab und verschwindet aus
    // dieser Liste — deshalb neu laden statt lokal auszublenden.
    router.refresh()
    setBusy(false)
  }

  return (
    <div className="flex items-center gap-4">
      {(TARGETS[status] ?? []).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            move(value)
          }}
          className="font-sans text-[10px] tracking-[0.15em] text-white/25 uppercase whitespace-nowrap transition-colors hover:text-ash disabled:opacity-30"
        >
          {busy ? '...' : label}
        </button>
      ))}
    </div>
  )
}
