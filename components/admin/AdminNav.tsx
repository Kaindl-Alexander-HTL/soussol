'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/archive', label: 'Archive' },
  { href: '/admin/settings', label: 'Schrift & Texte' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <nav className="flex items-center gap-10 border-b border-white/8 px-8 py-6 sm:px-14 lg:px-20">
      <span className="font-serif text-[10px] tracking-[0.35em] text-mist uppercase">
        SOUS SOL
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-x-9 gap-y-3">
        {links.map(({ href, label }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`font-sans text-[11px] tracking-[0.2em] uppercase transition-colors ${
                active ? 'text-spark' : 'text-mist hover:text-ash'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
      <button
        onClick={logout}
        className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
      >
        Logout
      </button>
    </nav>
  )
}
