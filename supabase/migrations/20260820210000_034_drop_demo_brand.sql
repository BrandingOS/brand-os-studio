-- ════════════════════════════════════════════════════════════════════════════
-- 034 — remove the demo brand entirely
-- ════════════════════════════════════════════════════════════════════════════
--
-- Reverses 033 (`20260820200000_033_demo_brand.sql`) at the owner's request.
-- Everything it added comes out: the trigger, both functions, the template
-- brand, the copies it handed to existing accounts, the partial index and the
-- two columns.
--
-- This is a forward migration rather than the matching `down/033_*.down.sql`
-- because a down file has to be applied by hand against the database, and the
-- teardown needed to reach production through `supabase db push` like anything
-- else. The down file is written too, for the convention.
--
-- ORDER MATTERS. The trigger goes first: while it exists, any signup racing
-- this migration would create a brand we are in the middle of deleting.

-- ─── 1. Stop making new ones ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created_demo_brand ON auth.users;
DROP FUNCTION IF EXISTS public.give_new_user_demo_brand();
DROP FUNCTION IF EXISTS public.clone_demo_brand(uuid);

-- ─── 2. Remove the brands 033 created ───────────────────────────────────────
--
-- Both the template and the copies. `assets`, `brand_folders` and `designs` all
-- carry ON DELETE CASCADE from `brands`, so their rows go with them.
--
-- These rows exist ONLY because 033 ran, roughly an hour ago, and only in
-- accounts that had no brands at all — so removing them restores the state
-- those accounts were in. Nothing a user created by hand matches either
-- predicate.
DO $cleanup$
DECLARE
  n_copies   INT := 0;
  n_template INT := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'is_demo'
  ) THEN
    WITH gone AS (DELETE FROM public.brands WHERE is_demo RETURNING 1)
    SELECT count(*) INTO n_copies FROM gone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'is_demo_template'
  ) THEN
    WITH gone AS (DELETE FROM public.brands WHERE is_demo_template RETURNING 1)
    SELECT count(*) INTO n_template FROM gone;
  END IF;

  RAISE NOTICE '034: removed % demo copy/copies and % template row(s)', n_copies, n_template;
END $cleanup$;

-- ─── 3. Remove the schema 033 added ─────────────────────────────────────────
DROP INDEX IF EXISTS public.brands_one_demo_template;
ALTER TABLE public.brands
  DROP COLUMN IF EXISTS is_demo,
  DROP COLUMN IF EXISTS is_demo_template;

-- ─── 4. Forget 033 ever applied ─────────────────────────────────────────────
--
-- Its file is deleted from the repo in the same change. Leaving the history row
-- behind would make every future `supabase db push` report a migration the
-- working tree does not have.
DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260820200000';

DO $$ BEGIN RAISE NOTICE '034 OK — the demo brand is gone.'; END $$;
