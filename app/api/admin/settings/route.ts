import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.object({
  key: z.enum([
    'manifest',
    'instagram_url',
    'strava_club_url',
    'contact_email',
    // Schrift & Texte, die Tim selbst pflegt
    'font_theme',
    'apply_headline',
    'apply_intro',
    'not_found_text',
    'footer_credit',
  ]),
  value: z.unknown(),
})

export async function PATCH(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { key, value } = parsed.data

  // upsert statt update: die neuen Keys (Schrift, Texte) existieren als Zeile
  // noch nicht, sollen aber ohne separate Migration anlegbar sein.
  const { error } = await supabaseAdmin
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
