import { redirect } from 'next/navigation'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'
import { GatedNav } from '@/components/GatedNav'

export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const member = await getCurrentMember()
  if (!hasArchiveAccess(member)) redirect('/enter')

  return (
    <div className="min-h-screen bg-ink">
      <GatedNav />
      <main className="pb-16 sm:pb-0">{children}</main>
    </div>
  )
}
