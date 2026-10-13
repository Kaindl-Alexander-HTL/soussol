import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'
import { CodeGateForm } from '@/components/CodeGateForm'
import { safeAppRedirect } from '@/lib/safe-redirect'

export const metadata: Metadata = {
  title: 'SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const destination = safeAppRedirect(next)

  const member = await getCurrentMember()
  if (hasArchiveAccess(member)) {
    redirect(destination)
  }

  return <CodeGateForm next={destination} />
}
