import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminClient } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Admin — SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function AdminDashboard() {
  const supabase = await getAdminClient()
  if (!supabase) redirect('/admin/login')

  const [
    { count: eventCount },
    { count: mementoCount },
    { count: registrationCount },
    { count: memberCount },
    { count: applicationCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'upcoming'),
    supabase.from('mementos').select('*', { count: 'exact', head: true }),
    supabase.from('registrations').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabaseAdmin
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const stats = [
    { label: 'Offene Bewerbungen', value: applicationCount ?? 0, href: '/admin/members' },
    { label: 'Mitglieder', value: memberCount ?? 0, href: '/admin/members' },
    { label: 'Upcoming Events', value: eventCount ?? 0, href: '/admin/events' },
    { label: 'Anmeldungen', value: registrationCount ?? 0, href: '/admin/events' },
    { label: 'Mementos', value: mementoCount ?? 0, href: '/admin/archive' },
  ]

  return (
    <div className="max-w-6xl">
      <h1 className="mb-16 font-serif italic text-4xl text-paper">Dashboard</h1>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="group border border-white/8 p-8 transition-colors hover:border-white/25"
          >
            <p className="mb-3 font-sans text-[40px] font-light leading-none text-spark">
              {value}
            </p>
            <p className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors group-hover:text-ash">
              {label}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
