'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

export function ApplicationForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading') return
    setState('loading')
    setErrorMsg('')

    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        message: message.trim() || undefined,
      }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(typeof json.error === 'string' ? json.error : 'Etwas ist schiefgelaufen.')
      setState('error')
      return
    }

    setState('success')
  }

  if (state === 'success') {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="opsz-body font-serif italic text-2xl text-paper">Danke.</p>
        <p className="mt-3 font-sans text-sm font-light text-mist">
          Wir haben deine Bewerbung. Du hörst von uns.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/8 pt-12">
      <p className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">Bewerben</p>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-7">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Name *</label>
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
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">E-Mail *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Erzähl uns von dir
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            disabled={state === 'loading'}
            className={`${inputClass} resize-y`}
            placeholder="Wie bist du zu SOUS SOL gekommen?"
          />
        </div>

        {errorMsg && <p className="font-sans text-[11px] text-white/40">{errorMsg}</p>}

        <button
          type="submit"
          disabled={state === 'loading' || !name.trim() || !email.trim()}
          className="text-left font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {state === 'loading' ? '...' : 'Absenden →'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
