'use client'

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
        body: JSON.stringify({ code: code.trim() }),
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
          aria-label="Zugangscode eingeben"
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

      {/* Back link — barely there */}
      <a
        href="/"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 font-sans text-[10px] tracking-[0.3em] text-white/15 uppercase transition-colors hover:text-white/30"
      >
        ← Zurück
      </a>
    </main>
  )
}
