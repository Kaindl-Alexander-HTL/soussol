'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/archive', label: 'Archive' },
  { href: '/admin/settings', label: 'Settings' },
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
    <nav className="flex items-center gap-6 border-b border-white/8 px-6 py-4 sm:px-10">
      <span className="mr-4 font-serif text-[10px] tracking-[0.35em] text-mist uppercase">
        SOUS SOL
      </span>
      <div className="flex flex-1 items-center gap-5">
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
