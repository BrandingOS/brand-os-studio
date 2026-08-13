# Deploy runbook — migrations 016 + 017 (Brand System Foundation, Phase 0)

Same shape as 013/014/015. **Additive, non-destructive, reversible.** Two
migrations ship together because they are the schema half of one feature
(`specs/001-brand-system-foundation`).

- **016** adds two nullable JSONB columns to `public.brands`: `identity_meta`
  (Brand Core authority/provenance sidecar) and `business_info` (reusable
  company facts). No RLS change — the existing `brands` policies govern them.
- **017** adds nine additive columns to `public.assets` (Library semantics),
  plus three new brand-scoped tables: `brand_folders`, `brand_kit_adoptions`,
  `brand_context_signals`, each with membership-aware RLS via
  `public.is_brand_member()`.

The application is **tolerant of the pre-016/017 state**, by the same pattern
015 used: the canonical brand model defaults missing `identity_meta` at read
time, and the Supabase adapters carry `42703` missing-column tolerance. So
shipping the code before the deploy causes no breakage and no data loss.

**Nothing reads these columns yet.** Phase 0 is schema + contracts only.

## 1. Commands

```bash
supabase db push --linked   # applies 016 then 017; 011–015 already remote, skipped
```

Migration files:
- `supabase/migrations/20260813000000_016_brand_core_and_business_info.sql`
- `supabase/migrations/20260813010000_017_brand_library_kit_context.sql`

## 2. Checks BEFORE

```bash
supabase migration list --linked   # 015 remote; 016 + 017 pending (local only)
```

Confirm 009/010 remain in `supabase/deferred-migrations/` (out of the push path).

## 3. Checks AFTER

```bash
supabase migration list --linked   # 016 AND 017 in BOTH local + remote
```

```sql
-- 016
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'brands' AND column_name IN ('identity_meta','business_info');  -- 2 rows

-- 017 tables
SELECT to_regclass('public.brand_folders'),
       to_regclass('public.brand_kit_adoptions'),
       to_regclass('public.brand_context_signals');                                  -- all not null

-- 017 RLS: 4 policies per new table (12 total)
SELECT tablename, count(*) FROM pg_policies
 WHERE tablename IN ('brand_folders','brand_kit_adoptions','brand_context_signals')
 GROUP BY tablename;                                                                 -- 4 each

-- 017 Library columns
SELECT count(*) FROM information_schema.columns
 WHERE table_name = 'assets'
   AND column_name IN ('origin','folder_id','is_favorite','is_disliked','archived_at',
                       'use_as_reference','provenance','deleted_at','legacy_ref_id'); -- 9
```

## 3b. Validation status — VERIFIED locally on 2026-08-13

**016 and 017 have been executed against a real isolated Postgres** (the local
Supabase stack, `supabase_db_ciojgoozobzbeglwdxcz`), applied on top of the full
001→015 chain. Nothing was run against production.

Results:

| Check | Result |
|---|---|
| 016 + 017 apply on top of 001–015 | clean, zero errors |
| Re-apply both (idempotency) | clean — every guard fired `… already exists, skipping` |
| `brands.identity_meta` / `business_info` | both present, `jsonb` |
| `brand_folders`, `brand_kit_adoptions`, `brand_context_signals` | all 3 created |
| 9 Library columns on `public.assets` | all 9 present |
| RLS policies on the 3 new tables | 4 each (12 total), `relrowsecurity = true` on all 3 |
| `supabase/tests/016_core_meta_isolation.test.sql` | ✓ ALL 4 ASSERTIONS PASSED |
| `supabase/tests/017_library_kit_context_isolation.test.sql` | ✓ ALL 5 ASSERTIONS PASSED |
| `down/017` then `down/016` | both apply; zero leftover tables/columns |
| Collateral damage from rollback | none — `public.assets` and `public.brands` intact |
| Re-apply after full rollback (round-trip) | clean |

Step 4 below remains the command reference; it has now been run.

### Two PRE-EXISTING defects found while doing this (neither is from 016/017)

Both were discovered because this was the first time the migration chain was
replayed from scratch. Neither blocks this deploy; both are worth a separate fix.

1. **The chain cannot be applied from zero.** `supabase db reset` fails on three
   legacy migrations: `20250905210043` and `20250905210159` insert demo brands
   with `user_id = (SELECT id FROM auth.users WHERE email = '…')`, which is NULL
   on a fresh database (NOT NULL violation); `20250905213158` contains
   `CREATE POLICY … FOR SELECT … WITH CHECK (…)`, which Postgres rejects outright
   (`WITH CHECK cannot be applied to SELECT`). A migration containing invalid SQL
   cannot ever have applied successfully, so production's policy set came from
   somewhere else. Consequence: no contributor can stand up a local database from
   the repo, which is why this validation had to apply the chain statement-wise
   through `psql` instead.

2. **`brands_select_policy` has a type mismatch that errors at runtime.**
   `20250905213225` creates it with `has_role(auth.uid(), 'admin'::app_role)`,
   and `20260416000000_006_admin_panel_upgrade` later retypes `user_roles.role`
   to `app_role_v2`. `has_role` then compares `app_role_v2 = app_role`:
   `ERROR: operator does not exist`. Owners are unaffected (the `user_id =
   auth.uid()` branch short-circuits), so this only bites a NON-owner reading a
   brand. The policy is superseded by migration 001's `brands_select`; dropping
   the three stale `brands_*_policy` policies is the likely fix. **Check whether
   they still exist in production** before assuming it is dormant there.

## 4. RLS verification (required — isolation is proven at the data layer, not the UI)

Needs Docker for the local stack:

```bash
supabase db reset
psql "$LOCAL_DB_URL" -f supabase/tests/016_core_meta_isolation.test.sql
psql "$LOCAL_DB_URL" -f supabase/tests/017_library_kit_context_isolation.test.sql
```

Each script is self-asserting and ends with `✓ ALL 0NN … ASSERTIONS PASSED`.
Between them they prove: a stranger cannot read or write another brand's
`identity_meta`/`business_info`, folders, Library items and flags, adoptions or
context signals; an adoption cannot be attributed to another user; and
favourite/dislike exclusivity holds on write.

## 5. SUCCESS

- 016 and 017 both remote; the column and policy counts above match.
- Both RLS scripts pass.
- The app behaves **exactly as before** — Phase 0 changes no behavior.

## 6. STOP / FAILURE

- If `db push` errors, **do NOT force**. The app keeps working: brands resolve
  with default metadata and the Library falls back to current DAM behavior.
- Rollback, in reverse order:
  ```bash
  psql "$DB_URL" -f supabase/migrations/down/017_brand_library_kit_context.down.sql
  psql "$DB_URL" -f supabase/migrations/down/016_brand_core_and_business_info.down.sql
  ```
  017's down file drops Library organization, adoptions and context signals but
  **deletes no asset** — asset rows, bucket files, and the legacy
  `brand.assets[]` / `brand.brandAssets[]` arrays are untouched.

## Deferred to a later step (deliberately NOT part of this deploy)

- `VALIDATE CONSTRAINT` on `assets_origin_check`, `assets_fav_dislike_exclusive`
  and `assets_folder_fk`. They ship `NOT VALID` so the push cannot fail on an
  unexpected legacy row; they are enforced for all new/updated rows immediately.
  Validation runs as its own re-runnable statement after the Library ingest:
  ```sql
  ALTER TABLE public.assets VALIDATE CONSTRAINT assets_origin_check;
  ALTER TABLE public.assets VALIDATE CONSTRAINT assets_fav_dislike_exclusive;
  ALTER TABLE public.assets VALIDATE CONSTRAINT assets_folder_fk;
  ```
- Regenerating `src/integrations/supabase/types.ts` (already stale — it predates
  `designs`, `identity`, `logo_system`, `brand_assets`). New adapters use the
  established payload-bag/`any`-mapper workarounds until then.
