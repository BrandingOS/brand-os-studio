# Stage 1 · Checkpoint 2 — Backup / Rollback Runbook (migration 011)

> The minimum real backup/rollback plan required **before** any production database change. No
> production writes are performed by this document. All commands are for the owner (or a session
> with prod DB access) to run; this environment has no `psql` and prod-only access (Checkpoint 1 §2).

## 0. What migration 011 actually changes (VERIFIED — scopes the backup)

011 is **pure DDL, zero DML**:
- `CREATE OR REPLACE FUNCTION public.is_workspace_owner(uuid)` — new function.
- `DROP + CREATE POLICY "wm_insert_admin"` on `public.workspace_members`.
- `DROP + CREATE POLICY "wm_update_admin"` on `public.workspace_members`.

**No table is created/altered/dropped. No row is inserted/updated/deleted.** Therefore:
- **No row/data backup is required** for 011 itself.
- The only state to capture is **the current definitions of the two policies** (so they can be
  restored exactly) and the fact that `is_workspace_owner` does not yet exist.

## 1. How schema state is captured (before deploy)

Run against production **before** applying 011 and save the output as the restore reference:

```bash
# A. Full schema snapshot (safe, read-only) — general safety net for the whole schema.
supabase db dump --linked -f backups/2026-08-09_pre-011_schema.sql   # schema only (no data)

# B. Exact current definitions of the two policies being replaced (the precise restore source):
#    (run via any SQL client with the prod connection string)
SELECT tablename, policyname, cmd, qual AS using_expr, with_check
FROM   pg_policies
WHERE  schemaname = 'public' AND tablename = 'workspace_members'
ORDER  BY policyname;
# Save the rows for wm_insert_admin and wm_update_admin verbatim.

# C. Confirm is_workspace_owner does not pre-exist (so DROP on rollback is safe/idempotent):
SELECT proname FROM pg_proc WHERE proname = 'is_workspace_owner';   # expect 0 rows pre-deploy
```

The current (pre-011) policy definitions are also preserved **in source** at
`supabase/migrations/20260412000000_001_workspaces_and_rls.sql` (wm_insert_admin `:548-555`,
wm_update_admin `:557-560`) and reproduced exactly in the down script — so restore is deterministic.

## 2. How migration history is recorded

Supabase tracks applied migrations in `supabase_migrations.schema_migrations`. After a successful
`supabase db push`, migration `20260809000000` appears there (and in `supabase migration list
--linked` under the Remote column). Capture before/after:
```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```

## 3. Rollback procedure — HONEST statement about Supabase's model

> **Supabase remote migrations are forward-only.** `supabase db push` does **not** apply the
> `supabase/migrations/down/*.sql` files — the `down/` directory is a **repository convention**, not
> an automatic Supabase rollback mechanism. A down script exists
> (`supabase/migrations/down/011_fix_workspace_member_escalation.down.sql`) and has been written and
> statically reviewed, **but it has NOT been executed/verified against a database** (no pre-prod env
> in this session). **Do not treat it as a proven one-command rollback.**

Rollback is therefore done as an **explicit corrective action**, one of:

**Option R1 — manual DDL execution (fastest emergency undo).** Execute the down script's SQL against
prod via a SQL client:
```
psql "$PROD_CONN" -f supabase/migrations/down/011_fix_workspace_member_escalation.down.sql
```
This DROP+CREATEs the two policies back to their 001 form and DROPs `is_workspace_owner`. Because 011
made no data changes, **no data cleanup is needed**. Then delete the `20260809000000` row from
`schema_migrations` (or push a corrective migration) so history matches.

**Option R2 — corrective forward migration (clean history, preferred for non-emergencies).** Create a
new migration `2026…_012_revert_011.sql` containing the down SQL, and `supabase db push`. History
stays forward-only and consistent.

**⚠ Rollback re-opens the vulnerability.** Both options restore the *vulnerable* wm_insert_admin
(cross-tenant self-owner insert) and the unguarded wm_update_admin. Roll back **only** if 011 is
proven to break a legitimate flow that cannot be hotfixed forward; otherwise **prefer fix-forward**
(a small corrective migration on top of 011).

## 4. Exact verification queries

**Post-deploy success checks** (expect the shown results):
```sql
-- (a) new function exists
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'is_workspace_owner';   -- 1 row, prosecdef=true

-- (b) wm_insert_admin now gates self-owner on ownership (with_check references is_workspace_owner)
SELECT policyname, with_check FROM pg_policies
WHERE tablename='workspace_members' AND policyname='wm_insert_admin';
-- with_check must contain is_workspace_owner(workspace_id) and NOT the bare
-- "(user_id = auth.uid() AND role = 'owner')" disjunct.

-- (c) wm_update_admin now has a WITH CHECK and an owner guard
SELECT policyname, qual, with_check FROM pg_policies
WHERE tablename='workspace_members' AND policyname='wm_update_admin';
-- both qual and with_check must contain "role <> 'owner'"; with_check must be non-null.

-- (d) migration recorded
SELECT version FROM supabase_migrations.schema_migrations WHERE version='20260809000000';  -- 1 row
```
Then run the full RLS assertion suite (`supabase/tests/011_workspace_member_escalation.test.sql`) —
see Checkpoint 3.

**Post-rollback checks:** (a) returns 0 rows; (b) `with_check` again contains the bare
`(user_id = auth.uid() AND role = 'owner')`; (c) `with_check` is null again.

## 5. What can and cannot be safely rolled back

| Aspect | Rollback safety |
|---|---|
| The two policy definitions | **Fully reversible** — exact prior SQL preserved in 001 + down script |
| `is_workspace_owner` function | **Fully reversible** — DROP is safe; nothing else references it (VERIFIED: only 011's own policy uses it) |
| Row/data | **N/A** — 011 changes no data; nothing to restore or clean up |
| Memberships inserted while 011 was live | **No cleanup needed** — the old (more permissive) policy also permits any row the stricter policy allowed |
| Migration history | Reversible via `schema_migrations` delete (R1) or corrective migration (R2) |
| The security posture | Rollback **re-introduces the vulnerability** — an operational risk, not a data risk |

## 6. Pre-deploy readiness checklist (must all be true before Checkpoint 4)
- [ ] `backups/2026-08-09_pre-011_schema.sql` captured (§1A)
- [ ] Current wm_insert_admin / wm_update_admin definitions saved (§1B)
- [ ] Confirmed `is_workspace_owner` absent pre-deploy (§1C)
- [ ] Rollback option chosen (R1 emergency / R2 clean) and the down SQL staged
- [ ] Verification queries (§4) ready to paste post-deploy
- [ ] The §5-Checkpoint-1 owner decision on 009/010 ride-along resolved

## 7. Checkpoint 2 status
Runbook established (documentation only; no prod writes). **DB3 (backup/rollback established) =
documented and ready**, but marked **BLOCKED** at Stage-1 completion until the pre-deploy capture
(§1) is actually executed against prod, which requires the owner's DB access + the §5/CP1 decision.
Continue to Checkpoint 3.
