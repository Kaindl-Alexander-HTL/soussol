import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { toSlug } from '@/lib/slug'

const sportEnum = z.enum(['running', 'cycling', 'volleyball', 'other'])
const statusEnum = z.enum(['upcoming', 'past', 'cancelled'])

const createSchema = z.object({
  title: z.string().min(1).max(255),
  sport: sportEnum,
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  meeting_point: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  max_participants: z.number().int().positive().nullable().optional(),
  registration_enabled: z.boolean().default(true),
  status: statusEnum.default('upcoming'),
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

  const { title, ...rest } = parsed.data
  const slug = toSlug(title)

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({ title, slug, ...rest })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug bereits vergeben — anderen Titel wählen.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, title, ...rest } = parsed.data
  const updates: Record<string, unknown> = { ...rest }
  if (title) {
    updates.title = title
    updates.slug = toSlug(title)
  }

  const { data, error } = await supabaseAdmin
    .from('events')
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
    .from('events')
    .delete()
    .eq('id', parsed.data.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
