import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normalizeArchiveMediaRef, signGalleryMedia } from '@/lib/archive-media'

const createSchema = z.object({
  memento_id: z.guid(),
  url: z.string().min(1).max(2048),
  caption: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().default(0),
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

  const normalizedUrl = normalizeArchiveMediaRef(parsed.data.url)
  if (!normalizedUrl) {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('gallery_photos')
    .insert({ ...parsed.data, url: normalizedUrl })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const [signed] = await signGalleryMedia([data])
  return NextResponse.json(signed, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('gallery_photos')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
