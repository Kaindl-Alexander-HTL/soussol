import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/access-cookie'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { GatedNav } from '@/components/GatedNav'

export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sous_pass')?.value

  if (!cookieValue) redirect('/enter')

  const { valid, code } = verifyCookie(cookieValue)
  if (!valid) redirect('/enter')

  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'access_code')
    .single()

  const currentCode = (data?.value as { code: string } | null)?.code
  if (!currentCode || code !== currentCode) redirect('/enter')

  return (
    <div className="min-h-screen bg-ink">
      <GatedNav />
      <main>{children}</main>
    </div>
  )
}
