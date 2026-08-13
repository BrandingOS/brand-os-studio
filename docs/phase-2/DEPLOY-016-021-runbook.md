# Deploy runbook — migrations 016 → 021 (Brand System Foundation)

This is ONE release covering six migrations. Every check, success criterion and
rollback step below is written for that whole set — not for a subset.

> ## ✅ RELEASE GATE — CLEARED 2026-08-13
>
> Two pre-existing database defects previously blocked this deployment. Both are
> now FIXED and verified on a clean database; this section is the single source
> of truth for that gate. There is **no remaining stop condition** on the
> migration chain, and no workaround is required to apply it.
>
> **T087 — a fresh chain applies cleanly.** `supabase db reset` runs
> 001 → 021 with **zero errors** (previously it died on the first legacy file).
> Nine legacy files were repaired: demo seeds that assumed a specific
> `auth.users` row, `WITH CHECK` on a SELECT policy, `'demo-brand-1'` written
> into a uuid column, duplicate object creation, and an assumed landing-page
> table. Editing them is safe because every one of those versions is already
> recorded as applied in production, and Supabase applies by version.
>
> **T088 — the `has_role` / `app_role` mismatch is fixed at the root.**
> Migration 006 could not drop the old function because five policies depended
> on it, so its enum swap never completed — that incomplete swap WAS the
> mismatch. 006 now drops the dependants first and recreates the three
> non-superseded ones against the corrected enum; 019 drops the three
> superseded `brands_*_policy` idempotently. Verified: a non-owner `SELECT` on
> `public.brands` returns without error.

## 1. Commands

**`db push` applies EVERY local migration not recorded remotely, in timestamp
order.** The linked history ends at 015, so this deploys **six** migrations.
Confirm the pending set before running it.

```bash
supabase migration list --linked   # expect 016-021 local-only
supabase db push --linked
```

Migration files, in apply order:

| # | File | What it does |
|---|---|---|
| 016 | `20260813000000_016_brand_core_and_business_info.sql` | 2 columns on `brands` |
| 017 | `20260813010000_017_brand_library_kit_context.sql` | Library columns + 3 tables |
| 018 | `20260813020000_018_brand_kit_state.sql` | server home for kit state |
| 019 | `20260813030000_019_drop_stale_brands_policies.sql` | removes the T088 policies |
| 020 | `20260813040000_020_drop_demo_brand_grants.sql` | removes blanket demo-brand write grants |
| 021 | `20260813050000_021_close_cross_account_holes.sql` | closes two confirmed cross-account holes |

Confirm 009/010 remain in `supabase/deferred-migrations/` (out of the push path).

## 2. Checks BEFORE

```bash
supabase migration list --linked   # 015 remote; 016,017,018,019,020,021 pending (local only)
```

All six must appear as local-only. If fewer are pending, stop — the local and
remote histories disagree and pushing would apply an unexpected set.

### Write-lock check on `public.assets`

017 creates three indexes on `public.assets`, the one pre-existing table it
touches. A plain `CREATE INDEX` blocks WRITES (reads are unaffected) until the
build completes, and `CREATE INDEX CONCURRENTLY` cannot run inside the
transaction `supabase db push` wraps each migration in.

```sql
SELECT count(*) AS assets_rows FROM public.assets;
```

- **Under ~1M rows:** push normally. The build is seconds at most.
- **Above that, or if any write pause is unacceptable:** create the three
  indexes CONCURRENTLY first, out of band, then push. `IF NOT EXISTS` in the
  migration makes it a no-op for indexes that already exist, so the push stays
  a single unmodified step.

  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_brand_active
    ON public.assets (brand_id) WHERE deleted_at IS NULL AND archived_at IS NULL;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_legacy_ref ON public.assets (legacy_ref_id);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_folder     ON public.assets (folder_id);
  ```

  Run each on its own connection, outside any transaction. A CONCURRENTLY build
  that fails leaves an INVALID index — drop it and retry before pushing.

This has NOT been measured against production, which has not been touched. The
threshold above is a standard rule of thumb, not a measurement of this table.

## 3. Checks AFTER

```bash
supabase migration list --linked   # 016,017,018,019,020,021 in BOTH local + remote
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

-- 017 folder delete keeps the asset's tenancy anchor
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'assets_folder_fk';
-- must read: … ON DELETE SET NULL (folder_id)   ← the column list is load-bearing

-- 018
SELECT to_regclass('public.brand_kit_state');                                        -- not null

-- 019: the three superseded policies are gone
SELECT count(*) FROM pg_policies
 WHERE tablename = 'brands' AND policyname LIKE 'brands\_%\_policy';                  -- 0

-- 020: no blanket demo-brand write grant survives
SELECT count(*) FROM pg_policies
 WHERE tablename = 'brands' AND qual LIKE '%demo-brand%';                             -- 0

-- 021a: notification inserts are self-scoped
SELECT with_check FROM pg_policies
 WHERE tablename = 'notifications' AND cmd = 'INSERT';        -- user_id = auth.uid(), never `true`

-- 021b: onboarding scratch is owner-scoped
SELECT policyname, qual FROM pg_policies
 WHERE schemaname = 'storage' AND policyname IN ('scratch_select_own','scratch_delete_own');
-- both quals must read `owner = auth.uid()`, with NO `owner IS NULL` escape —
-- a null owner matches for every authenticated user, which is the same hole
```

## 3b. Validation status — VERIFIED on a clean database, 2026-08-13

**The full chain has been executed against a real isolated Postgres** (the local
Supabase stack, `supabase_db_ciojgoozobzbeglwdxcz`), from an empty database.
Nothing was run against production.

| Check | Result |
|---|---|
| `supabase db reset` applies 001 → 021 | **35 migrations, zero errors** |
| Re-apply 016–021 (idempotency) | clean — every guard fired `… already exists, skipping` |
| `brands.identity_meta` / `business_info` | both present, `jsonb` |
| `brand_folders`, `brand_kit_adoptions`, `brand_context_signals` | all 3 created |
| 9 Library columns on `public.assets` | all 9 present |
| RLS policies on the 3 new tables | 4 each (12 total), `relrowsecurity = true` on all 3 |
| `brand_kit_state` (018) | created; select/insert/update/delete policies present |
| Stale `brands_*_policy` (019) | 0 remaining |
| Demo-brand write grants (020) | 0 remaining |
| Deleting a folder that holds assets (017) | asset survives, `folder_id` nulled, **`brand_id` intact** |
| `notifications` INSERT policy (021) | `user_id = auth.uid()`; cross-account insert denied |
| `onboarding-scratch` select/delete (021) | strictly owner-scoped; neither another user's object nor a null-owner object is visible |
| `supabase/tests/016_core_meta_isolation.test.sql` | ✓ ALL 4 ASSERTIONS PASSED |
| `supabase/tests/017_library_kit_context_isolation.test.sql` | ✓ ALL 5 ASSERTIONS PASSED |
| `supabase/tests/021_cross_account_holes.test.sql` | ✓ ALL 021 RLS ASSERTIONS PASSED |
| `down/017` then `down/016` | both apply; zero leftover tables/columns |
| Collateral damage from rollback | none — `public.assets` and `public.brands` intact |
| Re-apply after full rollback (round-trip) | clean |

### Historical note — the two defects that used to block this deploy

Recorded because the fixes touch nine legacy migration files and that is
surprising without the context. **Both are resolved**; see the release gate at
the top. Neither originated in 016–021.

1. **The chain could not be applied from zero.** `supabase db reset` failed on
   legacy migrations that inserted demo brands keyed to an `auth.users` row that
   does not exist on a fresh database, and on a `CREATE POLICY … FOR SELECT …
   WITH CHECK (…)` that Postgres rejects outright. Consequence at the time: no
   contributor could stand up a local database from the repo. **Fixed** — a
   clean reset now applies the whole chain.
2. **`profiles` was NOT world-readable** — reported, checked, and rejected.
   Migration 001 created `profiles_select` with `USING (true)`, which reads as a
   full directory leak in isolation. Checked against the FINAL policy set on a
   clean database: migration 012 supersedes it. What actually exists is
   `profiles_select_own` (`id = auth.uid()`), `profiles_select_coworkers`
   (`id = auth.uid() OR shares_workspace_with(id)`), `profiles_select_own_or_admin`
   and `admin_profiles_all` (`is_super_admin()`). No `USING (true)` survives, and
   `supabase/tests/012_profiles_visibility.test.sql` asserts it. Reading a
   historical migration file on its own is not evidence about the deployed state.
3. **`brands_select_policy` had a type mismatch that errored at runtime.** It
   compared `app_role_v2 = app_role`, so a NON-owner reading a brand got
   `ERROR: operator does not exist`. Root cause was migration 006's incomplete
   enum swap. **Fixed** in 006, with 019 dropping the superseded policies.

## 4. RLS verification (required — isolation is proven at the data layer, not the UI)

Needs Docker for the local stack:

```bash
supabase db reset
psql "$LOCAL_DB_URL" -f supabase/tests/016_core_meta_isolation.test.sql
psql "$LOCAL_DB_URL" -f supabase/tests/017_library_kit_context_isolation.test.sql
psql "$LOCAL_DB_URL" -f supabase/tests/021_cross_account_holes.test.sql
```

Each script is self-asserting and ends with `✓ ALL 0NN … ASSERTIONS PASSED`.
Between them they prove: a stranger cannot read or write another brand's
`identity_meta`/`business_info`, folders, Library items and flags, adoptions or
context signals; an adoption cannot be attributed to another user;
favourite/dislike exclusivity holds on write; a user cannot create a
notification addressed to anyone else; and onboarding scratch uploads are
readable and deletable only by the person who uploaded them.

## 5. SUCCESS

All of the following, not a subset:

- **All six** migrations (016, 017, 018, 019, 020, 021) appear in BOTH columns of
  `supabase migration list --linked`.
- Every query in §3 returns the annotated expected value — including the 019/020
  zero-counts and the 021 policy shapes. A release that stops after 017 is **not**
  successful: the broad demo-brand write grants would still be in place.
- All three RLS scripts pass.
- The app behaves **exactly as before**. These migrations add capacity and remove
  over-broad grants; they change no user-visible behavior.

## 6. STOP / FAILURE

- If `db push` errors, **do NOT force**. The app keeps working: brands resolve
  with default metadata, the Library falls back to current DAM behavior, and kit
  state stays browser-local.
- Rollback runs in **reverse order: 021 → 020 → 019 → 018 → 017 → 016**.

  ```bash
  psql "$DB_URL" -f supabase/migrations/down/021_close_cross_account_holes.down.sql  # no-op
  psql "$DB_URL" -f supabase/migrations/down/020_drop_demo_brand_grants.down.sql     # no-op
  psql "$DB_URL" -f supabase/migrations/down/019_drop_stale_brands_policies.down.sql # no-op
  psql "$DB_URL" -f supabase/migrations/down/018_brand_kit_state.down.sql
  psql "$DB_URL" -f supabase/migrations/down/017_brand_library_kit_context.down.sql
  psql "$DB_URL" -f supabase/migrations/down/016_brand_core_and_business_info.down.sql
  ```

  **Three of those are deliberate NO-OPs**, because reversing them would restore a
  known defect. `down/019` would re-break non-owner brand reads. `down/020` would
  restore a policy letting any authenticated user rewrite the demo brand row
  (including `user_id`). `down/021` would reopen the two confirmed cross-account
  holes. Each file states this and exits cleanly, so the sequence above runs
  end-to-end without special-casing.

  `down/018` drops server-side kit state — kit data returns to being
  browser-local, which is where it lived before 018, and the Supabase repository
  falls back to the local one automatically.

  `down/017` drops Library organization, adoptions and context signals but
  **deletes no asset** — asset rows, bucket files, and the legacy
  `brand.assets[]` / `brand.brandAssets[]` arrays are untouched.

  ⚠️ **Rolling back after users have used the release DOES discard data created
  by it**, even though no pre-existing data is touched. Specifically: folders and
  their assignments, Kit adoptions, context signals, and the Library flags
  (favourite / dislike / use-as-reference / archive / tombstone) all live in
  017 columns and tables, and server-side Kit state lives in 018's table. A
  rollback removes them. Assets themselves survive — they become unfiled and
  unflagged, and Kit state reverts to whatever each browser still holds locally.
  Take a backup before rolling back a release that has been live.

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
- **T050, the production Library ingest.** Still pending by explicit decision.
  It is idempotent and has a dry-run mode; it has not been run against
  production data.
- Regenerating `src/integrations/supabase/types.ts` (already stale — it predates
  `designs`, `identity`, `logo_system`, `brand_assets`). New adapters use the
  established payload-bag/`any`-mapper workarounds until then.
