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

