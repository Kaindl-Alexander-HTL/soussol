'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

export function LandingPage({
  paragraphs,
  instagramUrl,
}: {
  paragraphs: string[]
  instagramUrl: string
}) {
  // Stagger timing
  const paraDelay = (i: number) => 0.25 + i * 0.12
  const lastParaEnd = paraDelay(paragraphs.length - 1) + 0.6
  const enterDelay = lastParaEnd + 0.15
  const footerDelay = enterDelay + 0.2

  return (
    <main className="relative flex min-h-screen flex-col bg-ink px-6 pb-10 pt-20 sm:px-12 md:px-20 lg:px-32">
      {/* Wordmark — first to appear */}
      <motion.header
        className="mb-20 sm:mb-32"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease }}
      >
        <span
          className="font-serif text-[11px] font-light tracking-[0.4em] text-mist uppercase"
          aria-label="SOUS SOL"
        >
          SOUS SOL
        </span>
      </motion.header>

      {/* Manifest paragraphs — staggered */}
      <article className="flex-1 max-w-2xl">
        {paragraphs.map((para, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: paraDelay(i), ease }}
            className={`opsz-body font-serif italic text-paper leading-[1.55] mb-7 last:mb-0 ${
              i === 0
                ? 'text-[clamp(1.75rem,4vw,3rem)]'
                : 'text-[clamp(1.1rem,2.2vw,1.6rem)]'
            }`}
          >
            {para}
          </motion.p>
        ))}
      </article>

      {/* Enter CTA — last content to appear */}
      <motion.div
        className="mt-20 sm:mt-28"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: enterDelay, ease }}
      >
        <Link
          href="/enter"
          className="group inline-flex items-center gap-3 font-sans text-[11px] font-light tracking-[0.35em] text-ash uppercase transition-colors duration-500 hover:text-spark"
        >
          <span>Enter</span>
          <span
            className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      </motion.div>

      {/* Footer — very last */}
      <motion.footer
        className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: footerDelay }}
      >
        <nav className="flex gap-x-6" aria-label="Legal">
          <Link
            href="/impressum"
            className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
          >
            Datenschutz
          </Link>
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
            >
              Instagram
            </a>
          )}
        </nav>
        <span className="ml-auto font-sans text-[10px] tracking-[0.2em] text-white/15 uppercase">
          Made by Studioaix
        </span>
      </motion.footer>
    </main>
  )
}
