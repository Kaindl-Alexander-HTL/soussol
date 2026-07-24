import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MembersManager } from '@/components/admin/MembersManager'
import type { Member, Application } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Mitglieder — SOUS SOL Admin',
  robots: { index: false, follow: false },
}

export default async function MembersPage() {
  const [{ data: members }, { data: applications }] = await Promise.all([
    supabaseAdmin
      .from('members')
      .select('*')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="max-w-3xl">
      <h1 className="mb-10 font-serif italic text-3xl text-paper">Mitglieder</h1>
      <MembersManager
        initialMembers={(members ?? []) as Member[]}
        initialApplications={(applications ?? []) as Application[]}
      />
    </div>
  )
}
