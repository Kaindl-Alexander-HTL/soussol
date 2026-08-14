import { createClient } from '@/lib/supabase/server'

export type SettingsMap = Record<string, unknown>

// Liest mehrere Settings in einem Query. Die settings-Tabelle ist per RLS
// öffentlich lesbar — hier liegt nur Inhalt, keine Geheimnisse.
export async function getSettings(keys: string[]): Promise<SettingsMap> {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('key, value').in('key', keys)

  const map: SettingsMap = {}
  for (const row of data ?? []) map[row.key] = row.value
  return map
}

// Leere oder fehlende Werte fallen auf den im Code hinterlegten Text zurück,
// damit eine versehentlich leergeräumte Einstellung keine leere Seite erzeugt.
export function text(map: SettingsMap, key: string, fallback: string): string {
  const value = map[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}
