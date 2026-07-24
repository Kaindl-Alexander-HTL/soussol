# Membership-Fundament — manuelles Verifikations-Runbook

Voraussetzung: `supabase/membership-schema.sql` + `supabase/seed-test-member.sql` in Supabase
ausgeführt; `.env.local` mit echten Supabase-Werten + `ACCESS_COOKIE_SECRET` + `NEXT_PUBLIC_SITE_URL`.

Dev-Server: `npm run dev`

1. **Link-Weg (outer):** `http://localhost:3000/api/enter?token=TESTTOKENOUTER0000000000000000000`
   → Redirect nach `/archive`, Archiv sichtbar, Cookie `sous_pass` gesetzt.
2. **Code-Weg (outer):** Cookie löschen → `/enter` → Token `TESTTOKENOUTER0000000000000000000`
   eintippen → landet im Archiv.
3. **Falscher Token:** `/enter` → `zzzzz` eintippen → bleibt am Formular (Shake), kein Zugang.
4. **surrounding hat keinen Archiv-Zugang:** Cookie löschen →
   `http://localhost:3000/api/enter?token=TESTTOKENSURR00000000000000000000`
   → Redirect zu `/enter` (kein Archiv), weil Rolle `surrounding`.
5. **Entzug (soft-delete):** In Supabase `update members set is_active=false where email='test-outer@example.com';`
   → nächster `/archive`-Aufruf redirectet zu `/enter`.
6. **Rotation:** In Supabase `update members set access_token='NEUERTOKEN...' where email='test-outer@example.com';`
   → alter Token/Link ergibt keinen Treffer mehr; neuer funktioniert.
7. **Öffentlich bleibt offen:** `/`, `/upcoming`, `/event/...`, `/apply`, `/impressum`, `/datenschutz`
   ohne Cookie erreichbar.
8. **Bewerbung → Mitglied:** `/apply` ausfüllen → im Admin unter `/admin/members` (Bewerbungen)
   akzeptieren → Mitglied entsteht mit Rolle `outer`, Invite-Mail geht raus, Token funktioniert.
