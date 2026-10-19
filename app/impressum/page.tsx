import type { Metadata } from 'next'
import Link from 'next/link'
import { getLegalContactEmail } from '@/lib/legal-contact'
import { LEGAL_ADDRESS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Legal notice — SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function LegalNoticePage() {
  const contactEmail = await getLegalContactEmail()
  return (
    <main className="min-h-screen bg-ink px-6 pb-24 pt-16 sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/"
        className="mb-12 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← SOUS SOL
      </Link>

      <h1 className="mb-12 font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-spark">
        Legal notice
      </h1>

      <div className="max-w-lg space-y-10 font-sans text-sm font-light leading-relaxed text-ash">

        {/* Site owner */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Site owner & operator
          </h2>
          <p>
            {LEGAL_ADDRESS.name}<br />
            {LEGAL_ADDRESS.street}<br />
            {LEGAL_ADDRESS.postalCode} {LEGAL_ADDRESS.city}<br />
            {LEGAL_ADDRESS.country}
          </p>
          {contactEmail && <p>
            Email: <a href={`mailto:${contactEmail}`} className="text-spark underline underline-offset-2">{contactEmail}</a>
          </p>}
        </section>

        {/* Art des Mediums */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Nature of this website
          </h2>
          <p>
            SOUS SOL is a private initiative, not a registered association, company, or
            commercial offering. This website supports communication within a sports community
            in Linz.
          </p>
        </section>

        {/* ECG */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Editorial purpose
          </h2>
          <p>
            Documenting and organising sports events for a private community. No commercial
            purpose.
          </p>
        </section>

        {/* Haftung */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            External links
          </h2>
          <p>
            Despite careful review, we accept no liability for the content of external links.
            The operators of linked websites are solely responsible for their content.
          </p>
        </section>

      </div>
    </main>
  )
}
