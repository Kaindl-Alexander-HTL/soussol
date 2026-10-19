import { NextRequest, NextResponse, after } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateAccessToken } from '@/lib/member'
import { sendMemberInvite, sendMemberAccessRenewed } from '@/lib/email'

const roleEnum = z.enum(['surrounding', 'outer', 'inner'])

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  role: roleEnum,
})

const patchSchema = z.object({
  id: z.guid(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
  action: z.enum(['renew', 'resend']).optional(),
})

async function requireAdmin() {
  return getAdminUser()
}

function hasArchiveRole(role: string): boolean {
  return role === 'outer' || role === 'inner'
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, email, role } = parsed.data
  const access_token = generateAccessToken()

  const { data, error } = await supabaseAdmin
    .from('members')
    .insert({ name, email, role, access_token, is_active: true })
    .select('id, name, email, role, access_token')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email already belongs to a member.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (hasArchiveRole(data.role)) {
    // after(): sonst friert Vercel die Funktion nach der Antwort ein, bevor die
    // Mail raus ist.
    after(() =>
      sendMemberInvite({ name: data.name, email: data.email, accessToken: data.access_token }).catch((e) =>
        console.error('[members] Invite email for new member failed:', e?.message ?? e)
      )
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, action, ...fields } = parsed.data

  // Zugang erneuern: neuen Token erzeugen und per Mail schicken. Der alte
  // Link/Code wird dadurch ungültig — dafür gibt es eine eigene Mail, nicht
  // die Willkommens-Mail.
  if (action === 'renew') {
    const access_token = generateAccessToken()
    const { data, error } = await supabaseAdmin
      .from('members')
      .update({ access_token })
      .eq('id', id)
      .select('name, email, role, access_token')
      .single()
    if (error || !data) return NextResponse.json({ error: 'Access could not be renewed.' }, { status: 500 })
    if (hasArchiveRole(data.role)) {
      after(() =>
        sendMemberAccessRenewed({ name: data.name, email: data.email, accessToken: data.access_token }).catch((e) =>
          console.error('[members] New access email failed:', e?.message ?? e)
        )
      )
    }
    return NextResponse.json({ ok: true })
  }

  // Resend: aktuellen Token erneut per Mail schicken.
  if (action === 'resend') {
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('name, email, role, access_token')
      .eq('id', id)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    if (!hasArchiveRole(data.role)) {
      return NextResponse.json({ error: 'Only outer and inner members receive access.' }, { status: 409 })
    }
    after(() =>
      sendMemberInvite({ name: data.name, email: data.email, accessToken: data.access_token }).catch((e) =>
        console.error('[members] Invite-Mail (erneut senden) fehlgeschlagen:', e?.message ?? e)
      )
    )
    return NextResponse.json({ ok: true })
  }

  // Normales Update (name/email/role/is_active).
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('members').update(fields).eq('id', id)
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
