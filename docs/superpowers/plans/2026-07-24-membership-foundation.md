# Membership Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das geteilte Monats-Code-Gate durch benannte Mitglieder mit Rollen (`surrounding`/`outer`/`inner`) und persönlicher Token-Identität ersetzen.

**Architecture:** Neue `members`-Tabelle in Supabase. Zugang über einen persönlichen `access_token` pro Mitglied, der (a) als Klick-Link über einen Route Handler und (b) als eintippbarer Code am `/enter`-Formular funktioniert. Das signierte `sous_pass`-Cookie trägt künftig die `member.id` statt des geteilten Codes; bei jedem geschützten Request wird das Mitglied frisch aus der DB gelesen, wodurch Entzug (`is_active=false`), Rollenänderung und Token-Rotation sofort wirken.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts` als Middleware), TypeScript, Supabase (`supabaseAdmin` Service-Role-Client), Node `crypto` (HMAC + `randomBytes`), Zod.

## Global Constraints

- **Kein Test-Framework im Projekt.** Verifikation pro Task = `npm run build` (Typecheck) + `npm run lint`, beide grün. Verhaltensprüfung (Link/Code/Entzug) ist DB-abhängig und in Task 5 als manuelles Runbook gesammelt.
- **Next.js 16 mit Breaking Changes** — vor Code-Änderungen die relevante Doku in `node_modules/next/dist/docs/` lesen (siehe `AGENTS.md`). Insbesondere: Cookies dürfen **nicht** in einer Server-Component-Page gesetzt werden, nur in Route Handlers / Server Actions.
- **Middleware heißt `proxy.ts`** (nicht `middleware.ts`), Export `proxy` + `config`.
- **Deutsch** für User-facing Copy; Code/Bezeichner/Commits Englisch.
- **Cookie-Name bleibt `sous_pass`**, Env `ACCESS_COOKIE_SECRET` unverändert.
- **`supabaseAdmin`** ist server-only, nie in Client-Komponenten importieren.
- **Build-Verifikationsbefehl (Dummy-Env, da keine echten Secrets in dieser Umgebung):**
  ```bash
  SUPABASE_SERVICE_ROLE_KEY=dummy NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy RESEND_API_KEY=re_dummy ACCESS_COOKIE_SECRET=dummy npm run build
  ```

## File Structure

| Datei | Rolle | Task |
|---|---|---|
| `supabase/membership-schema.sql` | **neu** — `members`-Tabelle + RLS | 1 |
| `lib/types.ts` | **ändern** — `MemberRole`/`Member`-Typen ergänzen | 2 |
| `lib/access-cookie.ts` | **ändern** — signiert `member.id` statt Code | 2 |
| `lib/member.ts` | **neu** — `getCurrentMember`, `hasArchiveAccess`, `generateAccessToken` | 2 |
| `app/api/verify-code/route.ts` | **ändern** — Mitglied per Token suchen, Cookie setzen | 2 |
| `app/(gated)/layout.tsx` | **ändern** — `hasArchiveAccess(getCurrentMember())` | 2 |
| `app/enter/page.tsx` | **ändern** — geteilte-Code-Logik raus, „schon drin"-Check via Member | 2 |
| `app/api/register/route.ts` | **ändern** — `isGated()` nutzt `getCurrentMember()` | 2 |
| `components/CodeGateForm.tsx` | **ändern** — sendet `{ token }`, Copy angepasst | 2 |
| `app/api/enter/route.ts` | **neu** — `GET`-Link-Weg, setzt Cookie + Redirect | 3 |
| `lib/email.ts` | **ändern** — `sendMemberInvite()` (Link + Code) | 4 |
| `supabase/seed-test-member.sql` | **neu** — Test-Mitglied zum manuellen Verifizieren | 5 |
| `docs/superpowers/runbooks/membership-verification.md` | **neu** — manuelles Test-Runbook | 5 |

`proxy.ts` bleibt **unverändert**: es destrukturiert nur `{ valid }` aus `verifyCookie(...)`, und dieses Feld existiert weiter. Die DB-Prüfung (Mitglied aktiv?) passiert bewusst nicht in der Edge-Middleware, sondern im `(gated)`-Layout — das ist die bestehende Aufteilung.

---

### Task 1: Membership-Schema

**Files:**
- Create: `supabase/membership-schema.sql`

**Interfaces:**
- Produces: Tabelle `members(id, name, email, role, access_token, is_active, created_at)` — von `lib/member.ts` (Task 2), `app/api/verify-code` (Task 2), `app/api/enter` (Task 3) gelesen.

- [ ] **Step 1: Schema-Datei anlegen**

Create `supabase/membership-schema.sql`:

```sql
-- Mitglieder mit Circle-Rollen (surrounding/outer/inner) + persönlichem Zugangs-Token.
-- Einmalig im Supabase SQL Editor ausführen. Ersetzt das geteilte settings.access_code-Modell.

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('surrounding', 'outer', 'inner')),
  access_token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists members_access_token_idx on members(access_token);

-- RLS: Tabelle enthält Geheimnisse (access_token) und PII (email).
-- Kein anon/authenticated-Zugriff — alles läuft über den Service-Role-Client
-- (supabaseAdmin), der RLS umgeht. RLS aktiv, aber ohne Policies.
alter table members enable row level security;
```

- [ ] **Step 2: SQL-Syntax prüfen (ohne DB)**

Da hier keine Supabase-DB verfügbar ist, nur Syntax-Sichtprüfung: Datei enthält genau eine `create table`, drei `check`-Rollen, `unique` auf `email` und `access_token`, `is_active` default `true`. Kein Ausführen nötig für diesen Task.

- [ ] **Step 3: Commit**

```bash
git add supabase/membership-schema.sql
git commit -m "feat: add members schema (circle roles + access token)"
```

---

### Task 2: Kern-Identitäts-Migration (Cookie + Member-Lib + alle Consumer)

Dies ist die atomare Umstellung: Sobald `verifyCookie` `member.id` statt des Codes trägt, müssen **alle** Consumer zeitgleich umgestellt werden, damit der Build grün bleibt und das geteilte-Code-Modell vollständig verschwindet.

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/access-cookie.ts`
- Create: `lib/member.ts`
- Modify: `app/api/verify-code/route.ts`
- Modify: `app/(gated)/layout.tsx`
- Modify: `app/enter/page.tsx`
- Modify: `app/api/register/route.ts`
- Modify: `components/CodeGateForm.tsx`

**Interfaces:**
- Consumes: Tabelle `members` (Task 1).
- Produces:
  - `signCookie(memberId: string): string`
  - `verifyCookie(cookieValue: string): { valid: boolean; memberId: string }`
  - `getCurrentMember(): Promise<CurrentMember | null>` mit `CurrentMember = { id: string; name: string; email: string; role: MemberRole }`, `MemberRole = 'surrounding' | 'outer' | 'inner'`
  - `hasArchiveAccess(member: CurrentMember | null): boolean`
  - `generateAccessToken(): string`
  - `POST /api/verify-code` erwartet Body `{ token: string }`.

- [ ] **Step 1: Member-Typen ergänzen**

In `lib/types.ts` am Dateiende anhängen:

```ts
export type MemberRole = 'surrounding' | 'outer' | 'inner'

export type Member = {
  id: string
  name: string
  email: string
  role: MemberRole
  access_token: string
  is_active: boolean
  created_at: string
}
```

- [ ] **Step 2: Cookie auf member.id umstellen**

`lib/access-cookie.ts` vollständig ersetzen:

```ts
import { createHmac, timingSafeEqual } from 'crypto'

export function signCookie(memberId: string): string {
  const sig = createHmac('sha256', process.env.ACCESS_COOKIE_SECRET!)
    .update(memberId)
    .digest('hex')
  return `${memberId}.${sig}`
}

export function verifyCookie(cookieValue: string): { valid: boolean; memberId: string } {
  const lastDot = cookieValue.lastIndexOf('.')
  if (lastDot === -1) return { valid: false, memberId: '' }

  const memberId = cookieValue.slice(0, lastDot)
  const sig = cookieValue.slice(lastDot + 1)

  const expected = createHmac('sha256', process.env.ACCESS_COOKIE_SECRET!)
    .update(memberId)
    .digest('hex')

  let valid = false
  try {
    valid = timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    valid = false
  }

  return { valid, memberId }
}
```

- [ ] **Step 3: Member-Lib anlegen**

Create `lib/member.ts`:

```ts
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { verifyCookie } from '@/lib/access-cookie'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { MemberRole } from '@/lib/types'

export type CurrentMember = { id: string; name: string; email: string; role: MemberRole }

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

// 32 Zeichen aus [A-Za-z0-9]. Nicht als kryptografisches Schlüsselmaterial gedacht,
// sondern als praktisch unerratbarer Zugangs-Token; die unique-Constraint fängt
// theoretische Kollisionen ab.
export function generateAccessToken(): string {
  const bytes = randomBytes(32)
  let token = ''
  for (let i = 0; i < bytes.length; i++) {
    token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length]
  }
  return token
}

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sous_pass')?.value
  if (!cookieValue) return null

  const { valid, memberId } = verifyCookie(cookieValue)
  if (!valid || !memberId) return null

  const { data } = await supabaseAdmin
    .from('members')
    .select('id, name, email, role, is_active')
    .eq('id', memberId)
    .single()

  if (!data || !data.is_active) return null

  return { id: data.id, name: data.name, email: data.email, role: data.role as MemberRole }
}

export function hasArchiveAccess(member: CurrentMember | null): boolean {
  return member !== null && (member.role === 'outer' || member.role === 'inner')
}
```

- [ ] **Step 4: verify-code auf Token-Lookup umstellen**

`app/api/verify-code/route.ts` vollständig ersetzen:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signCookie } from '@/lib/access-cookie'

const schema = z.object({
  token: z.string().min(1).max(64),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { token } = parsed.data

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, is_active')
    .eq('access_token', token)
    .single()

  if (!member || !member.is_active) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const signed = signCookie(member.id)
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sous_pass', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })

  return response
}
```

- [ ] **Step 5: Gated-Layout auf Member-Check umstellen**

`app/(gated)/layout.tsx` vollständig ersetzen:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'
import { GatedNav } from '@/components/GatedNav'

export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const member = await getCurrentMember()
  if (!hasArchiveAccess(member)) redirect('/enter')

  return (
    <div className="min-h-screen bg-ink">
      <GatedNav />
      <main className="pb-16 sm:pb-0">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: Enter-Page vereinfachen (geteilte-Code-Logik raus)**

`app/enter/page.tsx` vollständig ersetzen. Der Token-Link wird NICHT hier verarbeitet (RSC darf keine Cookies setzen) — das macht der Route Handler in Task 3.

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentMember, hasArchiveAccess } from '@/lib/member'
import { CodeGateForm } from '@/components/CodeGateForm'

export const metadata: Metadata = {
  title: 'SOUS SOL',
  robots: { index: false, follow: false },
}

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  const member = await getCurrentMember()
  if (hasArchiveAccess(member)) {
    redirect(next ?? '/archive')
  }

  return <CodeGateForm next={next ?? '/archive'} />
}
```

- [ ] **Step 7: register isGated() auf Member umstellen**

In `app/api/register/route.ts` die `isGated`-Funktion und ihre Imports ersetzen. Die alten Imports `cookies`, `verifyCookie` werden in dieser Datei nicht mehr gebraucht — entfernen. Neu `getCurrentMember` importieren.

Alte `isGated`-Funktion (komplett) ersetzen durch:

```ts
async function isGated(): Promise<boolean> {
  return (await getCurrentMember()) !== null
}
```

Import-Block oben in der Datei so anpassen, dass er lautet:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendRegistrationNotification } from '@/lib/email'
import { getCurrentMember } from '@/lib/member'
```

(D.h. die Zeilen `import { cookies } from 'next/headers'` und `import { verifyCookie } from '@/lib/access-cookie'` entfallen; `getCurrentMember` kommt neu dazu. `supabaseAdmin` bleibt, weil es weiter für Event-/Registrations-Queries genutzt wird.)

- [ ] **Step 8: CodeGateForm sendet Token**

In `components/CodeGateForm.tsx` zwei Änderungen:

1. Den Fetch-Body-Key von `code` auf `token` ändern:

```tsx
        body: JSON.stringify({ token: code.trim() }),
```

2. Das `aria-label` des Inputs von `"Zugangscode eingeben"` auf `"Zugangscode oder Token eingeben"` ändern (rein kosmetisch, Copy):

```tsx
          aria-label="Zugangscode oder Token eingeben"
```

Alle übrige Logik/Styling der Datei bleibt unverändert (der lokale State darf weiter `code` heißen — nur der gesendete JSON-Key ist `token`).

- [ ] **Step 9: Build + Lint verifizieren**

Run:
```bash
SUPABASE_SERVICE_ROLE_KEY=dummy NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy RESEND_API_KEY=re_dummy ACCESS_COOKIE_SECRET=dummy npm run build && npm run lint
```
Expected: Build „Compiled successfully" + „Finished TypeScript", Lint 0 errors (die vorbestehende `no-img-element`-Warning in `GalleryView.tsx` ist erlaubt).

- [ ] **Step 10: Commit**

```bash
git add lib/types.ts lib/access-cookie.ts lib/member.ts app/api/verify-code/route.ts "app/(gated)/layout.tsx" app/enter/page.tsx app/api/register/route.ts components/CodeGateForm.tsx
git commit -m "feat: replace shared code gate with member identity"
```

---

### Task 3: Magic-Link-Eintritt (Route Handler)

**Files:**
- Create: `app/api/enter/route.ts`

**Interfaces:**
- Consumes: `signCookie` (Task 2), Tabelle `members` (Task 1).
- Produces: `GET /api/enter?token=<access_token>` → setzt `sous_pass`-Cookie und redirectet zu `/archive`; bei ungültigem/inaktivem/rollenlosem Token Redirect zu `/enter`. Dies ist das Ziel des emailbaren Links (Task 4).

- [ ] **Step 1: Route Handler anlegen**

Create `app/api/enter/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signCookie } from '@/lib/access-cookie'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = request.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(new URL('/enter', origin))
  }

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, is_active, role')
    .eq('access_token', token)
    .single()

  if (!member || !member.is_active || (member.role !== 'outer' && member.role !== 'inner')) {
    return NextResponse.redirect(new URL('/enter', origin))
  }

  const signed = signCookie(member.id)
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)

  const response = NextResponse.redirect(new URL('/archive', origin))
  response.cookies.set('sous_pass', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })
  return response
}
```

- [ ] **Step 2: Build verifizieren**

Run:
```bash
SUPABASE_SERVICE_ROLE_KEY=dummy NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy RESEND_API_KEY=re_dummy ACCESS_COOKIE_SECRET=dummy npm run build
```
Expected: „Compiled successfully"; die Routenliste enthält `ƒ /api/enter`.

- [ ] **Step 3: Commit**

```bash
git add app/api/enter/route.ts
git commit -m "feat: add magic-link entry route for member tokens"
```

---

### Task 4: Einladungs-Mail (Link + Code)

Diese Mail wird in Sub-Projekt B/C beim Anlegen/Akzeptieren tatsächlich versendet. In A wird nur die Funktion bereitgestellt (kein Aufrufer), damit sie getestet werden kann und die Interfaces stehen.

**Files:**
- Modify: `lib/email.ts`

**Interfaces:**
- Consumes: nichts aus früheren Tasks (nutzt `resend` + `NEXT_PUBLIC_SITE_URL`).
- Produces: `sendMemberInvite(params: { name: string; email: string; accessToken: string }): Promise<void>` — schickt Link `${SITE_URL}/api/enter?token=<token>` UND den Token als Code.

- [ ] **Step 1: sendMemberInvite ergänzen**

In `lib/email.ts` am Dateiende anhängen (der bestehende `resend`-Client oben in der Datei wird wiederverwendet):

```ts
type MemberInviteParams = {
  name: string
  email: string
  accessToken: string
}

export async function sendMemberInvite(params: MemberInviteParams) {
  const { name, email, accessToken } = params

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sous.club'
  const link = `${siteUrl}/api/enter?token=${accessToken}`

  const text = [
    `Hallo ${name},`,
    '',
    'du bist dabei. Über diesen Link kommst du rein:',
    link,
    '',
    'Falls der Link nicht funktioniert, kannst du diesen Code auf der Seite eingeben:',
    accessToken,
    '',
    'Bis bald.',
  ].join('\n')

  await resend.emails.send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: email,
    subject: 'Willkommen bei SOUS SOL',
    text,
  })
}
```

- [ ] **Step 2: Build + Lint verifizieren**

Run:
```bash
SUPABASE_SERVICE_ROLE_KEY=dummy NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy RESEND_API_KEY=re_dummy ACCESS_COOKIE_SECRET=dummy npm run build && npm run lint
```
Expected: Build grün, Lint 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add member invite email (link + code)"
```

---

### Task 5: Seed + Verifikations-Runbook (DB-abhängig)

Die eigentliche Verhaltensprüfung braucht eine Supabase-DB mit `members`-Tabelle (Task 1 ausgeführt) und echte Env-Werte. Dieser Task liefert die Hilfsmittel dafür.

**Files:**
- Create: `supabase/seed-test-member.sql`
- Create: `docs/superpowers/runbooks/membership-verification.md`

**Interfaces:**
- Consumes: alles Vorherige.
- Produces: manuelles Runbook.

- [ ] **Step 1: Seed-SQL anlegen**

Create `supabase/seed-test-member.sql`:

```sql
-- Test-Mitglied zum manuellen Verifizieren des Membership-Fundaments.
-- Im Supabase SQL Editor ausführen, NACHDEM membership-schema.sql lief.
-- Token ist bewusst gut merkbar (nur für Test; echte Tokens kommen aus generateAccessToken()).

insert into members (name, email, role, access_token, is_active)
values ('Test Outer', 'test-outer@example.com', 'outer', 'TESTTOKENOUTER0000000000000000000', true)
on conflict (email) do update
  set role = excluded.role, access_token = excluded.access_token, is_active = excluded.is_active;

insert into members (name, email, role, access_token, is_active)
values ('Test Surrounding', 'test-surrounding@example.com', 'surrounding', 'TESTTOKENSURR00000000000000000000', true)
on conflict (email) do update
  set role = excluded.role, access_token = excluded.access_token, is_active = excluded.is_active;
```

- [ ] **Step 2: Runbook anlegen**

Create `docs/superpowers/runbooks/membership-verification.md`:

```markdown
# Membership-Fundament — manuelles Verifikations-Runbook

Voraussetzung: `supabase/membership-schema.sql` + `supabase/seed-test-member.sql` in Supabase
ausgeführt; `.env.local` mit echten Supabase-Werten + `ACCESS_COOKIE_SECRET` + `NEXT_PUBLIC_SITE_URL`.

Dev-Server: `npm run dev`

1. **Link-Weg (outer):** `http://localhost:3000/api/enter?token=TESTTOKENOUTER0000000000000000000`
   → Redirect nach `/archive`, Archiv sichtbar, Cookie `sous_pass` gesetzt.
2. **Code-Weg (outer):** Cookie löschen → `/enter` → Token `TESTTOKENOUTER0000000000000000000`
   eintippen → landet im Archiv.
3. **Falscher Token:** `/enter` → `zzzzz` eintippen → bleibt am Formular (Shake), kein Zugang.
4. **surrounding hat keinen Archiv-Zugang:** Cookie löschen →
   `http://localhost:3000/api/enter?token=TESTTOKENSURR00000000000000000000`
   → Redirect zu `/enter` (kein Archiv), weil Rolle `surrounding`.
5. **Entzug (soft-delete):** In Supabase `update members set is_active=false where email='test-outer@example.com';`
   → nächster `/archive`-Aufruf redirectet zu `/enter`.
6. **Rotation:** In Supabase `update members set access_token='NEUERTOKEN...' where email='test-outer@example.com';`
   → alter Token/Link ergibt keinen Treffer mehr; neuer funktioniert.
7. **Öffentlich bleibt offen:** `/impressum`, `/datenschutz` ohne Cookie erreichbar.
```

- [ ] **Step 3: Commit**

```bash
git add supabase/seed-test-member.sql docs/superpowers/runbooks/membership-verification.md
git commit -m "docs: add member seed and verification runbook"
```

---

## Nach Abschluss aller Tasks

- `superpowers:finishing-a-development-branch` aufrufen.
- **DB-Abhängigkeit:** Tasks 1 und 5 produzieren SQL, das erst auf einer erreichbaren Supabase-DB
  (eigenes Produktions-Projekt, siehe geparkte DB-Übernahme) wirkt. Der Code (Tasks 2–4) ist ohne
  DB per `npm run build`/`lint` verifizierbar; die Verhaltensprüfung folgt dem Runbook, sobald die
  DB steht.
- **Folge-Sub-Projekte:** B (Bewerbungsformular + Akzeptieren/Ablehnen), C (Admin-Nutzerverwaltung
  inkl. „Token rotieren"/„neu senden"), D (Gating-Neuaufteilung, `settings.access_code` entfernen),
  E (Landing/Events), F (Turnier-Redirect), G (Long-Press-Kreis) — jeweils eigene Spec → Plan.
```
