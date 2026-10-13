-- SOUS SOL — production upgrade for the existing WEB Supabase project
-- Adds Inner/Outer Circle features and replaces legacy public/admin RLS rules.

begin;

-- Feature columns on the existing events table.
alter table events add column if not exists external_signup_url text;
alter table events add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'outer'));

-- Inner/Outer Circle membership and applications.
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

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists applications_status_idx on applications(status);

-- Durable, shared rate limits for public mutation endpoints.
create table if not exists api_rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (bucket, key_hash, window_start)
);
create index if not exists api_rate_limits_window_start_idx on api_rate_limits(window_start);

alter table events enable row level security;
alter table registrations enable row level security;
alter table settings enable row level security;
alter table mementos enable row level security;
alter table gallery_photos enable row level security;
alter table memento_connections enable row level security;
alter table members enable row level security;
alter table applications enable row level security;
alter table api_rate_limits enable row level security;

-- Remove the legacy policies. In particular, a generic Supabase-authenticated
-- user must not become an admin; the app now verifies ADMIN_EMAILS server-side.
drop policy if exists "events_admin_all" on events;
drop policy if exists "events_public_read" on events;
drop policy if exists "public read events" on events;

drop policy if exists "registrations_admin_all" on registrations;
drop policy if exists "registrations_public_insert" on registrations;

drop policy if exists "settings_admin_all" on settings;
drop policy if exists "settings_public_read" on settings;
drop policy if exists "public read settings" on settings;

drop policy if exists "mementos_admin_all" on mementos;
drop policy if exists "mementos_public_read" on mementos;
drop policy if exists "public read mementos" on mementos;

drop policy if exists "gallery_photos_admin_all" on gallery_photos;
drop policy if exists "gallery_photos_public_read" on gallery_photos;
drop policy if exists "public read gallery_photos" on gallery_photos;

drop policy if exists "connections_admin_all" on memento_connections;
drop policy if exists "connections_public_read" on memento_connections;
drop policy if exists "public read memento_connections" on memento_connections;

-- Public browser access is intentionally narrow.
create policy "public read events" on events
  for select to anon, authenticated using (
    visibility = 'public' and status = 'upcoming'
  );

create policy "public read settings" on settings
  for select to anon, authenticated using (
    key = any (array[
      'manifest', 'instagram_url', 'strava_club_url', 'font_theme',
      'apply_headline', 'apply_intro', 'not_found_text', 'footer_credit'
    ])
  );

grant usage on schema public to anon, authenticated, service_role;
revoke all on events, settings from anon, authenticated;
grant select on events, settings to anon, authenticated;
grant all on events, registrations, settings, mementos, gallery_photos,
  memento_connections, members, applications, api_rate_limits to service_role;

revoke all on registrations, mementos, gallery_photos, memento_connections,
  members, applications, api_rate_limits from anon, authenticated;

-- Archive files become private and are delivered only through short-lived URLs.
insert into storage.buckets (id, name, public)
values ('mementos', 'mementos', false)
on conflict (id) do update set public = false;

drop policy if exists "mementos_storage_public_read" on storage.objects;
drop policy if exists "mementos_storage_admin_write" on storage.objects;

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

commit;
