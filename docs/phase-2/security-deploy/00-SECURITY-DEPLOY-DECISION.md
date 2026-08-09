# 00 — Security-Only Deployment Decision

> Goal: get production to receive **only** the security intent of migrations **011 + 012**, with
> **zero** risk of applying the deferred/non-security **009/010**. Nothing is deployed by this
> document. Evidence: `02-PREPROD-VERIFICATION.md`.

## Production reality (VERIFIED 2026-08-09, `supabase migration list --linked` → `brandos-prod`)
Remote head = **008** applied. Pending (by timestamp): 009, 010, 011, 012.
**Extra finding:** 009 is **un-deployable as written** — it `ALTER TABLE designs …` but no migration
creates `designs`, so any `db push` that reaches 009 would **error**. So the current repo state is a
latent `db push` failure, independent of the ride-along concern.

## The four options evaluated

### A. Manual SQL execution of 011/012 + history-table insert
Run 011.sql, 012.sql directly against prod, then insert their versions into
`supabase_migrations.schema_migrations`.
- **History:** 011/012 marked applied; 009/010 stay pending. **Requires manual history rows** — the
  "migration-history manipulation" to avoid casually.
- **Future `db push`:** still sees 009/010 pending → would try (and 009 would error). Problem persists.
- **Rollback:** run down SQL + delete the two history rows manually.
- **Drift risk:** MEDIUM — hand-edited history + hand-run SQL can desync from files.
- **Clean chain:** NO, unless 009/010 are also resolved.

### B. New forward security migrations after the prod head
Copy 011/012 content into fresh migrations timestamped after 008.
- **History:** clean append **only if** 009/010 are removed from the push path — otherwise `db push`
  applies 009 (error) + 010 before the new ones (they have earlier timestamps).
- **Future push / drift / chain:** same 009/010 blocker as A. B alone does not solve it.

### C. Supabase migration repair (`supabase migration repair --status applied <ver>`)
Mark 009/010 as "applied" in remote history without running them, then push 011/012.
- **History:** records 009/010 as applied **when they are not** → the DB and history **lie** to each
  other. Future `db reset`/diffs assume those objects exist (they don't).
- **Future push:** clean for 011/012, but any later feature needing real 009/010 schema breaks.
- **Drift risk:** HIGH — deliberate history/DB divergence. Rejected.

### D. Relocate unreleased 009/010 out of the push path, then standard `db push` ✅ RECOMMENDED
Move 009/010 (+ 010 down) to `supabase/deferred-migrations/` (a sibling dir Supabase does **not**
scan). `supabase/migrations/` then contains 001–008 (matching remote) + 011 + 012 only, so
`supabase db push` applies **exactly 011 + 012**, in order, via the **normal mechanism**.
- **History:** clean and truthful — remote gains exactly 011, 012. No hand-edited history rows.
- **Future `db push`:** deploys only what's in `supabase/migrations/`; deferred schema can never
  ride along again (the footgun is disarmed, and the 009 broken-dependency failure is removed).
- **Rollback:** the standard down migrations — **verified working** in pre-prod
  (`02-PREPROD-VERIFICATION.md` §backup-dry-run restored pre-patch state exactly).
- **Drift risk:** LOW — files ↔ history stay in sync; no manipulation.
- **Clean chain:** YES. 009/010 are preserved for deliberate, reworked reintroduction later
  (`01-MIGRATION-HISTORY-PLAN.md`).

## Recommendation
**Option D.** It is the only approach that (a) deploys purely 011/012, (b) uses no history
manipulation, (c) removes the latent 009 failure, and (d) leaves a clean, truthful future chain.
The relocation has been **executed** in the repo (reversible via git); the deploy itself is **not**
executed — see `03-PRODUCTION-RUNBOOK.md`.

## Security release scope (what deploys)
1. **Migration 011** — closes the cross-tenant workspace-owner escalation.
2. **Migration 012** — closes the all-tenant profiles/email exposure.
3. **`finalize-onboarding-assets` IDOR (S3-B) — Edge Function action (Section 4):**
   - **Needed by live product?** **No.** `grep -rn "finalize-onboarding-assets" src/` → **zero
     callers** (live onboarding-v4 embeds data-URLs; it never calls this function). Orphan.
   - **Recommendation: disable/remove its callable production surface** — `supabase functions list`;
     if deployed, `supabase functions delete finalize-onboarding-assets` (also the sibling orphan
     `cleanup-onboarding-scratch`). This eliminates the authenticated cross-tenant storage IDOR
     without touching product code. **Not a migration** — separate deploy action, in the runbook.
   - **If the owner insists on keeping it deployed:** add the smallest guard at the top of the
     handler — verify the caller JWT (`supabase.auth.getUser()`), then require
     `is_brand_member(brandId,'editor')` and that `sessionId` belongs to the caller; reject
     otherwise. Add a regression test asserting an unauthenticated/foreign-brand call is `403`.
     (Not implemented here — undeploy is preferred; editing/redeploying the function needs deploy
     access + a live target to test against.)

## What is explicitly NOT in this release
009, 010 (relocated/deferred), any product/domain/editor/route change, any Stage-2 work, the
browser-AI-key migration (needs the server gateway first — separate Stage-2 item).
