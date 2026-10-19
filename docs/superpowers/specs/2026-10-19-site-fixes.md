# SOUS SOL Site Fixes Specification

## Requested outcomes

1. Supabase password-reset links must open the deployed reset page, never `localhost`.
2. The privacy page must reflect the currently collected data and the new payment flow.
3. The legal notice must use the SOUS SOL contact email configured in Admin Settings, not a personal address.
4. Replace `Mittelpromende 127` with `Großambergstraße 31a`; keep the currently published postal code/city unless separately corrected.
5. Add the configured Strava club link beside Privacy in the landing-page footer.
6. Long-pressing the landing-page circle on mobile must not select/highlight the control or open the touch callout.
7. All user-visible website, admin, transactional-email, validation, metadata, and legal copy must be English. Brand names and user-authored content remain unchanged.
8. Every displayed or edited event time must use `Europe/Vienna`, including daylight-saving time; Vercel's UTC server timezone must not shift values.

## Interpretation decisions

- “SOUS SOL email” means the existing `contact_email` Admin Setting. Legal pages read that setting; no personal Gmail address remains in source.
- The address is updated consistently on both Legal Notice and Privacy pages, not only on one page.
- English is the only UI locale for now; no translation framework or language switcher is added.
- Existing admin-authored database copy (`manifest`, application copy, 404 copy, footer credit) is translated as deployment data, not silently overwritten on every request.
- These fixes ship before the unfinished Stripe branch. Implementation starts from `main` in an isolated worktree and preserves the current `feature/stripe-integration` working tree untouched.

