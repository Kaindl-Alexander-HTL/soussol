import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ApplicationForm } from '@/components/ApplicationForm'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'
import { getSettings, text } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Apply — SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function ApplyPage() {
  const member = await getCurrentMember()
  const isMember = hasArchiveAccess(member)

  const settings = await getSettings(['apply_headline', 'apply_intro'])
  const headline = text(settings, 'apply_headline', 'Outer Circle')
  const intro = text(
    settings,
    'apply_intro',
    'The Outer Circle is for people with drive. With passion. For those who truly show up. Tell us a little about yourself — Tim decides who joins.'
  )

  return (
    <div className="min-h-screen bg-ink">
      <PublicNav isMember={isMember} memberName={member?.name ?? ''} />
      <div className="px-6 pb-32 pt-28 sm:px-12 md:px-20 lg:px-32">
        <h1 className="opsz-display mb-6 font-serif italic text-[clamp(1.8rem,6vw,4rem)] leading-[1.1] text-paper">
          {headline}
        </h1>

        {isMember ? (
          <>
            <p className="mb-6 max-w-xl font-sans text-sm font-light leading-relaxed text-ash">
              You’re already in.
            </p>
            <Link
              href="/archive"
              className="font-sans text-[11px] tracking-[0.25em] text-spark uppercase transition-opacity hover:opacity-70"
            >
              Go to the archive →
            </Link>
          </>
        ) : (
          <>
            <p className="mb-4 max-w-xl whitespace-pre-line font-sans text-sm font-light leading-relaxed text-ash">
              {intro}
            </p>
            <ApplicationForm />

            {/* Wer schon einen Zugangscode hat, soll sich nicht bewerben müssen. */}
            <div className="mt-14 border-t border-white/[0.06] pt-6">
              <p className="font-sans text-[11px] font-light leading-relaxed text-mist">
                Already a member?{' '}
                <Link
                  href="/enter"
                  className="tracking-[0.15em] text-ash uppercase transition-colors hover:text-paper"
                >
                  Enter with a code →
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
