'use client'

import { errorMessage } from '@/lib/form-error'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Sport = 'running' | 'cycling' | 'volleyball' | 'other'
type Status = 'upcoming' | 'past' | 'cancelled'
type Visibility = 'public' | 'outer'

export type EventFormValues = {
  id?: string
  title: string
  sport: Sport
  starts_at: string
  ends_at: string
  meeting_point: string
  description: string
  max_participants: string
  registration_enabled: boolean
  external_signup_url: string
  ticketing_enabled: boolean
  status: Status
  visibility: Visibility
}

const defaultValues: EventFormValues = {
  title: '',
  sport: 'running',
  starts_at: '',
  ends_at: '',
  meeting_point: '',
  description: '',
  max_participants: '',
  registration_enabled: true,
  external_signup_url: '',
  ticketing_enabled: false,
  status: 'upcoming',
  visibility: 'public',
}

const SPORTS: { value: Sport; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Rennrad' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'other', label: 'Other' },
]

const STATUSES: { value: Status; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
]

function toLocalDatetime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIso(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

export function EventForm({ initial }: { initial?: Partial<EventFormValues> & { id?: string } }) {
  const router = useRouter()
  const isEdit = !!initial?.id

  const [values, setValues] = useState<EventFormValues>({
    ...defaultValues,
    ...initial,
    starts_at: toLocalDatetime(initial?.starts_at ?? ''),
    ends_at: toLocalDatetime(initial?.ends_at ?? ''),
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    const payload = {
      ...(isEdit ? { id: initial!.id } : {}),
      title: values.title,
      sport: values.sport,
      starts_at: toIso(values.starts_at)!,
      ends_at: toIso(values.ends_at),
      meeting_point: values.meeting_point || null,
      description: values.description || null,
      max_participants: values.max_participants ? parseInt(values.max_participants) : null,
      registration_enabled: values.registration_enabled,
      external_signup_url: values.external_signup_url.trim() || null,
      ticketing_enabled: values.ticketing_enabled,
      status: values.status,
      visibility: values.visibility,
    }

    const res = await fetch('/api/admin/events', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(errorMessage(json.error, 'Fehler beim Speichern.'))
      setLoading(false)
      return
    }

    router.push('/admin/events')
    router.refresh()
  }

  async function deleteEvent() {
    if (!initial?.id || deleting) return
    if (!confirm('Event wirklich löschen?')) return
    setDeleting(true)
    await fetch('/api/admin/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: initial.id }),
    })
    router.push('/admin/events')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-8">
      {/* Title */}
      <Field label="Titel *">
        <input
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          required
          className={inputClass}
        />
      </Field>

      {/* Sport */}
      <Field label="Sportart">
        <div className="flex gap-2 flex-wrap">
          {SPORTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('sport', value)}
              className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase transition-colors ${
                values.sport === value
                  ? 'border border-white/40 text-spark'
                  : 'border border-white/10 text-mist hover:border-white/25 hover:text-ash'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-6">
        <Field label="Start *">
          <input
            type="datetime-local"
            value={values.starts_at}
            onChange={(e) => set('starts_at', e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Ende">
          <input
            type="datetime-local"
            value={values.ends_at}
            onChange={(e) => set('ends_at', e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Meeting point */}
      <Field label="Treffpunkt">
        <input
          type="text"
          value={values.meeting_point}
          onChange={(e) => set('meeting_point', e.target.value)}
          className={inputClass}
          placeholder="z.B. Stadtplatz Linz"
        />
      </Field>

      {/* Description */}
      <Field label="Beschreibung">
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={5}
          className={`${inputClass} resize-y`}
        />
      </Field>

      {/* Max participants */}
      <Field label="Max. Teilnehmer">
        <input
          type="number"
          min={1}
          value={values.max_participants}
          onChange={(e) => set('max_participants', e.target.value)}
          className={inputClass}
          placeholder="leer = unbegrenzt"
        />
      </Field>

      {/* External signup URL (z.B. Turnier über Partner) */}
      <Field label="Externe Anmeldung (URL)">
        <input
          type="url"
          value={values.external_signup_url}
          onChange={(e) => set('external_signup_url', e.target.value)}
          className={inputClass}
          placeholder="leer = interne Anmeldung. Sonst: https://…"
        />
      </Field>

      {/* Registration enabled */}
      <Field label="Anmeldung">
        <button
          type="button"
          onClick={() => set('registration_enabled', !values.registration_enabled)}
          className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase transition-colors ${
            values.registration_enabled ? 'text-spark' : 'text-mist'
          }`}
        >
          <span
            className={`h-4 w-7 rounded-full border transition-colors ${
              values.registration_enabled ? 'border-spark bg-spark/20' : 'border-white/20 bg-transparent'
            }`}
          />
          {values.registration_enabled ? 'Aktiviert' : 'Deaktiviert'}
        </button>
      </Field>

      {/* Ticketing enabled */}
      <Field label="Ticket-Verkauf">
        <button
          type="button"
          onClick={() => set('ticketing_enabled', !values.ticketing_enabled)}
          className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase transition-colors ${
            values.ticketing_enabled ? 'text-spark' : 'text-mist'
          }`}
        >
          <span
            className={`h-4 w-7 rounded-full border transition-colors ${
              values.ticketing_enabled ? 'border-spark bg-spark/20' : 'border-white/20 bg-transparent'
            }`}
          />
          {values.ticketing_enabled ? 'Aktiviert' : 'Deaktiviert'}
        </button>
      </Field>

      {/* Sichtbarkeit */}
      <Field label="Sichtbarkeit">
        <button
          type="button"
          onClick={() => set('visibility', values.visibility === 'outer' ? 'public' : 'outer')}
          className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase transition-colors ${
            values.visibility === 'outer' ? 'text-spark' : 'text-mist'
          }`}
        >
          <span
            className={`h-4 w-7 rounded-full border transition-colors ${
              values.visibility === 'outer' ? 'border-spark bg-spark/20' : 'border-white/20 bg-transparent'
            }`}
          />
          {values.visibility === 'outer' ? 'Nur Outer Circle' : 'Öffentlich'}
        </button>
        <p className="mt-2 font-sans text-[10px] font-light leading-relaxed text-mist">
          {values.visibility === 'outer'
            ? 'Nur eingeloggte Mitglieder sehen dieses Event. Gäste bekommen es weder auf /upcoming noch über die direkte URL.'
            : 'Jeder sieht dieses Event.'}
        </p>
      </Field>

      {/* Status — only in edit mode */}
      {isEdit && (
        <Field label="Status">
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set('status', value)}
                className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase transition-colors ${
                  values.status === value
                    ? 'border border-white/40 text-spark'
                    : 'border border-white/10 text-mist hover:border-white/25 hover:text-ash'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-6 border-t border-white/8 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {loading ? '...' : isEdit ? 'Speichern →' : 'Erstellen →'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={deleteEvent}
            disabled={deleting}
            className="ml-auto font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50 disabled:opacity-30"
          >
            {deleting ? '...' : 'Löschen'}
          </button>
        )}
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
