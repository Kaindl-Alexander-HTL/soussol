import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

const createSchema = z.object({
  memento_id: z.string().uuid(),
  url: z.string().url(),
  caption: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().default(0),
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
    .from('gallery_photos')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
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
