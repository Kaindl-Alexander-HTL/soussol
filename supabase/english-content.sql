-- Translate only application-owned defaults that may already exist in production.
-- Custom admin-authored values are deliberately left untouched.

update settings
set value = '"The Outer Circle is for people with drive. With passion. For those who truly show up. Tell us a little about yourself — Tim decides who joins."'::jsonb,
    updated_at = now()
where key = 'apply_intro'
  and value = '"Der Outer Circle ist für Leute mit Drive. Mit Passion. Für die, die wirklich dabei sind. Erzähl uns kurz von dir — Tim entscheidet, wer reinkommt."'::jsonb;

update settings
set value = '"Not found"'::jsonb,
    updated_at = now()
where key = 'not_found_text'
  and value = '"Nicht gefunden"'::jsonb;

update settings
set value = '{"content":"Built in the basement.\n\nRaised in the streets.\n\nRunning. Road cycling. Volleyball. Linz."}'::jsonb,
    updated_at = now()
where key = 'manifest'
  and value = '{"content":"Built in the basement.\n\nRaised in the streets.\n\nRunning. Rennrad. Volleyball. Linz."}'::jsonb;

-- These keys are intentionally included as no-op guards: their known defaults
-- are already English. This makes the production migration explicit without
-- overwriting any customised value.
update settings set updated_at = updated_at
where key in ('apply_headline', 'footer_credit')
  and value in ('"Outer Circle"'::jsonb, '""'::jsonb);
