import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, message } = parsed.data

  const { error } = await supabaseAdmin.from('applications').insert({
    name,
    email,
    message: message ?? null,
  })

  if (error) {
    return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
