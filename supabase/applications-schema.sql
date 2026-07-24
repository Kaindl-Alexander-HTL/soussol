-- Bewerbungen für den Outer Circle. Öffentlich einreichbar, von Tim akzeptiert/abgelehnt.
-- Bei Akzeptanz entsteht ein members-Eintrag (Rolle outer) + Invite-Mail.
-- Einmalig im Supabase SQL Editor ausführen, NACHDEM membership-schema.sql lief.

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists applications_status_idx on applications(status);

-- RLS: enthält PII. Kein anon/authenticated-Zugriff — alles über supabaseAdmin.
alter table applications enable row level security;
