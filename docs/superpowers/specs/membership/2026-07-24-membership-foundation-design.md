# Mitglieder-Fundament (Circle-Rollen + persönliche Token-Identität)

**Datum:** 2026-07-24
**Status:** Approved, bereit für Implementierungsplan
**Sub-Projekt:** A von A–G (siehe „Gesamtkontext")

## Gesamtkontext

Tim will das Zugangsmodell von SOUS SOL grundlegend umbauen: von einem geteilten,
monatlich rotierenden Code hin zu benannten Mitgliedern mit **Circle-Rollen**:

- **Surrounding Circle** — Öffentlichkeit. Jeder. Sieht Landingpage + öffentliche Events.
- **Outer Circle** — Leute, die sich beworben haben (Tim akzeptiert/lehnt ab) oder von
  Tim direkt aufgenommen wurden (z.B. häufige Run-Teilnehmer). Sehen das Foto-Archiv.
- **Inner Circle** — exklusiv, wenige, ausschließlich von Tim handverlesen (keine
  Bewerbung). Bekommen in Zukunft Perks (Rabatte o.ä.).

Das ist zu groß für eine Spec und wurde in Sub-Projekte zerlegt:

| # | Sub-Projekt | Hängt ab von |
|---|---|---|
| **A** | **Mitglieder-Fundament** (diese Spec) | — |
| B | Bewerbungsformular (öffentlich) → Tim akzeptiert/lehnt ab | A |
| C | Admin-Nutzerverwaltung (Liste, Rolle ändern, Name/E-Mail, entfernen) | A |
| D | Zugriffs-Gating umbauen (Archiv nur outer/inner; Landing/Events öffentlich) | A |
| E | Landingpage-Umbau (Events-Button für öffentliche Events) | D |
| F | Turnier-Anmeldung = externer Redirect zu UnderTheBridge | — |
| G | Long-Press-Kreis-Interaktion | — |

Diese Spec deckt **ausschließlich A** ab. Jedes weitere Sub-Projekt bekommt eine
eigene Spec → Plan → Umsetzung.

## Kontext zum bestehenden System

Heute existiert **keine** Nutzer-Identität. Zugang = ein geteilter, monatlich
rotierender Code (`settings.access_code`), der als HMAC-signiertes Cookie `sous_pass`
gespeichert wird (`lib/access-cookie.ts`). Prüfung passiert in:

- `app/(gated)/layout.tsx` — schützt Archiv/Galerie/Upcoming/Event
- `app/enter/page.tsx` + `components/CodeGateForm.tsx` — Code-Eingabe
- `app/api/verify-code/route.ts` — vergleicht Eingabe mit `settings.access_code`, setzt Cookie
- `proxy.ts` — Middleware, redirectet ungültige Cookies zu `/enter`

Die `registrations`-Tabelle sind reine Event-Anmeldungen, **keine** Accounts.

## Entscheidungen aus dem Brainstorming

| Frage | Entscheidung |
|---|---|
| Wie weisen sich Mitglieder aus? | Persönlicher Code/Link (baut auf bestehendem Cookie-Pattern auf) |
| Sehen inner/outer heute Unterschiedliches? | Nein — heute gleicher Zugang, `inner` ist nur markierte Stufe für spätere Perks. Gating heute binär: Archiv-Zugang vs. kein Archiv-Zugang |
| Wie kommt ein akzeptiertes Mitglied rein? | Beides: Mail enthält Klick-Link UND eintippbaren Code (derselbe Token) |
| Was passiert mit dem geteilten Monats-Code? | Ersetzen — Archiv-Zugang läuft nur noch über persönliche Mitglieds-Tokens |
| Gehört `surrounding` in die `members`-Tabelle? | Ja — alle drei Rollen sind Zeilen. `surrounding` = benanntes Mitglied ohne Archiv-Zugang (z.B. Bewerber, oder von Tim beobachtete Person). Anonyme Öffentlichkeit = gar keine Zeile / kein Cookie |
| Token stabil oder rotierend? | Auf Knopfdruck rotierbar: normal stabil, aber Tim kann pro Mitglied neu generieren (alter Link/Code wird ungültig, neuer wird verschickt). Kein Auto-Ablauf. Die Rotier-Aktion selbst ist Sub-Projekt C; A stellt nur die Datenbasis + `generateAccessToken()` bereit |
| Entfernen: hart oder soft? | Soft-Delete über `is_active`-Flag — Historie bleibt, Zugang sofort weg |

## Datenmodell (Supabase)

### Neue Tabelle `members`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid, PK, default `gen_random_uuid()` | |
| `name` | text, not null | |
| `email` | text, not null, unique | aus Bewerbung bzw. von Tim gesetzt |
| `role` | text, not null, check in (`surrounding`, `outer`, `inner`) | Alle drei Rollen sind Zeilen. Archiv-Zugang haben nur `outer`/`inner` |
| `access_token` | text, not null, unique | persönliches Geheimnis, ~32 Zeichen base62, hohe Entropie. Steckt im Link und ist der eintippbare Code. Von Tim neu generierbar (Sub-Projekt C) |
| `is_active` | boolean, not null, default `true` | Soft-Delete. `false` = entfernt/gesperrt → kein Zugang, Zeile bleibt für Historie |
| `created_at` | timestamptz, not null, default `now()` | |

- **Rollen-Modell:** `surrounding` = benanntes Mitglied **ohne** Archiv-Zugang (z.B. ein Bewerber,
  oder jemand, den Tim beobachtet/vormerkt). `outer`/`inner` = mit Archiv-Zugang. Die **anonyme
  Öffentlichkeit** (jeder ohne Cookie) hat gar keine Zeile — sie sieht nur die öffentlichen Seiten.
- **„Entfernen"** durch Tim (Sub-Projekt C) = `is_active = false` → Zugang sofort weg, Zeile bleibt erhalten.
- **Gating heute:** Archiv verlangt `is_active = true` **und** `role in (outer, inner)`. `surrounding`
  bekommt (noch) keinen geschützten Bereich, hat aber einen gültigen Token/Cookie (für spätere
  surrounding-Inhalte / Status-Seite; heute landet ein surrounding-Cookie effektiv wie Öffentlichkeit).
- RLS: Tabelle enthält Geheimnisse (`access_token`) und PII (`email`) — **keine** anon/authenticated
  Policies. Jeder Zugriff läuft ausschließlich über den Service-Role-Client (`supabaseAdmin`),
  der RLS umgeht. RLS wird aktiviert (enable row level security) ohne Policies, analog zum
  Pattern von `ticket_orders` in der bestehenden Ticket-Schema-Datei.

## Identitäts-Mechanismus

### Token-Erzeugung
Beim Anlegen eines Mitglieds (in A: manuell/über Seed; ab B/C: bei Akzeptanz bzw. durch Tim)
wird ein zufälliger `access_token` erzeugt: 32 Zeichen aus `[A-Za-z0-9]`, generiert mit
`crypto.randomBytes` server-seitig. Kollisionen sind bei dieser Entropie praktisch
ausgeschlossen; die `unique`-Constraint fängt den theoretischen Fall ab.

### Cookie
- Payload = `member.id`. Signiert mit HMAC-SHA256 über `ACCESS_COOKIE_SECRET` (bestehendes Env,
  gleiche Mechanik wie heute). Cookie-Name bleibt `sous_pass`.
- Format: `<member_id>.<hmac_hex>` — analog zum heutigen `<code>.<sig>`.
- Verifikation: Signatur mit `timingSafeEqual` prüfen, dann Mitglied per `id` frisch aus DB laden.
  Existiert das Mitglied nicht oder ist `is_active = false` → ungültig. **Dadurch wirken
  Entzug (is_active), Rollenänderung und Token-Rotation sofort beim nächsten Request.**

### Zwei Eintrittswege (beide führen zum selben Cookie)
1. **Link:** `GET /enter?token=<access_token>` — Server sucht Mitglied per Token; bei Treffer
   Cookie setzen und zu `/archive` redirecten; kein Treffer → normale Code-Eingabe anzeigen.
2. **Code:** Token am `/enter`-Formular eintippen → `POST /verify-code` mit `{ token }` → Mitglied
   per Token suchen → Cookie setzen.

Token ist **stabil** pro Mitglied (rotiert nicht). Widerruf = Mitglied löschen (C) oder Token
neu generieren (späteres Feature, nicht in A).

## Zugriffs-Helper

Neuer Server-Helper in `lib/member.ts`:

```ts
export type MemberRole = 'surrounding' | 'outer' | 'inner'
export type CurrentMember = { id: string; name: string; email: string; role: MemberRole }

// Liest das sous_pass-Cookie, verifiziert die Signatur, lädt das Mitglied frisch
// aus der DB (via supabaseAdmin). Gibt null bei fehlendem/ungültigem Cookie,
// nicht existierendem oder inaktivem (is_active = false) Mitglied.
export async function getCurrentMember(): Promise<CurrentMember | null>

// true, wenn das Mitglied Archiv-Zugang hat (role outer|inner).
export function hasArchiveAccess(member: CurrentMember | null): boolean

// Erzeugt einen neuen zufälligen access_token (crypto.randomBytes → 32 base62-Zeichen).
// Wird beim Anlegen und beim Rotieren (Sub-Projekt C) genutzt.
export function generateAccessToken(): string
```

Gating-Regel in A: Ein geschützter Bereich verlangt `hasArchiveAccess(await getCurrentMember())`
(role **outer** oder **inner**, und `is_active`). Ein `surrounding`-Cookie zählt hier nicht als
Zugang. Öffentliche Seiten rufen den Helper nicht auf. Die vollständige Neuaufteilung welche
Seiten öffentlich vs. gated sind (inkl. Landing/Events) ist Sub-Projekt D — in A wird nur der
bestehende `(gated)`-Bereich von „geteilter Code" auf „Mitglied mit Archiv-Zugang" umgestellt,
damit A eigenständig lauffähig/testbar ist.

## Änderungen an bestehendem Code

| Datei | Änderung |
|---|---|
| `lib/access-cookie.ts` | `signCookie`/`verifyCookie` arbeiten mit `member_id` statt geteiltem Code. Signatur-Mechanik (HMAC + timingSafeEqual) unverändert |
| `lib/member.ts` | **neu** — `getCurrentMember()`, `hasArchiveAccess()`, `generateAccessToken()` |
| `app/api/verify-code/route.ts` | Sucht aktives Mitglied per `token` in `members` (`is_active = true`) statt Vergleich mit `settings.access_code`. Setzt Cookie mit `member.id` |
| `app/enter/page.tsx` | Verarbeitet `?token=`-Query (Link-Weg): bei gültigem aktivem Token Cookie setzen + Redirect. Sonst Code-Formular. Nutzt `getCurrentMember()` für „schon eingeloggt"-Check |
| `components/CodeGateForm.tsx` | Feld/Label ggf. von „Code" zu Token-Eingabe; sendet `{ token }` an `/verify-code` |
| `app/(gated)/layout.tsx` | Ersetzt geteilte-Code-Prüfung durch `hasArchiveAccess(await getCurrentMember())`; bei false → `/enter` |
| `proxy.ts` | Cookie-Signaturprüfung bleibt (verifiziert nur Format/Signatur, nicht DB); Matcher unverändert |
| `settings.access_code` | Wird unbenutzt, bleibt vorerst in der DB liegen. Endgültige Entfernung in Sub-Projekt D |

**Hinweis zu `proxy.ts`:** Die Middleware prüft nur Signatur/Format (kein DB-Zugriff im Edge-Runtime).
Die DB-Prüfung (Mitglied existiert noch?) passiert im `(gated)/layout.tsx`. Das ist die heutige
Aufteilung und bleibt so — die Middleware ist nur ein schneller Vorfilter.

## Schema-Migration

Neue Datei `supabase/membership-schema.sql`:

```sql
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

alter table members enable row level security;
-- Bewusst keine Policies: Zugriff nur über supabaseAdmin (bypasst RLS).
```

## Fehlerfälle

- **Ungültiger/fehlender Token am Link:** `/enter?token=xxx` ohne Treffer → normales Code-Formular
  anzeigen (keine Fehlermeldung, die verrät ob ein Token existiert).
- **Ungültiger Code im Formular:** `POST /verify-code` → 401, generische Meldung „Ungültiger Code".
- **Inaktives Mitglied (`is_active = false`) mit noch gültigem Cookie:** `getCurrentMember()` gibt
  `null` → Redirect zu `/enter`.
- **surrounding-Mitglied ruft Archiv auf:** `getCurrentMember()` liefert Rolle `surrounding`,
  `hasArchiveAccess` = false → Redirect zu `/enter` (kein Archiv-Zugang).
- **Rotierter Token:** alter Token existiert nicht mehr in `members` → alter Link/Code ergibt keinen
  Treffer, wird wie ungültig behandelt.
- **Manipuliertes Cookie:** Signaturprüfung schlägt fehl → als ungültig behandelt.
- **DB nicht erreichbar:** `getCurrentMember()` gibt `null` (fail-closed → kein Zugang), analog zum
  heutigen Verhalten des `(gated)`-Layouts.

## Testplan

Da das Projekt kein Test-Framework hat, erfolgt die Verifikation manuell + per Build/Lint:

- `npm run build` + `npm run lint` grün.
- Mitglied per SQL/Seed anlegen (Name, E-Mail, Rolle `outer`, generierter Token, `is_active = true`).
- **Link-Weg:** `/enter?token=<token>` aufrufen → landet im Archiv, Cookie gesetzt.
- **Code-Weg:** Token am `/enter`-Formular eintippen → landet im Archiv.
- **Falscher Token:** zufälliger String → bleibt am Code-Formular / 401.
- **Entzug (soft-delete):** `is_active = false` setzen → nächster Archiv-Request redirectet zu `/enter`.
- **surrounding-Rolle:** Test-Mitglied mit Rolle `surrounding` → Link/Code funktioniert (Cookie gesetzt),
  aber Archiv-Request redirectet zu `/enter`.
- **Öffentlich bleibt öffentlich:** Impressum/Datenschutz weiter ohne Cookie erreichbar.

## Out of Scope (in A bewusst weggelassen)

- Bewerbungsformular + Akzeptieren/Ablehnen (Sub-Projekt B)
- Admin-UI zum Anlegen/Bearbeiten/Entfernen von Mitgliedern (Sub-Projekt C) — in A werden Mitglieder
  per SQL/Seed angelegt, nur zum Testen des Fundaments
- Neuaufteilung öffentlicher vs. gated Seiten inkl. Landing/Events (D/E)
- Perks/Rabatte für inner (späteres Feature)
- Admin-Aktion „Token rotieren" / „Zugang neu senden" — Datenbasis (`generateAccessToken`) ist in A,
  die UI/Route dazu ist Sub-Projekt C
- Turnier-Redirect (F), Long-Press-Kreis (G)

## Praktischer Blocker (kein Design-Problem)

Die Umsetzung braucht Supabase-Schema-Zugriff, den der User aktuell nicht hat (liegt bei einem
Kollegen von Tim). Spec + Plan können jetzt fertiggestellt werden; die tatsächliche Implementierung
hängt daran, dass DB-Zugriff bereitsteht oder der Kollege `supabase/membership-schema.sql` einspielt
und die Env-Werte (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ACCESS_COOKIE_SECRET`) für eine lokale `.env.local` liefert.
