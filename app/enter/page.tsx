import type { Metadata } from 'next'
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
  return <CodeGateForm next={next ?? '/archive'} />
}
