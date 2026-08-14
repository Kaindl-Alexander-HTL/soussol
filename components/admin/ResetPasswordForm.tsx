'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 disabled:opacity-40'

export function ResetPasswordForm() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Supabase hängt den Recovery-Token als URL-Fragment an (#access_token=…).
  // createBrowserClient löst das selbst ein und legt eine Session an; wir warten
  // hier nur darauf, dass sie da ist. Ohne gültigen Token gibt es keine Session
  // — dann ist der Link abgelaufen oder wurde schon benutzt.
  useEffect(() => {
    const supabase = createClient()
    let done = false

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        done = true
        setPhase('ready')
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        done = true
        setPhase('ready')
      } else {
        // Dem SDK kurz Zeit geben, das Fragment zu verarbeiten.
        setTimeout(() => {
          if (!done) setPhase('invalid')
        }, 1500)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    if (password.length < 8) {
      setError('Mindestens 8 Zeichen.')
      return
    }
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setPhase('done')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <p className="mb-12 font-serif text-[11px] tracking-[0.4em] text-mist uppercase">
          SOUS SOL — Admin
        </p>

        {phase === 'checking' && (
          <p className="font-sans text-[11px] tracking-[0.2em] text-mist uppercase">
            Moment...
          </p>
        )}

        {phase === 'invalid' && (
          <div className="flex flex-col gap-6">
            <h1 className="font-serif italic text-2xl text-paper">Link abgelaufen.</h1>
            <p className="font-sans text-[12px] font-light leading-relaxed text-mist">
              Dieser Link wurde bereits benutzt oder ist nicht mehr gültig.
              Fordere auf der Login-Seite einen neuen an.
            </p>
            <Link
              href="/admin/login"
              className="self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
            >
              Zum Login →
            </Link>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col gap-6">
            <h1 className="font-serif italic text-2xl text-paper">Passwort gesetzt.</h1>
            <button
              onClick={() => {
                router.push('/admin')
                router.refresh()
              }}
              className="self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
            >
              Ins Backoffice →
            </button>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
                Neues Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
                Wiederholen
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                className={inputClass}
              />
            </div>

            {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="mt-2 self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
            >
              {loading ? '...' : 'Passwort speichern →'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
