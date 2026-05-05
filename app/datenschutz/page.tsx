import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutz — SOUS SOL',
  robots: { index: false, follow: false },
}

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-ink px-6 pb-24 pt-16 sm:px-12 md:px-20 lg:px-32">
      <Link
        href="/"
        className="mb-12 inline-block font-sans text-[10px] tracking-[0.25em] text-mist uppercase transition-colors hover:text-ash"
      >
        ← SOUS SOL
      </Link>

      <h1 className="mb-12 font-serif italic text-[clamp(2rem,5vw,3.5rem)] leading-tight text-spark">
        Datenschutzerklärung
      </h1>

      <div className="max-w-lg space-y-10 font-sans text-sm font-light leading-relaxed text-ash">

        {/* Verantwortlicher */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Verantwortlicher
          </h2>
          <p>
            Tim Tanzer<br />
            E-Mail: <a href="mailto:tim@sous.club" className="text-spark underline underline-offset-2">tim@sous.club</a>
          </p>
          <p>
            Für Auskünfte, Berichtigungen oder Löschungen deiner gespeicherten Daten wende
            dich direkt per E-Mail an uns.
          </p>
        </section>

        {/* Welche Daten */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Welche Daten wir verarbeiten
          </h2>
          <p>
            Wir erheben nur Daten, die du uns aktiv mitteilst. Bei Anmeldung zu einem Event
            speichern wir:
          </p>
          <ul className="space-y-1 pl-4">
            <li className="list-disc list-outside text-ash">
              Deinen Namen (Vor- und Nachname oder Spitzname)
            </li>
            <li className="list-disc list-outside text-ash">
              Deinen Instagram-Handle
            </li>
            <li className="list-disc list-outside text-ash">
              Optional: eine kurze Notiz
            </li>
            <li className="list-disc list-outside text-ash">
              Zeitpunkt der Anmeldung
            </li>
          </ul>
          <p>
            Eine E-Mail-Adresse oder andere Kontaktdaten werden nicht erhoben.
          </p>
        </section>

        {/* Zweck */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Zweck der Verarbeitung
          </h2>
          <p>
            Die Daten dienen ausschließlich der Organisation des jeweiligen Events
            (Teilnehmerliste, Kapazitätsplanung). Sie werden nicht an Dritte weitergegeben
            und nicht für Werbezwecke genutzt.
          </p>
          <p>
            Rechtsgrundlage: berechtigtes Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO
            (interne Veranstaltungsorganisation).
          </p>
        </section>

        {/* Speicherdauer */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Speicherdauer
          </h2>
          <p>
            Anmeldedaten werden nach Durchführung des Events sowie einer Nachfrist von
            30 Tagen gelöscht.
          </p>
        </section>

        {/* Cookies */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Cookies
          </h2>
          <p>
            Diese Website setzt genau zwei Arten von Cookies:
          </p>
          <ul className="space-y-2 pl-4">
            <li className="list-disc list-outside text-ash">
              <span className="text-spark">sous_pass</span> — ein technisch notwendiges
              Zugangs-Cookie. Es enthält einen signierten Zugangscode und ermöglicht den
              Zugriff auf den geschützten Bereich. Keine personenbezogenen Daten.
              Läuft mit dem Code-Ablaufdatum automatisch ab.
            </li>
            <li className="list-disc list-outside text-ash">
              <span className="text-spark">Supabase Auth-Cookie</span> — nur im Admin-Bereich
              für Tim. Verwaltet die Login-Session.
            </li>
          </ul>
          <p>
            Es gibt keinen Cookie-Banner, da wir kein Tracking, keine Analytics und keine
            Werbe-Cookies einsetzen.
          </p>
        </section>

        {/* Hosting */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Hosting & Infrastruktur
          </h2>
          <p>
            <span className="text-spark">Vercel Inc.</span> (San Francisco, USA) —
            Webhosting. Bei Seitenaufruf werden technische Verbindungsdaten (IP-Adresse,
            Zeitstempel) kurzfristig in Server-Logs erfasst. Vercel verarbeitet Daten
            auf Basis von Standardvertragsklauseln (SCCs) gemäß Art. 46 DSGVO.
            Mehr: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">vercel.com/legal/privacy-policy</a>
          </p>
          <p>
            <span className="text-spark">Supabase Inc.</span> — Datenbank. Instanz läuft
            in der Region <strong className="text-spark font-normal">EU-West (Frankfurt, Deutschland)</strong>,
            damit innerhalb der EU. Mehr: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">supabase.com/privacy</a>
          </p>
        </section>

        {/* Kein Tracking */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Tracking & Analytics
          </h2>
          <p>
            Wir setzen keinerlei Tracking-Tools, Analytics-Dienste oder Social-Media-Pixel ein.
            Dein Besuch wird nicht profiliert und nicht an Werbenetze weitergegeben.
          </p>
        </section>

        {/* Rechte */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Deine Rechte
          </h2>
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
            Verarbeitung sowie Datenübertragbarkeit (Art. 15–20 DSGVO). Wende dich dazu
            an <a href="mailto:tim@sous.club" className="text-spark underline underline-offset-2">tim@sous.club</a>.
          </p>
          <p>
            Du hast außerdem das Recht, Beschwerde bei der österreichischen Datenschutzbehörde
            einzulegen: <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">dsb.gv.at</a>
          </p>
        </section>

        <section className="border-t border-white/5 pt-8">
          <p className="font-sans text-[10px] text-white/20">
            Stand: Mai 2026 · Vor Live-Schaltung rechtlich prüfen lassen.
          </p>
        </section>

      </div>
    </main>
  )
}
