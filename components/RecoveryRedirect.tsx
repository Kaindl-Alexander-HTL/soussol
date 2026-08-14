'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Supabase hängt den Recovery-Token als URL-Fragment an und leitet dabei auf
// die in den Projekteinstellungen hinterlegte URL — die nicht immer die
// Reset-Seite ist (Standard ist die Site-URL, also "/"). Landet der Token
// irgendwo anders, passiert dort nichts und der Link wirkt kaputt.
//
// Dieser Wächter fängt das ab: Sieht er ein Fragment mit type=recovery, schickt
// er den Nutzer samt Fragment auf die Reset-Seite. Damit funktioniert der Link
// unabhängig davon, was in Supabase konfiguriert ist.
export function RecoveryRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith('/admin/reset-password')) return

    const hash = window.location.hash
    if (!hash || !hash.includes('type=recovery')) return

    router.replace(`/admin/reset-password${hash}`)
  }, [pathname, router])

  return null
}
