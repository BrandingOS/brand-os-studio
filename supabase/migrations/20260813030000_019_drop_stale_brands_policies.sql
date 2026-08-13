-- 019 — Remove the stale brands_*_policy set (T088)
--
-- NON-DESTRUCTIVE to data. Drops three superseded RLS policies; no table,
-- column or row is touched.
--
-- THE DEFECT. `20250905213225` created `brands_select_policy` /
-- `brands_update_policy` / `brands_delete_policy`, each calling
-- `public.has_role(auth.uid(), 'admin'::app_role)`. Migration
-- `20260416000000_006_admin_panel_upgrade` later retyped `user_roles.role` to
-- `app_role_v2`, while `has_role`'s signature still takes `app_role`. The
-- comparison inside the function therefore raises:
--
--   ERROR: operator does not exist: public.app_role_v2 = public.app_role
--
-- Postgres evaluates the OR left-to-right, so an OWNER short-circuits on
-- `user_id = auth.uid()` and never reaches the broken branch. A NON-OWNER does
-- reach it, and their read fails outright rather than returning zero rows.
-- That is why this went unnoticed: it only bites the sharing case.
--
-- WHY DROPPING IS THE RIGHT FIX, not repairing the call. These three policies
-- are fully SUPERSEDED by migration 001's `brands_select` / `brands_insert` /
-- `brands_update` / `brands_delete`, which express the same intent through the
-- workspace/brand membership helpers (`is_workspace_member`, `is_brand_member`)
-- and are the current authorization model. Keeping a second, older policy set
-- alongside them is what made this defect possible in the first place: RLS
-- policies are OR-ed, so a stale policy can only widen access or, as here,
-- break it. Repairing the enum cast would preserve a duplicate authority.
--
-- Admin access is not lost: super-admin reach is provided by migration 004's
-- helpers, and ordinary access by the 001 membership policies.
--
-- Idempotent and history-independent: `DROP POLICY IF EXISTS` converges a fresh
-- database and production to the same end state regardless of which of the
-- legacy migrations actually executed there.
--
-- Reversible: supabase/migrations/down/019_drop_stale_brands_policies.down.sql

DROP POLICY IF EXISTS brands_select_policy ON public.brands;
DROP POLICY IF EXISTS brands_update_policy ON public.brands;
DROP POLICY IF EXISTS brands_delete_policy ON public.brands;

-- Guard rail: if the 001 policy set is somehow absent, dropping the legacy set
-- would leave `public.brands` readable by nobody. Fail loudly instead.
DO $$
DECLARE policy_count INT;
BEGIN
  SELECT count(*) INTO policy_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'brands'
     AND policyname IN ('brands_select', 'brands_insert', 'brands_update', 'brands_delete');

  IF policy_count < 4 THEN
    RAISE EXCEPTION
      'Refusing to drop the legacy brands policies: the migration-001 policy set is incomplete (% of 4 present). Apply 001 first.',
      policy_count;
  END IF;

  RAISE NOTICE 'Stale brands_*_policy set removed; the 001 membership policies remain in force.';
END $$;
