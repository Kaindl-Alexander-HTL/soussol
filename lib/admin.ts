import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function allowedAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

/**
 * A valid Supabase session is not sufficient for backoffice access.
 * Fail closed unless the authenticated address is explicitly allowlisted.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const allowed = allowedAdminEmails()
  if (allowed.size === 0) {
    console.error('[admin] ADMIN_EMAILS is missing; denying backoffice access.')
    return null
  }

  return allowed.has(user.email.toLowerCase()) ? user : null
}
