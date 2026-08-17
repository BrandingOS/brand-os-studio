-- ════════════════════════════════════════════════════════════════════════════
-- 026 — "can this user act on this brand?", asked the same way everywhere
-- ════════════════════════════════════════════════════════════════════════════
--
-- Why this exists
--
-- A brand can be owned two ways in this codebase:
--   1. through a workspace  — brands.workspace_id + workspace_members
--   2. directly             — brands.workspace_id IS NULL, brands.user_id
--
-- The `brands` table's own policies have always honoured both (001):
--   (workspace_id IS NULL AND user_id = auth.uid()) OR is_workspace_member(...)
--
-- but `is_brand_member()` only knows the first. Every table that scoped itself
-- with `is_brand_member` therefore locked the OWNER out of their own legacy
-- brand. Migration 025 inherited that gap, which surfaced immediately: creating
-- an image project against a workspace-less brand returned 42501.
--
-- `can_view_brand` / `can_edit_brand` express the question once, matching how
-- `brands` is scoped, so this cannot drift table by table again.
--
-- Additive: two new functions, and 025's policies re-pointed at them. Nothing
-- is widened beyond what `brands` itself already permits.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_view_brand(_brand_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = _brand_id
      AND (
        -- Directly owned (no workspace) …
        (b.workspace_id IS NULL AND b.user_id = (SELECT auth.uid()))
        -- … or reachable through brand/workspace membership.
        OR public.is_brand_member(b.id, 'viewer')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_brand(_brand_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = _brand_id
      AND (
        (b.workspace_id IS NULL AND b.user_id = (SELECT auth.uid()))
        OR public.is_brand_member(b.id, 'editor')
      )
  );
$$;

COMMENT ON FUNCTION public.can_view_brand(UUID) IS
  'True when the caller may read this brand, by direct ownership or membership. Mirrors the brands_select policy.';
COMMENT ON FUNCTION public.can_edit_brand(UUID) IS
  'True when the caller may write to this brand, by direct ownership or membership. Mirrors the brands_update policy.';

-- ─── Re-point 025's policies ────────────────────────────────────────────────

DROP POLICY IF EXISTS image_projects_select ON public.image_projects;
CREATE POLICY image_projects_select ON public.image_projects
  FOR SELECT TO authenticated
  USING (public.can_view_brand(brand_id));

DROP POLICY IF EXISTS image_projects_insert ON public.image_projects;
CREATE POLICY image_projects_insert ON public.image_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_brand(brand_id) AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS image_projects_update ON public.image_projects;
CREATE POLICY image_projects_update ON public.image_projects
  FOR UPDATE TO authenticated
  USING (public.can_edit_brand(brand_id))
  WITH CHECK (public.can_edit_brand(brand_id));

DROP POLICY IF EXISTS image_projects_delete ON public.image_projects;
CREATE POLICY image_projects_delete ON public.image_projects
  FOR DELETE TO authenticated
  USING (public.can_edit_brand(brand_id));

DROP POLICY IF EXISTS image_generation_jobs_select ON public.image_generation_jobs;
CREATE POLICY image_generation_jobs_select ON public.image_generation_jobs
  FOR SELECT TO authenticated
  USING (public.can_view_brand(brand_id));

-- ─── Credits for a workspace-less brand ─────────────────────────────────────
--
-- A directly-owned brand still needs somewhere to bill. The Edge Function
-- resolves it to the caller's own workspace, so every user needs an account
-- even if none of their brands names a workspace. The signup trigger covers
-- new users; this backfills anyone who predates 025.

DO $$
DECLARE ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    PERFORM public.ensure_credit_account(ws.id);
  END LOOP;
END $$;

-- ─── Guard rail ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'image_projects'
      AND cmd = 'INSERT' AND with_check LIKE '%can_edit_brand%'
  ) THEN
    RAISE EXCEPTION '026: image_projects INSERT must go through can_edit_brand';
  END IF;
END $$;
