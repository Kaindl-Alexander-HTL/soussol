'use client'

import { useState } from 'react'

type AccessCodeSetting = { code: string; valid_until: string }
type ManifestSetting = { content: string }

type Props = {
  accessCode: AccessCodeSetting
  manifest: ManifestSetting
  instagramUrl: string
  stravaClubUrl: string
  contactEmail: string
}

type SaveState = 'idle' | 'saving' | 'ok' | 'error'

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : ''
}

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => chars[b % chars.length]).join('')
}

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

// ─── Code Section ─────────────────────────────────────────────────────────────

function CodeSection({ initial }: { initial: AccessCodeSetting }) {
  const [code, setCode] = useState(initial.code)
  const [validUntil, setValidUntil] = useState(toDateInput(initial.valid_until))
  const { state, trigger } = useSaveState()

  function rotate() {
    const newCode = generateCode()
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    setCode(newCode)
    setValidUntil(toDateInput(in30Days.toISOString()))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await trigger(() =>
      saveSetting('access_code', {
        code,
        valid_until: new Date(validUntil).toISOString(),
      })
    )
  }

  return (
    <section className="border-b border-white/8 pb-12">
      <h2 className="mb-6 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Zugangscode
      </h2>
      <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Aktueller Code
          </label>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              maxLength={32}
              required
              className={inputClass}
            />
            <button
              type="button"
              onClick={rotate}
              className="shrink-0 font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
            >
              Rotieren ↻
            </button>
          </div>
          <p className="font-sans text-[10px] text-white/20">
            Teile diesen Code mit den Community-Mitgliedern. Nach Rotation werden alle alten Sessions automatisch ungültig.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">
            Gültig bis
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <SaveButton state={state} />
      </form>
    </section>
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
    <section className="border-b border-white/8 pb-12">
      <h2 className="mb-6 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Manifest
      </h2>
      <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-6">
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
      <h2 className="mb-6 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">Links</h2>
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
            placeholder="tim@sous.club"
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
  accessCode,
  manifest,
  instagramUrl,
  stravaClubUrl,
  contactEmail,
}: Props) {
  return (
    <div className="max-w-xl">
      <h1 className="mb-12 font-serif italic text-3xl text-paper">Settings</h1>
      <div className="flex flex-col gap-12">
        <CodeSection initial={accessCode} />
        <ManifestSection initial={manifest.content} />
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
