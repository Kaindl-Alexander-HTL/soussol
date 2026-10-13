import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normalizeArchiveMediaRef, signMementoMedia } from '@/lib/archive-media'

const kindEnum = z.enum(['polaroid', 'note', 'stamp', 'scan', 'strava', 'other'])

const createSchema = z.object({
  kind: kindEnum.default('polaroid'),
  image_url: z.string().min(1).max(2048).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  body: z.string().nullable().optional(),
  date_label: z.string().max(100).nullable().optional(),
  event_id: z.guid().nullable().optional(),
  is_visible: z.boolean().default(true),
})

const updateSchema = createSchema.partial().extend({
  id: z.guid(),
})

const deleteSchema = z.object({ id: z.guid() })

async function requireAdmin() {
  return getAdminUser()
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const normalizedImage = normalizeArchiveMediaRef(parsed.data.image_url)
  if (parsed.data.image_url && !normalizedImage) {
    return NextResponse.json({ error: 'Ungültige Bildadresse.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('mementos')
    .insert({ ...parsed.data, image_url: normalizedImage })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const [signed] = await signMementoMedia([data])
  return NextResponse.json(signed, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, ...updates } = parsed.data
  if ('image_url' in updates) {
    const normalizedImage = normalizeArchiveMediaRef(updates.image_url)
    if (updates.image_url && !normalizedImage) {
      return NextResponse.json({ error: 'Ungültige Bildadresse.' }, { status: 400 })
    }
    updates.image_url = normalizedImage
  }

  const { data, error } = await supabaseAdmin
    .from('mementos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const [signed] = await signMementoMedia([data])
  return NextResponse.json(signed)
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
