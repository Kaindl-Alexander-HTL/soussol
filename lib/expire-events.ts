import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isEventOver } from '@/lib/event-expiry'

// Nothing flips an event's status on its own, so every place that lists or
// accepts upcoming events moves finished ones to 'past' before it reads.
export async function expirePastEvents(now = new Date()): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, starts_at, ends_at')
    .eq('status', 'upcoming')
    .lte('starts_at', now.toISOString())
  if (error) throw error

  const finished = (data ?? []).filter((event) => isEventOver(event, now)).map((event) => event.id)
  if (!finished.length) return

  const { error: updateError } = await supabaseAdmin
    .from('events')
    .update({ status: 'past' })
    .in('id', finished)
    .eq('status', 'upcoming')
  if (updateError) throw updateError
}
