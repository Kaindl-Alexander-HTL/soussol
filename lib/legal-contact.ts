import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { legalContactEmail } from '@/lib/legal'

// contact_email is not in the anon RLS allowlist for settings, so the legal
// pages read it with the service-role client instead of getSettings().
export async function getLegalContactEmail(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'contact_email')
    .maybeSingle()
  if (error) throw error
  return legalContactEmail({ contact_email: data?.value })
}
