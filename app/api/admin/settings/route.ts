import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.object({
  key: z.enum(['access_code', 'manifest', 'instagram_url', 'strava_club_url', 'contact_email']),
  value: z.unknown(),
})

export async function PATCH(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { key, value } = parsed.data

  const { error } = await supabaseAdmin
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
