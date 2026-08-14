'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Falsche Zugangsdaten.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <p className="mb-12 font-serif text-[11px] tracking-[0.4em] text-mist uppercase">
          SOUS SOL — Admin
        </p>

        <form onSubmit={submit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 disabled:opacity-40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 disabled:opacity-40"
            />
          </div>

          {error && (
            <p className="font-sans text-[11px] text-white/40">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-2 self-start font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
          >
            {loading ? '...' : 'Einloggen →'}
          </button>

          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <Link
              href="/admin/forgot-password"
              className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
            >
              Passwort vergessen?
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
