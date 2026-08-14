import { PublicNav } from '@/components/PublicNav'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const member = await getCurrentMember()

  return (
    <div className="min-h-screen bg-ink">
      <PublicNav isMember={hasArchiveAccess(member)} memberName={member?.name ?? ''} />
      <main>{children}</main>
    </div>
  )
}
