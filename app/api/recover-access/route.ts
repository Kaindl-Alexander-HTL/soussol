import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendMemberAccessReminder } from '@/lib/email'

const schema = z.object({
  email: z.string().email().max(200),
})

// Einfache Drossel gegen stumpfes Hämmern: pro Adresse höchstens alle 2 Minuten
// eine Mail. Der Speicher ist prozesslokal — bei mehreren Instanzen greift das
// nur pro Instanz. Als harte Grenze dient ohnehin das Limit bei Resend; das
// hier verhindert, dass jemand einem Mitglied im Sekundentakt Mails schickt.
const lastSent = new Map<string, number>()
const THROTTLE_MS = 2 * 60 * 1000

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  // Immer dieselbe Antwort — auch bei ungültiger Eingabe. Sonst ließe sich über
  // die Fehlermeldungen herausfinden, welche Adressen Mitglieder sind.
  const ok = NextResponse.json({ ok: true })
  if (!parsed.success) return ok

  const email = parsed.data.email.toLowerCase().trim()

  const now = Date.now()
  const previous = lastSent.get(email)
  if (previous && now - previous < THROTTLE_MS) return ok
  lastSent.set(email, now)

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('name, email, role, access_token, is_active')
    .ilike('email', email)
    .single()

  // Kein Mitglied, deaktiviert oder ohne Archivzugang: still aussteigen.
  if (
    !member ||
    !member.is_active ||
    (member.role !== 'outer' && member.role !== 'inner')
  ) {
    return ok
  }

  await sendMemberAccessReminder({
    name: member.name,
    email: member.email,
    accessToken: member.access_token,
  }).catch((e) =>
    console.error('[recover-access] Mail fehlgeschlagen:', e?.message ?? e)
  )

  return ok
}
