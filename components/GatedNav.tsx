'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export function GatedNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function leaveSession() {
    await fetch('/api/leave', { method: 'POST' })
    router.push('/')
  }

  const isArchive  = pathname.startsWith('/archive') || pathname.startsWith('/galerie')
  const isUpcoming = pathname.startsWith('/upcoming') || pathname.startsWith('/event')

  return (
    <>
      {/* ── Desktop Top Nav ────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-ink/80 px-6 py-5 backdrop-blur-sm sm:px-12 md:px-20 lg:px-32">
        <Link
          href="/archive"
          className="font-serif text-[11px] tracking-[0.4em] text-paper/70 uppercase transition-colors hover:text-paper"
        >
          SOUS SOL
        </Link>

        {/* Desktop links — hidden on mobile */}
        <nav className="hidden sm:flex items-center gap-8">
          <Link
            href="/archive"
            className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
              isArchive ? 'text-paper' : 'text-smoke hover:text-ash'
            }`}
          >
            Archive
          </Link>
          <Link
            href="/upcoming"
            className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
              isUpcoming ? 'text-paper' : 'text-smoke hover:text-ash'
            }`}
          >
            Upcoming
          </Link>
          <button
            onClick={leaveSession}
            className="font-sans text-[10px] tracking-[0.3em] text-white/20 uppercase transition-colors hover:text-white/50"
          >
            Leave
          </button>
        </nav>
      </header>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center sm:hidden bg-ink/90 backdrop-blur-md border-t border-white/[0.06]">
        <Link
          href="/archive"
          className={`flex flex-1 flex-col items-center gap-1 py-4 transition-colors ${
            isArchive ? 'text-paper' : 'text-white/30'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="10" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="1" y="10" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
            <rect x="10" y="10" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <span className="font-sans text-[8px] tracking-[0.2em] uppercase">Archive</span>
        </Link>

        <Link
          href="/upcoming"
          className={`flex flex-1 flex-col items-center gap-1 py-4 transition-colors ${
            isUpcoming ? 'text-paper' : 'text-white/30'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="4" width="16" height="13" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="1" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="13" y1="1" x2="13" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="font-sans text-[8px] tracking-[0.2em] uppercase">Upcoming</span>
        </Link>

        <button
          onClick={leaveSession}
          className="flex flex-1 flex-col items-center gap-1 py-4 text-white/20 transition-colors active:text-white/50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 3H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M12 13l4-4-4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="9" x2="7" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="font-sans text-[8px] tracking-[0.2em] uppercase">Leave</span>
        </button>
      </nav>
    </>
  )
}
