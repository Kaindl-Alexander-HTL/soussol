# Lokal testen — alles inkl. Fake-Bezahlung

Branch: `integration/dev-test` (Membership + Tickets zusammen).
Ziel: die ganze App lokal durchklicken, inkl. Stripe-Fake-Zahlung.

Was **nur du** tun kannst, ist mit 🔑 markiert (Accounts/Keys). Der Rest ist vorbereitet.

---

## 1. 🔑 Eigenes Supabase-Projekt anlegen (~5 Min)
- [supabase.com](https://supabase.com) → New Project. Passwort merken.
- **SQL Editor** → Inhalt von `supabase/dev/schema-full.sql` einfügen → **Run**.
- **SQL Editor** → Inhalt von `supabase/dev/seed.sql` einfügen → **Run** (Testdaten).
- **Authentication → Users → Add user**: E-Mail + Passwort für den Admin-Login (Tim).
  Danach **Authentication → Providers/Settings → „Allow new users to sign up" AUS**.
- **Settings → API**: `Project URL`, `anon public` key, `service_role` key kopieren.

## 2. 🔑 Stripe Test-Key holen
- [dashboard.stripe.com](https://dashboard.stripe.com) → oben rechts **Test mode** AN.
- **Developers → API keys** → `Secret key` (`sk_test_...`) kopieren.

## 3. `.env.local` anlegen
```bash
cp .env.local.example .env.local
```
Werte eintragen: die drei Supabase-Werte, `STRIPE_SECRET_KEY=sk_test_...`,
`ACCESS_COOKIE_SECRET` (beliebiger Zufallsstring), `ADMIN_EMAIL`.
`RESEND_API_KEY=re_dummy` und `NEXT_PUBLIC_SITE_URL=http://localhost:3000` können so bleiben.

## 4. Stripe-Webhook lokal weiterleiten (fuer Fake-Zahlung)
Die Stripe CLI ist bereits installiert.
```bash
stripe login
stripe listen --forward-to localhost:3000/api/tickets/webhook
```
Der Befehl gibt ein `whsec_...` aus → als `STRIPE_WEBHOOK_SECRET` in `.env.local` eintragen.
**Dieses Terminal offen lassen** (leitet Stripe-Events an deinen lokalen Webhook weiter).

## 5. App starten (zweites Terminal)
```bash
npm install
npm run dev
```
→ http://localhost:3000

---

## 6. Durchklicken

**Landing / Long-Press (G)**
- `/` — „Events" und „Enter" sichtbar. Kreis rechts oben **gedrückt halten** (~1,1s) → landet auf `/apply`.

**Bewerbung → Mitglied (B + C)**
- `/apply` ausfüllen → absenden.
- `/admin/login` (der in Schritt 1 angelegte User) → **Members** → Bewerbung **Akzeptieren**
  → Mitglied (outer) entsteht, Invite-Mail wird versucht (Dummy-Resend = still fehlgeschlagen, egal).

**Mitglied-Zugang (A)**
- Link-Weg: `http://localhost:3000/api/enter?token=TESTTOKENOUTER0000000000000000000` → landet im `/archive`.
- Code-Weg: `/enter` → Token `TESTTOKENOUTER0000000000000000000` eintippen.
- `surrounding` testen: Token `TESTTOKENSURR00000000000000000000` → kein Archiv-Zugang (zurueck zu `/enter`).

**Fake-Bezahlung / Tickets (Stripe)**
- `/event/winter-cup` → Ticket-Typ wählen, Menge, Name, E-Mail → **Zur Kasse**.
- Stripe-Checkout: Karte `4242 4242 4242 4242`, Ablauf **beliebig in der Zukunft**, CVC **beliebig**, PLZ beliebig.
- Nach Zahlung → zurück auf `/event/winter-cup?ticket=success` → „Zahlung erfolgreich".
- Im `stripe listen`-Terminal siehst du `checkout.session.completed` → der Webhook setzt die
  Order auf `paid`. Prüfen unter `/admin/events` → **Winter Indoor Cup** → **Verkäufe**.

**Externes Turnier (F)**
- `/event/volleyball-turnier` → **Anmelden** → leitet zur (Beispiel-)Partner-URL weiter.

---

## Hinweise
- Archiv-Canvas ist leer (keine Bilder geseedet) — das ist ok, die Gating-Logik testet trotzdem.
- E-Mails gehen mit `re_dummy` nicht raus (fire-and-forget). Für echte Mails einen echten
  `RESEND_API_KEY` eintragen.
- Dieses Setup ist **Dev/Test** auf deinem eigenen Projekt. Die Produktion-Übernahme (echte Daten
  vom Kollegen migrieren) ist davon unabhängig und weiterhin offen.
