# 02 — Pre-Production Verification (executed)

> **Not just documented — executed.** No local Docker/psql/staging exists, so a real PostgreSQL was
> stood up in-process via **PGlite (PostgreSQL 18.3, WASM)** in the scratchpad, which **enforces RLS
> under `SET ROLE`** (probed and confirmed). Security policy behavior was verified **outside
> production** against a faithful reproduction of the relevant pre-patch schema. Nothing touched
> production or the repo runtime.

## Environment
- Engine: PGlite `PostgreSQL 18.3`, in-process (Node v23). RLS-under-`SET ROLE` **confirmed
  enforced** by a probe (as `authenticated`, only own-row visible; bad insert blocked).
- Reproduction (`scratchpad/pgverify/setup_preprod.sql`): the exact pre-patch objects the 011/012
  policies + tests touch — `workspace_role` enum; `profiles`/`workspaces`/`workspace_members`
  tables; `is_workspace_member` (SECURITY DEFINER); the **pre-patch** policies verbatim from
  migration 001 (vulnerable `wm_insert_admin`, `USING`-only `wm_update_admin`, `profiles USING(true)`);
  004's `admin_profiles_all` + `is_super_admin`; an `auth.uid()` shim reading `request.jwt.claims`
  exactly as Supabase does.
- **One faithful-reproduction deviation, documented:** the original `wm_select_fellow` SELECT policy
  self-references `workspace_members` and triggered Postgres "infinite recursion detected in policy"
  under enforcement. It was replaced with a **definer-based, semantically-equivalent**
  `USING (is_workspace_member(workspace_id,'viewer'))` so the tests' read-assertions can run. This
  does **not** affect the INSERT/UPDATE escalation logic under test. **Observation (needs prod
  confirmation, NOT part of this release):** if production's `wm_select_fellow` is the recursive
  form, authenticated reads of `workspace_members` could error in prod — worth a follow-up check.

## Negative controls — the environment actually reproduces both vulnerabilities (VERIFIED)
Run against the **pre-patch** schema:
- **NC-011:** as an attacker (their own JWT), `INSERT workspace_members(victim_ws, self, 'owner')`
  → **SUCCEEDED** → cross-tenant self-owner escalation reproduced. ✓
- **NC-012:** as an unrelated authenticated user, `SELECT email FROM profiles WHERE id=<stranger>`
  → **returned `b@x.com`** → cross-tenant email exposure reproduced. ✓

These prove the tests are not passing trivially — the vulns are present before the patch.

## 011 — required proofs (VERIFIED, real test file `supabase/tests/011_…sql`)
After applying the real `20260809000000_011_…sql`, the self-asserting suite ran **✓ ALL ASSERTIONS
PASSED**, covering:
- no cross-tenant self-membership/owner escalation (Proof 1 + 1b: insert as owner AND as editor into
  a foreign workspace both **blocked**);
- no admin→owner self-promotion (Proof 3a **blocked**);
- legitimate workspace-owner bootstrap works (regression: genuine owner self-inserts owner in their
  own new workspace — **allowed**);
- legitimate admin member management works (Proof 2: admin adds + updates a non-owner member —
  **allowed**);
- owner protections (Proof 3b update owner row **blocked**, 3c delete owner **blocked**);
- helper not authoritative for the attacker (Proof 4: `is_workspace_member(victim,·)` **false**).

## 012 — required proofs (VERIFIED, real test file `supabase/tests/012_…sql`)
After applying the real `20260809010000_012_…sql`, the suite ran **✓ ALL ASSERTIONS PASSED**:
- an unrelated authenticated user **cannot** read a stranger's profile/email (stranger row **not
  visible**);
- legitimate workspace/member visibility still works (a workspace **co-member's** profile **is**
  visible);
- self profile visible; and admin access is preserved by the untouched `admin_profiles_all`
  (super-admin path), so admin behavior remains intact.

## Backup / recovery dry-run (Section 5 — EXERCISED, not just documented)
Harness `scratchpad/pgverify/dryrun.mjs` captured state, applied both patches, then applied the
down-migrations:
- **PRE-PATCH snapshot:** no helper functions; `wm_insert_admin` carries the vulnerable
  `role='owner'` disjunct (no `is_workspace_owner`); profiles has broad `profiles_select_by_member`.
- **POST-PATCH:** `is_workspace_owner` + `shares_workspace_with` present; `wm_insert_admin` gated on
  `is_workspace_owner`; profiles has `profiles_select_coworkers`.
- **DOWN 012 + DOWN 011 applied: OK.**
- **Rollback restored the pre-patch state EXACTLY** (policy + function snapshots identical to
  pre-patch). ✓
- **Post-rollback the vulnerability returns** (attacker owner-insert succeeds again) — proving the
  rollback truly reverts the security posture, not just object names. ✓

**This verifies the down-migrations that Stage 1 could only document** → the rollback path is proven.

## Overall verdict
**PASS.** Vulnerabilities reproduced pre-patch; both real test suites green post-patch; forward +
rollback both proven against real PostgreSQL. This satisfies S2 (tests executed) and DB3 (backup/
rollback exercised) **in pre-production** — final PASS flips only after the same runs succeed against
the production/shadow DB during deployment (`03-PRODUCTION-RUNBOOK.md`).

## Caveats (why pre-prod ≠ production)
- PGlite ≠ Supabase's full stack (no `auth.users`, `storage`, real `authenticated`/`anon` GRANT
  wiring, extensions). The reproduction is a **focused subset** of the objects the patches touch —
  sufficient to prove RLS logic, not a full-schema replay. The production runbook re-runs the same
  assertions against a shadow of the real DB before/after deploy.
- The `wm_select_fellow` recursion observation should be checked on the real DB (separate from this
  release).
