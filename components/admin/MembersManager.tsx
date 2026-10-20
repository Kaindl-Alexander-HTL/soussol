'use client'

import { errorMessage } from '@/lib/form-error'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatVienna } from '@/lib/date-time'
import type { Member, MemberRole, Application } from '@/lib/types'

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'surrounding', label: 'Surrounding' },
  { value: 'outer', label: 'Outer' },
  { value: 'inner', label: 'Inner' },
]

export function MembersManager({
  initialMembers,
  initialApplications,
}: {
  initialMembers: Member[]
  initialApplications: Application[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showFormer, setShowFormer] = useState(false)
  const [showApplications, setShowApplications] = useState(true)

  const activeMembers = initialMembers.filter((m) => m.is_active)
  const formerMembers = initialMembers.filter((m) => !m.is_active)

  async function call(
    url: string,
    method: string,
    payload: object
  ): Promise<{ ok: boolean; error: string }> {
    setBusy(true)
    setError('')
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setBusy(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const message = errorMessage(json.error, 'Error.')
      setError(message)
      return { ok: false, error: message }
    }

    router.refresh()
    return { ok: true, error: '' }
  }

  return (
    <div className="flex flex-col gap-24">
      {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}

      {/* ── Bewerbungen ─────────────────────────────────────────── */}
      <section>
        {/* Standardmäßig offen, solange etwas offen ist — eine unbeantwortete
            Bewerbung soll man nicht erst aufklappen müssen. */}
        <button
          type="button"
          onClick={() => setShowApplications((v) => !v)}
          aria-expanded={showApplications}
          disabled={initialApplications.length === 0}
          className="mb-8 flex items-center gap-3 font-sans text-[10px] tracking-[0.3em] text-mist uppercase transition-colors hover:text-ash disabled:hover:text-mist"
        >
          {initialApplications.length > 0 && (
            <span
              aria-hidden="true"
              className={`inline-block transition-transform duration-300 ${
                showApplications ? 'rotate-90' : ''
              }`}
            >
              ›
            </span>
          )}
          Applications ({initialApplications.length})
        </button>

        {initialApplications.length === 0 ? (
          <p className="font-sans text-sm text-mist">No open applications.</p>
        ) : !showApplications ? null : (
          <div className="flex flex-col divide-y divide-white/5">
            {initialApplications.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 py-6">
                <div className="flex items-center gap-4">
                  <span className="font-sans text-sm font-light text-ash">{a.name}</span>
                  <span className="font-sans text-[11px] text-mist">{a.email}</span>
                  <span className="ml-auto font-sans text-[10px] text-white/20">
                    {formatVienna(a.created_at, 'd MMM')}
                  </span>
                </div>
                {a.message && (
                  <p className="max-w-xl font-sans text-[12px] font-light leading-relaxed text-smoke">
                    {a.message}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => call('/api/admin/applications', 'PATCH', { id: a.id, action: 'approve' })}
                    className="font-sans text-[10px] tracking-[0.2em] text-spark uppercase transition-colors hover:text-paper disabled:opacity-30"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => call('/api/admin/applications', 'PATCH', { id: a.id, action: 'reject' })}
                    className="font-sans text-[10px] tracking-[0.2em] text-white/25 uppercase transition-colors hover:text-white/50 disabled:opacity-30"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Mitglied hinzufügen ─────────────────────────────────── */}
      <AddMemberForm busy={busy} onCreate={(p) => call('/api/admin/members', 'POST', p)} />

      {/* ── Mitglieder ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
          Members ({activeMembers.length})
        </h2>
        {activeMembers.length === 0 ? (
          <p className="font-sans text-sm text-mist">No members yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {activeMembers.map((m) => (
              <MemberRow key={m.id} member={m} busy={busy} call={call} />
            ))}
          </div>
        )}

        {/* Ehemalige liegen eingeklappt darunter — sie sollen die aktive
            Liste nicht zustellen, aber auffindbar bleiben. */}
        {formerMembers.length > 0 && (
          <div className="mt-14 border-t border-white/5 pt-8">
            <button
              type="button"
              onClick={() => setShowFormer((v) => !v)}
              aria-expanded={showFormer}
              className="flex items-center gap-3 font-sans text-[10px] tracking-[0.3em] text-white/25 uppercase transition-colors hover:text-ash"
            >
              <span
                aria-hidden="true"
                className={`inline-block transition-transform duration-300 ${
                  showFormer ? 'rotate-90' : ''
                }`}
              >
                ›
              </span>
              Former members ({formerMembers.length})
            </button>

            {showFormer && (
              <div className="mt-8 flex flex-col divide-y divide-white/5">
                {formerMembers.map((m) => (
                  <MemberRow key={m.id} member={m} busy={busy} call={call} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function AddMemberForm({
  busy,
  onCreate,
}: {
  busy: boolean
  onCreate: (payload: { name: string; email: string; role: MemberRole }) => Promise<{
    ok: boolean
    error: string
  }>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('inner')
  // Eigener Fehler direkt am Formular — die gemeinsame Meldung oben im
  // Bauteil steht bei langer Mitgliederliste weit außerhalb des Sichtfelds.
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const result = await onCreate({ name: name.trim(), email: email.trim(), role })
    if (result.ok) {
      setName('')
      setEmail('')
      setRole('inner')
    } else {
      setError(result.error)
    }
  }

  return (
    <section>
      <h2 className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
        Add member
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          {ROLES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase transition-colors ${
                role === value
                  ? 'border border-white/40 text-spark'
                  : 'border border-white/10 text-mist hover:border-white/25 hover:text-ash'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <p className="border-l-2 border-white/25 pl-3 font-sans text-[11px] font-light leading-relaxed text-ash">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !name.trim() || !email.trim()}
          className="text-left font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          Add →
        </button>
        <p className="font-sans text-[10px] text-white/25">
          Outer and inner members automatically receive an invitation email with a link and code.
        </p>
      </form>
    </section>
  )
}

function MemberRow({
  member,
  busy,
  call,
}: {
  member: Member
  busy: boolean
  call: (url: string, method: string, payload: object) => Promise<{ ok: boolean; error: string }>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [role, setRole] = useState<MemberRole>(member.role)

  async function saveEdit() {
    const result = await call('/api/admin/members', 'PATCH', {
      id: member.id,
      name: name.trim(),
      email: email.trim(),
      role,
    })
    if (result.ok) setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-center gap-2">
          {ROLES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase transition-colors ${
                role === value
                  ? 'border border-white/40 text-spark'
                  : 'border border-white/10 text-mist hover:border-white/25 hover:text-ash'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            disabled={busy}
            onClick={saveEdit}
            className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
          >
            Save →
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <span className={`font-sans text-sm font-light ${member.is_active ? 'text-ash' : 'text-white/25 line-through'}`}>
        {member.name}
      </span>
      <span className="font-sans text-[11px] text-mist">{member.email}</span>
      <span className="border border-white/10 px-2 py-0.5 font-sans text-[9px] tracking-[0.2em] text-smoke uppercase">
        {member.role}
      </span>
      {member.is_active ? (
        <span className="font-sans text-[10px] text-white/25">
          joined {formatVienna(member.created_at, 'd MMMM yyyy')}
        </span>
      ) : (
        <span className="font-sans text-[9px] tracking-[0.2em] text-white/30 uppercase">Removed</span>
      )}

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
        >
          Edit
        </button>
        {(member.role === 'outer' || member.role === 'inner') && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => call('/api/admin/members', 'PATCH', { id: member.id, action: 'resend' })}
              className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash disabled:opacity-30"
              title="Sends the same access details again; the old link remains valid."
            >
              Resend
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    `Create new access details for ${member.name}?\n\nThe current link and code will stop working immediately. ${member.name} will receive the new details by email.`
                  )
                ) {
                  call('/api/admin/members', 'PATCH', { id: member.id, action: 'renew' })
                }
              }}
              className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash disabled:opacity-30"
              title="Creates new access details and invalidates the old ones."
            >
              New access
            </button>
          </>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (
              member.is_active &&
              !confirm(
                `Remove ${member.name}?\n\n${member.name} loses access immediately: no Outer Circle events, no archive, and the access link stops working.`
              )
            ) {
              return
            }
            call('/api/admin/members', 'PATCH', { id: member.id, is_active: !member.is_active })
          }}
          className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50 disabled:opacity-30"
        >
          {member.is_active ? 'Remove' : 'Activate'}
        </button>
      </div>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
