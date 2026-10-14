import 'server-only'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Ein Supabase-Auth-Account allein macht noch keinen Admin — nur Adressen aus
// ADMIN_EMAIL und ADMIN_EMAILS kommen ins Backoffice.
//
// ADMIN_EMAIL ist der Haupt-Admin: darf rein UND bekommt die Benachrichtigungen
// (Bewerbungen, Anmeldungen). ADMIN_EMAILS (kommagetrennt) sind zusätzliche
// Admins, die nur reinschauen dürfen, aber keine Mails bekommen. Beide Listen
// werden vereinigt — wer ADMIN_EMAILS setzt, kann so den Haupt-Admin nicht
// versehentlich aussperren.
//
// Hintergrund: Vorher genügte "irgendein Auth-User". Da Supabase die öffentliche
// Registrierung erlauben kann und der anon key im Browser-Bundle steht, hätte
// sich damit jeder selbst einen Admin-Zugang anlegen können.
//
// Bewusst "fail closed": Ist keine der beiden Variablen gesetzt, kommt niemand
// rein. Ein stiller Rückfall auf "alle dürfen" wäre genau die Lücke, die das
// hier schließen soll — deshalb lieber ein lauter Fehler im Log.
function allowedEmails(): string[] {
  return [process.env.ADMIN_EMAIL ?? '', process.env.ADMIN_EMAILS ?? '']
    .join(',')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const allowed = allowedEmails()
  if (allowed.length === 0) {
    console.error(
      '[admin] ADMIN_EMAILS/ADMIN_EMAIL ist nicht gesetzt — Zugriff verweigert.'
    )
    return null
  }

  if (!allowed.includes(user.email.toLowerCase())) {
    console.warn(`[admin] Zugriff verweigert für ${user.email} (nicht in ADMIN_EMAIL/ADMIN_EMAILS)`)
    return null
  }

  return user
}

export async function getAdminClient() {
  return (await getAdminUser()) ? supabaseAdmin : null
}
