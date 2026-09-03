# Access Architecture — 14 · Deployment record

The production deployment of migrations 035–046, as it actually happened.
Written as it went, so the corrections are part of the record rather than tidied out of it.

## Attempt 1 — 2026-09-03 — ABORTED inside 036

```
supabase db push --include-all
  Applying 20260829000000_035_access_enums_and_columns.sql ... OK
  Applying 20260829010000_036_backfill_tenancy.sql ... ERROR
  036 guard: 18 brands still have no workspace (see migration_log brand_unassigned)
```

**PRODUCTION IS AT 035, NOT UNTOUCHED.** 036 rolled back its own transaction; 037–046
never ran. 035 is additive — every column is `ADD COLUMN IF NOT EXISTS … NOT NULL
DEFAULT`, and the three `workspace_members` constraints it drops are re-added in the same
transaction (verified present) — so the running app, which reads none of it, is unaffected.
Sitting on 035 is safe; `down/035` exists if a return to 034 is ever wanted.

### Why the preflight did not catch it

The runbook's `brands_with_no_home` asked only whether SOME workspace has the brand's
creator as owner. 036 step (c) needs one that is also `is_personal` AND `deleted_at IS
NULL`, and step (b) runs FIRST and soft-deletes every workspace whose owner is gone from
`auth.users`. A brand whose creator has been deleted therefore passes the old check — its
orphan workspace is still there when you look — and is stranded by the migration itself.
The check reported 0 while 036 aborted on 18. Corrected in 12-runbook.md §1.

### What I could not do, and why it took a failed push to find out

I believed there was no arbitrary-SQL path to production and worked around reads by
dumping the database and restoring it locally. `supabase db query --linked` does exactly
this, and I had not found it. Had I, the corrected preflight would have run against
production before the push instead of after it.

## The 18 brands, recorded before deletion

All 18 were created by three accounts that no longer exist in `auth.users`. Names, dates
and contents identify them as QA artifacts: **1 asset and 0 designs between all eighteen**.
Deleted by EXACT ID only — never by name or prefix — on the owner's explicit instruction
(option 1 of three offered; reassignment and amending 036 were declined).

Recovery point: the full pre-deletion dump (`prod-data-2.sql`, public + auth, taken
2026-09-03 immediately before this step).

| id | created | assets | designs | name |
|---|---|---|---|---|
| `39b78409-bf20-460f-9b52-204cba5f84b2` | 2026-04-16 | 0 | 0 | selfix |
| `ac1304c9-56b1-4853-ab5d-112e4e128ae0` | 2026-05-07 | 0 | 0 | 3 |
| `ac9c801e-9ac6-4e30-8076-21205b3abe2b` | 2026-05-07 | 0 | 0 | 54 |
| `355077bf-ec34-447c-91b8-52878f28392b` | 2026-08-14 | 0 | 0 | Marker Check |
| `6c6fe758-08c4-4f05-94bc-aa0cc8999e09` | 2026-08-14 | 0 | 0 | Resume Check |
| `555ecb36-a4bf-47c6-8b87-c65ea047dd9a` | 2026-08-14 | 0 | 0 | Kaafex Roles |
| `96574d61-93d9-48a9-bdb5-5f6646aa70e0` | 2026-08-14 | 0 | 0 | Kaafex Roles Two |
| `d3b9057d-c645-4969-8eec-25b7e2457115` | 2026-08-14 | 0 | 0 | Kaafex Roles Three |
| `833fade6-9a27-440b-a853-27b70d407183` | 2026-08-14 | 0 | 0 | Kaafex Roles Four |
| `20bc85ec-c4f0-453a-8a35-87e0f16bb846` | 2026-08-14 | 0 | 0 | Kaafex Full |
| `9fac7ef6-9ea3-4946-8b57-ac60ae476cb7` | 2026-08-15 | 0 | 0 | Kaafex Picker |
| `d5e75835-20f4-48db-afaf-dfd34f224315` | 2026-08-15 | 1 | 0 | Kaafex Engine |
| `d8f54a26-b785-4725-8e7e-c9b5c20c3310` | 2026-08-15 | 0 | 0 | Strategy Check |
| `70f081b0-c6cb-4b87-bc19-889b1c5c5d0c` | 2026-08-15 | 0 | 0 | On Dark Check |
| `a1082b78-785c-4851-ae0d-d2aaeaaecb44` | 2026-08-15 | 0 | 0 | Polish Check |
| `17a53525-04e1-4494-9998-18aa52a0e6a4` | 2026-08-15 | 0 | 0 | Rename Check |
| `7a10e185-7db4-48b9-8b20-7a481efeba1c` | 2026-08-18 | 0 | 0 | QA Alpha |
| `7ee174a2-b93e-42be-ba01-a3e8bfc147ba` | 2026-08-18 | 0 | 0 | QA Beta |

Distinct deleted creators: `04bb256f-93b4-4735-8659-584d96b260cb`, `5e94f05d-e56a-4e27-807d-b71eddf3dfd9`, `fa8049f3-4c13-4391-b368-b2c12fbec6b0`

## Attempt 2 — 2026-09-03 — COMPLETE

The 18 brands above were deleted by exact id, inside a transaction that refused to run
unless all 18 still matched the recorded condition (no workspace, creator gone from
`auth.users`) and unless the row carried exactly 0 designs and 1 asset. Recovery point:
`prod-data-2.sql`, taken immediately before.

### Preflight, re-run after the deletion (corrected query)

| check | before deletion | after | expected |
|---|---|---|---|
| brands | 82 | 64 | −18 exactly |
| brands_without_workspace | 45 | 27 | −18 exactly |
| **brands_with_no_home** | **18** | **0** | 0 ✓ |
| workspaces / memberships | 29 / 29 | 29 / 29 | unchanged ✓ |
| users | 13 | 13 | unchanged ✓ |
| orphan_workspaces | 16 | 16 | unchanged ✓ |
| legacy brand_members | 0 | 0 | 0 ✓ |
| credits | 14,322 | 14,322 | unchanged ✓ |

### Applied

`supabase db push --include-all` — 036 → 046, all eleven, exit 0. With 035 from attempt 1,
production is at **20260903000000 (046)**.

### Verification

| check | result |
|---|---|
| brands / without workspace | 64 / **0** |
| migration_log: moved · orphans retired · left unassigned | 27 · 16 · **0** |
| credits | **14,322** — unchanged through the whole deployment |
| capability presets (038) | 98 |
| policies total · capability-based | 104 · 59 |
| `brand_people`, `workspace_invitations` | present |
| active owner memberships | 13 (29 − the 16 orphan workspaces whose members were themselves deleted accounts) |
| every live workspace has an existing, active owner | 0 violations |
| credit accounts failing reconciliation | 0 |

**One deviation, investigated and benign.** The runbook's "every brand still has an owner
who can reach it" returned **1**, not 0: `Demo Smoke Brand` in `QA Auth's Workspace`. It was
verified against the pre-migration dump — the brand already sat in that workspace, its owner
was already absent from `auth.users`, and its single member was itself a deleted account
that 036 step (b) correctly removed. The migration did not cause it and nobody lost access;
it is the same QA-residue class as the 18, and it was not caught by `brands_with_no_home`
only because it already had a `workspace_id`. Left in place — deleting it was not authorised.

### Edge Functions

Six deployed together with the app: `ai-generate-image`, `anthropic-proxy`,
`check-plan-limit`, `cleanup-onboarding-scratch`, `finalize-onboarding-assets`,
`purge-deleted-accounts` (v1 — genuinely new). All ACTIVE, all **`verify_jwt=true`**,
including `anthropic-proxy` — so the dashboard step the runbook called for was already
satisfied by deploying without `--no-verify-jwt`. Both anonymous probes return 401.

### App

Fast-forward `demo` → `edf8982b` (146 commits, nothing on `demo` that was not already in the
branch). Cloudflare built and is serving it: `/` and `/dashboard` return 200, and the live
bundle contains `my_access` / `my_brand_access`, which exist only in this release.

### Secrets and schedules

`PURGE_CRON_SECRET` set before the push (15 secrets, was 14). `RESEND_API_KEY` still unset —
invitations work, the link returns to the inviter, no email is sent.

`pg_cron` was NOT installed, so 044 skipped its schedules. Installed and scheduled per §4:

```
expire-stale-reservations   * * * * *    active     ← not optional
reconcile-credit-accounts   17 3 * * *   active
prune-audit-events          41 3 * * *   active
```

### Open items

1. **Nothing invokes the two cron-driven Edge Functions.** `cleanup-onboarding-scratch` and
   `purge-deleted-accounts` now require BOTH a gateway JWT and the `x-cron-secret` header,
   and no scheduler is configured to call either. Pre-existing gap, not a regression: scratch
   cleanup and account purging do not run until one is set up.
2. **`Demo Smoke Brand`** — see above.
3. **`my_brand_access` is 215–290 ms for a 500-brand owner.** Not optimised, by instruction.
