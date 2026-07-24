-- Externe Turnier-/Ticket-Anmeldung (z.B. UnderTheBridge übernimmt das Volleyball-Turnier).
-- Wenn gesetzt, zeigt die Event-Seite einen "Anmelden"-Button, der auf diese URL weiterleitet,
-- statt des internen RSVP-/Ticket-Flows.
-- Einmalig im Supabase SQL Editor ausführen.

alter table events
  add column if not exists external_signup_url text;
