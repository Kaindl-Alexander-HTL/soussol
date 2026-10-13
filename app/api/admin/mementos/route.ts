import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

const kindEnum = z.enum(['polaroid', 'note', 'stamp', 'scan', 'strava', 'other'])

const createSchema = z.object({
  kind: kindEnum.default('polaroid'),
  image_url: z.string().url().nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  body: z.string().nullable().optional(),
  date_label: z.string().max(100).nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  is_visible: z.boolean().default(true),
})

const updateSchema = createSchema.partial().extend({
  id: z.string().uuid(),
})

const deleteSchema = z.object({ id: z.string().uuid() })

async function requireAdmin() {
  return getAdminUser()
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('mementos')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, ...updates } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('mementos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('mementos')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
