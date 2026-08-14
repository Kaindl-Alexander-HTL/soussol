-- Sichtbarkeit von Events: öffentlich vs. nur Outer Circle.
-- 'public' = jeder sieht das Event auf /upcoming und /event/<slug>.
-- 'outer'  = nur eingeloggte Mitglieder (outer/inner) sehen es.
--
-- Wichtig: Die Filterung darf NICHT nur in der App passieren. Der anon key steht
-- im Browser-Bundle, jeder könnte die events-Tabelle direkt über die REST-API
-- abfragen. Deshalb wird zusätzlich die RLS-Policy verschärft — anon bekommt
-- outer-Events gar nicht erst zu sehen.
--
-- Mitglieder authentifizieren sich über ein eigenes signiertes Cookie (sous_pass),
-- nicht über Supabase Auth. Ihre Events liest der Server deshalb per Service-Role,
-- nachdem das Cookie geprüft wurde (siehe lib/events.ts).
--
-- Einmalig im Supabase SQL Editor ausführen.

alter table events
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'outer'));

-- anon sieht nur öffentliche Events. auth.uid() is not null = eingeloggter
-- Supabase-Auth-User = Admin im Backoffice; der sieht weiterhin alles.
drop policy if exists "public read events" on events;
create policy "public read events" on events
  for select using (visibility = 'public' or auth.uid() is not null);
