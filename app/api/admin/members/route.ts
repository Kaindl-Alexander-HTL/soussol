import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateAccessToken } from '@/lib/member'
import { sendMemberInvite } from '@/lib/email'

const roleEnum = z.enum(['surrounding', 'outer', 'inner'])

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  role: roleEnum,
})

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  role: roleEnum.optional(),
  is_active: z.boolean().optional(),
  action: z.enum(['rotate', 'resend']).optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
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
      return NextResponse.json({ error: 'E-Mail bereits als Mitglied vorhanden.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (hasArchiveRole(data.role)) {
    sendMemberInvite({ name: data.name, email: data.email, accessToken: data.access_token }).catch(() => {})
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

  // Rotate: neuen Token erzeugen, speichern, Invite mit neuem Token senden.
  if (action === 'rotate') {
    const access_token = generateAccessToken()
    const { data, error } = await supabaseAdmin
      .from('members')
      .update({ access_token })
      .eq('id', id)
      .select('name, email, role, access_token')
      .single()
    if (error || !data) return NextResponse.json({ error: 'Fehler beim Rotieren.' }, { status: 500 })
    if (hasArchiveRole(data.role)) {
      sendMemberInvite({ name: data.name, email: data.email, accessToken: data.access_token }).catch(() => {})
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
    if (error || !data) return NextResponse.json({ error: 'Mitglied nicht gefunden.' }, { status: 404 })
    if (!hasArchiveRole(data.role)) {
      return NextResponse.json({ error: 'Nur outer/inner erhalten Zugang.' }, { status: 409 })
    }
    sendMemberInvite({ name: data.name, email: data.email, accessToken: data.access_token }).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  // Normales Update (name/email/role/is_active).
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Keine Änderung angegeben.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('members').update(fields).eq('id', id)
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'E-Mail bereits vergeben.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
