'use client'

import { useState } from 'react'

export type TicketTypeWithAvailability = {
  id: string
  name: string
  price_cents: number
  capacity_per_ticket: number
  remaining: number | null
}

type State = 'idle' | 'loading' | 'error'

export function TicketPurchaseForm({
  eventId,
  ticketTypes,
}: {
  eventId: string
  ticketTypes: TicketTypeWithAvailability[]
}) {
  const [ticketTypeId, setTicketTypeId] = useState(
    ticketTypes.find((t) => t.remaining === null || t.remaining >= t.capacity_per_ticket)?.id ?? ''
  )
  const [quantity, setQuantity] = useState(1)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading' || !ticketTypeId) return
    setState('loading')
    setErrorMsg('')

    const res = await fetch('/api/tickets/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(json.error ?? 'Etwas ist schiefgelaufen.')
      setState('error')
      return
    }

    window.location.href = json.url
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="font-sans text-sm text-mist">Noch keine Tickets verfügbar.</p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/8 pt-12">
      <p className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">Tickets</p>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-7">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Ticket-Typ *</label>
          <div className="flex flex-col gap-2">
            {ticketTypes.map((t) => {
              const soldOut = t.remaining !== null && t.remaining < t.capacity_per_ticket
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={soldOut || state === 'loading'}
                  onClick={() => setTicketTypeId(t.id)}
                  className={`flex items-center justify-between border px-3 py-2 text-left font-sans text-sm transition-colors ${
                    ticketTypeId === t.id
                      ? 'border-white/40 text-spark'
                      : 'border-white/10 text-mist hover:border-white/25'
                  } disabled:opacity-30`}
                >
                  <span>{t.name}</span>
                  <span className="text-[11px]">
                    {(t.price_cents / 100).toFixed(2).replace('.', ',')} €
                    {soldOut ? ' · Ausverkauft' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Menge *</label>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Name *</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">E-Mail *</label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            required
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        {errorMsg && <p className="font-sans text-[11px] text-white/40">{errorMsg}</p>}

        <button
          type="submit"
          disabled={state === 'loading' || !ticketTypeId}
          className="text-left font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {state === 'loading' ? '...' : 'Zur Kasse →'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
