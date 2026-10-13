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
  visibility text not null default 'public' check (visibility in ('public', 'outer')),
  status text not null default 'upcoming' check (status in ('upcoming', 'past', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Falls events bereits existierte (Teil-Setup): fehlende Spalten nachziehen.
alter table events add column if not exists external_signup_url text;
alter table events add column if not exists ticketing_enabled boolean not null default false;
alter table events add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'outer'));

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
create policy "public read events" on events
  for select to anon, authenticated using (
    visibility = 'public' and status = 'upcoming'
  );

drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select to anon, authenticated using (
  key = any (array[
    'manifest', 'instagram_url', 'strava_club_url', 'font_theme',
    'apply_headline', 'apply_intro', 'not_found_text', 'footer_credit'
  ])
);

drop policy if exists "public read mementos" on mementos;
drop policy if exists "public read gallery_photos" on gallery_photos;
drop policy if exists "public read memento_connections" on memento_connections;

drop policy if exists "public read active ticket_types" on ticket_types;
create policy "public read active ticket_types" on ticket_types
  for select to anon, authenticated using (
    is_active = true and exists (
      select 1 from events
      where events.id = ticket_types.event_id
        and events.visibility = 'public'
        and events.status = 'upcoming'
    )
  );

-- Gemeinsames, atomares Rate-Limit für alle Server-Instanzen.
create table if not exists api_rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (bucket, key_hash, window_start)
);
create index if not exists api_rate_limits_window_start_idx on api_rate_limits(window_start);
alter table api_rate_limits enable row level security;

create or replace function check_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_window_seconds integer,
  p_max_requests integer
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if length(p_bucket) not between 1 and 100
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_window_seconds not between 1 and 86400
     or p_max_requests not between 1 and 10000 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into api_rate_limits (bucket, key_hash, window_start, request_count)
  values (p_bucket, p_key_hash, v_window_start, 1)
  on conflict (bucket, key_hash, window_start)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into v_count;

  delete from api_rate_limits where window_start < v_now - interval '2 days';

  return query select
    v_count <= p_max_requests,
    greatest(1, ceil(extract(epoch from (
      v_window_start + make_interval(secs => p_window_seconds) - v_now
    )))::integer);
end;
$$;

revoke all on function check_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function check_rate_limit(text, text, integer, integer) to service_role;

-- Grants. service_role (supabaseAdmin) braucht VOLLE Rechte (Admin/Inserts);
-- anon/authenticated nur SELECT (RLS gated die Zeilen zusätzlich — sensible
-- Tabellen ohne Policy = anon sieht nichts, trotz GRANT).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on all tables in schema public to anon, authenticated;
revoke select on mementos, gallery_photos, memento_connections, api_rate_limits
  from anon, authenticated;

-- ── Storage-Bucket für Archiv-Bilder ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('mementos', 'mementos', false)
on conflict (id) do update set public = false;
