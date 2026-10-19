import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const germanUi = /\b(?:Abmelden|Anmelden|Anmeldung|Anmeldungen|Bewerben|Bewerbung|Bewerbungen|Datenschutz|E-Mail|Erstellen|Fehler|Gespeichert|Hinzufügen|Impressum|Mitglied|Mitglieder|Passwort|Schließen|Speichern|Verfügbar|Warteliste|Zurück)\b|(?:Keine|Noch keine|Ungültige|Öffentlich|Löschen|Schrift|Texte)/

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

test('application-owned user-facing copy is English', () => {
  const failures: string[] = []

  for (const file of [...sourceFiles('app'), ...sourceFiles('components'), 'lib/email.ts']) {
    const source = readFileSync(file, 'utf8')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')

    source.split('\n').forEach((line, index) => {
      if (germanUi.test(line)) failures.push(`${file}:${index + 1}: ${line.trim()}`)
    })
  }

  assert.deepEqual(failures, [])
})
