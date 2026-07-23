# Ticket-System (Stripe Checkout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bezahlte Event-Tickets (z.B. für ein Volleyball-Turnier) über Stripe Checkout verkaufen, generisch für beliebige zukünftige Events, verwaltet vom Host selbst über den bestehenden Admin-Bereich.

**Architecture:** Server erstellt eine Stripe Checkout Session (Redirect-Flow, kein Stripe.js im Frontend), ein Webhook bestätigt die Zahlung serverseitig und schreibt den Status in Supabase. Der komplette Kauf-Flow läuft hinter dem bestehenden `sous_pass`-Cookie-Gate; Admin-Verwaltung läuft über die bestehende Supabase-Auth-geschützte Admin-Oberfläche.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + `@supabase/ssr`), Stripe Node SDK v22, Resend, Zod 4, Tailwind 4.

**Referenz-Spec:** [docs/superpowers/specs/payment/2026-07-23-ticket-system-design.md](../specs/payment/2026-07-23-ticket-system-design.md)

## Global Constraints

- Preise werden ausschließlich als Integer in Cent gespeichert (`price_cents`, `total_amount_cents`) — nie als Float/Euro in der DB.
- Der Webhook (`checkout.session.completed`) ist die einzige Quelle der Wahrheit für `status='paid'`. Kein anderer Codepfad darf diesen Status setzen.
- Kauf-Flow bleibt hinter dem `sous_pass`-Cookie-Gate (gleiche `isGated()`-Prüfung wie in `app/api/register/route.ts`, dort lokal dupliziert — dieses Projekt kopiert dieses Pattern pro Route statt es zu teilen, das wird hier fortgesetzt).
- Admin-Routen nutzen den bestehenden `requireAdmin()`-Pattern (Supabase Auth via `createClient()` aus `lib/supabase/server.ts`), lokal pro Route dupliziert wie in `app/api/admin/events/route.ts`.
- Alle Schreibzugriffe auf `ticket_types`/`ticket_orders` laufen über `supabaseAdmin` (Service-Role) — nie über den anon Client.
- Kein Testframework im Projekt vorhanden (kein Jest/Vitest) — Verifikation erfolgt über `npm run build`, `npm run lint`, manuelle curl-Aufrufe und den Stripe-Test-Mode-Flow, analog zum bestehenden `soussol-build-prompt.md`-Standard.
- `capacity_per_ticket` ist "Plätze pro Ticket" (1 = Einzelticket, N = Team-Ticket). `max_tickets` ist die maximale Summe an **Plätzen** (`quantity * capacity_per_ticket`), nicht die Anzahl verkaufter Ticket-Einheiten — das war die im Spec festgelegte Formel.

---

## File Structure Overview

| Datei | Aktion | Zweck |
|---|---|---|
| `lib/stripe.ts` | neu | Stripe-Client-Singleton |
| `supabase/ticket-system-schema.sql` | neu | Schema-Änderungen, manuell in Supabase SQL Editor auszuführen |
| `lib/types.ts` | erweitert | `TicketType`, `TicketOrder`, `TicketOrderStatus` |
| `lib/email.ts` | erweitert | `sendTicketConfirmation`, `sendTicketSaleNotification` |
| `app/api/tickets/checkout/route.ts` | neu | Erstellt Order + Stripe Checkout Session |
| `app/api/tickets/webhook/route.ts` | neu | Verifiziert Zahlung, setzt Order-Status, verschickt Mails |
| `components/TicketPurchaseForm.tsx` | neu | Kauf-Formular auf der Event-Seite |
| `app/(gated)/event/[slug]/page.tsx` | erweitert | Rendert Ticket-Form statt Gratis-Form, zeigt Success/Cancel-Banner |
| `app/api/admin/ticket-types/route.ts` | neu | Admin-CRUD für Ticket-Typen |
| `app/api/admin/events/route.ts` | erweitert | `ticketing_enabled` in create/update-Schema |
| `components/admin/EventForm.tsx` | erweitert | Toggle für `ticketing_enabled` |
| `app/admin/(protected)/events/[id]/page.tsx` | erweitert | Ticket-Typ-Verwaltung + Verkaufsübersicht |
| `components/admin/TicketTypesManager.tsx` | neu | Admin-UI zum Anlegen/Bearbeiten/Deaktivieren von Ticket-Typen |

---

### Task 1: Dependencies & Stripe-Client

**Files:**
- Modify: `package.json`
- Create: `lib/stripe.ts`

**Interfaces:**
- Produces: `stripe: Stripe` (Singleton-Instanz), importierbar via `import { stripe } from '@/lib/stripe'`

- [ ] **Step 1: Stripe SDK installieren**

Run: `npm install stripe@^22.3.2`

Expected: `package.json`-Dependencies enthalten `"stripe": "^22.3.2"`, `package-lock.json` aktualisiert.

- [ ] **Step 2: Stripe-Client-Singleton schreiben**

Create `lib/stripe.ts`:

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
```

- [ ] **Step 3: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch (Stripe-Key ist zur Build-Zeit nicht nötig, `lib/stripe.ts` wird nur bei Import ausgeführt, kein Top-Level-API-Call).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/stripe.ts
git commit -m "feat: add stripe dependency and client singleton

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Datenbank-Schema

**Files:**
- Create: `supabase/ticket-system-schema.sql`

**Interfaces:**
- Produces: Spalte `events.ticketing_enabled`, Tabellen `ticket_types`, `ticket_orders` — von allen folgenden Tasks vorausgesetzt.

- [ ] **Step 1: Schema-SQL schreiben**

Create `supabase/ticket-system-schema.sql`:

```sql
-- Ticket-System für bezahlte Events (Stripe Checkout).
-- Einmalig im Supabase SQL Editor ausführen.

alter table events
  add column if not exists ticketing_enabled boolean not null default false;

create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  capacity_per_ticket integer not null default 1 check (capacity_per_ticket >= 1),
  max_tickets integer check (max_tickets is null or max_tickets >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ticket_types_event_id_idx on ticket_types(event_id);

create table if not exists ticket_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id) on delete restrict,
  buyer_name text not null,
  buyer_email text not null,
  quantity integer not null check (quantity >= 1),
  total_amount_cents integer not null check (total_amount_cents >= 0),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists ticket_orders_event_id_idx on ticket_orders(event_id);
create index if not exists ticket_orders_ticket_type_id_idx on ticket_orders(ticket_type_id);
create index if not exists ticket_orders_status_idx on ticket_orders(status);

-- RLS: ticket_types dürfen öffentlich (anon) gelesen werden, aber nur aktive —
-- damit die Event-Seite Namen/Preise anzeigen kann. Alles andere (inkl. jeglicher
-- Zugriff auf ticket_orders, das Käufer-PII und Zahlungsdaten enthält) läuft
-- ausschließlich über den Service-Role-Client (supabaseAdmin) in Server-Code,
-- der RLS grundsätzlich umgeht — analog zum bestehenden Pattern in
-- app/(gated)/layout.tsx und app/enter/page.tsx.

alter table ticket_types enable row level security;

create policy "Public can read active ticket types"
  on ticket_types for select
  using (is_active = true);

alter table ticket_orders enable row level security;
-- Bewusst keine Policies auf ticket_orders — weder anon noch authenticated
-- bekommen direkten Zugriff, nur supabaseAdmin (bypasst RLS).
```

- [ ] **Step 2: Schema im Supabase Dashboard ausführen**

Im Supabase-Projekt-Dashboard → SQL Editor → Inhalt von `supabase/ticket-system-schema.sql` einfügen und ausführen.

- [ ] **Step 3: Anlage verifizieren**

Im SQL Editor ausführen:

```sql
select column_name from information_schema.columns where table_name = 'events' and column_name = 'ticketing_enabled';
select table_name from information_schema.tables where table_name in ('ticket_types', 'ticket_orders');
```

Expected: Beide Queries liefern die erwarteten Zeilen zurück (1 Zeile bzw. 2 Zeilen).

- [ ] **Step 4: Commit**

```bash
git add supabase/ticket-system-schema.sql
git commit -m "feat: add ticket_types/ticket_orders schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Shared Types

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `TicketType`, `TicketOrder`, `TicketOrderStatus` — importierbar via `import type { TicketType, TicketOrder, TicketOrderStatus } from '@/lib/types'`

- [ ] **Step 1: Typen ergänzen**

Append to `lib/types.ts`:

```typescript
export type TicketType = {
  id: string
  event_id: string
  name: string
  price_cents: number
  capacity_per_ticket: number
  max_tickets: number | null
  is_active: boolean
  created_at: string
}

export type TicketOrderStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type TicketOrder = {
  id: string
  event_id: string
  ticket_type_id: string
  buyer_name: string
  buyer_email: string
  quantity: number
  total_amount_cents: number
  stripe_checkout_session_id: string
  stripe_payment_intent_id: string | null
  status: TicketOrderStatus
  created_at: string
}
```

- [ ] **Step 2: Typecheck verifizieren**

Run: `npm run build`
Expected: Build läuft durch, keine TypeScript-Fehler.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TicketType and TicketOrder types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: E-Mail-Funktionen

**Files:**
- Modify: `lib/email.ts`

**Interfaces:**
- Consumes: nichts Neues (nutzt bestehenden `resend`-Client und `format`/`de`-Import, bereits in der Datei vorhanden)
- Produces: `sendTicketConfirmation(params: TicketConfirmationParams): Promise<void>`, `sendTicketSaleNotification(params: TicketSaleNotificationParams): Promise<void>`

- [ ] **Step 1: Funktionen anhängen**

Append to `lib/email.ts`:

```typescript
type TicketConfirmationParams = {
  buyerName: string
  buyerEmail: string
  eventTitle: string
  startsAt: string
  ticketTypeName: string
  quantity: number
  totalAmountCents: number
}

export async function sendTicketConfirmation(params: TicketConfirmationParams) {
  const { buyerName, buyerEmail, eventTitle, startsAt, ticketTypeName, quantity, totalAmountCents } = params

  const dateStr = format(new Date(startsAt), 'dd. MMMM yyyy, HH:mm', { locale: de })
  const amountStr = (totalAmountCents / 100).toFixed(2).replace('.', ',')

  const text = [
    `Hallo ${buyerName},`,
    '',
    `dein Ticket für ${eventTitle} ist bestätigt.`,
    '',
    `Ticket:  ${ticketTypeName}`,
    `Menge:   ${quantity}`,
    `Betrag:  ${amountStr} €`,
    `Datum:   ${dateStr}`,
    '',
    'Bis dann.',
  ].join('\n')

  await resend.emails.send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: buyerEmail,
    subject: `Ticket bestätigt — ${eventTitle}`,
    text,
  })
}

type TicketSaleNotificationParams = {
  buyerName: string
  buyerEmail: string
  eventTitle: string
  ticketTypeName: string
  quantity: number
  totalAmountCents: number
  overbooked: boolean
}

export async function sendTicketSaleNotification(params: TicketSaleNotificationParams) {
  const { buyerName, buyerEmail, eventTitle, ticketTypeName, quantity, totalAmountCents, overbooked } = params

  const amountStr = (totalAmountCents / 100).toFixed(2).replace('.', ',')
  const subject = overbooked
    ? `⚠️ ÜBERBUCHT — ${buyerName} — ${eventTitle}`
    : `Neuer Ticket-Verkauf: ${buyerName} — ${eventTitle}`

  const lines = [
    overbooked ? '⚠️ ÜBERBUCHT — MANUELL PRÜFEN' : 'NEUER TICKET-VERKAUF',
    '',
    `Käufer:  ${buyerName}`,
    `E-Mail:  ${buyerEmail}`,
    `Event:   ${eventTitle}`,
    `Ticket:  ${ticketTypeName}`,
    `Menge:   ${quantity}`,
    `Betrag:  ${amountStr} €`,
  ]

  await resend.emails.send({
    from: 'SOUS SOL <noreply@soussol-archive.com>',
    to: process.env.ADMIN_EMAIL!,
    subject,
    text: lines.join('\n'),
  })
}
```

- [ ] **Step 2: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add ticket confirmation and sale notification emails

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Checkout-API-Route

**Files:**
- Create: `app/api/tickets/checkout/route.ts`

**Interfaces:**
- Consumes: `stripe` (`lib/stripe.ts`), `supabaseAdmin` (`lib/supabase/admin.ts`), `verifyCookie` (`lib/access-cookie.ts`)
- Produces: `POST /api/tickets/checkout` — Request-Body `{ event_id: string, ticket_type_id: string, quantity: number, buyer_name: string, buyer_email: string }`, Response `{ url: string }` (200) oder `{ error: string }` (400/401/404/409/500)

- [ ] **Step 1: Route schreiben**

Create `app/api/tickets/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { verifyCookie } from '@/lib/access-cookie'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const schema = z.object({
  event_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  buyer_name: z.string().min(1).max(200),
  buyer_email: z.string().email().max(200),
})

async function isGated(): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('sous_pass')?.value
  if (!cookieValue) return false
  const { valid, code } = verifyCookie(cookieValue)
  if (!valid) return false
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'access_code')
    .single()
  const current = (data?.value as { code: string } | null)?.code
  return code === current
}

export async function POST(request: NextRequest) {
  if (!(await isGated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { event_id, ticket_type_id, quantity, buyer_name, buyer_email } = parsed.data

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, slug, ticketing_enabled, status')
    .eq('id', event_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 })
  }
  if (!event.ticketing_enabled || event.status !== 'upcoming') {
    return NextResponse.json({ error: 'Ticket-Verkauf nicht möglich.' }, { status: 409 })
  }

  const { data: ticketType } = await supabaseAdmin
    .from('ticket_types')
    .select('id, event_id, name, price_cents, capacity_per_ticket, max_tickets, is_active')
    .eq('id', ticket_type_id)
    .single()

  if (!ticketType || ticketType.event_id !== event_id || !ticketType.is_active) {
    return NextResponse.json({ error: 'Ticket-Typ nicht verfügbar.' }, { status: 404 })
  }

  if (ticketType.max_tickets !== null) {
    const { data: paidOrders } = await supabaseAdmin
      .from('ticket_orders')
      .select('quantity')
      .eq('ticket_type_id', ticket_type_id)
      .eq('status', 'paid')

    const soldSpots = (paidOrders ?? []).reduce(
      (sum, o) => sum + o.quantity * ticketType.capacity_per_ticket,
      0
    )
    const requestedSpots = quantity * ticketType.capacity_per_ticket

    if (soldSpots + requestedSpots > ticketType.max_tickets) {
      return NextResponse.json({ error: 'Nicht genug Plätze mehr verfügbar.' }, { status: 409 })
    }
  }

  const totalAmountCents = ticketType.price_cents * quantity
  const orderId = randomUUID()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: buyer_email,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: ticketType.price_cents,
          product_data: { name: ticketType.name },
        },
        quantity,
      },
    ],
    metadata: { order_id: orderId },
    success_url: `${request.nextUrl.origin}/event/${event.slug}?ticket=success`,
    cancel_url: `${request.nextUrl.origin}/event/${event.slug}?ticket=cancelled`,
  })

  const { error: insertError } = await supabaseAdmin.from('ticket_orders').insert({
    id: orderId,
    event_id,
    ticket_type_id,
    buyer_name,
    buyer_email,
    quantity,
    total_amount_cents: totalAmountCents,
    stripe_checkout_session_id: session.id,
    status: 'pending',
  })

  if (insertError || !session.url) {
    return NextResponse.json({ error: 'Fehler beim Erstellen der Bestellung.' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 2: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch, keine TypeScript-Fehler (insbesondere bei den Stripe-Typen für `line_items`/`price_data`).

- [ ] **Step 3: Manuell mit curl gegen 401 testen**

Run (Dev-Server muss laufen: `npm run dev`):

```bash
curl -s -X POST http://localhost:3000/api/tickets/checkout \
  -H "Content-Type: application/json" \
  -d '{"event_id":"00000000-0000-0000-0000-000000000000","ticket_type_id":"00000000-0000-0000-0000-000000000000","quantity":1,"buyer_name":"Test","buyer_email":"test@example.com"}'
```

Expected: `{"error":"Unauthorized"}` mit Status 401, da kein `sous_pass`-Cookie mitgeschickt wird.

- [ ] **Step 4: Commit**

```bash
git add app/api/tickets/checkout/route.ts
git commit -m "feat: add ticket checkout API route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Webhook-API-Route

**Files:**
- Create: `app/api/tickets/webhook/route.ts`

**Interfaces:**
- Consumes: `stripe` (`lib/stripe.ts`), `supabaseAdmin`, `sendTicketConfirmation`, `sendTicketSaleNotification` (`lib/email.ts`)
- Produces: `POST /api/tickets/webhook` — von Stripe aufgerufen, kein Frontend-Konsument

- [ ] **Step 1: Route schreiben**

Create `app/api/tickets/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTicketConfirmation, sendTicketSaleNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature invalid: ${(err as Error).message}` },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (orderId) {
      const { data: order } = await supabaseAdmin
        .from('ticket_orders')
        .select('id, status, event_id, ticket_type_id, buyer_name, buyer_email, quantity, total_amount_cents')
        .eq('id', orderId)
        .single()

      if (order && order.status !== 'paid') {
        const { data: ticketType } = await supabaseAdmin
          .from('ticket_types')
          .select('name, capacity_per_ticket, max_tickets')
          .eq('id', order.ticket_type_id)
          .single()

        const { data: eventRow } = await supabaseAdmin
          .from('events')
          .select('title, starts_at')
          .eq('id', order.event_id)
          .single()

        let overbooked = false
        if (ticketType?.max_tickets != null) {
          const { data: paidOrders } = await supabaseAdmin
            .from('ticket_orders')
            .select('quantity')
            .eq('ticket_type_id', order.ticket_type_id)
            .eq('status', 'paid')

          const soldSpots = (paidOrders ?? []).reduce(
            (sum, o) => sum + o.quantity * ticketType.capacity_per_ticket,
            0
          )
          overbooked = soldSpots + order.quantity * ticketType.capacity_per_ticket > ticketType.max_tickets
        }

        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null)

        await supabaseAdmin
          .from('ticket_orders')
          .update({ status: 'paid', stripe_payment_intent_id: paymentIntentId })
          .eq('id', order.id)

        sendTicketConfirmation({
          buyerName: order.buyer_name,
          buyerEmail: order.buyer_email,
          eventTitle: eventRow?.title ?? '',
          startsAt: eventRow?.starts_at ?? new Date().toISOString(),
          ticketTypeName: ticketType?.name ?? '',
          quantity: order.quantity,
          totalAmountCents: order.total_amount_cents,
        }).catch(() => {})

        sendTicketSaleNotification({
          buyerName: order.buyer_name,
          buyerEmail: order.buyer_email,
          eventTitle: eventRow?.title ?? '',
          ticketTypeName: ticketType?.name ?? '',
          quantity: order.quantity,
          totalAmountCents: order.total_amount_cents,
          overbooked,
        }).catch(() => {})
      }
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent?.id ?? null)

    if (paymentIntentId) {
      await supabaseAdmin
        .from('ticket_orders')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch.

- [ ] **Step 3: Signaturprüfung manuell testen**

Run (Dev-Server muss laufen):

```bash
curl -s -X POST http://localhost:3000/api/tickets/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"type":"checkout.session.completed"}'
```

Expected: Status 400 mit `{"error":"Webhook signature invalid: ..."}` — bestätigt, dass ungültige Signaturen abgelehnt werden, bevor irgendein Datenbankzugriff passiert.

- [ ] **Step 4: Commit**

```bash
git add app/api/tickets/webhook/route.ts
git commit -m "feat: add stripe webhook route for ticket payment confirmation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: TicketPurchaseForm-Komponente

**Files:**
- Create: `components/TicketPurchaseForm.tsx`

**Interfaces:**
- Consumes: `POST /api/tickets/checkout` (Task 5)
- Produces: `TicketPurchaseForm({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketTypeWithAvailability[] })` mit `TicketTypeWithAvailability = { id: string; name: string; price_cents: number; capacity_per_ticket: number; remaining: number | null }` (`remaining` ist die Anzahl freier **Plätze**, `null` = unbegrenzt)

- [ ] **Step 1: Komponente schreiben**

Create `components/TicketPurchaseForm.tsx`:

```typescript
'use client'

import { useState } from 'react'

export type TicketTypeWithAvailability = {
  id: string
  name: string
  price_cents: number
  capacity_per_ticket: number
  remaining: number | null
}

type State = 'idle' | 'loading' | 'error'

export function TicketPurchaseForm({
  eventId,
  ticketTypes,
}: {
  eventId: string
  ticketTypes: TicketTypeWithAvailability[]
}) {
  const [ticketTypeId, setTicketTypeId] = useState(
    ticketTypes.find((t) => t.remaining === null || t.remaining >= t.capacity_per_ticket)?.id ?? ''
  )
  const [quantity, setQuantity] = useState(1)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading' || !ticketTypeId) return
    setState('loading')
    setErrorMsg('')

    const res = await fetch('/api/tickets/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(json.error ?? 'Etwas ist schiefgelaufen.')
      setState('error')
      return
    }

    window.location.href = json.url
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="border-t border-white/8 pt-12">
        <p className="font-sans text-sm text-mist">Noch keine Tickets verfügbar.</p>
      </div>
    )
  }

  return (
    <div className="border-t border-white/8 pt-12">
      <p className="mb-8 font-sans text-[10px] tracking-[0.3em] text-mist uppercase">Tickets</p>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-7">
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Ticket-Typ *</label>
          <div className="flex flex-col gap-2">
            {ticketTypes.map((t) => {
              const soldOut = t.remaining !== null && t.remaining < t.capacity_per_ticket
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={soldOut || state === 'loading'}
                  onClick={() => setTicketTypeId(t.id)}
                  className={`flex items-center justify-between border px-3 py-2 text-left font-sans text-sm transition-colors ${
                    ticketTypeId === t.id
                      ? 'border-white/40 text-spark'
                      : 'border-white/10 text-mist hover:border-white/25'
                  } disabled:opacity-30`}
                >
                  <span>{t.name}</span>
                  <span className="text-[11px]">
                    {(t.price_cents / 100).toFixed(2).replace('.', ',')} €
                    {soldOut ? ' · Ausverkauft' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Menge *</label>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">Name *</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.25em] text-mist uppercase">E-Mail *</label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            required
            disabled={state === 'loading'}
            className={inputClass}
          />
        </div>

        {errorMsg && <p className="font-sans text-[11px] text-white/40">{errorMsg}</p>}

        <button
          type="submit"
          disabled={state === 'loading' || !ticketTypeId}
          className="text-left font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {state === 'loading' ? '...' : 'Zur Kasse →'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
```

- [ ] **Step 2: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch (Komponente wird noch von niemandem importiert, aber muss isoliert typchecken).

- [ ] **Step 3: Commit**

```bash
git add components/TicketPurchaseForm.tsx
git commit -m "feat: add TicketPurchaseForm component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Event-Seite integrieren (öffentlich)

**Files:**
- Modify: `app/(gated)/event/[slug]/page.tsx`

**Interfaces:**
- Consumes: `TicketPurchaseForm`, `TicketTypeWithAvailability` (Task 7), `supabaseAdmin` (für die Kapazitätsberechnung über `ticket_orders`, das keine öffentliche RLS-Policy hat)

- [ ] **Step 1: Import ergänzen**

In `app/(gated)/event/[slug]/page.tsx`, Zeile 1-7 ersetzen durch:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { RegistrationForm } from '@/components/RegistrationForm'
import { TicketPurchaseForm, type TicketTypeWithAvailability } from '@/components/TicketPurchaseForm'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
```

- [ ] **Step 2: Ticket-Daten laden**

In `app/(gated)/event/[slug]/page.tsx`, die Funktionssignatur von `EventPage` ändern, um `searchParams` entgegenzunehmen, und nach der bestehenden `if (!event) notFound()`-Zeile (aktuell Zeile 42) die Ticket-Verfügbarkeit laden:

```typescript
export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ticket?: string }>
}) {
  const { slug } = await params
  const { ticket: ticketStatus } = await searchParams
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'upcoming')
    .single()

  if (!event) notFound()

  let ticketTypesWithAvailability: TicketTypeWithAvailability[] = []
  if (event.ticketing_enabled) {
    const { data: ticketTypes } = await supabase
      .from('ticket_types')
      .select('id, name, price_cents, capacity_per_ticket, max_tickets')
      .eq('event_id', event.id)
      .eq('is_active', true)

    const { data: paidOrders } = await supabaseAdmin
      .from('ticket_orders')
      .select('ticket_type_id, quantity')
      .eq('event_id', event.id)
      .eq('status', 'paid')

    ticketTypesWithAvailability = (ticketTypes ?? []).map((t) => {
      const soldSpots = (paidOrders ?? [])
        .filter((o) => o.ticket_type_id === t.id)
        .reduce((sum, o) => sum + o.quantity * t.capacity_per_ticket, 0)

      return {
        id: t.id,
        name: t.name,
        price_cents: t.price_cents,
        capacity_per_ticket: t.capacity_per_ticket,
        remaining: t.max_tickets !== null ? Math.max(0, t.max_tickets - soldSpots) : null,
      }
    })
  }

  const registrationOpen = event.registration_enabled
```

- [ ] **Step 3: Render-Zweig ersetzen**

Den bestehenden Block ab `{/* Registration */}` (aktuell Zeile 105-112) ersetzen durch:

```typescript
      {/* Ticket purchase / Success-Cancel banner */}
      {event.ticketing_enabled && ticketStatus === 'success' && (
        <p className="mb-8 border-t border-white/8 pt-8 font-sans text-sm text-spark">
          Zahlung erfolgreich — Bestätigung kommt per Mail.
        </p>
      )}
      {event.ticketing_enabled && ticketStatus === 'cancelled' && (
        <p className="mb-8 border-t border-white/8 pt-8 font-sans text-sm text-mist">
          Zahlung abgebrochen.
        </p>
      )}

      {event.ticketing_enabled ? (
        <TicketPurchaseForm eventId={event.id} ticketTypes={ticketTypesWithAvailability} />
      ) : registrationOpen ? (
        <RegistrationForm eventId={event.id} />
      ) : (
        <p className="border-t border-white/8 pt-10 font-sans text-sm text-mist">
          Keine Anmeldung notwendig.
        </p>
      )}
```

- [ ] **Step 4: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch, keine TypeScript-Fehler bei `searchParams`/`params` (Next 16 erwartet beide als `Promise`, siehe bestehendes `generateMetadata` in derselben Datei).

- [ ] **Step 5: Manuell im Browser verifizieren**

Run: `npm run dev`, dann im Browser ein bestehendes Gratis-Event (`registration_enabled=true`, `ticketing_enabled=false`) aufrufen.
Expected: Die bestehende `RegistrationForm` erscheint unverändert wie vor der Änderung — kein Regressionsschaden am Gratis-Flow.

- [ ] **Step 6: Commit**

```bash
git add "app/(gated)/event/[slug]/page.tsx"
git commit -m "feat: render ticket purchase form on ticketed events

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Admin-API für Ticket-Typen

**Files:**
- Create: `app/api/admin/ticket-types/route.ts`

**Interfaces:**
- Consumes: `supabaseAdmin`, `createClient` (`lib/supabase/server.ts`)
- Produces: `POST /api/admin/ticket-types` (Body: `{ event_id, name, price_cents, capacity_per_ticket?, max_tickets? }`, Response: erstellte Zeile, 201), `PATCH /api/admin/ticket-types` (Body: `{ id, ...partial fields, is_active? }`, Response: aktualisierte Zeile, 200)

- [ ] **Step 1: Route schreiben**

Create `app/api/admin/ticket-types/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const createSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  price_cents: z.number().int().min(0),
  capacity_per_ticket: z.number().int().min(1).default(1),
  max_tickets: z.number().int().min(1).nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  price_cents: z.number().int().min(0).optional(),
  capacity_per_ticket: z.number().int().min(1).optional(),
  max_tickets: z.number().int().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('ticket_types').insert(parsed.data).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, ...updates } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('ticket_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch.

- [ ] **Step 3: Unauthorized-Fall manuell testen**

Run (Dev-Server muss laufen, kein Admin-Login-Cookie gesetzt):

```bash
curl -s -X POST http://localhost:3000/api/admin/ticket-types \
  -H "Content-Type: application/json" \
  -d '{"event_id":"00000000-0000-0000-0000-000000000000","name":"Test","price_cents":1000}'
```

Expected: `{"error":"Unauthorized"}` mit Status 401.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/ticket-types/route.ts
git commit -m "feat: add admin CRUD route for ticket types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: `ticketing_enabled`-Toggle in EventForm

**Files:**
- Modify: `app/api/admin/events/route.ts`
- Modify: `components/admin/EventForm.tsx`
- Modify: `app/admin/(protected)/events/[id]/page.tsx`

**Interfaces:**
- Produces: `events.ticketing_enabled` wird über die bestehende Admin-Events-API setzbar; `EventFormValues.ticketing_enabled: boolean`

- [ ] **Step 1: Zod-Schema erweitern**

In `app/api/admin/events/route.ts`, in `createSchema` (nach der Zeile `registration_enabled: z.boolean().default(true),`) ergänzen:

```typescript
  registration_enabled: z.boolean().default(true),
  ticketing_enabled: z.boolean().default(false),
```

- [ ] **Step 2: `EventFormValues` erweitern**

In `components/admin/EventForm.tsx`, `EventFormValues`-Type (Zeile 9-20) und `defaultValues` (Zeile 22-32) ergänzen:

```typescript
export type EventFormValues = {
  id?: string
  title: string
  sport: Sport
  starts_at: string
  ends_at: string
  meeting_point: string
  description: string
  max_participants: string
  registration_enabled: boolean
  ticketing_enabled: boolean
  status: Status
}

const defaultValues: EventFormValues = {
  title: '',
  sport: 'running',
  starts_at: '',
  ends_at: '',
  meeting_point: '',
  description: '',
  max_participants: '',
  registration_enabled: true,
  ticketing_enabled: false,
  status: 'upcoming',
}
```

- [ ] **Step 3: Payload und UI-Toggle ergänzen**

In `components/admin/EventForm.tsx`, in der `submit`-Funktion (nach `registration_enabled: values.registration_enabled,`) ergänzen:

```typescript
      registration_enabled: values.registration_enabled,
      ticketing_enabled: values.ticketing_enabled,
```

Direkt nach dem bestehenden `{/* Registration enabled */}`-Block (Zeile 213-229) einen neuen Toggle einfügen:

```typescript
      {/* Ticketing enabled */}
      <Field label="Ticket-Verkauf">
        <button
          type="button"
          onClick={() => set('ticketing_enabled', !values.ticketing_enabled)}
          className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase transition-colors ${
            values.ticketing_enabled ? 'text-spark' : 'text-mist'
          }`}
        >
          <span
            className={`h-4 w-7 rounded-full border transition-colors ${
              values.ticketing_enabled ? 'border-spark bg-spark/20' : 'border-white/20 bg-transparent'
            }`}
          />
          {values.ticketing_enabled ? 'Aktiviert' : 'Deaktiviert'}
        </button>
      </Field>
```

- [ ] **Step 4: Edit-Seite anpassen**

In `app/admin/(protected)/events/[id]/page.tsx`, im `initial`-Prop von `<EventForm>` (Zeile 62-75) ergänzen:

```typescript
      <EventForm
        initial={{
          id: event.id,
          title: event.title,
          sport: event.sport,
          starts_at: event.starts_at,
          ends_at: event.ends_at ?? '',
          meeting_point: event.meeting_point ?? '',
          description: event.description ?? '',
          max_participants: event.max_participants?.toString() ?? '',
          registration_enabled: event.registration_enabled,
          ticketing_enabled: event.ticketing_enabled,
          status: event.status,
        }}
      />
```

- [ ] **Step 5: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch.

- [ ] **Step 6: Manuell verifizieren**

Run: `npm run dev`, im Admin-Bereich (`/admin/events/new`) ein Event anlegen, Toggle "Ticket-Verkauf" aktivieren, speichern, danach auf der Edit-Seite erneut öffnen.
Expected: Der Toggle-Zustand bleibt nach dem Speichern erhalten (liest `ticketing_enabled` korrekt aus der DB zurück).

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/events/route.ts components/admin/EventForm.tsx "app/admin/(protected)/events/[id]/page.tsx"
git commit -m "feat: add ticketing_enabled toggle to event admin form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Admin-Ticket-Typ-Verwaltung

**Files:**
- Create: `components/admin/TicketTypesManager.tsx`
- Modify: `app/admin/(protected)/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `POST`/`PATCH /api/admin/ticket-types` (Task 9), `TicketType` (Task 3)
- Produces: `TicketTypesManager({ eventId, initial }: { eventId: string; initial: TicketType[] })`

- [ ] **Step 1: Komponente schreiben**

Create `components/admin/TicketTypesManager.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TicketType } from '@/lib/types'

type FormValues = {
  name: string
  price_euros: string
  capacity_per_ticket: string
  max_tickets: string
}

const emptyForm: FormValues = {
  name: '',
  price_euros: '',
  capacity_per_ticket: '1',
  max_tickets: '',
}

export function TicketTypesManager({ eventId, initial }: { eventId: string; initial: TicketType[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function startEdit(t: TicketType) {
    setEditingId(t.id)
    setForm({
      name: t.name,
      price_euros: (t.price_cents / 100).toFixed(2),
      capacity_per_ticket: String(t.capacity_per_ticket),
      max_tickets: t.max_tickets?.toString() ?? '',
    })
    setError('')
  }

  function startCreate() {
    setEditingId('new')
    setForm(emptyForm)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  async function save() {
    if (loading) return
    setLoading(true)
    setError('')

    const priceCents = Math.round(parseFloat(form.price_euros.replace(',', '.')) * 100)
    const payload = {
      ...(editingId !== 'new' ? { id: editingId } : { event_id: eventId }),
      name: form.name.trim(),
      price_cents: priceCents,
      capacity_per_ticket: parseInt(form.capacity_per_ticket) || 1,
      max_tickets: form.max_tickets ? parseInt(form.max_tickets) : null,
    }

    const res = await fetch('/api/admin/ticket-types', {
      method: editingId === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Fehler beim Speichern.')
      setLoading(false)
      return
    }

    setLoading(false)
    cancelEdit()
    router.refresh()
  }

  async function toggleActive(t: TicketType) {
    await fetch('/api/admin/ticket-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
          Ticket-Typen ({initial.length})
        </h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startCreate}
            className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
          >
            + Hinzufügen
          </button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-white/5">
        {initial.map((t) =>
          editingId === t.id ? (
            <TicketTypeFormRow
              key={t.id}
              form={form}
              setForm={setForm}
              onSave={save}
              onCancel={cancelEdit}
              loading={loading}
              error={error}
              isNew={false}
            />
          ) : (
            <div key={t.id} className="flex items-center gap-4 py-3">
              <span
                className={`flex-1 font-sans text-sm font-light ${t.is_active ? 'text-ash' : 'text-white/25 line-through'}`}
              >
                {t.name}
              </span>
              <span className="font-sans text-[11px] text-mist">
                {(t.price_cents / 100).toFixed(2).replace('.', ',')} €
                {' · '}
                {t.capacity_per_ticket === 1 ? 'Einzelticket' : `Team (${t.capacity_per_ticket})`}
                {t.max_tickets != null ? ` · max. ${t.max_tickets} Plätze` : ''}
              </span>
              <button
                type="button"
                onClick={() => startEdit(t)}
                className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => toggleActive(t)}
                className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
              >
                {t.is_active ? 'Deaktivieren' : 'Aktivieren'}
              </button>
            </div>
          )
        )}
      </div>

      {editingId === 'new' && (
        <div className="mt-5 border-t border-white/8 pt-5">
          <TicketTypeFormRow
            form={form}
            setForm={setForm}
            onSave={save}
            onCancel={cancelEdit}
            loading={loading}
            error={error}
            isNew={true}
          />
        </div>
      )}
    </div>
  )
}

function TicketTypeFormRow({
  form,
  setForm,
  onSave,
  onCancel,
  loading,
  error,
  isNew,
}: {
  form: FormValues
  setForm: (f: FormValues) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
  error: string
  isNew: boolean
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Name, z.B. Team-Ticket"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Preis in €, z.B. 60"
          value={form.price_euros}
          onChange={(e) => setForm({ ...form, price_euros: e.target.value })}
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          placeholder="Plätze pro Ticket"
          value={form.capacity_per_ticket}
          onChange={(e) => setForm({ ...form, capacity_per_ticket: e.target.value })}
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          placeholder="Max. Plätze (leer = unbegrenzt)"
          value={form.max_tickets}
          onChange={(e) => setForm({ ...form, max_tickets: e.target.value })}
          className={inputClass}
        />
      </div>
      {error && <p className="font-sans text-[11px] text-white/40">{error}</p>}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="font-sans text-[11px] tracking-[0.3em] text-ash uppercase transition-colors hover:text-spark disabled:opacity-30"
        >
          {loading ? '...' : isNew ? 'Erstellen →' : 'Speichern →'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-[10px] tracking-[0.2em] text-white/20 uppercase transition-colors hover:text-white/50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}

const inputClass =
  'border-b border-white/15 bg-transparent py-2 font-sans text-sm font-light text-spark outline-none transition-colors focus:border-white/35 placeholder-white/20 w-full'
```

- [ ] **Step 2: In Event-Edit-Seite einbinden**

In `app/admin/(protected)/events/[id]/page.tsx`:

Import ergänzen (nach `import { EventForm } from '@/components/admin/EventForm'`):

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TicketTypesManager } from '@/components/admin/TicketTypesManager'
import type { TicketType } from '@/lib/types'
```

Im `Promise.all` (Zeile 36-43) einen dritten Query ergänzen:

```typescript
  const [{ data: event }, { data: registrations }, { data: ticketTypes }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase
      .from('registrations')
      .select('id, guest_name, instagram_handle, strava_handle, phone, email, is_waitlist, notes, created_at')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('ticket_types')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ])
```

Nach dem bestehenden `{/* Registrations */}`-Block (nach Zeile 123, vor dem schließenden `</div>` der Komponente) ergänzen:

```typescript
      {/* Ticket types */}
      {event.ticketing_enabled && (
        <div className="mt-16">
          <TicketTypesManager eventId={event.id} initial={(ticketTypes ?? []) as TicketType[]} />
        </div>
      )}
```

- [ ] **Step 3: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch.

- [ ] **Step 4: Manuell verifizieren**

Run: `npm run dev`, ein Event mit aktiviertem "Ticket-Verkauf"-Toggle öffnen, einen Ticket-Typ anlegen (z.B. "Team-Ticket", 60€, 6 Plätze pro Ticket, max. 24 Plätze), Seite neu laden.
Expected: Der angelegte Ticket-Typ erscheint in der Liste mit korrekt formatiertem Preis.

- [ ] **Step 5: Commit**

```bash
git add components/admin/TicketTypesManager.tsx "app/admin/(protected)/events/[id]/page.tsx"
git commit -m "feat: add admin UI for managing ticket types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Admin-Verkaufsübersicht

**Files:**
- Modify: `app/admin/(protected)/events/[id]/page.tsx`

**Interfaces:**
- Consumes: `TicketOrder` (Task 3), `supabaseAdmin`

- [ ] **Step 1: Ticket-Orders laden**

In `app/admin/(protected)/events/[id]/page.tsx`, den `Promise.all`-Block aus Task 11 um einen vierten Query erweitern:

```typescript
  const [{ data: event }, { data: registrations }, { data: ticketTypes }, { data: ticketOrders }] =
    await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase
        .from('registrations')
        .select('id, guest_name, instagram_handle, strava_handle, phone, email, is_waitlist, notes, created_at')
        .eq('event_id', id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('ticket_types')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('ticket_orders')
        .select('id, buyer_name, buyer_email, quantity, total_amount_cents, status, created_at, ticket_types(name)')
        .eq('event_id', id)
        .eq('status', 'paid')
        .order('created_at', { ascending: true }),
    ])
```

- [ ] **Step 2: CSV-Export-Helper ergänzen**

Nach der bestehenden `csvExport`-Funktion (Zeile 11-26) ergänzen:

```typescript
type TicketOrderRow = {
  buyer_name: string
  buyer_email: string
  quantity: number
  total_amount_cents: number
  status: string
  created_at: string
  ticket_types: { name: string } | null
}

function ticketOrdersCsvExport(orders: TicketOrderRow[]) {
  const rows = [
    ['Käufer', 'E-Mail', 'Ticket-Typ', 'Menge', 'Betrag (€)', 'Angekauft am'],
    ...orders.map((o) => [
      o.buyer_name,
      o.buyer_email,
      o.ticket_types?.name ?? '',
      String(o.quantity),
      (o.total_amount_cents / 100).toFixed(2),
      format(new Date(o.created_at), 'dd.MM.yyyy HH:mm'),
    ]),
  ]
  return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
}
```

- [ ] **Step 3: Sektion im Render ergänzen**

Nach dem in Task 11 hinzugefügten Ticket-Typen-Block ergänzen:

```typescript
      {/* Ticket sales */}
      {event.ticketing_enabled && (
        <div className="mt-16">
          {(() => {
            const orders = (ticketOrders ?? []) as unknown as TicketOrderRow[]
            const totalRevenueCents = orders.reduce((sum, o) => sum + o.total_amount_cents, 0)
            const totalTickets = orders.reduce((sum, o) => sum + o.quantity, 0)
            const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(ticketOrdersCsvExport(orders))}`

            return (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-sans text-[10px] tracking-[0.3em] text-mist uppercase">
                    Verkäufe ({orders.length}) · {totalTickets} Tickets ·{' '}
                    {(totalRevenueCents / 100).toFixed(2).replace('.', ',')} €
                  </h2>
                  {orders.length > 0 && (
                    <a
                      href={csvHref}
                      download={`${event.slug}-verkaeufe.csv`}
                      className="font-sans text-[10px] tracking-[0.2em] text-mist uppercase transition-colors hover:text-ash"
                    >
                      CSV ↓
                    </a>
                  )}
                </div>

                {orders.length === 0 ? (
                  <p className="font-sans text-sm text-mist">Noch keine Verkäufe.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-white/5">
                    {orders.map((o, i) => (
                      <div key={i} className="flex items-center gap-4 py-3">
                        <span className="flex-1 font-sans text-sm font-light text-ash">{o.buyer_name}</span>
                        <span className="font-sans text-[11px] text-mist">
                          {o.ticket_types?.name} · {o.quantity}x ·{' '}
                          {(o.total_amount_cents / 100).toFixed(2).replace('.', ',')} €
                        </span>
                        <span className="font-sans text-[10px] text-white/20">
                          {format(new Date(o.created_at), 'd. MMM', { locale: de })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}
```

- [ ] **Step 4: Build verifizieren**

Run: `npm run build`
Expected: Build läuft durch.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(protected)/events/[id]/page.tsx"
git commit -m "feat: add ticket sales overview to admin event page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: End-to-End-Verifikation im Stripe Test-Mode

**Files:** keine Code-Änderungen — reine Verifikation des Gesamt-Flows.

**Interfaces:** keine.

- [ ] **Step 1: Env-Vars lokal setzen**

In `.env.local` (nicht committen, siehe `.gitignore`) ergänzen:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`STRIPE_SECRET_KEY` aus dem Stripe Dashboard (Test-Mode) holen. `STRIPE_WEBHOOK_SECRET` kommt aus Schritt 2.

- [ ] **Step 2: Stripe CLI lokal für Webhook-Forwarding starten**

Run:

```bash
stripe listen --forward-to localhost:3000/api/tickets/webhook
```

Expected: Ausgabe enthält `Ready! Your webhook signing secret is whsec_...` — diesen Wert als `STRIPE_WEBHOOK_SECRET` in `.env.local` eintragen und den Dev-Server neu starten.

- [ ] **Step 3: Kompletten Kauf-Flow durchspielen**

1. `npm run dev` starten.
2. Als Admin einloggen (`/admin/login`), ein Event anlegen mit `ticketing_enabled=true`, einen Ticket-Typ anlegen (z.B. "Einzelticket", 10€, `capacity_per_ticket=1`, `max_tickets=2`).
3. Als normaler Nutzer über `/enter` mit dem aktuellen Zugangscode einloggen.
4. Die Event-Seite öffnen, Ticket-Typ wählen, Name + E-Mail eingeben, "Zur Kasse →" klicken.
5. Auf der Stripe-Checkout-Seite Testkarte `4242 4242 4242 4242`, beliebiges zukünftiges Ablaufdatum, beliebige CVC eingeben, Zahlung abschließen.

Expected:
- Weiterleitung zurück zur Event-Seite mit `?ticket=success`, Banner "Zahlung erfolgreich" sichtbar.
- Im Terminal mit `stripe listen` läuft: Log-Zeile `checkout.session.completed` mit Status `200`.
- Im Admin-Bereich auf der Event-Seite erscheint der Verkauf unter "Verkäufe".
- Käufer-E-Mail (Resend-Log/Postfach prüfen) und Admin-Benachrichtigung an `ADMIN_EMAIL` sind angekommen.

- [ ] **Step 4: Abbruch-Pfad testen**

Gleichen Flow wiederholen, aber auf der Stripe-Checkout-Seite den Zurück-Button/Browser-Zurück nutzen.
Expected: Weiterleitung zu `?ticket=cancelled`, Banner "Zahlung abgebrochen", kein neuer Eintrag unter "Verkäufe" (Order bleibt `pending` in der DB).

- [ ] **Step 5: Kapazität testen**

Mit `max_tickets=2` und `capacity_per_ticket=1` aus Schritt 3: zwei erfolgreiche Käufe durchführen, dann einen dritten Kaufversuch starten.
Expected: Der Ticket-Typ ist im Formular als "Ausverkauft" markiert und nicht auswählbar.

- [ ] **Step 6: Finale Build- und Lint-Prüfung**

Run: `npm run build && npm run lint`
Expected: Beide Befehle laufen ohne Fehler durch.

- [ ] **Step 7: Abschluss-Commit (falls durch Tests noch Anpassungen nötig waren)**

```bash
git add -A
git commit -m "chore: verify end-to-end ticket purchase flow in stripe test mode

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Nur committen, falls Step 1-6 tatsächlich Code-Anpassungen ausgelöst haben — sonst entfällt dieser Commit.)

---

## Nicht Teil dieses Plans (siehe Spec "Out of Scope")

QR-Code-Check-in, Warteliste für bezahlte Tickets, automatischer Refund bei Überbuchung, Rabattcodes, Mehrwährungsunterstützung, eigene Rechnungsstellung. Live-Mode-Umschaltung (Stripe-Account-Verifizierung durch Tim) ist eine Konto-Voraussetzung außerhalb dieses Plans — siehe Spec-Abschnitt "Setup-Voraussetzungen".
