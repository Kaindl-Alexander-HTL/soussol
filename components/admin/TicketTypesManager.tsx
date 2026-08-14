'use client'

import { errorMessage } from '@/lib/form-error'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TicketType } from '@/lib/types'

type FormValues = {
  name: string
  price_euros: string
  capacity_per_ticket: string
  max_tickets: string
}

const emptyForm: FormValues = {
  name: '',
  price_euros: '',
  capacity_per_ticket: '1',
  max_tickets: '',
}

export function TicketTypesManager({ eventId, initial }: { eventId: string; initial: TicketType[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function startEdit(t: TicketType) {
    setEditingId(t.id)
    setForm({
      name: t.name,
      price_euros: (t.price_cents / 100).toFixed(2),
      capacity_per_ticket: String(t.capacity_per_ticket),
      max_tickets: t.max_tickets?.toString() ?? '',
    })
    setError('')
  }

  function startCreate() {
    setEditingId('new')
    setForm(emptyForm)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  async function save() {
    if (loading) return
    setLoading(true)
    setError('')

    const priceCents = Math.round(parseFloat(form.price_euros.replace(',', '.')) * 100)
    const payload = {
      ...(editingId !== 'new' ? { id: editingId } : { event_id: eventId }),
      name: form.name.trim(),
      price_cents: priceCents,
      capacity_per_ticket: parseInt(form.capacity_per_ticket) || 1,
      max_tickets: form.max_tickets ? parseInt(form.max_tickets) : null,
    }

    const res = await fetch('/api/admin/ticket-types', {
      method: editingId === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(errorMessage(json.error, 'Fehler beim Speichern.'))
      setLoading(false)
      return
    }

    setLoading(false)
    cancelEdit()
    router.refresh()
  }

  async function toggleActive(t: TicketType) {
    await fetch('/api/admin/ticket-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
          Ticket-Typen ({initial.length})
        </h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startCreate}
            className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
          >
            + Hinzufügen
          </button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-white/5">
        {initial.map((t) =>
          editingId === t.id ? (
            <TicketTypeFormRow
              key={t.id}
              form={form}
              setForm={setForm}
              onSave={save}
              onCancel={cancelEdit}
              loading={loading}
              error={error}
              isNew={false}
            />
          ) : (
            <div key={t.id} className="flex items-center gap-4 py-3">
              <span
                className={`flex-1 font-sans text-sm font-light ${t.is_active ? 'text-ash' : 'text-white/25 line-through'}`}
              >
                {t.name}
              </span>
              <span className="font-sans text-[11px] text-mist">
                {(t.price_cents / 100).toFixed(2).replace('.', ',')} €
                {' · '}
                {t.capacity_per_ticket === 1 ? 'Einzelticket' : `Team (${t.capacity_per_ticket})`}
                {t.max_tickets != null ? ` · max. ${t.max_tickets} Plätze` : ''}
              </span>
              <button
                type="button"
                onClick={() => startEdit(t)}
                className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => toggleActive(t)}
                className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
              >
                {t.is_active ? 'Deaktivieren' : 'Aktivieren'}
              </button>
            </div>
          )
        )}
      </div>

      {editingId === 'new' && (
        <div className="mt-5 border-t border-white/8 pt-5">
          <TicketTypeFormRow
            form={form}
            setForm={setForm}
            onSave={save}
            onCancel={cancelEdit}
            loading={loading}
            error={error}
            isNew={true}
          />
        </div>
      )}
    </div>
  )
}

function TicketTypeFormRow({
  form,
  setForm,
  onSave,
  onCancel,
  loading,
  error,
  isNew,
}: {
  form: FormValues
  setForm: (f: FormValues) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
  error: string
  isNew: boolean
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Name, z.B. Team-Ticket"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Preis in €, z.B. 60"
          value={form.price_euros}
          onChange={(e) => setForm({ ...form, price_euros: e.target.value })}
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          placeholder="Plätze pro Ticket"
          value={form.capacity_per_ticket}
          onChange={(e) => setForm({ ...form, capacity_per_ticket: e.target.value })}
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          placeholder="Max. Plätze (leer = unbegrenzt)"
          value={form.max_tickets}
          onChange={(e) => setForm({ ...form, max_tickets: e.target.value })}
          className={inputClass}
        />
      </div>
      {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {loading ? '...' : isNew ? 'Erstellen →' : 'Speichern →'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
