# Access Architecture — 08 · Migration Plan

Production is at **034** (verified `supabase migration list --linked`, 2026-08-29). New
migrations are **035–045**, additive first, backfill, validate, then tighten. Nothing is
pushed to production by this initiative (owner decision #9); `09-runbook.md` is the hand-over.

Every migration: idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`), ends with a `DO $$`
guard-rail block that RAISEs if an invariant it introduced is not true, has a `down/` file,
and is exercised by `supabase db reset` + the SQL test suite locally and in CI.

| # | file | content | destructive? |
|---|---|---|---|
| 035 | `access_enums_and_columns` | `workspace_role_v2`, `brand_role`, `member_status`, `brand_access_mode`, `invitation_status`, `share_target` enums; new columns on `workspaces`, `workspace_members` (`role_v2`, `status`, `brand_access_mode`, `default_brand_role`, `capability_overrides`, suspend cols), `brands` (`archived_at`, `version`, `updated_by`), `UNIQUE(brands.id, workspace_id)`; `citext` extension | no |
| 036 | `backfill_tenancy` | brands with `workspace_id IS NULL` → the `user_id`'s personal workspace (oldest owned; created if the user somehow has none); `workspaces.is_personal` = the signup-created one (earliest per owner); `role_v2` backfill: owner→owner, admin→admin, editor→member/default `editor`/mode `all`, exporter→member/default `viewer`/mode `all` + grant `designs.export`,`brand.guideline.export`,`brand.kit.export`, viewer→member/default `viewer`/mode `all`; `brand_members` → `brand_access` (role map: owner/admin→manager, editor→editor, exporter→viewer+export grants, viewer→viewer); `workspace_id` denormalised onto every brand-child table listed in 02 §3 | no (adds data) |
| 037 | `validate_and_tighten` | `brands.workspace_id SET NOT NULL`; composite FKs `(brand_id, workspace_id) → brands(id, workspace_id)` on child tables (created `NOT VALID`, then `VALIDATE CONSTRAINT`); `VALIDATE` the four 017/032 `NOT VALID` constraints; swap `workspace_members.role` → `role_v2` (rename columns, keep old enum type until 045); drop `brand_members` (data already moved; kept as `brand_members_legacy` view for one release) | yes, validated first; guard-rail counts must match |
| 038 | `capabilities` | `role_capabilities` seed, `capability_overrides` validator trigger, `has_capability`, `brands_with_capability`, `workspaces_with_capability`, `effective_capabilities`, `my_access()`, ownership guards (`guard_last_owner`, `self_role_change`), `transfer_ownership`, `leave_workspace`, `create_workspace` (entitlement-checked), `guard_immutable_columns` | no |
| 039 | `rls_rewrite` | every tenant table's policies replaced (DROP IF EXISTS + CREATE), `TO authenticated`, `WITH CHECK` everywhere, `deleted_at`/`archived_at` filters; `user_roles` escalation fix; `platform_config` read narrowed to `is_moderator_or_above()`; storage policies re-pointed; `workspaces_insert_auth` removed (RPC only); `designs` gets brand scoping | **yes — the security change**; guarded by the SQL suite |
| 040 | `invitations` | table + RPCs + audit hooks | no |
| 041 | `share_links` | table + `resolve_share_link` + `resolve_showcase` + `is_public` revoke trigger; anon SELECT on `brand_identity_publications` removed; existing publications backfilled into `share_links(target_kind='identity')` using the existing token (already random, 24 chars — re-hashed; the URL keeps working) | anon policy removed |
| 042 | `audit_events` | table, policies, triggers on members/access/invitations/workspaces/brands/share_links/credit_ledger grants; retention function + cron | no |
| 043 | `entitlements` | `plan_entitlements` (seeded), `workspace_entitlement_overrides`, `entitlement()`, `check_limit()`, `ensure_credit_account` grants only `is_personal` | changes signup grant rule |
| 044 | `credits_v2` | `credit_reservations`, `ai_usage_events`, `reserve/settle/release` extended (same signatures + optional `_ttl`), `expire_stale_reservations` + cron, `reconcile_credit_account` + cron, `cancel_job` RPC and removal of the column-free jobs UPDATE policy, `image_generation_jobs.*_credits` → BIGINT | policy removed |
| 045 | `versioning_and_activity` | `version`/`updated_by`/`bump_version` on brands/designs/brand_kit_state/workspaces, `update_brand_checked`, `update_design_checked`, `activity_log.workspace_id` + backfill, drop old `workspace_role` enum once nothing references it | no |

## 2. Backfill validation (run inside 036/037 guard rails and again in the runbook)
- `count(brands where workspace_id is null) = 0`
- every workspace has ≥ 1 active owner; `owner_id` equals the earliest one
- `count(brand_access) = count(old brand_members)` (minus rows whose user is owner/admin, which are refused — counted and logged)
- for every child table: `count(rows where workspace_id <> (select workspace_id from brands b where b.id = brand_id)) = 0`
- every existing member keeps at least the access they had: for each `(user, brand)` pair visible under the OLD `can_view_brand`, `has_capability('brand.view')` is true under the new model — computed as a set difference in the guard rail; any row → RAISE. **No one loses access in the migration**; new invites are what default to `selected`.
- credits: `sum(credit_accounts.balance_credits)` before = after; ledger row count unchanged; every account reconciles.

## 3. Data shape in production (read-only query via the Management API, 2026-08-29)
| fact | value | consequence for the backfill |
|---|---|---|
| brands | 81, **44 with `workspace_id IS NULL`** | all 44 creators own a workspace (`ws_null_no_owned_ws = 0`) → every one moves to its creator's personal workspace |
| workspaces / memberships | 29 / 29, all `role = owner`, one per workspace | no admin/editor/exporter/viewer rows exist → the role remap touches nothing in prod; only the enum swap matters |
| auth.users | **13** | 16 workspaces (and their owner memberships) reference users that no longer exist — `owner_id`/`user_id` have no FK. 036 soft-deletes those workspaces (`deleted_at = now()`, audit `migration.orphan_workspace`) and removes the dangling member rows; the guard rail then asserts every non-deleted workspace has a live owner |
| brand_members | 0 | `brand_access` starts empty; the remap code is still exercised by the SQL tests |
| brand_identity_publications | 0 | share-link backfill is a no-op in prod, tested locally |
| designs / assets | 8 / 315 | `workspace_id` denormalisation is trivial in size |
| credits in circulation | 14,322 | before/after sum asserted by 044's guard rail |

The same queries live in `09-runbook.md` §1 for the owner to re-run before applying.

## 4. Application cut-over (same release)
- `Brand` type gains `workspaceId`, `archivedAt`, `version`, `updatedBy`; `mapFromDatabase` stops dropping them.
- `brandStore.loadAll()` passes the current workspace id; the switcher calls `resetScope()`.
- Adapters use `update_brand_checked` / `update_design_checked`.
- `usePermissions`, `permissions.ts`, `plan-gates.ts`, `usePlanGate.ts`, `TeamPanel.tsx`, the hardcoded-email admin check are **deleted**; `WorkspaceRole` type replaced by the catalog.
- Edge Functions: `_shared/authz.ts` (`requireCaller`, `requireCapability`, `resolveWorkspaceForBrand`, `requireCronSecret`), applied to every function in 07 §3.

## 5. Rollback
- 035–038, 040–045 are additive; `down/` files drop what they added.
- 039 `down/` restores the pre-039 policy set verbatim (copied from the current migrations).
- 037's NOT NULL / FK tightening is reversible (`DROP CONSTRAINT`, `DROP NOT NULL`); the brand→personal-workspace move is recorded in `audit_events(action='migration.brand_workspace_assigned')` with the previous NULL so it can be undone by query.
- Because the app release and the migrations ship together, rollback = revert the deploy + apply the `down/` files in reverse.
