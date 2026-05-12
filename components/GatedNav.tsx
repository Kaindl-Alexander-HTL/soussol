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

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-ink/80 px-6 py-5 backdrop-blur-sm sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/archive"
        className="font-serif text-[11px] tracking-[0.4em] text-paper/70 uppercase transition-colors hover:text-paper"
      >
        SOUS SOL
      </Link>
      <nav className="flex items-center gap-8">
        <Link
          href="/archive"
          className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
            pathname.startsWith('/archive') ? 'text-paper' : 'text-smoke hover:text-ash'
          }`}
        >
          Archive
        </Link>
        <Link
          href="/upcoming"
          className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
            pathname.startsWith('/upcoming') || pathname.startsWith('/event')
              ? 'text-paper'
              : 'text-smoke hover:text-ash'
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
  )
}
