import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/access-cookie'
import { supabaseAdmin } from '@/lib/supabase/admin'
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

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sous_pass')?.value

  if (cookieValue) {
    const { valid, code } = verifyCookie(cookieValue)
    if (valid) {
      const { data } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', 'access_code')
        .single()
      const currentCode = (data?.value as { code: string } | null)?.code
      if (currentCode && code === currentCode) {
        redirect(next ?? '/archive')
      }
    }
  }

  return <CodeGateForm next={next ?? '/archive'} />
}
