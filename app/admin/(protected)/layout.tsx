import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Prüft nicht nur "eingeloggt", sondern auch "in ADMIN_EMAILS".
  const user = await getAdminUser()

  if (!user) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-ink">
      <AdminNav />
      <div className="px-8 py-14 sm:px-14 lg:px-20 lg:py-20">{children}</div>
    </div>
  )
}
