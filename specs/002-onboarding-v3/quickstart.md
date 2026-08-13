# Quickstart: Validating Onboarding V3

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-08-13

How to prove 002 works, end to end. Every scenario maps to a spec requirement so
a failure names what it broke.

---

## Prerequisites

```bash
npm install
npx playwright install          # once per machine — the browser project needs it
npm run dev                     # port 8080
```

Migration 018 is **not** required to run the flow. Without it the onboarding
marker degrades to non-resumable and everything else behaves normally — that
tolerance is itself a scenario (S9). To exercise resume:

```bash
supabase db push --linked       # applies 018_brand_onboarding_state
```

Two accounts are needed for the isolation check (S10). The dev bypass on the
login screen exercises the local adapter path; a real sign-in exercises Supabase.
**Both must pass** — a behaviour that works on only one is not done.

---

## Automated gates

```bash
npm run lint                    # 0 errors
npm run typecheck:ci            # ratchet — no NEW type errors
npx vitest run --project unit   # jsdom: unit + adapter integration
npx vitest run --project browser # Playwright: the end-to-end journeys
npm run test                    # all projects — the single gate
```

RLS for the new column:

```bash
supabase db query --linked -f supabase/tests/018_onboarding_state.test.sql
```

The suite is self-asserting: it fails loudly rather than printing a report to
read.

---

## Manual validation scenarios

### S1 — Bring an existing brand (US1, FR-012…FR-021)

1. Go to `/onboard-brand`, name the brand, choose "I have a brand", paste a
   description.
2. Drop a logo (SVG or transparent PNG), a font file, a palette image, a PDF and
   a website link.
3. **Expect**: each item appears under the group the system chose; the logo lands
   in a slot; the palette contributes colours; the font is grouped as one family
   with its weights; the PDF is present; nothing vanishes.
4. **Expect**: proposed mission / audience / voice appear, drawn only from the
   text you wrote — no invented content.
5. **Verify in the Library** (`/b/:slug/folders`) that every file is a real
   Library item. **Nothing may be a `data:` URL.**

### S2 — Start from scratch (US2, FR-011, FR-015)

1. `/onboard-brand`, name it, choose "starting new".
2. **Expect**: starting directions instead of an upload surface.
3. Pick a direction, continue, finish.
4. **Compare** with the S1 brand: the same concepts are populated through the
   same write paths. Only the values differ.

### S3 — Per-value acceptance (US3, FR-025, FR-025a–d) — *the critical one*

1. Reach Review with several proposals.
2. **Open and read** a proposal. Scroll past others. Accept **nothing**.
3. Finish.
4. **Expect**: every value you merely looked at is still below `confirmed`.
   Reading is not accepting.
5. Repeat: accept exactly one value, edit exactly one other, finish.
6. **Expect**: those two are `confirmed`, everything else is not, and both still
   record their original provenance — an AI-suggested value that you confirmed
   reads as *both*, not as user-entered.
7. **Expect**: no value anywhere is `official`.

Inspect authority via the brand record's `identityMeta`:

```js
// browser console
JSON.parse(localStorage.getItem('brandos:brands')).at(-1).identityMeta
```

### S4 — Accept all equals accepting each (FR-025c)

Accept a group with "accept all"; on a second brand accept the same values one
by one. **Expect**: identical `identityMeta` for those paths, including
`promotedBy`. No group-level record exists.

### S5 — Nothing is generated (US4, FR-030)

After finishing, check that no Brand Kit adoption, guideline, template or design
exists for the brand. `/b/:slug/brand-kit` shows an un-generated kit.

### S6 — Name only (US5, FR-033)

Name a brand, skip everything, finish. **Expect**: a valid brand, in under 30
seconds, landing on Setup.

### S7 — Resume (US5, FR-035)

1. Get to the material step, upload something, close the tab.
2. Reopen `/onboard-brand/:slug` — ideally in a different browser profile signed
   in as the same user.
3. **Expect**: you land on the material step with your uploads already in the
   Library.

### S8 — Abandonment is visible (US5, FR-009)

Name a brand and leave. **Expect**: it appears in the brand list marked
unfinished, resumable, and deletable.

### S9 — Pre-migration tolerance (R5)

Against an environment without 018: the whole flow works, saves succeed, and only
resume degrades. **No failed save, ever.**

### S10 — Isolation (FR-040)

As account B, open account A's `/onboard-brand/:slug`. **Expect**: not found,
decided at the data layer. Confirm the same via direct query — a hidden route is
not protection.

### S11 — One brand, never two (FR-005, SC-006)

Double-click the primary action on every step. Re-enter `/onboard-brand` while a
brand is in progress. **Expect**: exactly one brand.

### S12 — Return destination (FR-036)

Enter from a surface that needs a brand, so the URL carries `?then=`. Finish.
**Expect**: you return there, not to Setup.

---

## Retirement verification (FR-041, FR-042, SC-011)

Run last, after every scenario above passes.

```bash
# the superseded surface is gone
test ! -d src/features/onboarding-v4 && echo "v4 removed"
test ! -f src/pages/onboard-brand/create.tsx && echo "create page removed"

# nothing still imports it
rg -n "onboarding-v4|cosmos\.css" src/ || echo "no dangling importers"

# and the gates still pass
npm run typecheck:ci && npm run test
```

Then confirm in the browser that `/onboard-brand/create` and `/onboarding-brand`
both resolve to `/onboard-brand` rather than 404.

---

## What "done" means

Every automated gate green, S1–S12 demonstrated on **both** storage backends, and
the retirement check clean. Per the constitution: done means verified, not
compiled.
