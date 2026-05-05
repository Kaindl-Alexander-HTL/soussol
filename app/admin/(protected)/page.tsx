import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Admin — SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [{ count: eventCount }, { count: mementoCount }, { count: registrationCount }] =
    await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'upcoming'),
      supabase.from('mementos').select('*', { count: 'exact', head: true }),
      supabase.from('registrations').select('*', { count: 'exact', head: true }),
    ])

  const stats = [
    { label: 'Upcoming Events', value: eventCount ?? 0 },
    { label: 'Mementos', value: mementoCount ?? 0 },
    { label: 'Registrierungen', value: registrationCount ?? 0 },
  ]

  return (
    <div className="max-w-2xl">
      <h1 className="mb-10 font-serif italic text-3xl text-spark">Dashboard</h1>

      <div className="mb-12 grid grid-cols-3 gap-6">
        {stats.map(({ label, value }) => (
          <div key={label} className="border border-white/8 p-5">
            <p className="mb-1 font-sans text-[28px] font-light text-spark">{value}</p>
            <p className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p className="mb-2 font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
          Schnellzugriff
        </p>
        {[
          { href: '/admin/events/new', label: 'Neuer Event →' },
          { href: '/admin/archive/new', label: 'Memento hochladen →' },
          { href: '/admin/settings', label: 'Code rotieren →' },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="font-sans text-sm font-light text-ash transition-colors hover:text-spark"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
