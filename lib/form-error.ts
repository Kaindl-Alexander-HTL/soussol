// Bei Validierungsfehlern antworten die API-Routen mit dem flatten()-Objekt von
// Zod: { formErrors, fieldErrors }. Legt ein Formular das ungefiltert in seinen
// State, versucht React das Objekt als Kind zu rendern und die Seite stürzt ab
// ("Objects are not valid as a React child").
//
// Diese Funktion macht daraus immer einen anzeigbaren String — und nebenbei
// eine brauchbare Fehlermeldung statt eines generischen Satzes.
export function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value

  if (value && typeof value === 'object') {
    const zodError = value as {
      formErrors?: string[]
      fieldErrors?: Record<string, string[] | undefined>
    }

    const parts = [
      ...(zodError.formErrors ?? []),
      ...Object.entries(zodError.fieldErrors ?? {}).map(
        ([field, messages]) => `${field}: ${(messages ?? []).join(', ')}`
      ),
    ].filter(Boolean)

    if (parts.length) return parts.join(' · ')
  }

  return fallback
}
