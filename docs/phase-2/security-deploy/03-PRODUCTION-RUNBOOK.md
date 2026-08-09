# 03 — Production Deployment Runbook (security-only: 011 + 012)

> Exact, ordered checklist. **Nothing here has been executed against production.** Deployment
> requires management/DB access this session does not have (no `SUPABASE_ACCESS_TOKEN`, no `psql`,
> no Docker). Where an action needs the owner, the exact command is given and execution **stops**
> there. Approach = Option D (`00-SECURITY-DEPLOY-DECISION.md`): the repo push-path already contains
> only 011 + 012, so `supabase db push` deploys exactly those.

## BEFORE

1. **Confirm the target project.**
   - Project: **`brandos-prod`**, ref **`ciojgoozobzbeglwdxcz`** (`supabase/.temp/linked-project.json`,
     `config.toml`). This is **production** (no staging exists).
   - `supabase projects list` (if authenticated) to double-confirm the ref before any write.

2. **Confirm the remote migration state + that only 011/012 are pending.**
   ```
   supabase migration list --linked
   ```
   Expected: Local **and** Remote match through `20260427000000` (008); **only** `20260809000000`
   (011) and `20260809010000` (012) are Local-without-Remote. **009/010 must NOT appear** as pending
   (they were relocated to `supabase/deferred-migrations/`). If 009/010 appear, STOP — the
   relocation was reverted; re-apply `01-MIGRATION-HISTORY-PLAN.md`.

3. **Backup (pre-change capture).**
   ```
   supabase db dump --linked -f backups/$(date +%F)_pre-011-012_schema.sql
   ```
   Plus capture the exact current policy definitions (restore reference):
   ```sql
   SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
   WHERE schemaname='public' AND tablename IN ('workspace_members','profiles') ORDER BY 1,2;
   SELECT proname FROM pg_proc WHERE proname IN ('is_workspace_owner','shares_workspace_with'); -- expect 0 rows
   ```

4. **Exact migrations that will execute:** `20260809000000_011_fix_workspace_member_escalation.sql`
   and `20260809010000_012_restrict_profiles_visibility.sql` — **and nothing else.**

5. **Confirm 009/010 will NOT execute:** they are in `supabase/deferred-migrations/` which Supabase
   does not scan; step 2's list is the authoritative check.

## DEPLOY

```
supabase db push
```
(applies 011 then 012, in order). Alternative (max control): run each file's SQL via the Supabase
SQL editor, then `supabase migration repair --status applied 20260809000000 20260809010000` to record
history — but `db push` on the clean path is simpler and needs no repair.

## AFTER (verify — do not declare success until all green)

1. **Schema verification queries** (expected results):
   ```sql
   SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('is_workspace_owner','shares_workspace_with'); -- 2 rows, prosecdef=true
   SELECT policyname, with_check FROM pg_policies WHERE tablename='workspace_members' AND policyname='wm_insert_admin';
     -- with_check contains is_workspace_owner(workspace_id); NOT the bare (user_id=auth.uid() AND role='owner')
   SELECT policyname, qual, with_check FROM pg_policies WHERE tablename='workspace_members' AND policyname='wm_update_admin';
     -- qual AND with_check both contain role <> 'owner'; with_check non-null
   SELECT policyname FROM pg_policies WHERE tablename='profiles' ORDER BY 1;
     -- includes profiles_select_coworkers; NOT profiles_select_by_member
   ```
2. **RLS behavior** — run the two suites against a prod **shadow** (or on prod inside a `BEGIN … ROLLBACK`):
   ```
   psql "$PROD_OR_SHADOW" -f supabase/tests/011_workspace_member_escalation.test.sql   # ✓ ALL PASSED
   psql "$PROD_OR_SHADOW" -f supabase/tests/012_profiles_visibility.test.sql           # ✓ ALL PASSED
   ```
   (Both already proven green in pre-prod — `02-PREPROD-VERIFICATION.md`.)
3. **Migration history:** `supabase migration list --linked` now shows 011 + 012 in Remote; 009/010 absent.
4. **Application smoke checks:** sign in; workspace/brands load; **member list still shows workspace
   co-members** (012 didn't break member lists); create a new workspace (owner bootstrap works);
   admin adds a member (works); a normal user cannot enumerate other tenants' users.

Only after all four → mark **S1 = PASS, S2 = PASS (prod)**.

## ROLLBACK / RECOVERY (verified working in pre-prod)

If any AFTER check fails:
```
psql "$PROD_CONN" -f supabase/migrations/down/012_restrict_profiles_visibility.down.sql
psql "$PROD_CONN" -f supabase/migrations/down/011_fix_workspace_member_escalation.down.sql
```
Then remove the two rows from `supabase_migrations.schema_migrations` (or push a corrective forward
migration). The dry-run (`02` §backup) proved these restore the exact pre-patch state (no data
changes; nothing to clean up). **⚠ Rollback re-opens both vulnerabilities** — prefer a small
fix-forward over rollback unless a legitimate flow is broken.

## Section 4 — finalize-onboarding-assets (separate Edge Function action)
Not a migration; do during the same deploy window:
```
supabase functions list                                   # is it deployed?
supabase functions delete finalize-onboarding-assets      # RECOMMENDED (orphan; zero src callers)
supabase functions delete cleanup-onboarding-scratch      # sibling orphan, low impact
```
(If the owner insists on keeping it: add the JWT + `is_brand_member(brandId,'editor')` guard and a
403 regression test — see `00-SECURITY-DEPLOY-DECISION.md` §Section 4. Undeploy is preferred.)

## Section 7 — Credential hygiene (OWNER ACTION REQUIRED)
- The embedded GitHub `gho_` token was removed from local `.git/config` (Stage 1) — **re-verified
  2026-08-09: no token in remote config, `.git/config`, or any tracked file.**
- **The token must still be REVOKED** by the owner (GitHub → Settings → Developer settings → revoke
  the OAuth token/app) and reissued via a credential helper (never embedded in the URL). Treat it as
  **compromised** until revoked. I cannot revoke it (no GitHub account access). Do not print the token.

## Stop condition
This session **cannot** safely execute the production deployment (no prod DB/management access, no
psql, production-only target). **STOP at BEFORE-step 1.** The owner (or a session with prod access)
runs BEFORE→DEPLOY→AFTER. Everything verifiable without prod access is done and green.
