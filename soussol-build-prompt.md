# SOUS SOL — Master Build Prompt

> **Wie du das nutzt:**
> 1. Im Terminal: `cd /Users/moritzaigner/website/websites && mkdir soussol && cd soussol && claude`
> 2. Diesen gesamten Inhalt in Claude Code einfügen.
> 3. Claude Code baut die App in mehreren Iterationen — mit dir im Loop.

---

## Mission

Du baust **SOUS SOL** — eine Website für eine Underground-Sport-Community in Linz (Running, Rennrad, Volleyball). Die Site ist kein klassischer Web-Auftritt, sondern ein **digitales Archiv**, das man durch einen monatlich rotierenden Code betritt. Founder ist Tim Tanzer; Co-Founder Moritz Aigner (Studioaix) wird nur klein im Footer erwähnt.

Tonalität: schwarz, exklusiv, editorial, magazinhaft. Schwarz-Weiß-Basis. Kein Bro-Fitness, keine Stockfoto-Optik, kein Mainstream. Referenzen: palmer-dinnerware.com (Drag-Canvas), weareexample.com (editorial Magazin-Layout).

**Zentrale Idee:** Statt scrollbarer Listen gibt es eine **endlose 2D-Fläche** mit Mementos (Polaroids, Notizen, Stempel, Strava-Screenshots) — frei verteilt, drag-explorable. Klick auf ein Memento öffnet ein Detail-Overlay. Genau das Pattern von palmer-dinnerware.com.

---

## Stack (verbindlich)

- Next.js 14 App Router
- TypeScript (strict)
- Tailwind CSS
- Supabase (Postgres + Auth nur für Tim + Storage für Bilder)
- Framer Motion (für Hover/Modal-Transitions, **nicht** für den Drag — der ist nativer JS)
- Resend (für Tim-Notifications wenn jemand sich registriert)
- Vercel Hosting
- GitHub: `Moziaix/soussol` (Private)
- Domain: **sous.club** (primär) + **soussol.at** (Redirect → sous.club)
- Schriften: **Cormorant Garamond** (Serif, editorial Headlines + Captions) + **Inter** (Sans, UI/Body) + **Caveat** (Handwriting, Memento-Notes/Captions)

---

## Setup-Reihenfolge

```bash
# 1. Projekt anlegen
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# 2. Dependencies
npm install @supabase/supabase-js @supabase/ssr framer-motion resend zod date-fns
npm install -D @types/node

# 3. Env-Datei
cp .env.example .env.local  # template siehe unten
```

**Env-Vars (`.env.local`):**

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # nur server-side, nie an client leaken!
RESEND_API_KEY=re_...
ADMIN_EMAIL=tim@sous.club        # Empfänger für Registrierungs-Notifications
ACCESS_COOKIE_SECRET=...         # 32+ Zeichen random; signiert das access-cookie
NEXT_PUBLIC_SITE_URL=https://sous.club
```

**Supabase:** Schema-File `soussol-schema.sql` ist separat dabei — im Supabase SQL Editor ausführen. Storage Bucket `mementos` wird vom Schema automatisch angelegt. Nach Schema-Run: in Supabase Dashboard unter Authentication einen User für Tim anlegen und Sign-Ups deaktivieren.

---

## Projektstruktur

```
soussol/
├── app/
│   ├── layout.tsx              # Root: Fonts (Cormorant + Inter + Caveat), Grain-Overlay
│   ├── page.tsx                # Manifest (öffentlich)
│   ├── enter/page.tsx          # Code-Gate
│   ├── (gated)/                # Route Group — Middleware prüft Cookie
│   │   ├── layout.tsx          # Header + Nav (nur intern)
│   │   ├── archive/page.tsx    # Drag-Canvas
│   │   ├── upcoming/page.tsx   # Event-Liste (kommend)
│   │   └── event/[slug]/page.tsx # Event-Detail + Registrierung
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── layout.tsx          # Admin-Shell, Auth-Check
│   │   ├── page.tsx            # Dashboard
│   │   ├── events/page.tsx     # Liste
│   │   ├── events/new/page.tsx
│   │   ├── events/[id]/page.tsx
│   │   ├── archive/page.tsx    # Mementos: Liste + Canvas-Positionierung
│   │   ├── archive/new/page.tsx
│   │   ├── archive/[id]/page.tsx
│   │   └── settings/page.tsx   # Code, Manifest, Links
│   ├── api/
│   │   ├── verify-code/route.ts        # POST { code } → setzt Cookie
│   │   ├── register/route.ts           # POST { event_id, guest_name, instagram_handle }
│   │   ├── admin/
│   │   │   ├── events/route.ts         # POST/PATCH/DELETE (auth)
│   │   │   ├── mementos/route.ts
│   │   │   ├── mementos/positions/route.ts  # bulk update x/y/rotation
│   │   │   ├── settings/route.ts
│   │   │   └── upload/route.ts         # Memento-Bilder → Storage
│   ├── impressum/page.tsx
│   ├── datenschutz/page.tsx
│   └── globals.css
├── components/
│   ├── ArchiveCanvas.tsx       # Public: Drag-Explore mit Mementos
│   ├── AdminCanvas.tsx         # Admin: Drag-Reposition mit Snap-to-grid optional
│   ├── Memento.tsx             # Render-Komponente für alle Memento-Kinds
│   ├── EventCard.tsx
│   ├── RegistrationForm.tsx
│   ├── Modal.tsx               # Detail-Overlay
│   ├── GrainOverlay.tsx
│   └── admin/...
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # createServerClient (cookies)
│   │   ├── admin.ts            # service-role client (server-only!)
│   │   └── browser.ts          # createBrowserClient
│   ├── access-cookie.ts        # signed cookie helper (HMAC mit ACCESS_COOKIE_SECRET)
│   ├── email.ts                # Resend wrapper
│   └── slug.ts                 # title → slug
├── middleware.ts               # Code-Gate für (gated) routes + Admin-Auth
├── tailwind.config.ts
└── next.config.js
```

---

## Routen-Inventar

| Route                       | Zugriff       | Zweck                                     |
|-----------------------------|---------------|-------------------------------------------|
| `/`                         | öffentlich    | Manifest. Ein Statement, ein Link „Enter" |
| `/enter`                    | öffentlich    | Code-Eingabe                              |
| `/archive`                  | code-gated    | Drag-Canvas mit Mementos                  |
| `/upcoming`                 | code-gated    | Liste kommender Events                    |
| `/event/[slug]`             | code-gated    | Event-Detail + Anmeldung (wenn enabled)   |
| `/admin/login`              | öffentlich    | Tim's Login                               |
| `/admin/*`                  | auth required | CRUD Panel                                |
| `/impressum`, `/datenschutz`| öffentlich    | Pflicht (österreichisches Recht)          |

---

## Public Flow (Besucher)

### Landing `/`

Schwarz. Cormorant Garamond, italic, sehr groß. Das Manifest in voller Länge, in einer Spalte, generös gesetzt. Unten ein dezenter Link `Enter →` zur Code-Eingabe. Im Footer ganz klein: Impressum · Datenschutz · Instagram · „Made by Studioaix". Kein Logo, keine Navigation, keine Bilder. **Less is more — die Marke besteht aus Worten.**

### Code-Gate `/enter`

Dunkel, fast leer. Mittig ein einzelnes Input-Feld ohne Label, Placeholder-Text (z.B. „——"). Rechts daneben dezenter Submit-Pfeil. Bei falschem Code: subtiler Shake, kein erklärender Fehlertext (passt zur Anti-Spotlight-Mentalität). Bei korrektem Code: Cookie wird gesetzt → Redirect nach `/archive`.

### Archive `/archive`

**Das Herzstück.** Vollbild-Canvas, dragbar, schwarz mit subtilem Film-Grain. Mementos sind frei im Raum verteilt. Klick auf ein Memento → Modal mit:
- Datum/Sportart-Meta (kleine Caps, weit gesperrt)
- Cormorant-Italic Titel
- Body-Text (Inter, hell-grau)
- Bei Strava-Mementos: zusätzlich Distanz/Pace/Höhenmeter-Stats

Reset-Button oben rechts, „Drag to explore"-Hint mittig unten (fadet nach 6s aus).

### Upcoming `/upcoming`

Editorial-Liste. Cormorant-Italic Datums-Header (z.B. „Maii"), darunter Event-Titel groß, Sportart und Treffpunkt klein. Kein Bild-Heavy. Klick auf einen Eintrag → `/event/[slug]`.

### Event-Detail `/event/[slug]`

Großzügiger editorial Aufbau. Wenn `registration_enabled` true: Formular am Ende mit nur **zwei Pflichtfeldern: Name + Instagram-Handle**. Optional: Notiz. Submission ruft `/api/register` → Insert + sendet Tim Notification via Resend. Bei `max_participants` erreicht: Status auf „Warteliste" mit `is_waitlist=true`. Wenn `registration_enabled` false: nur Anzeige, evtl. mit Hinweis „Strava: [Link]".

---

## Code-Gate Logik (kritisch — sorgfältig implementieren)

**Konzept:** Ein einziger gültiger Code, der monatlich rotiert. Tim setzt ihn im Admin Panel. Bei korrekter Eingabe wird ein **signiertes Cookie** gesetzt das den aktuellen Code als HMAC enthält.

**Datenmodell:** `settings` Tabelle, Key `'access_code'`, Value `{ code: string, valid_until: ISO timestamp }`.

**Verify-Endpoint** (`/api/verify-code`):
```ts
// Pseudo
const { code } = await req.json();
const setting = await supabaseAdmin.from('settings')
  .select('value').eq('key', 'access_code').single();
if (code !== setting.value.code) return Response.json({ ok: false }, { status: 401 });

const sig = hmacSha256(code, ACCESS_COOKIE_SECRET);
const cookie = `${code}.${sig}`;
return new Response(JSON.stringify({ ok: true }), {
  headers: {
    'Set-Cookie': `sous_pass=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${new Date(setting.value.valid_until).toUTCString()}`,
  },
});
```

**Middleware** (`middleware.ts`):
- Liest Cookie, prüft Signatur, prüft ob `code` Teil immer noch dem aktuellen Setting entspricht.
- Wenn nicht (oder kein Cookie): redirect → `/enter?next=/archive`.
- Bei Code-Rotation durch Tim invalidieren alle alten Cookies automatisch, weil der Code-Teil nicht mehr matcht.

**Wichtig:** Middleware läuft auf der Edge — Supabase-Lookup dort ist langsam. Lieber den aktuellen Code beim Cookie-Set als zweites signiertes Token mit kurzer TTL (~5 min) im Cookie cachen, ODER einen Edge-cache mit `revalidate` auf den Settings-Endpoint legen. Tim soll den Code maximal alle paar Wochen rotieren, also ist die Cache-TTL großzügig okay.

**Admin rotiert Code:** PATCH auf `settings.access_code`. Frontend zeigt aktuellen Code an + „Generate new" Button (8-Zeichen alphanumerisch, klein) + manueller Override.

---

## Archive Canvas (technische Tiefe)

Dies ist die einzige wirklich knifflige Komponente. **Nicht** Framer Motion's drag verwenden — es kollidiert mit dem nested click-handling und macht touch zur Hölle. Stattdessen pure JS pointer events.

**Architektur:**

```tsx
// ArchiveCanvas.tsx — Pseudo
<div className="viewport fixed inset-0 overflow-hidden cursor-grab">
  <div ref={stageRef} className="stage absolute"
       style={{ width: 4000, height: 3000, transform: `translate(-50% + ${x}px, -50% + ${y}px)` }}>
    {mementos.map(m => (
      <Memento key={m.id} memento={m}
        onClick={() => !dragMoved && openModal(m)}
        style={{
          left: 2000 + m.x, top: 1500 + m.y,
          transform: `translate(-50%, -50%) rotate(${m.rotation}deg) scale(${m.scale})`,
          zIndex: m.z_index,
        }}/>
    ))}
  </div>
</div>
```

**Drag-Implementierung:**
- `pointerdown` → `dragging=true`, speicher Start-Position
- `pointermove` → wenn Distanz > 5px Threshold: `dragMoved=true`, update stage-transform
- `pointerup` → `dragging=false`. Click-Handler auf Memento prüft `!dragMoved` bevor Modal öffnet
- Während drag: stage-transform OHNE transition (`will-change: transform`); beim Reset MIT smooth transition
- **Touch-Events parallel** (touchstart, touchmove preventDefault, touchend)

**Memento-Komponente:** Switch über `kind` rendert Polaroid / Note / Stamp / Strava / Custom. Polaroids haben SVG-Pattern als Bild-Platzhalter falls `image_url` null ist. Bei vorhandenem `image_url` aus dem Storage-Bucket wird das echte Foto eingeblendet, B&W gefiltert via CSS `filter: grayscale(1) contrast(1.1)`.

**Reset-Button:** setzt `x=0, y=0` mit smooth transition (cubic-bezier).

**Hint:** „Drag to explore" mittig unten, fadet nach 6s aus oder beim ersten Drag.

> **Referenz:** Der Canvas-Prototyp `soussol-archive-prototype.html` (separate Datei) zeigt das fertige Verhalten. Verwende ihn als Vorlage für Geometrie, Animation-Timings und Polaroid-Styling.

---

## Admin Panel — Specs

**Login:** `/admin/login`. Supabase Auth, Email+Passwort. Bei Erfolg → `/admin`.

**Dashboard:** Quick-Stats: anstehende Events, neue Registrierungen seit letztem Login, gesamt Mementos. Schnell-Aktionen: „Neuer Event", „Memento hochladen", „Code rotieren".

**Events:**
- Liste: Tab-Navigation Upcoming / Past / Cancelled. Zeile zeigt Datum, Titel, Sportart, Anmeldungen-Count.
- Editor: Felder analog Schema. `registration_enabled` ist ein Toggle (manche Events haben Anmeldung, andere nicht — das ist explizit gewünscht). Speichern via PATCH-Endpoint.
- Detail: Liste der Registrierungen mit Name + Insta-Handle. Export als CSV.
- Status-Wechsel: Button „Mark as past" verschiebt Event ins Archive automatisch.

**Archive (Mementos):**
- Liste-Ansicht mit Thumbnails.
- Editor: Bild-Upload (→ `/api/admin/upload` → Storage-Bucket `mementos`), Caption, Body, Date-Label, Kind, optional event_id.
- **Canvas-Positionierung** (eigene Sub-Page `/admin/archive/canvas`): Identischer Drag-Canvas wie public, aber jedes Memento ist selbst dragbar (nested drag — pointerdown auf Memento stoppt stage-drag, propagiert eigene Bewegung). Beim Loslassen: PATCH `x/y/rotation/z_index`. „Save layout" persistiert alle Änderungen via bulk-update Endpoint.

**Settings:**
- Access-Code: aktueller Code anzeigen, „Rotate" Button, manueller Override mit Date-picker für `valid_until`.
- Manifest: einfaches Textarea, speichert `settings.manifest`.
- Links: Instagram, Strava-Club-URL.

---

## Styling-System

**Farben:**
```ts
// tailwind.config.ts → extend.colors
{
  ink:    '#0A0A0A',     // Background
  paper:  '#F5F1E8',     // Polaroid / Note bg (warm, leicht vergilbt)
  bone:   '#E8E2D0',     // alternative Memento-Surface
  ash:    'rgba(255,255,255,0.5)', // Body text muted
  mist:   'rgba(255,255,255,0.3)', // Hints, captions
  spark:  '#FFFFFF',     // High contrast accent (rar einsetzen)
}
```

**Schriften:**
```tsx
// app/layout.tsx
import { Inter, Cormorant_Garamond, Caveat } from 'next/font/google';
const inter     = Inter({ subsets: ['latin'], variable: '--font-sans' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], style: ['normal','italic'], weight: ['300','400','500'], variable: '--font-serif' });
const caveat    = Caveat({ subsets: ['latin'], weight: ['400','500'], variable: '--font-hand' });
```

**Verwendung:**
- **Cormorant italic** für editorial Headlines, Event-Titel, Modal-Titel, Memento-Stamps' Slogan.
- **Inter** für UI, Body, Buttons, Form-Labels — alles mit `font-weight: 300`, sehr selten 400.
- **Caveat** für Polaroid-Captions, handgeschriebene Notes.
- Letter-spacing: weit (`0.2em` – `0.4em`) für kleine Caps-Labels (Meta, Buttons). Engl bis normal für Headlines.

**Grain-Overlay:** Globaler `<GrainOverlay />` in root layout. Fixed, inset-0, pointer-events-none, z-50, mix-blend-mode overlay, opacity ~0.5. Pattern aus inline SVG mit `feTurbulence`.

**Cursor:** `cursor-grab` auf draggable Bereiche, `cursor-grabbing` während Drag (über `<body class>`-Toggle).

**Transitions:** überwiegend `cubic-bezier(0.22, 1, 0.36, 1)` für „decelerate" — fühlt sich teuer an.

**Mobile:** Canvas-Drag funktioniert mit Touch, aber für Mobile **zusätzlich** ein optionaler Grid-Fallback (`/archive?view=grid`) — manche Nutzer wollen einfach scrollen. Standard bleibt aber Canvas.

---

## Build-Prioritäten (Reihenfolge für Claude Code)

Baue in dieser Reihenfolge, jeden Step end-to-end testen bevor zum nächsten:

1. **Setup + Schema laufen lassen** + Supabase-Clients konfigurieren
2. **Public Landing** `/` mit Manifest aus DB + Code-Gate-Link
3. **Code-Gate** `/enter` + `/api/verify-code` + Middleware
4. **Admin Login** + Admin-Layout mit Auth-Check
5. **Admin Events CRUD** (ohne Bilder)
6. **Public Upcoming** + Event-Detail + Registration-Endpoint + Resend-Mail an Tim
7. **Admin Mementos CRUD** mit Bild-Upload
8. **Public Archive Canvas** (read-only) — Drag, Click, Modal
9. **Admin Canvas Positioner** (drag-reposition + bulk-save)
10. **Admin Settings** (Code-Rotation, Manifest, Links)
11. **Impressum / Datenschutz** (siehe unten)
12. **Polish:** Grain, Animations, Mobile-Tuning, SEO-Meta, OG-Image
13. **Domain + Vercel** (siehe Deployment)

---

## Impressum & Datenschutz (Pflicht — österreichisches Recht)

**Impressum (`/impressum`):** Tim Tanzer als Medieninhaber. Anschrift, E-Mail, Telefon. Hinweis dass Soussol kein Verein ist sondern eine private Initiative. Co-Founder Moritz Aigner ganz klein erwähnt. ECG/MedienG-konform.

**Datenschutz (`/datenschutz`):** DSGVO-konform. Welche Daten gespeichert werden: bei Registrierung Name + Insta-Handle, Aufbewahrung bis nach dem Event + 30 Tage. Hosting: Vercel (USA) — Hinweis. Supabase: EU (Frankfurt). Keine Cookies außer dem Access-Cookie und Supabase-Auth-Cookie im Admin. Kein Tracking, kein Analytics.

> **Vor Live-Schaltung:** WKO oder Anwalt drüberschauen lassen — Studioaix-Standard.

---

## Resend — E-Mail-Setup

**Domain:** `sous.club` — DNS-Records (SPF, DKIM, MX) bei World4You eintragen. Resend gibt die exakten Records vor.

**Templates** (in `lib/email.ts`):
1. **Registration → Tim:** „New registration: {Name} (@handle) for {Event Title} — {Date}". Plain text reicht, kein HTML-Template-Aufwand.

(Mehr nicht für Phase 1 — keine Teilnehmer-Bestätigungen weil keine Emails der Teilnehmer vorhanden sind.)

---

## Deployment

**GitHub:**
```bash
gh repo create Moziaix/soussol --private --source=. --push
```

**Vercel:**
- Import Repo, Framework: Next.js
- Env-Vars 1:1 aus `.env.local` übernehmen, `NEXT_PUBLIC_SITE_URL` auf `https://sous.club`
- Domain `sous.club` hinzufügen — DNS bei World4You: A-Record `@` → `216.198.79.1`, CNAME `www` → `cname.vercel-dns.com`
- `soussol.at` als zweite Domain hinzufügen, in Vercel Domain-Settings als Redirect zu `sous.club` einrichten

**Build-Check vor Push:**
```bash
npm run build
npm run lint
```

---

## Out of Scope (Scope-Guard — bewusst weglassen)

- ❌ Bezahlung / Stripe (alles vor Ort, kostet teilweise nichts)
- ❌ Mehrsprachigkeit (DE-only)
- ❌ Newsletter-System (Strava + Insta reichen)
- ❌ Shop / Merchandise
- ❌ Live-Stream
- ❌ Mitgliederbereich mit individuellen Profilen
- ❌ Push-Notifications
- ❌ Cookie-Banner für Analytics — wir tracken nicht, also brauchen wir keinen

---

## Akzeptanzkriterien (Done-Definition)

- [ ] Code-Gate funktioniert: falscher Code → kein Zugang, korrekter → 30 Tage Cookie
- [ ] Admin kann Code rotieren, alte Cookies werden ungültig
- [ ] Tim kann ein Event anlegen und es erscheint öffentlich auf `/upcoming`
- [ ] Anmeldung schickt Tim eine Mail via Resend
- [ ] `registration_enabled=false` versteckt das Anmeldeformular auf der Event-Seite
- [ ] Tim kann Memento mit Foto hochladen
- [ ] Memento erscheint auf Public-Canvas, ist anklickbar, öffnet Modal mit Body-Text
- [ ] Tim kann Memento auf Canvas verschieben + rotieren, gespeicherte Position lädt korrekt
- [ ] Mobile: Canvas dragbar mit Touch, Modal sauber
- [ ] `npm run build` läuft fehlerfrei
- [ ] Lighthouse: Performance ≥ 85, SEO ≥ 90, Accessibility ≥ 85
- [ ] Impressum + Datenschutz vollständig + verlinkt
- [ ] Vercel deployed, sous.club live mit HTTPS

---

## Was ich (Studioaix) vorab erledige bevor Claude Code startet

- [ ] Domain `sous.club` + `soussol.at` bei World4You registrieren
- [ ] Supabase Projekt anlegen (Region Frankfurt)
- [ ] Schema `soussol-schema.sql` ausführen
- [ ] Storage Bucket `mementos` (kommt automatisch via Schema)
- [ ] Tim-Login in Supabase Auth anlegen, Sign-Ups deaktivieren
- [ ] Resend Account, `sous.club` als Domain verifizieren
- [ ] Vercel Account verknüpfen, GitHub `Moziaix/soussol` (Private) erstellt
- [ ] Tim's Daten für Impressum bekommen (Anschrift, E-Mail, Telefon)
- [ ] Erste 3 vergangene Events von Tim als Material (Fotos, Daten, kurze Beschreibungen) für initiales Archive-Befüllen

---

**Wenn du, Claude Code, an irgendeiner Stelle unsicher bist (Designentscheidung, Datenmodell-Erweiterung, Library-Wahl), frag mich** — lieber kurze Rückfrage als versteckte Annahme.
