-- ============================================================================
-- SOUS SOL — VOLLSTÄNDIGES DEV-SCHEMA (zum Testen auf eigenem Supabase-Projekt)
-- ============================================================================
-- Rekonstruiert aus dem Code (Basis-Tabellen) + alle neuen Features
-- (Membership, Bewerbungen, Tickets, Event-Spalten). Idempotent — mehrfach
-- ausführbar. NUR für Dev/Test gedacht; Produktion nutzt die migrierte echte DB.
--
-- Ausführen: Supabase Dashboard → SQL Editor → alles einfügen → Run.
-- ============================================================================

-- ── Basis: Events ───────────────────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sport text not null check (sport in ('running', 'cycling', 'volleyball', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_point text,
  description text,
  max_participants integer,
  registration_enabled boolean not null default true,
  external_signup_url text,
  ticketing_enabled boolean not null default false,
  status text not null default 'upcoming' check (status in ('upcoming', 'past', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Falls events bereits existierte (Teil-Setup): fehlende Spalten nachziehen.
alter table events add column if not exists external_signup_url text;
alter table events add column if not exists ticketing_enabled boolean not null default false;

-- ── Basis: Registrierungen (Gratis-RSVP) ────────────────────────────────────
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_name text not null,
  instagram_handle text,
  strava_handle text,
  phone text,
  email text,
  notes text,
  is_waitlist boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists registrations_event_id_idx on registrations(event_id);

-- ── Basis: Settings (key/value) ─────────────────────────────────────────────
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Basis: Mementos (Archiv-Canvas) ─────────────────────────────────────────
create table if not exists mementos (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'polaroid' check (kind in ('polaroid', 'note', 'stamp', 'scan', 'strava', 'other')),
  image_url text,
  caption text,
  body text,
  date_label text,
  event_id uuid references events(id) on delete set null,
  x integer not null default 0,
  y integer not null default 0,
  rotation double precision not null default 0,
  scale double precision not null default 1,
  z_index integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Basis: Gallery-Photos (an einem Memento hängend) ────────────────────────
create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  memento_id uuid not null references mementos(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gallery_photos_memento_id_idx on gallery_photos(memento_id);

-- ── Basis: Memento-Verbindungen ─────────────────────────────────────────────
create table if not exists memento_connections (
  id uuid primary key default gen_random_uuid(),
  from_memento_id uuid not null references mementos(id) on delete cascade,
  to_memento_id uuid not null references mementos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_memento_id, to_memento_id)
);

-- ── Feature: Members (Circle-Rollen + Token) ────────────────────────────────
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

-- ── Feature: Bewerbungen ────────────────────────────────────────────────────
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists applications_status_idx on applications(status);

-- ── Feature: Ticket-Typen ───────────────────────────────────────────────────
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

-- ── Feature: Ticket-Bestellungen ────────────────────────────────────────────
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

-- ── RLS: alles nur über den Service-Role-Client (supabaseAdmin) ──────────────
-- Öffentliche Reads laufen im Code über den anon-Client für events/mementos/
-- gallery_photos; dafür Lese-Policies. Alles Sensible (members/applications/
-- ticket_orders) bleibt policy-los = nur Service-Role.
alter table events enable row level security;
alter table registrations enable row level security;
alter table settings enable row level security;
alter table mementos enable row level security;
alter table gallery_photos enable row level security;
alter table memento_connections enable row level security;
alter table members enable row level security;
alter table applications enable row level security;
alter table ticket_types enable row level security;
alter table ticket_orders enable row level security;

-- Öffentlich lesbare Inhalte (Landing/Events/Archiv-Anzeige laufen z.T. über anon).
drop policy if exists "public read events" on events;
create policy "public read events" on events for select using (true);

drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select using (true);

drop policy if exists "public read mementos" on mementos;
create policy "public read mementos" on mementos for select using (true);

drop policy if exists "public read gallery_photos" on gallery_photos;
create policy "public read gallery_photos" on gallery_photos for select using (true);

drop policy if exists "public read memento_connections" on memento_connections;
create policy "public read memento_connections" on memento_connections for select using (true);

drop policy if exists "public read active ticket_types" on ticket_types;
create policy "public read active ticket_types" on ticket_types for select using (is_active = true);

-- ── Storage-Bucket für Archiv-Bilder ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('mementos', 'mementos', true)
on conflict (id) do nothing;
