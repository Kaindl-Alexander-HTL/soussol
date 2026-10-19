import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { MembersManager } from '@/components/admin/MembersManager'
import type { Member, Application } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Members — SOUS SOL Admin',
  robots: { index: false, follow: false },
}

export default async function MembersPage() {
  // Beide Listen neueste zuerst. Der Name als zweites Kriterium hält die
  // Reihenfolge stabil — die Seed-Mitglieder wurden in einem einzigen Insert
  // angelegt und haben deshalb exakt denselben Zeitstempel.
  const [{ data: members }, { data: applications }] = await Promise.all([
    supabaseAdmin
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-3xl">
      <h1 className="mb-16 font-serif italic text-4xl text-paper">Members</h1>
      <MembersManager
        initialMembers={(members ?? []) as Member[]}
        initialApplications={(applications ?? []) as Application[]}
      />
    </div>
  )
}
