import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Impressum — SOUS SOL',
  robots: { index: false, follow: false },
}

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-ink px-6 pb-24 pt-16 sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/"
        className="mb-12 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← SOUS SOL
      </Link>

      <h1 className="mb-12 font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-spark">
        Impressum
      </h1>

      <div className="max-w-lg space-y-10 font-sans text-sm font-light leading-relaxed text-ash">

        {/* Medieninhaber */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Medieninhaber & Betreiber
          </h2>
          <p>
            Tim Tanzer<br />
            Mittelpromende 127<br />
            4048 Puchenau<br />
            Österreich
          </p>
          <p>
            E-Mail: <a href="mailto:tim.tobs24@gmail.com" className="text-spark underline underline-offset-2">tim.tobs24@gmail.com</a>
          </p>
        </section>

        {/* Art des Mediums */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Art des Mediums
          </h2>
          <p>
            SOUS SOL ist eine private Initiative und kein eingetragener Verein, kein Unternehmen
            und kein kommerzielles Angebot. Die Website dient der internen Kommunikation
            einer Sportcommunity in Linz.
          </p>
        </section>

        {/* ECG */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Grundlegende Richtung
          </h2>
          <p>
            Dokumentation und Organisation von Sportveranstaltungen einer privaten Community.
            Kein wirtschaftlicher Zweck.
          </p>
        </section>

        {/* Haftung */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Haftungsausschluss
          </h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die
            Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich
            deren Betreiber verantwortlich.
          </p>
        </section>

        {/* Co-Founder */}
        <section className="space-y-1 border-t border-white/5 pt-8">
          <p className="font-sans text-[10px] text-white/20">
            Webdesign & Entwicklung: Moritz Aigner / Studioaix — <a href="https://studioaix.at" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">studioaix.at</a>
          </p>
        </section>

      </div>
    </main>
  )
}
