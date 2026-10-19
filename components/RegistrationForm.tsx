'use client'

import { errorMessage } from '@/lib/form-error'
import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'waitlist' | 'error'

export function RegistrationForm({ eventId }: { eventId: string }) {
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [strava, setStrava] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const hasContact = instagram.trim() || strava.trim() || phone.trim() || email.trim()

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
        instagram_handle: instagram.trim() || undefined,
        strava_handle: strava.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(errorMessage(json.error, 'Something went wrong.'))
      setState('error')
      return
    }

    setState(json.is_waitlist ? 'waitlist' : 'success')
  }

  if (state === 'success') {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="opsz-body font-serif italic text-2xl text-paper">You’re in.</p>
        <p className="mt-3 font-sans text-sm font-light text-mist">
          See you there.
        </p>
      </div>
    )
  }

  if (state === 'waitlist') {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="opsz-body font-serif italic text-2xl text-paper">Waitlist.</p>
        <p className="mt-3 font-sans text-sm font-light text-mist">
          You’re on the waitlist. We’ll be in touch if a spot opens up.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/8 pt-12">
      <p className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Sign up
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

        {/* Kontakt — mindestens eines erforderlich */}
        <div className="flex flex-col gap-4">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Contact * <span className="normal-case tracking-normal text-white/20">(at least one)</span>
          </label>

          <div className="flex flex-col gap-px">
            <div className="flex items-center gap-3 border-b border-white/10 py-2 focus-within:border-white/30">
              <span className="w-24 shrink-0 font-sans text-[9px] tracking-[0.2em] text-mist uppercase">Instagram</span>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@handle"
                disabled={state === 'loading'}
                className={inlineInputClass}
              />
            </div>
            <div className="flex items-center gap-3 border-b border-white/10 py-2 focus-within:border-white/30">
              <span className="w-24 shrink-0 font-sans text-[9px] tracking-[0.2em] text-mist uppercase">Strava</span>
              <input
                type="text"
                value={strava}
                onChange={(e) => setStrava(e.target.value)}
                placeholder="Strava name"
                disabled={state === 'loading'}
                className={inlineInputClass}
              />
            </div>
            <div className="flex items-center gap-3 border-b border-white/10 py-2 focus-within:border-white/30">
              <span className="w-24 shrink-0 font-sans text-[9px] tracking-[0.2em] text-mist uppercase">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+43 ..."
                disabled={state === 'loading'}
                className={inlineInputClass}
              />
            </div>
            <div className="flex items-center gap-3 border-b border-white/10 py-2 focus-within:border-white/30">
              <span className="w-24 shrink-0 font-sans text-[9px] tracking-[0.2em] text-mist uppercase">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={state === 'loading'}
                className={inlineInputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Note
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
          disabled={state === 'loading' || !name.trim() || !hasContact}
          className="self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {state === 'loading' ? '...' : 'Sign up →'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full disabled:opacity-40'

const inlineInputClass =
  'flex-1 bg-transparent font-sans text-sm font-light text-spark outline-none placeholder-white/20 disabled:opacity-40'
