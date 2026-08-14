import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'

export type EventVisibility = 'public' | 'outer'

// Wer welche Events sehen darf.
//
// Gäste: anon-Client, nur 'public'. Die RLS-Policy blockt outer-Events
// zusätzlich auf DB-Ebene, damit der öffentliche anon key nichts durchlässt.
//
// Mitglieder (outer/inner): deren Zugang hängt am signierten sous_pass-Cookie,
// nicht an Supabase Auth — RLS kann das nicht prüfen. Deshalb liest der Server
// hier bewusst per Service-Role, nachdem das Cookie verifiziert wurde, und
// schränkt die Sichtbarkeit selbst per .in('visibility', …) ein.
export async function getEventAccess(): Promise<{
  isMember: boolean
  db: SupabaseClient
  visibilities: EventVisibility[]
}> {
  const member = await getCurrentMember()

  if (hasArchiveAccess(member)) {
    return { isMember: true, db: supabaseAdmin, visibilities: ['public', 'outer'] }
  }

  return { isMember: false, db: await createClient(), visibilities: ['public'] }
}
