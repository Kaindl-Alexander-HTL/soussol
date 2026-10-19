'use client'

import { errorMessage } from '@/lib/form-error'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Kind = 'polaroid' | 'note' | 'stamp' | 'scan' | 'strava' | 'other'

export type MementoFormValues = {
  id?: string
  kind: Kind
  image_url: string
  caption: string
  body: string
  date_label: string
  event_id: string
  is_visible: boolean
}

const defaultValues: MementoFormValues = {
  kind: 'polaroid',
  image_url: '',
  caption: '',
  body: '',
  date_label: '',
  event_id: '',
  is_visible: true,
}

const KINDS: { value: Kind; label: string }[] = [
  { value: 'polaroid', label: 'Polaroid' },
  { value: 'note', label: 'Note' },
  { value: 'stamp', label: 'Stamp' },
  { value: 'scan', label: 'Scan' },
  { value: 'strava', label: 'Strava' },
  { value: 'other', label: 'Other' },
]

type Event = { id: string; title: string }

export function MementoForm({
  initial,
  events,
}: {
  initial?: Partial<MementoFormValues> & { id?: string }
  events: Event[]
}) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const fileRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState<MementoFormValues>({
    ...defaultValues,
    ...initial,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function set<K extends keyof MementoFormValues>(key: K, value: MementoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setUploadError(errorMessage(json.error, 'Upload fehlgeschlagen.'))
    } else {
      set('image_url', json.url)
    }
    setUploading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || uploading) return
    setLoading(true)
    setError('')

    const payload = {
      ...(isEdit ? { id: initial!.id } : {}),
      kind: values.kind,
      image_url: values.image_url || null,
      caption: values.caption || null,
      body: values.body || null,
      date_label: values.date_label || null,
      event_id: values.event_id || null,
      is_visible: values.is_visible,
    }

    const res = await fetch('/api/admin/mementos', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(errorMessage(json.error, 'Could not save.'))
      setLoading(false)
      return
    }

    router.push('/admin/archive')
    router.refresh()
  }

  async function deleteMemento() {
    if (!initial?.id || deleting) return
    if (!confirm('Delete this memento?')) return
    setDeleting(true)
    await fetch('/api/admin/mementos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: initial.id }),
    })
    router.push('/admin/archive')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-8">
      {/* Kind */}
      <Field label="Art">
        <div className="flex flex-wrap gap-2">
          {KINDS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('kind', value)}
              className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase transition-colors ${
                values.kind === value
                  ? 'border border-white/40 text-spark'
                  : 'border border-white/10 text-mist hover:border-white/25 hover:text-ash'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Image upload */}
      <Field label="Bild">
        <div className="flex flex-col gap-3">
          {values.image_url && (
            <div className="relative h-40 w-40 overflow-hidden">
              <Image
                src={values.image_url}
                alt="Vorschau"
                fill
                className="object-cover grayscale"
                unoptimized
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash disabled:opacity-40"
            >
              {uploading ? 'Uploading...' : values.image_url ? 'Ersetzen' : 'Hochladen'}
            </button>
            {values.image_url && (
              <button
                type="button"
                onClick={() => set('image_url', '')}
                className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          {uploadError && (
            <p className="font-sans text-[11px] text-white/40">{uploadError}</p>
          )}
        </div>
      </Field>

      {/* Caption */}
      <Field label="Caption">
        <input
          type="text"
          value={values.caption}
          onChange={(e) => set('caption', e.target.value)}
          placeholder="Kurze Bildunterschrift"
          className={inputClass}
        />
      </Field>

      {/* Body */}
      <Field label="Body text">
        <textarea
          value={values.body}
          onChange={(e) => set('body', e.target.value)}
          rows={4}
          placeholder={values.kind === 'strava' ? 'Distance · Pace · Elevation' : 'Longer text, description...'}
          className={`${inputClass} resize-y`}
        />
      </Field>

      {/* Date label */}
      <Field label="Date label">
        <input
          type="text"
          value={values.date_label}
          onChange={(e) => set('date_label', e.target.value)}
          placeholder="z.B. Mai '25"
          className={inputClass}
        />
      </Field>

      {/* Event link */}
      <Field label="Event (optional)">
        <select
          value={values.event_id}
          onChange={(e) => set('event_id', e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">— kein Event —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </Field>

      {/* Visibility */}
      <Field label="Sichtbarkeit">
        <button
          type="button"
          onClick={() => set('is_visible', !values.is_visible)}
          className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase transition-colors ${
            values.is_visible ? 'text-spark' : 'text-mist'
          }`}
        >
          <span
            className={`h-4 w-7 rounded-full border transition-colors ${
              values.is_visible ? 'border-spark bg-spark/20' : 'border-white/20 bg-transparent'
            }`}
          />
          {values.is_visible ? 'Sichtbar' : 'Versteckt'}
        </button>
      </Field>

      {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-6 border-t border-white/8 pt-6">
        <button
          type="submit"
          disabled={loading || uploading}
          className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {loading ? '...' : isEdit ? 'Save →' : 'Create →'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={deleteMemento}
            disabled={deleting}
            className="ml-auto font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50 disabled:opacity-30"
          >
            {deleting ? '...' : 'Delete'}
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
