import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'
import { CodeGateForm } from '@/components/CodeGateForm'

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

  const member = await getCurrentMember()
  if (hasArchiveAccess(member)) {
    redirect(next ?? '/archive')
  }

  return <CodeGateForm next={next ?? '/archive'} />
}
