-- Test-Mitglieder zum manuellen Verifizieren des Membership-Fundaments.
-- Im Supabase SQL Editor ausführen, NACHDEM membership-schema.sql lief.
-- Tokens sind bewusst merkbar (nur für Test; echte Tokens kommen aus generateAccessToken()).

insert into members (name, email, role, access_token, is_active)
values ('Test Outer', 'test-outer@example.com', 'outer', 'TESTTOKENOUTER0000000000000000000', true)
on conflict (email) do update
  set role = excluded.role, access_token = excluded.access_token, is_active = excluded.is_active;

insert into members (name, email, role, access_token, is_active)
values ('Test Surrounding', 'test-surrounding@example.com', 'surrounding', 'TESTTOKENSURR00000000000000000000', true)
on conflict (email) do update
  set role = excluded.role, access_token = excluded.access_token, is_active = excluded.is_active;
