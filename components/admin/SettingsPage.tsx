'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ManifestSetting = { content: string }

type FontThemeOption = {
  id: string
  label: string
  note: string
  serif: string
  sans: string
}

type Props = {
  manifest: ManifestSetting
  instagramUrl: string
  stravaClubUrl: string
  contactEmail: string
  fontThemes: FontThemeOption[]
  fontTheme: string
  applyHeadline: string
  applyIntro: string
  notFoundText: string
  footerCredit: string
}

type SaveState = 'idle' | 'saving' | 'ok' | 'error'

async function saveSetting(key: string, value: unknown): Promise<boolean> {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  return res.ok
}

function useSaveState() {
  const [state, setState] = useState<SaveState>('idle')
  const trigger = async (fn: () => Promise<boolean>) => {
    setState('saving')
    const ok = await fn()
    setState(ok ? 'ok' : 'error')
    setTimeout(() => setState('idle'), 2500)
  }
  return { state, trigger }
}

function SaveButton({ state, disabled }: { state: SaveState; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={state === 'saving' || disabled}
      className={`font-sans text-[11px] tracking-[0.3em] uppercase transition-colors disabled:opacity-30 ${
        state === 'ok' ? 'text-spark' : state === 'error' ? 'text-white/40' : 'text-ash hover:text-spark'
      }`}
    >
      {state === 'saving' ? '...' : state === 'ok' ? 'Gespeichert ✓' : state === 'error' ? 'Fehler' : 'Speichern →'}
    </button>
  )
}

// ─── Manifest Section ─────────────────────────────────────────────────────────

function ManifestSection({ initial }: { initial: string }) {
  const [content, setContent] = useState(initial)
  const { state, trigger } = useSaveState()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await trigger(() => saveSetting('manifest', { content }))
  }

  return (
    <section className="border-b border-white/8 pb-16">
      <h2 className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Manifest
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Text
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="Das Manifest..."
          />
          <p className="font-sans text-[10px] text-white/20">
            Absätze mit Leerzeile trennen. Erscheint auf der Landing-Page.
          </p>
        </div>
        <SaveButton state={state} />
      </form>
    </section>
  )
}

// ─── Font Section ─────────────────────────────────────────────────────────────

function FontSection({
  themes,
  initial,
}: {
  themes: FontThemeOption[]
  initial: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(initial)
  const { state, trigger } = useSaveState()

  // Die aktive Schrift hängt an zwei CSS-Variablen auf <html>, gesetzt vom
  // Root-Layout. Alle Paare liegen ohnehin schon im Dokument (self-hosted über
  // next/font) — ein Klick hängt also nur um, nichts wird nachgeladen.
  function applyTheme(theme: FontThemeOption) {
    const root = document.documentElement
    root.style.setProperty('--font-serif', theme.serif)
    root.style.setProperty('--font-sans', theme.sans)
  }

  // Kein Speichern-Knopf: Klick heißt sofort sehen und sofort sichern.
  // Schlägt das Sichern fehl, wird die Vorschau zurückgerollt — sonst würde
  // die Auswahl etwas anderes behaupten als das, was gespeichert ist.
  async function choose(theme: FontThemeOption) {
    if (theme.id === selected || state === 'saving') return

    const previous = selected
    setSelected(theme.id)
    applyTheme(theme)

    await trigger(async () => {
      const ok = await saveSetting('font_theme', theme.id)
      if (ok) {
        router.refresh()
      } else {
        setSelected(previous)
        const previousTheme = themes.find((t) => t.id === previous)
        if (previousTheme) applyTheme(previousTheme)
      }
      return ok
    })
  }

  return (
    <section className="border-b border-white/8 pb-16">
      <div className="mb-8 flex items-center gap-4">
        <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
          Schrift
        </h2>
        <span
          className={`font-sans text-[10px] tracking-[0.2em] uppercase transition-opacity ${
            state === 'ok'
              ? 'text-spark opacity-100'
              : state === 'error'
                ? 'text-white/40 opacity-100'
                : state === 'saving'
                  ? 'text-mist opacity-100'
                  : 'opacity-0'
          }`}
        >
          {state === 'saving' ? '...' : state === 'ok' ? 'Gespeichert ✓' : state === 'error' ? 'Fehler' : ''}
        </span>
      </div>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => choose(theme)}
              className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                selected === theme.id
                  ? 'border-white/40'
                  : 'border-white/10 hover:border-white/25'
              }`}
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full border transition-colors ${
                  selected === theme.id ? 'border-spark bg-spark/40' : 'border-white/25'
                }`}
              />
              <span className="flex flex-col gap-0.5">
                <span
                  className={`font-serif italic text-lg ${
                    selected === theme.id ? 'text-spark' : 'text-ash'
                  }`}
                >
                  {theme.label}
                </span>
                <span className="font-sans text-[10px] tracking-[0.15em] text-white/25">
                  {theme.note}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Texts Section ────────────────────────────────────────────────────────────

function TextsSection({
  initialApplyHeadline,
  initialApplyIntro,
  initialNotFound,
  initialFooterCredit,
}: {
  initialApplyHeadline: string
  initialApplyIntro: string
  initialNotFound: string
  initialFooterCredit: string
}) {
  const [applyHeadline, setApplyHeadline] = useState(initialApplyHeadline)
  const [applyIntro, setApplyIntro] = useState(initialApplyIntro)
  const [notFound, setNotFound] = useState(initialNotFound)
  const [footerCredit, setFooterCredit] = useState(initialFooterCredit)
  const { state, trigger } = useSaveState()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await trigger(async () => {
      const results = await Promise.all([
        saveSetting('apply_headline', applyHeadline),
        saveSetting('apply_intro', applyIntro),
        saveSetting('not_found_text', notFound),
        saveSetting('footer_credit', footerCredit),
      ])
      return results.every(Boolean)
    })
  }

  return (
    <section className="border-b border-white/8 pb-16">
      <h2 className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Texte
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Bewerbungsseite — Überschrift
          </label>
          <input
            type="text"
            value={applyHeadline}
            onChange={(e) => setApplyHeadline(e.target.value)}
            placeholder="Outer Circle"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Bewerbungsseite — Text
          </label>
          <textarea
            value={applyIntro}
            onChange={(e) => setApplyIntro(e.target.value)}
            rows={4}
            placeholder="Der Outer Circle ist für Leute mit Drive..."
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            404-Seite
          </label>
          <input
            type="text"
            value={notFound}
            onChange={(e) => setNotFound(e.target.value)}
            placeholder="Nicht gefunden"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Footer-Credit
          </label>
          <input
            type="text"
            value={footerCredit}
            onChange={(e) => setFooterCredit(e.target.value)}
            placeholder="Leer lassen = kein Credit"
            className={inputClass}
          />
        </div>

        <p className="font-sans text-[10px] leading-relaxed text-white/20">
          Leer lassen = der im Code hinterlegte Standardtext bleibt stehen.
        </p>
        <SaveButton state={state} />
      </form>
    </section>
  )
}

// ─── Links Section ────────────────────────────────────────────────────────────

function LinksSection({
  initialInstagram,
  initialStrava,
  initialEmail,
}: {
  initialInstagram: string
  initialStrava: string
  initialEmail: string
}) {
  const [instagram, setInstagram] = useState(initialInstagram)
  const [strava, setStrava] = useState(initialStrava)
  const [email, setEmail] = useState(initialEmail)
  const { state, trigger } = useSaveState()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await trigger(async () => {
      const [r1, r2, r3] = await Promise.all([
        saveSetting('instagram_url', instagram),
        saveSetting('strava_club_url', strava),
        saveSetting('contact_email', email),
      ])
      return r1 && r2 && r3
    })
  }

  return (
    <section>
      <h2 className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">Links</h2>
      <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Instagram URL</label>
          <input
            type="url"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/..."
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Strava Club URL</label>
          <input
            type="url"
            value={strava}
            onChange={(e) => setStrava(e.target.value)}
            placeholder="https://www.strava.com/clubs/..."
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Kontakt-E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tim@soussol-archive.com"
            className={inputClass}
          />
        </div>
        <SaveButton state={state} />
      </form>
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SettingsPage({
  manifest,
  instagramUrl,
  stravaClubUrl,
  contactEmail,
  fontThemes,
  fontTheme,
  applyHeadline,
  applyIntro,
  notFoundText,
  footerCredit,
}: Props) {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-16 font-serif italic text-4xl text-paper">Schrift & Texte</h1>
      <div className="flex flex-col gap-20">
        <FontSection themes={fontThemes} initial={fontTheme} />
        <ManifestSection initial={manifest.content} />
        <TextsSection
          initialApplyHeadline={applyHeadline}
          initialApplyIntro={applyIntro}
          initialNotFound={notFoundText}
          initialFooterCredit={footerCredit}
        />
        <LinksSection
          initialInstagram={instagramUrl}
          initialStrava={stravaClubUrl}
          initialEmail={contactEmail}
        />
      </div>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
