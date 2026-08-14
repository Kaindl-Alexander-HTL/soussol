import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'

const createSchema = z.object({
  event_id: z.guid(),
  name: z.string().min(1).max(255),
  price_cents: z.number().int().min(0),
  capacity_per_ticket: z.number().int().min(1).default(1),
  max_tickets: z.number().int().min(1).nullable().optional(),
})

const updateSchema = z.object({
  id: z.guid(),
  name: z.string().min(1).max(255).optional(),
  price_cents: z.number().int().min(0).optional(),
  capacity_per_ticket: z.number().int().min(1).optional(),
  max_tickets: z.number().int().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
})

async function requireAdmin() {
  return getAdminUser()
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('ticket_types').insert(parsed.data).select().single()

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
    .from('ticket_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
