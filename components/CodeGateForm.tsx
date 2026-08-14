'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'

function safeRedirect(next: string): string {
  const allowed = ['/archive', '/upcoming', '/event/']
  if (next && allowed.some((p) => next.startsWith(p))) return next
  return '/archive'
}

export function CodeGateForm({ next }: { next: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // "Zugang verloren": Adresse eintragen, bestehenden Link nochmal zuschicken.
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverSent, setRecoverSent] = useState(false)
  const [recoverLoading, setRecoverLoading] = useState(false)

  const recover = useCallback(async () => {
    if (!recoverEmail.trim() || recoverLoading) return
    setRecoverLoading(true)
    await fetch('/api/recover-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: recoverEmail.trim() }),
    }).catch(() => {})
    setRecoverSent(true)
    setRecoverLoading(false)
  }, [recoverEmail, recoverLoading])

  const triggerShake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }, [])

  const submit = useCallback(async () => {
    if (!code.trim() || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code.trim() }),
      })

      if (res.ok) {
        router.push(safeRedirect(next))
      } else {
        setCode('')
        setLoading(false)
        triggerShake()
        inputRef.current?.focus()
      }
    } catch {
      setLoading(false)
      triggerShake()
    }
  }, [code, loading, next, router, triggerShake])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink">
      <div
        className="flex items-center gap-5 transition-transform"
        style={shaking ? { animation: 'shake 0.45s ease-in-out' } : undefined}
      >
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="——"
          autoComplete="off"
          autoCapitalize="none"
          autoFocus
          spellCheck={false}
          disabled={loading}
          className="w-44 border-b border-white/15 bg-transparent pb-2 text-center font-serif italic text-2xl tracking-widest text-spark placeholder-white/25 outline-none transition-all duration-500 focus:border-white/35 disabled:opacity-40 sm:w-56 sm:text-3xl"
          aria-label="Zugangscode oder Token eingeben"
        />
        <button
          onClick={submit}
          disabled={loading || !code.trim()}
          className="font-sans text-base text-white/25 transition-all duration-300 hover:text-white/70 disabled:opacity-0"
          aria-label="Bestätigen"
        >
          →
        </button>
      </div>

      {/* Zugang verloren — erst auf Klick, damit die Seite karg bleibt */}
      <div className="mt-14 flex min-h-[3.5rem] w-full max-w-xs flex-col items-center px-6">
        {recoverSent ? (
          <p className="text-center font-sans text-[11px] font-light leading-relaxed text-mist">
            Falls es zu dieser Adresse einen Zugang gibt, liegt er gleich im Postfach.
          </p>
        ) : recoverOpen ? (
          <div className="flex w-full items-center gap-3">
            <input
              type="email"
              value={recoverEmail}
              onChange={(e) => setRecoverEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && recover()}
              placeholder="deine@mail.at"
              autoComplete="email"
              autoFocus
              disabled={recoverLoading}
              className="w-full border-b border-white/15 bg-transparent pb-1.5 text-center font-sans text-xs font-light text-ash placeholder-white/20 outline-none transition-colors focus:border-white/35 disabled:opacity-40"
              aria-label="E-Mail-Adresse für den Zugangslink"
            />
            <button
              onClick={recover}
              disabled={recoverLoading || !recoverEmail.trim()}
              className="font-sans text-sm text-white/25 transition-colors hover:text-white/70 disabled:opacity-0"
              aria-label="Zugang schicken"
            >
              →
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRecoverOpen(true)}
            className="font-sans text-[10px] tracking-[0.25em] text-white/15 uppercase transition-colors hover:text-white/35"
          >
            Zugang verloren?
          </button>
        )}
      </div>

      {/* Back link — barely there */}
      <Link
        href="/"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 font-sans text-[10px] tracking-[0.3em] text-white/15 uppercase transition-colors hover:text-white/30"
      >
        ← Zurück
      </Link>
    </main>
  )
}
