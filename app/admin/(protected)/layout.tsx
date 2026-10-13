import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAdminUser()

  if (!user) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-ink">
      <AdminNav />
      <div className="px-6 py-8 sm:px-10">{children}</div>
    </div>
  )
}
