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

## 3b. Validation status (read before deploying)

**These migrations have NOT been executed against any database yet.** Docker is
unavailable in the environment where they were authored, so neither
`supabase start` nor `supabase db reset` could run.

What HAS been verified, statically, against migrations 001–015:

- Every object 016/017 reference exists earlier: `public.is_brand_member()`,
  `public.set_updated_at()`, `public.brands`, `public.assets`.
- Every `is_brand_member` role argument (`viewer`/`editor`/`admin`) is a real
  `workspace_role` enum member.
- The down files invert the up files exactly: 3 tables created / 3 dropped,
  9 columns added / 9 dropped, 2 columns added / 2 dropped.
- Every DDL statement is idempotency-guarded; all 12 policies are preceded by
  `DROP POLICY IF EXISTS`; `DO $$ … END $$;` blocks balance.
- Both RLS test scripts insert only columns that exist, satisfy every NOT NULL
  on `public.brands`, and are transactional and self-asserting.

**What static checking CANNOT tell you**, and why step 4 is still mandatory: it
cannot catch a syntax error the Postgres parser would reject, and it cannot
prove a single RLS policy actually denies access. Run step 4 before step 1.

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
