'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function GatedNav() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-ink/80 px-6 py-5 backdrop-blur-sm sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/archive"
        className="font-serif text-[11px] tracking-[0.4em] text-mist uppercase transition-colors hover:text-ash"
      >
        SOUS SOL
      </Link>
      <nav className="flex items-center gap-8">
        <Link
          href="/archive"
          className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
            pathname.startsWith('/archive') ? 'text-spark' : 'text-mist hover:text-ash'
          }`}
        >
          Archive
        </Link>
        <Link
          href="/upcoming"
          className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
            pathname.startsWith('/upcoming') || pathname.startsWith('/event')
              ? 'text-spark'
              : 'text-mist hover:text-ash'
          }`}
        >
          Upcoming
        </Link>
      </nav>
    </header>
  )
}
