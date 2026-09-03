# Access Architecture — 12 · Production Runbook

**Nothing in this initiative has been applied to production.** Migrations 035–046 exist in
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
npm run test:db          # 22 suites; 21 pass, 025 crashes the Supabase image (see §7.2)
npm run test:db:stock    # 22/22 on stock postgres:17, including 025
npm run rehearse:rollback # UP → DOWN → UP, with data-survival checks (see §8)
npm run perf:access      # 500 brands, timed through RLS (see §7.4)
npm run typecheck:ci && npm run lint && npx vitest run
```

`npm run seed:demo` puts a four-person agency in the local database if you want to click
through the access model; it refuses any host but loopback.

The database goes first and the app + Edge Functions go together, immediately after. §8 has
the sequence and why each intermediate state is safe.

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

Expected — and CONFIRMED read-only against production on 2026-08-30: 81 brands (44 without
a workspace), 29 workspaces, 29 memberships all `owner`, 13 users, **16 orphan
workspaces**, **0 brands with no home**, 14,322 credits, 0 legacy `brand_members`, 0
publications. Remote migration head is `20260820210000` (034) and all eleven of
`20260829*` report `remote: ""` — none applied.

**`brands_with_no_home` must be 0.** If it is not, migration 036 will log those brands as
`brand_unassigned` and 036's guard rail will abort the migration. Fix the data first (give
the creator a workspace, or reassign the brand) rather than weakening the guard.

Take a backup. `supabase db dump` or the dashboard's point-in-time restore — but take one,
because 037 and 039 are not additive.

---

## 2. Apply

```bash
supabase db push        # applies 035 → 046 in order
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
| 046 | `046 OK — brand_people` |

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
supabase functions deploy \
  ai-generate-image anthropic-proxy check-plan-limit \
  cleanup-onboarding-scratch finalize-onboarding-assets purge-deleted-accounts
```

**Six, not five.** `purge-deleted-accounts` is NEW on this branch (it did not exist in
production) and was missing from this list until 2026-09-03; without it the account-deletion
cron has nothing to call. The list was derived, not remembered:
`git diff --name-only origin/main...HEAD -- supabase/functions/` for functions with their
own changes, plus every function that bundles a changed `_shared/*` module. That second
rule caught `fetch-url-preview`, which imports `_shared/rate_limit.ts` — but the only change
there is an added `export` keyword on a symbol it does not use, so redeploying it is
optional and changes no behaviour.

Secrets to set or confirm (`supabase secrets set …`):

| secret | why it matters now |
|---|---|
| `PURGE_CRON_SECRET` | **NOT SET in production** (re-checked 2026-09-03 — the project has 14 secrets and this is not one). **TWO** functions fail closed without it: `cleanup-onboarding-scratch` and the new `purge-deleted-accounts`. Scratch cleanup and account purging both stop until it is set and the crons send the `x-cron-secret` header. |
| `RESEND_API_KEY` | **NOT SET** (re-checked 2026-09-03). Optional: invitations still work, the link comes back to the inviter to copy, but no email is sent. |
| `ANTHROPIC_API_KEY` | unchanged. |

**Turn `verify_jwt` back ON for `anthropic-proxy`** in the dashboard. There is no
`verify_jwt` entry in `supabase/config.toml`, so this setting exists only in the dashboard
and cannot be verified from the CLI — treat it as an unchecked manual step, and confirm it
by eye after deploying. The runbook at
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
2. **`025_image_generation_isolation` PASSES — on stock Postgres.** Re-confirmed
   2026-09-03: `npm run test:db:stock` is **22/22**, 025 included. The Supabase image
   `public.ecr.aws/supabase/postgres:17.6.1.104` segfaults on any "permission denied for
   function" raised for a non-superuser. Reproduced on **both aarch64 and x86_64**, and NOT
   on stock `postgres:17`, so it is a bug in the image, reproducible anywhere, and CI would
   hit it too. `npm run test:db:stock` dumps the migrated schema into a throwaway stock
   container and runs the suites there. Doing that found a deployment blocker (an ambiguous
   `reserve_credits` overload) that no other suite could see.
3. **`src/integrations/supabase/types.ts` is current** as of 2026-09-03
   (`supabase gen types typescript --local`). The August note that it was ~14 tables stale
   is obsolete: the new tables were picked up earlier in the initiative, and today's
   regeneration was a one-line diff adding `brand_people`.
4. **Measured at 500 brands** (26 members, 4,000 assets, warm), re-run 2026-09-03 through
   `npm run perf:access` — timed INSIDE the database as the user, with RLS on, because
   timing as superuser measures a database with the policies switched off:

   | query | owner | guest | selected-mode member |
   |---|---|---|---|
   | brand list | 2.7 ms | 5.7 ms | 8.4 ms |
   | `my_brand_access` | **215–290 ms** | 36–41 ms | 43–55 ms |
   | `my_access` | 0.7 ms | — | — |
   | one brand's assets | 2.5 ms | — | — |
   | `brand_people` | 1.7 ms | — | — |

   `my_brand_access` for a 500-brand OWNER is the one outlier, at ~5× everything else and
   consistent with the 221 ms measured in August. (The range is machine noise — 215 ms on
   an idle machine, 287 ms with the browser suite running alongside.) It runs once per workspace switch and
   once at sign-in. It is acceptable and it is the number to watch; the remedy, if it
   becomes a complaint, is the same grouping trick `brands_with_capability` already uses —
   the per-brand capability arrays are identical for every brand with no explicit grant.
   Deliberately NOT changed before this release: it is the resolver, and a correctness
   risk taken for an acceptable number is a bad trade.
5. **The LOCAL stack's default privileges are wrong. Production's are correct, and this
   changes nothing about the deployment.** Diagnosed 2026-09-03 after `npm run test:db`
   reported 6/22 with `permission denied for table brands ... GRANT SELECT ON public.brands
   TO authenticated`.

   `pg_default_acl` on the local database carries two entries for tables in `public`: the
   one for `supabase_admin` grants everything, and the one for **`postgres`** — the role
   migrations actually run as — grants anon/authenticated/service_role only `Dxtm`
   (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) and **no SELECT/INSERT/UPDATE/DELETE**. Every
   table a migration creates is therefore unreadable by the app's roles, on that machine.

   It is not the migrations, and three independent things say so: the grants survive a full
   down→up cycle (all twelve down files then all twelve up files, checked before and
   after); `npm run test:db:stock`, which restores the migrated schema into a stock
   `postgres:17`, is 22/22; and no migration in the repo contains a REVOKE on any tenant
   table.

   **Production is configured correctly.** Its own schema dump (read-only, same day)
   contains `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON
   TABLES TO "anon" / "authenticated" / "service_role"`, and `GRANT ALL ON TABLE
   "public"."brands"` for all three. **So every table created by 035–046 gets its grants
   automatically and the deployment needs no grant step.**

   `npm run test:db` now repairs the local database with exactly what production already
   has, and says so when it does. This is deliberately NOT a migration: production does not
   need it, and a migration granting DML on every table would change a security posture
   nobody asked to change.

6. **The rollback rehearsal seeds an owner MEMBERSHIP, not just `workspaces.owner_id`.**
   A workspace without one is a shape the product never produces, and 036's guard rail
   rightly refuses to run against it (`036 guard: 1 live workspaces have no owner row`).
   That is the guard working; it is the same invariant §3 verifies against production.

---

## 8. The deployment sequence

**No maintenance window is required, and no downtime.** The order below was chosen so that
every intermediate state is one a live user can be in.

### Why the database can go first
Between step 2 and step 3 the database is new and the app is old. That window is safe, and
it was checked rather than assumed:

| the old app does | after the migration |
|---|---|
| reads/writes brands, designs, assets | works — an owner holds every capability those policies now ask for |
| `ai-generate-image` calls `reserve_credits` with 4 named args | works — 044 DROPS the old 4-arg overload, so PostgREST resolves the one remaining function (leaving both is what would break it) |
| calls `settle_credits` with 5 named args | works — the 6th argument is defaulted, and it finds the hold by job id exactly as before |
| calls `anthropic-proxy` with a body `sessionId` | works — the OLD function is still deployed at that point |
| reads `workspace_members.role` for display | shows `member` where it used to show `editor`; cosmetic, admin surfaces only |

The reverse order is NOT safe: the new app calls `my_access()`, which does not exist until
step 2.

### The steps

```
1. backup                       point-in-time restore point, or supabase db dump
2. supabase db push             035 → 046, each with its own guard rail
3. verify                       §3 of this runbook — do NOT skip
4. deploy the app + the SIX Edge Functions TOGETHER
5. supabase secrets set PURGE_CRON_SECRET=…    (§5 — TWO cron functions fail closed)
6. schedules                    §4 — expire-stale-reservations is not optional
7. turn verify_jwt back ON for anthropic-proxy
```

Step 4 is one release because the new app requires the new functions (it sends no
`sessionId`) and the new functions require a JWT the old app does not send.

### The rollback point

- **Before step 4** — free. Apply the `down/` files in reverse. Rehearsed again on
  2026-09-03 by `npm run rehearse:rollback`: **12 up → 12 down → 12 up**, with a seeded
  brand, its asset, its workspace AND the owner membership checked after each direction,
  and 59 capability-based policies back in place at the end. The membership is the row most
  likely to be lost, because 039 renames the role column and `down/039` renames it back.
- **After step 4, before anyone uses the new features** — revert the app deploy, then the
  `down/` files.
- **The point of no return is the first invitation ACCEPTED or share link CREATED.** Those
  live in tables the rollback drops, so rolling back after that loses those memberships and
  links (never the brands, designs or assets they refer to). Check before rolling back:

```sql
select (select count(*) from workspace_invitations where status='accepted') accepted,
       (select count(*) from share_links where revoked_at is null) live_links,
       (select count(*) from brand_access) grants;
```

If any of those is non-zero, export the three tables before rolling back.

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
