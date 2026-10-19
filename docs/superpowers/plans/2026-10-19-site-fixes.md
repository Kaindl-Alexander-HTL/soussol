# SOUS SOL Site Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix production password recovery, legal/footer data, mobile long-press behavior, English-only copy, and Vienna-local event times before continuing Stripe.

**Architecture:** Work from a clean `feature/site-fixes` worktree based on `main`, leaving the uncommitted Stripe branch untouched. Keep a single English locale, centralize canonical site/contact/date behavior in small helpers, and treat Supabase Auth URL settings plus admin-authored copy as explicit deployment configuration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/Postgres, date-fns 4 + `@date-fns/tz`, Node test runner, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-19-site-fixes.md`

## Global Constraints

- Preserve all uncommitted work on `feature/stripe-integration`; implement these fixes from current `main` in an isolated worktree.
- Canonical production origin: `NEXT_PUBLIC_SITE_URL`, normalized without a trailing slash; browser origin is development fallback only.
- Canonical event timezone: `Europe/Vienna`, including CET/CEST transitions.
- UI locale: English only; do not add an i18n dependency or language selector.
- Legal contact email comes from the existing `contact_email` setting; never hardcode the personal Gmail address.
- Legal address street: `Großambergstraße 31a`; retain the existing `4048 Puchenau, Austria` until the user provides a different locality.
- Preserve brand names (`SOUS SOL`, `Outer Circle`, Instagram, Strava), event/user content, and the existing visual design.

## Review Focus

- Supabase ignores a non-allowlisted `redirectTo`: live test must prove the email link resolves to `/admin/reset-password` on the production domain.
- DST boundaries can create nonexistent or duplicated local times: date tests cover both CET and CEST and reject invalid `datetime-local` input.
- Long press can trigger selection, context menus, or callouts differently on iOS/Android: mobile QA covers hold, release, cancel, and successful navigation.
- English source copy can coexist with German database-managed copy: deployment verification checks both code and current production settings.
- Legal copy can drift from collected fields/providers: privacy review verifies RSVP contact fields, Supabase/Vercel/Resend, cookies, and Stripe when Stripe is eventually enabled.

---

### Task 1: Isolate the fixes and repair password-reset routing

**Files:**
- Create: `lib/public-site-url.ts`
- Modify: `components/admin/ForgotPasswordForm.tsx`
- Modify: `.env.local.example`
- Test: `tests/public-site-url.test.ts`
- Configure: Supabase production project → Authentication → URL Configuration

**Interfaces:**
- Produces: `publicSiteUrl(configured: string | undefined, browserOrigin: string): string`
- Consumes: `NEXT_PUBLIC_SITE_URL`

- [ ] **Step 1: Create an isolated worktree from `main`**

Run `git worktree add <temporary-path> -b feature/site-fixes main`; confirm the original `feature/stripe-integration` status is unchanged.

- [ ] **Step 2: Write failing URL-normalization tests**

Assert that `publicSiteUrl('https://www.soussol-archive.com/', 'http://localhost:3000')` returns `https://www.soussol-archive.com`, missing configuration falls back to the supplied browser origin, and invalid/non-HTTP configured values fall back safely.

- [ ] **Step 3: Run the focused test and verify RED**

Run `node --test tests/public-site-url.test.ts`; expect module/function-not-found failure.

- [ ] **Step 4: Implement the helper and use it in password recovery**

Set `redirectTo` to `${publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, window.location.origin)}/admin/reset-password`; document the production URL in `.env.local.example`.

- [ ] **Step 5: Run focused and full tests**

Run `node --test tests/public-site-url.test.ts` and `npm test`; expect all tests to pass.

- [ ] **Step 6: Correct Supabase Auth URLs**

Set Site URL to the canonical production origin and allow exactly the production reset URL, non-`www` redirect if it is still served, plus localhost reset URLs only for development. Do not use localhost as Site URL.

- [ ] **Step 7: Verify a real recovery email**

Request one reset email for an authorized admin and confirm its final browser URL is the production `/admin/reset-password` page with a valid recovery session.

- [ ] **Step 8: Commit**

Commit message: `fix: route password recovery to production`

### Task 2: Make legal/contact/footer information consistent

**Files:**
- Create: `lib/legal.ts`
- Modify: `app/page.tsx`
- Modify: `components/LandingPage.tsx`
- Modify: `app/impressum/page.tsx`
- Modify: `app/datenschutz/page.tsx`
- Test: `tests/legal-content.test.ts`

**Interfaces:**
- Produces: `LEGAL_ADDRESS` constant and `legalContactEmail(settings: SettingsMap): string | null`
- Consumes: `getSettings(['contact_email', 'strava_club_url'])`

- [ ] **Step 1: Write failing legal-data tests**

Assert the address contains `Großambergstraße 31a`, the contact resolver returns the trimmed `contact_email`, and no legal source contains `tim.tobs24@gmail.com` or `Mittelpromende`.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/legal-content.test.ts`; expect missing helper/current personal data failures.

- [ ] **Step 3: Centralize legal data**

Add `LEGAL_ADDRESS` with the specified street and existing locality. Resolve contact email from settings; if absent, render a neutral “Contact email not configured” warning only to admins and omit a broken mail link publicly.

- [ ] **Step 4: Update both legal pages**

Make both pages async, load `contact_email`, use the shared address/email, update privacy disclosures to match current RSVP fields and infrastructure, and keep legal citations factually unchanged while translating them in Task 4.

- [ ] **Step 5: Add Strava beside Privacy**

Load `strava_club_url` in `app/page.tsx`, add `stravaUrl` to `LandingPage`, and render the external Strava link immediately after Privacy with `target="_blank"` and `rel="noopener noreferrer"`.

- [ ] **Step 6: Run tests and inspect desktop/mobile footer**

Run the focused test plus `npm test`; in the preview confirm link order and that missing URLs hide only their own link.

- [ ] **Step 7: Commit**

Commit message: `fix: update legal contact and social links`

### Task 3: Prevent mobile selection on the landing circle

**Files:**
- Modify: `components/LongPressCircle.tsx`
- Modify: `app/globals.css`
- Test: `tests/long-press-circle.test.ts`

**Interfaces:**
- Produces: unchanged `LongPressCircle({ href?: string })`

- [ ] **Step 1: Write a failing source-level regression test**

Assert the interactive button exposes an English accessible label and applies `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`, `touch-action: none`, and context-menu prevention without disabling normal pointer events.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/long-press-circle.test.ts`; expect missing mobile protections.

- [ ] **Step 3: Add the minimum touch protections**

Apply a reusable `.no-touch-selection` utility to the button/ring, prevent the context menu, retain pointer capture/cancel behavior, and do not change the hold timings or animation.

- [ ] **Step 4: Run automated tests and mobile interaction QA**

Verify on 390×844 and 412×915 viewports: tapping does not navigate, early release retracts, long hold navigates once, dragging/canceling stops the timer, and no blue highlight/callout appears.

- [ ] **Step 5: Commit**

Commit message: `fix: prevent mobile selection on landing control`

### Task 4: Translate all application-owned copy to English

**Files:**
- Modify: `app/**/*.tsx`, `components/**/*.tsx`, `lib/email.ts`, `lib/email-template.ts`
- Modify: user-facing error strings in `app/api/**/*.ts`, while leaving log-only diagnostics free to remain technical
- Modify: `app/layout.tsx` (`lang="en"`, English metadata, `openGraph.locale = 'en_AT'`)
- Modify: date locale imports from `de` to `enGB`
- Create: `supabase/english-content.sql`
- Test: `tests/english-copy.test.ts`

**Interfaces:**
- Produces: English-only application defaults and an idempotent SQL update for admin-authored settings
- Consumes: existing settings keys `manifest`, `apply_headline`, `apply_intro`, `not_found_text`, `footer_credit`

- [ ] **Step 1: Write the failing English-copy guard**

Scan application-owned public/admin/email source files and fail on the known German UI phrases collected by the current `rg` inventory; explicitly exclude comments, test fixtures, brand names, and user/database content.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/english-copy.test.ts`; expect failures listing current German phrases.

- [ ] **Step 3: Translate public/member surfaces**

Translate landing/footer labels, application/access/recovery forms, event/RSVP/ticket pages, archive/gallery navigation, empty/error/success states, metadata, and the 404 page. Keep “SOUS SOL” and “Outer Circle” unchanged.

- [ ] **Step 4: Translate admin surfaces and API responses**

Translate login/reset, dashboard navigation, members/applications, events/tickets, archive/gallery editors, settings, confirmations, validation responses, and CSV headers.

- [ ] **Step 5: Translate transactional emails and legal pages**

Translate subjects, HTML/text bodies, labels, Legal Notice, and Privacy Policy without changing their factual/legal meaning.

- [ ] **Step 6: Add an idempotent production content update**

Create SQL that updates only the known German defaults for the five admin-authored settings, so customized unrelated text is not overwritten. Review the final English manifesto/application copy before execution.

- [ ] **Step 7: Run guard, tests, lint, and visual smoke checks**

Run `npm test`, `npm run lint`, and `rg` for residual German UI phrases; browse every public route and each admin section in the preview.

- [ ] **Step 8: Commit**

Commit message: `feat: make the product copy English`

### Task 5: Normalize all event times to Europe/Vienna

**Files:**
- Create: `lib/date-time.ts`
- Modify: `package.json`, `package-lock.json` (add current compatible `@date-fns/tz`)
- Modify: `components/admin/EventForm.tsx`
- Modify: `app/(events)/upcoming/page.tsx`
- Modify: `app/(events)/event/[slug]/page.tsx`
- Modify: `app/admin/(protected)/events/page.tsx`
- Modify: `app/admin/(protected)/events/[id]/page.tsx`
- Modify: `components/admin/MembersManager.tsx`
- Modify: `lib/email.ts`
- Test: `tests/date-time.test.ts`

**Interfaces:**
- Produces: `VIENNA_TIME_ZONE`, `formatVienna(iso, pattern)`, `toViennaDatetimeLocal(iso)`, `fromViennaDatetimeLocal(value)`, and `viennaMonthKey(iso)`

- [ ] **Step 1: Write failing CET/CEST tests**

Assert `2026-01-15T17:00:00Z` formats to `18:00`, `2026-07-15T16:00:00Z` formats to `18:00`, summer local `2026-07-15T18:00` stores as `16:00Z`, winter local `2026-01-15T18:00` stores as `17:00Z`, and invalid/nonexistent local times are rejected.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/date-time.test.ts`; expect missing helper failures.

- [ ] **Step 3: Implement explicit Vienna conversion helpers**

Use `TZDate`/`tz` from `@date-fns/tz` with date-fns; no helper may depend on the host machine or browser timezone.

- [ ] **Step 4: Replace direct date formatting and editor conversion**

Use the helpers for public event dates/times, month grouping, admin forms/lists, CSV output, membership timestamps, and transactional emails. Keep database timestamps in UTC ISO format.

- [ ] **Step 5: Run focused/full tests and a round-trip browser check**

Create an 18:00 Vienna event in preview, reload/edit it, and confirm public page, list, admin, CSV, and email preview all remain 18:00.

- [ ] **Step 6: Commit**

Commit message: `fix: render event times in Vienna timezone`

### Task 6: Final verification and staged release

**Files:**
- Review: all changed files
- Configure: Supabase Auth URL settings and `supabase/english-content.sql`

**Interfaces:**
- Consumes: completed Tasks 1–5
- Produces: verified production release before Stripe work resumes

- [ ] **Step 1: Run the complete local verification suite**

Run `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm audit --omit=dev`, and `git diff --check`; require zero test/type/lint errors and zero production vulnerabilities.

- [ ] **Step 2: Deploy a protected Vercel preview**

Confirm the remote Next.js production build succeeds and inspect response/security headers.

- [ ] **Step 3: Complete browser acceptance testing**

Test landing long press on mobile, English public/admin pages, Strava/footer links, legal address/contact, recovery email redirect, and Vienna time round-trip. Check browser console/network for errors.

- [ ] **Step 4: Apply reviewed production settings**

Apply the Supabase Auth URL configuration and reviewed English settings SQL. Verify the SOUS SOL contact email value exists before publishing legal pages.

- [ ] **Step 5: Merge and deploy production**

Merge `feature/site-fixes` into `main` without touching the preserved Stripe branch, push, deploy, and repeat the critical smoke tests against the canonical domain.

- [ ] **Step 6: Commit any deployment-only documentation**

Commit message: `docs: record site fixes release checks`

