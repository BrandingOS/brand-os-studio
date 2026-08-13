-- 020 — Remove the blanket demo-brand grants (security)
--
-- NON-DESTRUCTIVE to data. Drops RLS policies only.
--
-- THE PROBLEM. Four legacy migrations each created a SELECT and an UPDATE
-- policy over the fixed demo brand row, under four different names:
--
--   "Demo brands are viewable by all authenticated users" / "… editable …"
--   "Demo brand viewable by all authenticated users"      / "… editable …"
--   "Demo brands viewable by all"                         / "… editable …"
--
-- The UPDATE policies are the serious half: `FOR UPDATE TO authenticated`
-- with only `id = '550e8400-…'` in the predicate lets ANY signed-in user
-- rewrite EVERY column of that row — including `user_id`, which is the column
-- the rest of the brands policy set uses to decide ownership. Because the
-- names differ, the policies accumulate rather than replace one another, and
-- RLS policies are OR-ed, so each one independently widens access.
--
-- WHY NOW. These policies were previously inert on a fresh database, because
-- the migrations that create them aborted before reaching them (see the T087
-- repairs). Now that the chain applies cleanly they genuinely take effect on
-- every new environment, so the exposure is real going forward — and on
-- production, where those migrations are recorded as applied, the policies may
-- already exist. Dropping them by every historical name converges both.
--
-- Demo/seed brands remain readable through the normal path: they are served
-- from bundled seed data in the client, not from these grants.
--
-- Reversible: supabase/migrations/down/020_drop_demo_brand_grants.down.sql
-- (deliberately a no-op — see that file.)

DROP POLICY IF EXISTS "Demo brands are viewable by all authenticated users" ON public.brands;
DROP POLICY IF EXISTS "Demo brands are editable by all authenticated users" ON public.brands;
DROP POLICY IF EXISTS "Demo brand viewable by all authenticated users" ON public.brands;
DROP POLICY IF EXISTS "Demo brand editable by all authenticated users" ON public.brands;
DROP POLICY IF EXISTS "Demo brands viewable by all" ON public.brands;
DROP POLICY IF EXISTS "Demo brands editable by all" ON public.brands;

DO $$
DECLARE leftover TEXT;
BEGIN
  SELECT string_agg(policyname, ', ') INTO leftover
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'brands'
     AND policyname ILIKE '%demo%';

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'Demo-brand policies still present after 020: %', leftover;
  END IF;

  RAISE NOTICE 'All demo-brand blanket grants removed from public.brands.';
END $$;
