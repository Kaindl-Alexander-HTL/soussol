-- ============================================================================
-- SOUS SOL — DEV-SEED (Testdaten zum Durchklicken)
-- Nach schema-full.sql ausführen. Idempotent über feste UUIDs / on conflict.
-- ============================================================================

-- ── Settings (Landing-Manifest + Links) ─────────────────────────────────────
insert into settings (key, value) values
  ('manifest', '{"content": "Built in the basement.\n\nRaised in the streets.\n\nRunning. Rennrad. Volleyball. Linz."}'::jsonb),
  ('instagram_url', '"https://instagram.com/soussol"'::jsonb),
  ('strava_club_url', '"https://strava.com/clubs/soussol"'::jsonb),
  ('contact_email', '"hey@sous.club"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ── Test-Mitglieder ─────────────────────────────────────────────────────────
insert into members (name, email, role, access_token, is_active) values
  ('Test Outer',       'test-outer@example.com',       'outer',       'TESTTOKENOUTER0000000000000000000', true),
  ('Test Inner',       'test-inner@example.com',       'inner',       'TESTTOKENINNER0000000000000000000', true),
  ('Test Surrounding', 'test-surrounding@example.com', 'surrounding', 'TESTTOKENSURR00000000000000000000', true)
on conflict (email) do update
  set role = excluded.role, access_token = excluded.access_token, is_active = excluded.is_active;

-- ── Events ──────────────────────────────────────────────────────────────────
-- 1) Gratis-RSVP-Event
insert into events (id, slug, title, sport, starts_at, meeting_point, description, registration_enabled, ticketing_enabled, status)
values ('11111111-1111-1111-1111-111111111111', 'sunday-run', 'Sunday Long Run', 'running',
        '2026-08-16 09:00:00+02', 'Donaulände Linz', 'Lockerer 12k entlang der Donau. Danach Kaffee.',
        true, false, 'upcoming')
on conflict (id) do update set
  slug = excluded.slug, title = excluded.title, sport = excluded.sport, starts_at = excluded.starts_at,
  meeting_point = excluded.meeting_point, description = excluded.description,
  registration_enabled = excluded.registration_enabled, ticketing_enabled = excluded.ticketing_enabled, status = excluded.status;

-- 2) Ticket-Event (für Stripe-Test)
insert into events (id, slug, title, sport, starts_at, meeting_point, description, registration_enabled, ticketing_enabled, status)
values ('22222222-2222-2222-2222-222222222222', 'winter-cup', 'Winter Indoor Cup', 'volleyball',
        '2026-08-30 10:00:00+02', 'Sporthalle Linz', 'Indoor-Turnier. Tickets pro Team oder einzeln.',
        false, true, 'upcoming')
on conflict (id) do update set
  slug = excluded.slug, title = excluded.title, sport = excluded.sport, starts_at = excluded.starts_at,
  meeting_point = excluded.meeting_point, description = excluded.description,
  registration_enabled = excluded.registration_enabled, ticketing_enabled = excluded.ticketing_enabled, status = excluded.status;

-- 3) Externes Turnier (Redirect zu Partner)
insert into events (id, slug, title, sport, starts_at, meeting_point, description, registration_enabled, external_signup_url, ticketing_enabled, status)
values ('33333333-3333-3333-3333-333333333333', 'volleyball-turnier', 'SOUS SOL Beach Turnier', 'volleyball',
        '2026-09-06 11:00:00+02', 'Beach Arena Linz', 'Das grosse Turnier. Anmeldung laeuft ueber unseren Partner.',
        false, 'https://example.com/turnier-anmeldung', false, 'upcoming')
on conflict (id) do update set
  slug = excluded.slug, title = excluded.title, external_signup_url = excluded.external_signup_url, status = excluded.status;

-- ── Ticket-Typen fuer das Ticket-Event ──────────────────────────────────────
insert into ticket_types (id, event_id, name, price_cents, capacity_per_ticket, max_tickets, is_active)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Team-Ticket (6 Spieler)', 6000, 6, 60, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Einzelticket', 1000, 1, 40, true)
on conflict (id) do update set
  name = excluded.name, price_cents = excluded.price_cents, capacity_per_ticket = excluded.capacity_per_ticket,
  max_tickets = excluded.max_tickets, is_active = excluded.is_active;
