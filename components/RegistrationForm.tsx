'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'waitlist' | 'error'

export function RegistrationForm({ eventId }: { eventId: string }) {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading')
    setErrorMsg('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        guest_name: name.trim(),
        instagram_handle: handle.trim(),
        notes: notes.trim() || undefined,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(json.error ?? 'Etwas ist schiefgelaufen.')
      setState('error')
      return
    }

    setState(json.is_waitlist ? 'waitlist' : 'success')
  }

  if (state === 'success') {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="opsz-body font-serif italic text-2xl text-paper">Du bist dabei.</p>
        <p className="mt-3 font-sans text-sm font-light text-mist">
          Bis dann.
        </p>
      </div>
    )
  }

  if (state === 'waitlist') {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="opsz-body font-serif italic text-2xl text-paper">Warteliste.</p>
        <p className="mt-3 font-sans text-sm font-light text-mist">
          Du stehst auf der Warteliste. Wir melden uns wenn ein Platz frei wird.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/8 pt-12">
      <p className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Anmelden
      </p>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-7">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Instagram *
          </label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            placeholder="@handle"
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Notiz
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={state === 'loading'}
            className={`${inputClass} resize-none`}
          />
        </div>

        {state === 'error' && (
          <p className="font-sans text-[11px] text-white/40">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={state === 'loading' || !name.trim() || !handle.trim()}
          className="self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {state === 'loading' ? '...' : 'Anmelden →'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full disabled:opacity-40'
