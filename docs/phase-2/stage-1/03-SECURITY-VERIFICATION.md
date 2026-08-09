# Stage 1 · Checkpoint 3 — RLS Security Verification

> Verify the security fixes **outside production first**. This environment has **no local Supabase
> (Docker not installed), no staging project, and no `psql`** (Checkpoint 1 §2), so the executable
> RLS tests **cannot be run here**. Verification is therefore: (1) rigorous **static** predicate
> proof + (2) self-asserting test scripts staged for the owner/CI to execute against a shadow DB.
> Statuses: **VERIFIED (static) / BLOCKED (executable, needs a DB) / dispositions per finding.**

## 1. Migration 011 (workspace-member escalation) — static verification

Full predicate proof is in `docs/codebase-intelligence/12-RLS-CONTAINMENT.md` §5–7; re-confirmed
here against the current file. Summary of why each required property holds:

| Required proof | Holds because (predicate) |
|---|---|
| Attacker cannot self-insert into an unrelated workspace | `wm_insert_admin` clause (b) requires `is_workspace_owner(workspace_id)`, false for a victim WS; clause (a) requires existing admin membership, absent |
| Attacker cannot self-promote admin→owner | `wm_update_admin` `WITH CHECK` now includes `role <> 'owner'` → new row with `role='owner'` rejected |
| Legit owner bootstrap still works | clause (b) true for a workspace the caller owns (`workspaces_insert_auth` set `owner_id=self`); `is_workspace_owner` is SECURITY DEFINER so it sees `owner_id` before the membership row exists (the chicken-and-egg fix) |
| Legit admin member management still works | clause (a) `is_workspace_member(ws,'admin')`; UPDATE `USING/WITH CHECK` allow non-owner target/new rows |
| Owner protected | UPDATE `USING role<>'owner'` (can't modify owner row) + `wm_delete_admin` `role != 'owner'` |
| Super-admin intentional | migration 004 `admin_workspace_members_all` (permissive, unchanged) |

**Postgres note re-confirmed during this checkpoint:** for an UPDATE policy with a `USING` clause and
**no** `WITH CHECK`, PostgreSQL applies the `USING` expression to the **new** row as well. 011's
`wm_update_admin` `USING` already carries `role <> 'owner'`, so even absent the explicit `WITH CHECK`
the owner-promotion would be blocked; the explicit `WITH CHECK` is defensive clarity. (This same
behavior is load-bearing for the disposition of finding C below.)

**Executable test:** `supabase/tests/011_workspace_member_escalation.test.sql` — self-asserting,
encodes all six proofs + the create-workspace regression. **Status: BLOCKED (not run — no pre-prod
DB).** Run pre-production with:
```
supabase db reset && psql "$SHADOW_DB_URL" -f supabase/tests/011_workspace_member_escalation.test.sql
# expect: "✓ ALL 011 RLS ASSERTIONS PASSED", exit 0
```

## 2. Finding S3-A — profiles/email visibility → **FIX NOW (fix written: migration 012)**

- **Confirmed (VERIFIED):** `profiles_select_by_member USING (true)` (001:29-32) exposes every
  `public.profiles` row — incl. `email TEXT NOT NULL` (001:15) — to any authenticated user. Whole-
  user-base PII harvest. Authenticated-only (anon has no profiles SELECT policy).
- **Classification: FIX NOW** — cross-tenant PII access.
- **Fix (written, staged, not deployed):** `supabase/migrations/20260809010000_012_restrict_profiles_visibility.sql`
  replaces the `USING(true)` policy with `id = auth.uid() OR shares_workspace_with(id)` (a new
  SECURITY DEFINER helper), so a user sees only their own profile + workspace co-members. **Admin
  access preserved** via migration 004 `admin_profiles_all` (VERIFIED present, 004:76 — super-admins
  keep full access; regular users lose the all-profiles read). Public pages use denormalized data,
  not `profiles` (anon has no policy) → no regression.
- **Executable test:** `supabase/tests/012_profiles_visibility.test.sql` (self + co-member visible;
  stranger not). **Status: BLOCKED (not run — no pre-prod DB).**
- **Down:** `supabase/migrations/down/012_restrict_profiles_visibility.down.sql` (restores the
  vulnerable policy; forward-only caveat as in Checkpoint 2).

## 3. Finding S3-B — `finalize-onboarding-assets` service-role IDOR → **FIX NOW (owner action; not edited this session)**

- **Confirmed (VERIFIED):** the Edge Function creates a **service-role** client and performs a
  storage move using client-supplied `sessionId`/`brandId` with **no JWT/ownership check**
  (11 §9). An authenticated caller can move attacker scratch files into a victim brand's folder, or
  read another brand's scratch by guessing `sessionId` — an **authenticated cross-tenant storage
  IDOR** (anon is blocked by the default gateway `verify_jwt=true`; no override in `config.toml`).
- **Orphan (VERIFIED):** `grep -rn "finalize-onboarding-assets" src/` returns **zero** callers — the
  live app (onboarding-v4) embeds data-URLs and never calls it. It is dead code that is nonetheless a
  live attack surface **if deployed**.
- **Classification: FIX NOW** (cross-tenant access via a service-role function).
- **Remediation (owner action — I did not edit runtime Edge code this session, and cannot verify
  deployment or redeploy from here):**
  1. **Determine if it is deployed:** `supabase functions list`.
  2. **Preferred (it is an orphan):** **undeploy** it — `supabase functions delete finalize-onboarding-assets`
     — removing the attack surface entirely without deleting source (respects "no legacy deletion").
     Same applies to the sibling orphan `cleanup-onboarding-scratch` (low impact, no user input).
  3. **If it must stay deployed:** add, at the top of the handler, (a) `verify the caller JWT`
     (`supabase.auth.getUser()` from the `Authorization` header), and (b) an **ownership check** that
     the caller is an editor/admin of `brandId` (`is_brand_member(brandId,'editor')`) and that
     `sessionId` belongs to that caller — reject otherwise.
- **Why not fixed in-session:** editing/redeploying an Edge Function is a runtime backend change that
  needs deploy access + verification not available here; and the safest action (undeploy the orphan)
  also needs access. Flagged for the same owner deploy window as 011/012.

## 4. Finding S3-C — `bm_update` missing WITH CHECK → **FIX LATER WITH JUSTIFICATION (re-analysis corrects an earlier overstatement)**

- **Earlier claim (11 §9 / 12 §6):** `bm_update` lacks a `WITH CHECK`, implying an admin could move a
  brand membership to a brand they don't admin (cross-tenant).
- **Re-analysis this checkpoint (VERIFIED against Postgres semantics):** `bm_update`
  `USING (is_brand_member(brand_id,'admin'))` has no `WITH CHECK`, so Postgres **reuses the `USING`
  expression as the `WITH CHECK`** for the new row. The new row must satisfy
  `is_brand_member(new.brand_id,'admin')` — i.e. the caller must admin the **target** brand — so
  **moving a membership to a brand the caller does not admin is already blocked.** The earlier
  "cross-tenant" framing was **overstated.** Residual: an existing brand-admin could change a
  membership's *role* within a brand they already admin (no owner tier at brand level) — normal
  within-brand admin power, not cross-tenant.
- **Classification: FIX LATER WITH JUSTIFICATION.** Justification: (a) not a cross-tenant hole given
  the USING-reuse; (b) `brand_members` is effectively **unused today** (no UI/flows — Phase-0 06);
  (c) brand-level permission overrides are **owner-DEFERRED** (Owner Decision D-Perms / target-arch
  C4). The correct time to add an explicit `WITH CHECK` (with role/tenant constraints) is when brand
  overrides are actually built. If, at RLS-test time, the USING-reuse behavior is somehow not
  observed, this upgrades to FIX NOW — but that behavior is standard Postgres.

## 5. Deployment impact of this checkpoint

Migration 012 was added. Pending forward migrations are now, in order: **009, 010, 011, 012** (009/010
are pre-existing owner-deferred; 011/012 are the security fixes). This **compounds** the Checkpoint-1
§5 deployment complication — a plain `supabase db push` would apply all four. The clean-deploy
decision is deferred to **Checkpoint 4** and requires owner input (do not deploy unrelated
009/010 as a side effect of shipping the security fixes).

## 6. Checkpoint 3 status
| Item | Status |
|---|---|
| 011 static predicate proof | **VERIFIED** |
| 011 executable RLS test | **BLOCKED** (no pre-prod DB; script staged) |
| S3-A profiles/email | **FIX NOW** — migration 012 written + test staged |
| 012 static reasoning | **VERIFIED** (admin access preserved; member-lists preserved) |
| 012 executable test | **BLOCKED** (no pre-prod DB; script staged) |
| S3-B finalize IDOR | **FIX NOW** — owner action (undeploy orphan / add guard); not edited in-session |
| S3-C bm_update | **FIX LATER WITH JUSTIFICATION** — re-analyzed, not cross-tenant; unused + deferred |

No security checkpoint **failed**. Executable verification is **BLOCKED by environment**, not by a
test failure. Because the deploy is owner-gated (Checkpoint 4), continue to the **engineering
checkpoints (5–8)**, which are independent of the DB deploy, then STOP at Checkpoint 4's deploy step.

---

## Checkpoint 4 — Production Security Deployment: **STOPPED (not deployed)**

**Entry condition NOT met.** Checkpoint 4 may be entered "only if Checkpoint 3 is fully green."
Checkpoint 3's executable RLS tests are **BLOCKED** (no local/staging/`psql`), so the fix is proven
only statically, not against a database. Three independent blockers prevent a safe production deploy
from this session:

1. **No pre-production verification path.** No local Supabase (Docker not installed), no staging
   project, no `psql`. The self-asserting tests (011, 012) have not been executed anywhere.
2. **Unrelated migrations would ride along.** Pending forward migrations are **009, 010, 011, 012**
   (Checkpoint 1 §5, §3 above). A standard `supabase db push` applies **all four**, deploying the
   owner-deferred 009 (templates) + 010 (brand-kit-premium / `profiles.is_admin`) as a side effect —
   violating "confirm no unrelated migrations/code will be deployed." **Owner decision required.**
3. **No management-API auth / deploy authority in-session.** No `SUPABASE_ACCESS_TOKEN`, no
   `~/.supabase` session. The linked project is **production** (`brandos-prod`) with no staging to
   practice on. Deploying straight to prod without the above is exactly the "do not guess" case.

**Therefore S1 (011 applied) and S2 (tests executed) remain BLOCKED — not PASS.**

### Exact manual actions the owner must perform (in order)

**Step 0 — decide the 009/010 question** (Checkpoint 1 §5). Choose one:
- **(i)** Accept 009+010 going live now (they are additive, idempotent `IF NOT EXISTS` schema; this
  would make `templates`/`template_categories` and `profiles.is_admin` real in prod). *Simplest, but
  ships owner-deferred scope.*
- **(ii)** Ship **only** the security fixes: apply 011 + 012 **out of band** (execute their SQL
  directly against prod, then insert their versions into `supabase_migrations.schema_migrations`),
  leaving 009/010 pending. *Keeps deferred scope out, at the cost of a manual history entry.*
- **(iii)** Reorder/renumber so the security fixes precede 009/010. *More churn; not recommended.*

**Step 1 — stand up a pre-production DB and run the tests (required before any prod write):**
```
# local (needs Docker) OR a throwaway staging project:
supabase db reset
psql "$SHADOW_DB_URL" -f supabase/tests/011_workspace_member_escalation.test.sql   # expect ✓ PASS
psql "$SHADOW_DB_URL" -f supabase/tests/012_profiles_visibility.test.sql           # expect ✓ PASS
```
If either fails → STOP, fix the migration/test only, repeat (do not deploy).

**Step 2 — capture the backup** (Checkpoint 2 §1) against prod.

**Step 3 — deploy** per the Step-0 choice. For choice (ii), the security-only path is e.g.:
```
psql "$PROD_CONN" -f supabase/migrations/20260809000000_011_fix_workspace_member_escalation.sql
psql "$PROD_CONN" -f supabase/migrations/20260809010000_012_restrict_profiles_visibility.sql
# then record both versions in supabase_migrations.schema_migrations
```
For choice (i): `supabase db push` (applies 009,010,011,012).

**Step 4 — post-deploy verification** (Checkpoint 2 §4 queries) + re-run the two test scripts against
prod-in-a-rollback-transaction if desired. Only then mark **S1 = PASS, S2 = PASS**.

**Step 5 — disposition S3-B** (finalize-onboarding-assets): `supabase functions list`; if deployed,
`supabase functions delete finalize-onboarding-assets` (and `cleanup-onboarding-scratch`), or add the
JWT+ownership guard (§3).

**No production write was performed in this session.**
