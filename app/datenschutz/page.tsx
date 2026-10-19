import type { Metadata } from 'next'
import Link from 'next/link'
import { getLegalContactEmail } from '@/lib/legal-contact'
import { LEGAL_ADDRESS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy policy — SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function PrivacyPolicyPage() {
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
        Privacy policy
      </h1>

      <div className="max-w-lg space-y-10 font-sans text-sm font-light leading-relaxed text-ash">

        {/* Verantwortlicher */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Data controller
          </h2>
          <p>
            {LEGAL_ADDRESS.name}<br />
            {LEGAL_ADDRESS.street}, {LEGAL_ADDRESS.postalCode} {LEGAL_ADDRESS.city}<br />
            {contactEmail && <>Email: <a href={`mailto:${contactEmail}`} className="text-spark underline underline-offset-2">{contactEmail}</a></>}
          </p>
          <p>
            Contact us by email to request access to, correction of, or deletion of your stored data.
          </p>
        </section>

        {/* Welche Daten */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Data we process
          </h2>
          <p>
            We only collect data you actively provide. When you register for an event, we store:
          </p>
          <ul className="space-y-1 pl-4">
            <li className="list-disc list-outside text-ash">
              Your name (full name or nickname)
            </li>
            <li className="list-disc list-outside text-ash">
              Your voluntary contact details (Instagram, Strava, phone, or email)
            </li>
            <li className="list-disc list-outside text-ash">
              Optionally, a short note
            </li>
            <li className="list-disc list-outside text-ash">
              The time of registration
            </li>
          </ul>
          <p>
            For applications, we also store your email address and message.
          </p>
        </section>

        {/* Zweck */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Purpose of processing
          </h2>
          <p>
            We use this data solely to organise the relevant event (participant list and capacity
            planning). We do not share it with third parties or use it for advertising.
          </p>
          <p>
            Legal basis: legitimate interest under Art. 6(1)(f) GDPR (internal event organisation).
          </p>
        </section>

        {/* Speicherdauer */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Retention period
          </h2>
          <p>
            Registration data is deleted after the event and an additional 30-day period.
          </p>
        </section>

        {/* Cookies */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Cookies
          </h2>
          <p>
            This website uses exactly two types of cookies:
          </p>
          <ul className="space-y-2 pl-4">
            <li className="list-disc list-outside text-ash">
              <span className="text-spark">sous_pass</span> — a technically necessary access
              cookie. It contains a signed access code and enables access to the protected area.
              It contains no personal data and expires with the access code.
            </li>
            <li className="list-disc list-outside text-ash">
              <span className="text-spark">Supabase Auth cookie</span> — used only in the admin
              area for Tim to maintain the login session.
            </li>
          </ul>
          <p>
            We do not show a cookie banner because we use no tracking, analytics, or advertising cookies.
          </p>
        </section>

        {/* Hosting */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Hosting & infrastructure
          </h2>
          <p>
            <span className="text-spark">Vercel Inc.</span> (San Francisco, USA) —
            web hosting. When a page is requested, technical connection data (IP address and
            timestamp) may be retained briefly in server logs. Vercel processes data under
            Standard Contractual Clauses pursuant to Art. 46 GDPR. More: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">vercel.com/legal/privacy-policy</a>
          </p>
          <p>
            <span className="text-spark">Supabase Inc.</span> — database. The instance runs in
            <strong className="text-spark font-normal"> EU West (Frankfurt, Germany)</strong>,
            within the EU. More: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">supabase.com/privacy</a>
          </p>
        </section>

        {/* Kein Tracking */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Tracking & Analytics
          </h2>
          <p>
            We use no tracking tools, analytics services, or social-media pixels. Your visit is
            not profiled or shared with advertising networks.
          </p>
        </section>

        {/* Rechte */}
        <section className="space-y-3">
          <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
            Your rights
          </h2>
          <p>
            You have the right to access, correct, delete, restrict processing of, and receive
            your data (Arts. 15–20 GDPR). Contact{' '}
            {contactEmail ? <><a href={`mailto:${contactEmail}`} className="text-spark underline underline-offset-2">{contactEmail}</a>.</> : 'SOUS SOL directly.'}
          </p>
          <p>
            You may also lodge a complaint with the Austrian Data Protection Authority:{' '}
            <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-mist transition-colors">dsb.gv.at</a>
          </p>
        </section>

        <section className="border-t border-white/5 pt-8">
          <p className="font-sans text-[10px] text-white/20">
            Last updated: May 2026
          </p>
        </section>

      </div>
    </main>
  )
}
