import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      x: z.number().int(),
      y: z.number().int(),
      rotation: z.number(),
      scale: z.number().positive(),
      z_index: z.number().int(),
    })
  ).min(1),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const results = await Promise.all(
    parsed.data.updates.map(({ id, x, y, rotation, scale, z_index }) =>
      supabaseAdmin
        .from('mementos')
        .update({ x, y, rotation, scale, z_index })
        .eq('id', id)
    )
  )

  const failed = results.filter((r) => r.error)
  if (failed.length > 0) {
    return NextResponse.json({ error: 'Teilweise fehlgeschlagen.', count: failed.length }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: parsed.data.updates.length })
}
