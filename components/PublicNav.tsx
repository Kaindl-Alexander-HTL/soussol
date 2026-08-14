'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MemberMenu } from '@/components/MemberMenu'

export function PublicNav({
  isMember = false,
  memberName = '',
}: {
  isMember?: boolean
  memberName?: string
}) {
  const pathname = usePathname()


  const isEvents = pathname.startsWith('/upcoming') || pathname.startsWith('/event')

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-ink/80 px-6 py-5 backdrop-blur-sm sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/"
        className="font-serif text-[11px] tracking-[0.4em] text-paper/70 uppercase transition-colors hover:text-paper"
      >
        SOUS SOL
      </Link>

      <nav className="flex items-center gap-6 sm:gap-8">
        <Link
          href="/upcoming"
          className={`font-sans text-[10px] tracking-[0.3em] uppercase transition-colors ${
            isEvents ? 'text-paper' : 'text-smoke hover:text-ash'
          }`}
        >
          Events
        </Link>

        {/* Mitglieder kommen von den öffentlichen Seiten zurück ins Archiv und
            sehen, als wer sie unterwegs sind. Gäste sehen den Weg hinein. */}
        {isMember ? (
          <>
            <Link
              href="/archive"
              className="font-sans text-[10px] tracking-[0.3em] text-spark uppercase transition-opacity hover:opacity-70"
            >
              Archive
            </Link>
            <MemberMenu name={memberName} />
          </>
        ) : null}
      </nav>
    </header>
  )
}
