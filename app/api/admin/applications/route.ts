import { NextRequest, NextResponse, after } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateAccessToken } from '@/lib/member'
import { sendMemberInvite } from '@/lib/email'

const schema = z.object({
  id: z.guid(),
  action: z.enum(['approve', 'reject']),
})

async function requireAdmin() {
  return getAdminUser()
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, action } = parsed.data

  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // approve: Mitglied (outer) anlegen + Invite senden, dann Bewerbung als approved markieren.
  const { data: application, error: appError } = await supabaseAdmin
    .from('applications')
    .select('id, name, email, status')
    .eq('id', id)
    .single()

  if (appError || !application) {
    return NextResponse.json({ error: 'Bewerbung nicht gefunden.' }, { status: 404 })
  }

  const access_token = generateAccessToken()
  const { data: member, error: insertError } = await supabaseAdmin
    .from('members')
    .insert({
      name: application.name,
      email: application.email,
      role: 'outer',
      access_token,
      is_active: true,
    })
    .select('name, email, access_token')
    .single()

  let invite: { name: string; email: string; accessToken: string } | null = null

  if (insertError) {
    if (insertError.code === '23505') {
      // Bereits Mitglied — reaktivieren, vorhandenen Token wiederverwenden.
      const { data: existing } = await supabaseAdmin
        .from('members')
        .update({ is_active: true })
        .eq('email', application.email)
        .select('name, email, access_token')
        .single()
      if (existing) {
        invite = { name: existing.name, email: existing.email, accessToken: existing.access_token }
      }
    } else {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  } else if (member) {
    invite = { name: member.name, email: member.email, accessToken: member.access_token }
  }

  await supabaseAdmin.from('applications').update({ status: 'approved' }).eq('id', id)

  if (invite) {
    // Fehler nicht verschlucken: sonst meldet das Admin-UI "angenommen",
    // während die Einladung nie rausgeht (z.B. Absender-Domain nicht verifiziert).
    // after(): sonst friert Vercel die Funktion nach der Antwort ein, bevor die
    // Mail raus ist.
    const pending = invite
    after(() =>
      sendMemberInvite(pending).catch((e) =>
        console.error('[approve] Invite-Mail fehlgeschlagen:', e?.message ?? e)
      )
    )
  }

  return NextResponse.json({ ok: true })
}
