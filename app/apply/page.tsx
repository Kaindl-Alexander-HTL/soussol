import type { Metadata } from 'next'
import { PublicNav } from '@/components/PublicNav'
import { ApplicationForm } from '@/components/ApplicationForm'

export const metadata: Metadata = {
  title: 'Bewerben — SOUS SOL',
  robots: { index: false, follow: false },
}

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-ink">
      <PublicNav />
      <div className="px-6 pb-32 pt-28 sm:px-12 md:px-20 lg:px-32">
        <h1 className="opsz-display mb-6 font-serif italic text-[clamp(1.8rem,6vw,4rem)] leading-[1.1] text-paper">
          Outer Circle
        </h1>
        <p className="mb-4 max-w-xl font-sans text-sm font-light leading-relaxed text-ash">
          Der Outer Circle ist für Leute mit Drive. Mit Passion. Für die, die wirklich dabei sind.
          Erzähl uns kurz von dir — Tim entscheidet, wer reinkommt.
        </p>
        <ApplicationForm />
      </div>
    </div>
  )
}
