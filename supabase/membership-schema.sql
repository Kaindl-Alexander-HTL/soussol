-- Mitglieder mit Circle-Rollen (surrounding/outer/inner) + persönlichem Zugangs-Token.
-- Einmalig im Supabase SQL Editor ausführen. Ersetzt das geteilte settings.access_code-Modell.

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

-- RLS: Tabelle enthält Geheimnisse (access_token) und PII (email).
-- Kein anon/authenticated-Zugriff — alles läuft über den Service-Role-Client
-- (supabaseAdmin), der RLS umgeht. RLS aktiv, aber ohne Policies.
alter table members enable row level security;
