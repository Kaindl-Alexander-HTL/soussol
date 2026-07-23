# Ticket-System für bezahlte Events (Stripe Checkout)

**Datum:** 2026-07-23
**Status:** Approved, bereit für Implementierungsplan

## Kontext & Ziel

Der Host (Tim) soll ein Volleyball-Turnier hosten können, bei dem Tickets ausschließlich über die bestehende SOUS-SOL-App gekauft werden. Tickets können nur über die App erworben werden — kein externer Shop.

Wichtiger Hinweis zum Scope: [soussol-build-prompt.md](../../../../soussol-build-prompt.md) listet unter "Out of Scope" explizit `❌ Bezahlung / Stripe (alles vor Ort, kostet teilweise nichts)`. Dieses Feature ist eine bewusste Erweiterung des ursprünglichen Scopes, kein Widerspruch dazu.

Die App ist Next.js 16 (App Router) + Supabase, mit einem bestehenden Gratis-RSVP-Flow (`events` + `registrations` Tabellen, `app/api/register/route.ts`, `components/RegistrationForm.tsx`) und einem eigenen Cookie-Gate (`sous_pass`, siehe `lib/access-cookie.ts`, `proxy.ts`).

Ziel ist kein One-Off-Hack nur fürs Volleyball-Turnier, sondern ein generisches Feature: jedes zukünftige Event kann optional kostenpflichtig sein.

## Entscheidungen aus dem Brainstorming

| Frage | Entscheidung |
|---|---|
| Scope | Generisch für alle Events, nicht nur dieses Turnier |
| Ticket-Einheit | Konfigurierbar pro Ticket-Typ (`capacity_per_ticket`), nicht global fest — deckt Einzel- und Team-Tickets gleichzeitig ab |
| Zugriff | Ticket-Kauf bleibt hinter dem bestehenden `sous_pass`-Cookie-Gate |
| Nachweis nach Kauf | Nur Bestätigungsmail (kein QR-Code/Scanning in V1) |
| Kapazität | Bei ausverkauft: Kauf-Button deaktiviert, keine Warteliste für bezahlte Tickets |
| Admin-Sicht | Ja — Ticket-Liste + Umsatz pro Event im bestehenden Admin-Bereich |
| Stripe-Account | Noch nicht vorhanden — Setup als Voraussetzung dokumentiert, nicht Teil der Code-Implementierung |
| Integrationsansatz | Stripe Checkout Session (Redirect), nicht Payment Element (embedded) oder Payment Links (No-Code) |

## Architektur-Übersicht

```
Gated User → TicketPurchaseForm → POST /api/tickets/checkout
                                        → legt ticket_orders (pending) an
                                        → erstellt Stripe Checkout Session
                                        → Redirect zu Stripe
Stripe Checkout (hosted) → Zahlung → Redirect zurück zu /event/[slug]?ticket=success
                          → gleichzeitig: Webhook POST /api/tickets/webhook
                                        → verifiziert Signatur
                                        → markiert ticket_orders als paid (idempotent)
                                        → sendet Bestätigungsmail + Admin-Mail
Admin → EventForm (Ticket-Typen verwalten) + Event-Detailseite (Verkäufe/Umsatz)
```

Der Webhook ist die einzige vertrauenswürdige Quelle für "bezahlt" — der `success_url`-Redirect ist rein kosmetisch (zeigt eine Erfolgsmeldung), da er client-seitig manipulierbar wäre.

## Datenmodell (Supabase)

### `events` — neue Spalte

- `ticketing_enabled boolean default false` — analog zu `registration_enabled`. Ein Event ist entweder Gratis-RSVP oder Ticket-Verkauf, nie beides gleichzeitig.

### `ticket_types` (neu)

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid, PK | |
| `event_id` | uuid, FK → events | |
| `name` | text | z.B. "Team-Ticket (6 Spieler)" |
| `price_cents` | int | Preis in Cent (EUR). Integer statt Float, weil (a) Stripe `unit_amount` als Integer in der kleinsten Währungseinheit erwartet, (b) Fließkomma-Rundungsfehler bei Geldbeträgen vermieden werden |
| `capacity_per_ticket` | int, default 1 | 1 = Einzelticket, N = Team-Ticket für bis zu N Spieler |
| `max_tickets` | int, nullable | Kontingent dieses Typs, null = unbegrenzt |
| `is_active` | boolean, default true | Deaktivieren statt Löschen (Referenzintegrität mit bestehenden Orders) |

### `ticket_orders` (neu)

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid, PK | |
| `event_id`, `ticket_type_id` | uuid, FK | |
| `buyer_name` | text | Pflichtfeld |
| `buyer_email` | text | Pflichtfeld (im Gegensatz zu `registrations`, wo Kontakt optional ist — hier zwingend für Stripe-Receipt + Bestätigungsmail) |
| `quantity` | int | Anzahl gekaufter Tickets dieses Typs |
| `total_amount_cents` | int | Preis-Snapshot zum Kaufzeitpunkt (spätere Preisänderungen verfälschen alte Orders nicht) |
| `stripe_checkout_session_id` | text, unique | Idempotenz-Schlüssel, verhindert doppelte Verarbeitung |
| `stripe_payment_intent_id` | text, nullable | Referenz für Refund-Zuordnung |
| `status` | text: `pending / paid / failed / refunded` | |
| `created_at` | timestamptz | |

Verkaufte Kapazität eines Ticket-Typs = `sum(quantity * capacity_per_ticket)` über alle Orders mit `status='paid'`.

## API-Routen

### `POST /api/tickets/checkout`

Folgt dem Muster von `app/api/register/route.ts`.

1. Cookie-Gate-Check (`sous_pass`), wie im bestehenden `isGated()`.
2. Zod-Validierung: `event_id`, `ticket_type_id`, `quantity` (max. 20 pro Order, verhindert versehentliches/böswilliges Blockieren des gesamten Kontingents), `buyer_name`, `buyer_email`.
3. Lädt `ticket_type` + `event`; prüft `ticketing_enabled`, `is_active`.
4. **Soft-Kapazitätscheck**: verbleibendes Kontingent gegen `quantity` prüfen. Kein Lock — siehe Race-Condition-Handling unten.
5. Legt `ticket_orders`-Zeile mit `status='pending'` an.
6. Erstellt Stripe Checkout Session:
   - `line_items`: ein Posten, `price_data.unit_amount = price_cents`, `currency = 'eur'`, `quantity`.
   - `metadata.order_id` — Verknüpfung für den Webhook, unabhängig von Client-Daten.
   - `success_url`: `/event/[slug]?ticket=success`, `cancel_url`: `/event/[slug]?ticket=cancelled`.
7. Response: `{ url: session.url }`. Client macht `window.location.href = url` — kein Stripe.js im Frontend nötig.

### `POST /api/tickets/webhook`

Kein Cookie-Gate (Stripe hat keinen Community-Cookie) — Sicherheit über Signaturprüfung.

1. Verifiziert `stripe-signature`-Header via `stripe.webhooks.constructEvent(...)` gegen `STRIPE_WEBHOOK_SECRET`. Ungültige Signatur → 400, Request verworfen.
2. Event `checkout.session.completed`:
   - Lädt `ticket_orders` über `metadata.order_id`.
   - Idempotenz: bereits `paid` → 200, keine weitere Aktion.
   - **Harter Kapazitäts-Recheck**: bei Überbuchung durch Zeitrennen trotzdem als `paid` markieren (Geld ist geflossen), aber Admin-Mail mit `⚠️ ÜBERBUCHT`-Kennzeichnung zur manuellen Klärung durch Tim. Kein automatischer Refund in V1.
   - Setzt `status='paid'`, speichert `payment_intent_id`.
   - Fire-and-forget: `sendTicketConfirmation` (an Käufer) + `sendTicketSaleNotification` (an Admin).
3. Event `charge.refunded`:
   - Setzt zugehörige Order auf `status='refunded'`, damit die Admin-Umsatzsumme korrekt bleibt. Kein eigener Refund-Button in der App — Rückerstattungen laufen über das Stripe Dashboard.
4. Andere Events werden ignoriert. `checkout.session.expired` braucht keine explizite Behandlung — die Order bleibt einfach `pending` (zählt nirgends als verkauft).

## Frontend

### `components/TicketPurchaseForm.tsx` (neu)

Analog zu `RegistrationForm.tsx` (State-Machine `idle/loading/error`, gleiches visuelles Vokabular: `border-white/8`, `tracking-[0.25em]` etc.):

- Zeigt verfügbare `ticket_types` (Name, Preis, Restkontingent), Mengenfeld, Name + E-Mail (Pflicht).
- Ausverkaufte Typen sind in der Auswahl deaktiviert.
- Submit → `POST /api/tickets/checkout` → bei Erfolg Redirect zu `json.url`. Kein inline "success"-State, da der eigentliche Erfolg erst nach Rückkehr von Stripe sichtbar wird.

### `app/(gated)/event/[slug]/page.tsx` (Erweiterung)

- Neuer Zweig: wenn `event.ticketing_enabled`, lade `ticket_types` + verkaufte Menge, rendere `<TicketPurchaseForm/>` statt `<RegistrationForm/>`.
- Liest `searchParams.ticket` (`success` / `cancelled`) und zeigt einen entsprechenden Banner oberhalb der Form.

## Admin

### `components/admin/EventForm.tsx` (Erweiterung)

- Toggle `ticketing_enabled`.
- Verwaltung der `ticket_types` für das Event: Name, Preis, `capacity_per_ticket`, `max_tickets` — Add/Edit/Deaktivieren (kein Löschen, wegen Order-Referenzen).

### `app/admin/(protected)/events/[id]/page.tsx` (Erweiterung)

- Neue Sektion: Tabelle aller `ticket_orders` mit `status='paid'` (Käufer, Ticket-Typ, Menge, Betrag, Zeitpunkt) + Summenzeile (Gesamtumsatz, Anzahl Tickets). Reiner Lesezugriff.

## E-Mail (`lib/email.ts`-Erweiterung)

Zwei neue Funktionen, gleiches Muster wie `sendRegistrationNotification`:

- `sendTicketConfirmation(params)` → an `buyer_email`: Ticket-Details (Event, Typ, Menge, Betrag).
- `sendTicketSaleNotification(params)` → an `ADMIN_EMAIL`: gleiche Info, plus `⚠️ ÜBERBUCHT`-Kennzeichnung im Überbuchungsfall.

## Sicherheit & Edge Cases

- Webhook-Signaturprüfung ist die einzige Quelle der Wahrheit für "bezahlt". Kein anderer Codepfad darf `status='paid'` setzen.
- Mengenlimit pro Order (max. 20) verhindert Kontingent-Blockade durch eine einzelne Bestellung.
- `checkout.session.expired`: Stripe verwirft offene Sessions nach 24h automatisch — kein eigener Cleanup-Job in V1.
- Race Condition bei knappem Kontingent (zwei gleichzeitige Käufer): Soft-Check vor Session-Erstellung + harter Recheck im Webhook. Bei echter Überbuchung: manuelle Klärung durch Tim via markierter Mail statt automatischem Refund — für ein Community-Turnier mit überschaubarem Traffic ist ein DB-Lock nicht gerechtfertigt.
- Kein Stripe.js im Frontend nötig (Redirect-Flow), dadurch kein PCI-Scope in der eigenen App.

## Setup-Voraussetzungen (kein Code)

Kein Stripe-Account vorhanden — Tim muss vor Live-Betrieb:

1. Stripe-Account unter dashboard.stripe.com anlegen (Test-Mode funktioniert ohne Verifizierung, Live-Mode braucht Geschäftsdaten/KYC).
2. API-Keys aus dem Dashboard holen → `STRIPE_SECRET_KEY` in `.env.local` + Vercel Env-Vars (gleiches Muster wie bestehender Deploy-Abschnitt in `soussol-build-prompt.md`).
3. Nach Deploy: Webhook-Endpoint auf `https://sous.club/api/tickets/webhook` im Stripe Dashboard anlegen, Events `checkout.session.completed` + `charge.refunded` abonnieren, Signing Secret als `STRIPE_WEBHOOK_SECRET` eintragen.

Das Feature ist vollständig im Test-Mode durchspielbar, sobald Test-Keys vorhanden sind. Live-Umschaltung ist danach nur ein Key-Tausch, kein Code-Change.

## Testplan

- Lokal: Stripe CLI (`stripe listen --forward-to localhost:3000/api/tickets/webhook`) für lokale Webhook-Zustellung.
- End-to-End mit Testkarte `4242 4242 4242 4242`: Event + Ticket-Typ anlegen → Kauf → Stripe-Checkout → Zahlung → Redirect zurück → Status `pending → paid` → Bestätigungsmail an Käufer + Admin-Mail → Eintrag in Admin-Übersicht sichtbar.
- Abbruch-Pfad: Checkout abbrechen → `cancelled`-Banner, Order bleibt `pending`.
- Kapazität: `max_tickets` niedrig setzen, Kauf-Button deaktiviert sich bei Ausverkauf.
- Vor jedem Push: `npm run build && npm run lint` (bestehender Projekt-Standard).

## Out of Scope (V1)

- QR-Code-Check-in / Scanning-App
- Warteliste für bezahlte Tickets
- Automatischer Refund bei Überbuchung
- Rabattcodes / Gutscheine
- Mehrere Währungen (nur EUR)
- Rechnungsstellung über die eigene App (Stripe-Receipt reicht)
