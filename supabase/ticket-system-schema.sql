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
