'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { publicSiteUrl } from '@/lib/public-site-url'

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 disabled:opacity-40'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, window.location.origin)}/admin/reset-password`,
    })

    // Nach außen bleibt die Meldung immer gleich — sonst verrät die Seite,
    // welche Adressen einen Zugang haben. Nur das Rate-Limit wird benannt,
    // weil "keine Mail gekommen" sonst nicht diagnostizierbar ist.
    if (resetError) {
      console.error('[reset] Anfrage fehlgeschlagen:', resetError.message)
      if (resetError.message.toLowerCase().includes('rate limit')) {
        setError('Zu viele Anfragen. Bitte in etwa einer Stunde erneut versuchen.')
        setLoading(false)
        return
      }
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <p className="mb-12 font-serif text-[11px] tracking-[0.4em] text-mist uppercase">
          <Link href="/" className="transition-colors hover:text-ash">SOUS SOL</Link> — Admin
        </p>

        {sent ? (
          <div className="flex flex-col gap-6">
            <h1 className="font-serif italic text-2xl text-paper">Unterwegs.</h1>
            <p className="font-sans text-[12px] font-light leading-relaxed text-mist">
              Falls es zu dieser Adresse einen Zugang gibt, liegt gleich ein Link im
              Postfach. Er führt direkt auf die Seite, wo du ein neues Passwort setzt.
            </p>
            <Link
              href="/admin/login"
              className="self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark"
            >
              Zum Login →
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <h1 className="font-serif italic text-2xl text-paper">Passwort vergessen</h1>
            <p className="-mt-2 font-sans text-[12px] font-light leading-relaxed text-mist">
              Trag deine Adresse ein — wir schicken dir einen Link zum Zurücksetzen.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                disabled={loading}
                className={inputClass}
              />
            </div>

            {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-2 self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
            >
              {loading ? '...' : 'Link schicken →'}
            </button>

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <Link
                href="/admin/login"
                className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
              >
                ← Zurück zum Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
