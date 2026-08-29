# Access Architecture — 12 · Production Runbook

**Nothing in this initiative has been applied to production.** Migrations 035–045 exist in
the repo, run clean against a local Supabase, and are covered by the SQL suite. This is the
document for the person who applies them.

Production head at the time of writing: **034** (`20260820210000`), verified with
`supabase migration list --linked` on 2026-08-29.

---

## 0. Before anything

```bash
git checkout feat/workspace-access-architecture
npm ci
supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,pgbouncer
npm run test:db          # 20 SQL suites; 19 pass, 025 crashes the local image (see §7)
npm run typecheck:ci && npm run lint && npx vitest run
```

The release ships the app and the migrations **together**. The application expects the new
model (it reads `my_access()`, writes through the membership RPCs, and no longer inserts
into `workspaces`/`workspace_members` directly), so a database rolled back without the app
— or an app deployed without the database — will not work.

---

## 1. Read production first

Run these read-only, and compare with what the backfill assumed (08 §3). If a number has
moved a long way, stop and re-read 036 before continuing.

```sql
select
  (select count(*) from brands)                                  as brands,
  (select count(*) from brands where workspace_id is null)       as brands_without_workspace,
  (select count(*) from workspaces)                              as workspaces,
  (select count(*) from workspace_members)                       as memberships,
  (select count(*) from brand_members)                           as legacy_brand_members,
  (select count(*) from auth.users)                              as users,
  (select count(*) from workspaces w
     where not exists (select 1 from auth.users u where u.id = w.owner_id)) as orphan_workspaces,
  (select count(*) from brands b where b.workspace_id is null
     and not exists (select 1 from workspaces w where w.owner_id = b.user_id)) as brands_with_no_home,
  (select sum(balance_credits) from credit_accounts)             as credits_in_circulation,
  (select json_agg(x) from (select role, count(*) from workspace_members group by role) x) as roles;
```

Expected on 2026-08-29: 81 brands (44 without a workspace), 29 workspaces, 29 memberships
all `owner`, 13 users, **16 orphan workspaces**, 0 brands with no home, 14,322 credits,
0 legacy brand_members.

**`brands_with_no_home` must be 0.** If it is not, migration 036 will log those brands as
`brand_unassigned` and 036's guard rail will abort the migration. Fix the data first (give
the creator a workspace, or reassign the brand) rather than weakening the guard.

Take a backup. `supabase db dump` or the dashboard's point-in-time restore — but take one,
because 037 and 039 are not additive.

---

## 2. Apply

```bash
supabase db push        # applies 035 → 045 in order
```

Each migration ends with a guard rail that RAISEs rather than leaving a half-applied state.
Watch for these NOTICEs, in this order:

| migration | expected notice |
|---|---|
| 035 | `035 OK — access enums and columns in place` |
| 036 | `036 OK — tenancy backfilled: 44 brands moved, 16 orphan workspaces soft-deleted` |
| 037 | `037 OK — tenancy tightened` |
| 038 | `038 OK — 98 capability presets, resolver and RPCs in place` |
| 039 | `039 OK — N policies over the capability model` |
| 040 | `040 OK — invitations` |
| 041 | `041 OK — share links (0 migrated from publications)` |
| 042 | `042 OK — audit events` |
| 043 | `043 OK — entitlements` |
| 044 | `044 OK — credit reservations, usage events, reaper and reconciliation` |
| 045 | `045 OK — versioning, checked writes, ownership succession` |

If 044 prints `pg_cron unavailable`, the schedules did not install — see §4.

---

## 3. Verify

```sql
-- nobody lost access: every brand still has an owner who can reach it
select count(*) from brands b
 where not exists (
   select 1 from workspace_members m
    where m.workspace_id = b.workspace_id and m.role = 'owner' and m.status = 'active');
-- expect 0

-- every live workspace has an owner, and that owner exists
select count(*) from workspaces w
 where w.deleted_at is null
   and (not exists (select 1 from workspace_members m
                     where m.workspace_id = w.id and m.role = 'owner' and m.status = 'active')
        or not exists (select 1 from auth.users u where u.id = w.owner_id));
-- expect 0

-- money is untouched
select sum(balance_credits) from credit_accounts;              -- expect 14322
select count(*) from credit_accounts a
 where not (public.reconcile_credit_account(a.workspace_id)->>'ok')::boolean;
-- expect 0

-- what the migration moved, and why
select action, count(*) from migration_log group by action order by 2 desc;

-- the policies are on the new model
select count(*) from pg_policies
 where schemaname = 'public' and (qual like '%_with_capability%' or with_check like '%_with_capability%');
-- expect > 30
```

Then, as a real user in the app: sign in, confirm the dashboard still lists the same
brands, open one, edit something, and check `/settings/members` lists you as Owner.

---

## 4. Schedules

`pg_cron` is preloaded on Supabase but the extension must exist. 044 tries to create it and
schedule three jobs; if the notice said it was unavailable, run:

```sql
create extension if not exists pg_cron with schema extensions;
select cron.schedule('expire-stale-reservations', '* * * * *', 'select public.expire_stale_reservations()');
select cron.schedule('reconcile-credit-accounts', '17 3 * * *', 'select public.reconcile_all_credit_accounts()');
select cron.schedule('prune-audit-events',        '41 3 * * *', 'select public.prune_audit_events()');
select jobname, schedule, active from cron.job;
```

**`expire-stale-reservations` is not optional.** Without it a crashed generation holds a
customer's credits for ever — the exact failure this initiative was meant to end.

---

## 5. Edge Functions and secrets

Deploy the changed functions:

```bash
supabase functions deploy check-plan-limit cleanup-onboarding-scratch \
  finalize-onboarding-assets anthropic-proxy ai-generate-image
```

Secrets to set or confirm (`supabase secrets set …`):

| secret | why it matters now |
|---|---|
| `PURGE_CRON_SECRET` | `cleanup-onboarding-scratch` now **fails closed** without it. Set it, and add the header to the cron that calls the function, or scratch cleanup stops running. |
| `RESEND_API_KEY` | optional. Without it invitations still work — the link comes back to the inviter to copy — but no email is sent. |
| `ANTHROPIC_API_KEY` | unchanged. |

**Turn `verify_jwt` back ON for `anthropic-proxy`** in the dashboard. The runbook at
`docs/phase-2/SECURITY-E6-runbook.md:44` asked for it OFF because the function was used
pre-signup; it now requires a real user JWT and meters against the wallet, so the gateway
should refuse anonymous callers too.

---

## 6. What users will notice

- **Nobody loses access.** Every existing member keeps what they had; the `selected`
  default applies to NEW invitations only.
- **A second workspace now costs a plan.** Free allows one owned workspace. Existing users
  who own several keep them — the cap is checked at creation.
- **Free credits are bounded.** The 500-credit signup grant is once per person's personal
  workspace, not once per workspace created.
- **AI text features require sign-in.** Logo Maker is public, so its AI suggestions fall
  back to the deterministic keyword path for signed-out visitors.
- **Signed image URLs last 7 days, not a year.** The client re-signs on demand; anyone who
  bookmarked a raw storage URL will need to reopen the asset.
- **Guidelines, comments and approvals are still per-device** (ADR-008). Their capabilities
  are reserved and appear in no access UI, so nobody can be promised what the server cannot
  enforce yet.

---

## 7. Known caveats, stated plainly

1. **The role remap is validated by fixtures, not by production data.** Production has 29
   memberships, all `owner`, so the five-role → four-role mapping and the exporter export
   grants are exercised only by `supabase/tests/036_backfill.test.sql`. "The guard rail
   passed" means the invariants hold — not that the remap ran against real variety.
2. **`supabase/tests/025_image_generation_isolation.test.sql` crashes the local Postgres.**
   The image `public.ecr.aws/supabase/postgres:17.6.1.104` segfaults on any
   "permission denied for function" raised for `authenticated`, reproduced with a trivial
   revoked function outside any test. It is an environment fault, not a policy failure;
   `scripts/db-test.mjs` labels it distinctly. Re-run that suite against a newer image
   before trusting it.
3. **The generated `src/integrations/supabase/types.ts` is ~14 tables stale** and was left
   that way deliberately — regenerating it touches the whole app and belongs in its own
   change. New RPCs are reached through the house untyped-accessor pattern.
4. **No load testing.** The RLS helpers are uncorrelated and were reasoned about with
   EXPLAIN on the existing policies, but nobody has measured a 500-brand agency.

---

## 8. If it goes wrong

Each migration has a `down/` file. Reverse order, and note that:

- `down/039` restores the pre-039 policy set and the legacy `role` column. It is a
  break-glass path: the shipped app expects the new model.
- `down/037` un-tightens (drops the composite FKs and NOT NULLs); `down/036` reverses the
  brand moves and un-deletes the orphan workspaces **by query from `migration_log`**, which
  is why every move it made was logged.
- `brand_access` rows created after the migration are lost on a 036 rollback. If people
  have been invited since, export that table first.

The fastest safe rollback is: revert the application deploy, then apply the `down/` files
in reverse, then restore from the backup taken in §1 if anything disagrees.
