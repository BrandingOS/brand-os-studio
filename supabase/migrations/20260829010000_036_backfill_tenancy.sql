-- ============================================================================
-- 036 — Tenancy backfill (ADDITIVE: adds rows and columns, removes nothing a user
-- can see; orphan workspaces are soft-deleted, not dropped)
--
-- What it does, in order (docs/access-architecture/08-migration-plan.md §1–3):
--   1. `brand_access` — the successor of `brand_members`; a per-brand grant that is
--      unrepresentable across tenants once 037 adds the composite FKs.
--   2. `migration_log` — every reversible move this migration makes is recorded
--      with what it replaced, so the runbook can undo it by query.
--   3. `workspace_id` on every brand-child table (nullable here, NOT NULL in 037).
--   4. `backfill_tenancy()` — idempotent, re-runnable:
--        a. `is_personal` = the earliest workspace each owner has
--        b. workspaces whose owner is no longer in auth.users → soft-deleted
--           (prod had 16 of these: owner_id has no FK)
--        c. brands with workspace_id NULL → the creator's personal workspace
--        d. old five-role → new four-role remap on workspace_members
--        e. brand_members → brand_access (skipping owners/admins and non-members)
--        f. child tables: workspace_id := the brand's
--   5. runs it, then a guard rail that RAISEs if any invariant does not hold.
-- ============================================================================

-- ── 1. brand_access ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_access (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL,
  brand_id             uuid NOT NULL,
  user_id              uuid NOT NULL,
  role                 public.brand_role NOT NULL,
  capability_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_access_brand_user_unique UNIQUE (brand_id, user_id),
  CONSTRAINT brand_access_overrides_shape CHECK (jsonb_typeof(capability_overrides) = 'object')
);
CREATE INDEX IF NOT EXISTS brand_access_user_idx ON public.brand_access (user_id, brand_id);
CREATE INDEX IF NOT EXISTS brand_access_workspace_user_idx ON public.brand_access (workspace_id, user_id);
ALTER TABLE public.brand_access ENABLE ROW LEVEL SECURITY;   -- no policies until 039 ⇒ clients see nothing
DROP TRIGGER IF EXISTS trg_brand_access_updated_at ON public.brand_access;
CREATE TRIGGER trg_brand_access_updated_at
  BEFORE UPDATE ON public.brand_access FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
COMMENT ON TABLE public.brand_access IS
  'Per-brand grant for a workspace member (mode=selected, or a per-brand override when mode=all). Owners/admins never have rows — they are implicit managers.';

-- ── 2. migration_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.migration_log (
  id         bigserial PRIMARY KEY,
  action     text NOT NULL,
  target_id  text,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.migration_log ENABLE ROW LEVEL SECURITY;  -- service role only

-- ── 3. workspace_id on brand-child tables ───────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations',
    'brand_identity_publications','activity_log','notifications'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id)', t || '_workspace_idx', t);
  END LOOP;
END $$;
-- image_projects already carries a nullable workspace_id (025/027).

-- ── 4. the backfill ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.backfill_tenancy()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE t text; n int;
BEGIN
  -- a. personal workspace = the earliest one each owner holds
  UPDATE public.workspaces w SET is_personal = true
  FROM (SELECT DISTINCT ON (owner_id) id FROM public.workspaces WHERE deleted_at IS NULL ORDER BY owner_id, created_at, id) first
  WHERE w.id = first.id AND NOT w.is_personal
    AND NOT EXISTS (SELECT 1 FROM public.workspaces p WHERE p.owner_id = w.owner_id AND p.is_personal AND p.id <> w.id);

  -- b. orphan workspaces: the owner is gone from auth.users (no FK ever existed)
  WITH orphans AS (
    UPDATE public.workspaces w SET deleted_at = now()
    WHERE w.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = w.owner_id)
    RETURNING w.id, w.owner_id
  )
  INSERT INTO public.migration_log (action, target_id, detail)
  SELECT 'orphan_workspace_soft_deleted', id::text, jsonb_build_object('owner_id', owner_id) FROM orphans;
  DELETE FROM public.workspace_members m
  USING public.workspaces w
  WHERE w.id = m.workspace_id AND w.deleted_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);

  -- c. workspace-less brands → creator's personal workspace (logged with the previous NULL)
  WITH moved AS (
    UPDATE public.brands b SET workspace_id = w.id
    FROM public.workspaces w
    WHERE b.workspace_id IS NULL AND w.owner_id = b.user_id AND w.is_personal AND w.deleted_at IS NULL
    RETURNING b.id, w.id AS ws
  )
  INSERT INTO public.migration_log (action, target_id, detail)
  SELECT 'brand_workspace_assigned', id::text, jsonb_build_object('workspace_id', ws, 'previous', NULL) FROM moved;
  INSERT INTO public.migration_log (action, target_id, detail)
  SELECT 'brand_unassigned', b.id::text, jsonb_build_object('user_id', b.user_id)
  FROM public.brands b WHERE b.workspace_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.migration_log l WHERE l.action = 'brand_unassigned' AND l.target_id = b.id::text);

  -- d. five roles → four (+ mode, default brand role, export grants for exporters)
  UPDATE public.workspace_members SET
    role_v2 = CASE role WHEN 'owner' THEN 'owner'::public.workspace_role_v2
                        WHEN 'admin' THEN 'admin'
                        ELSE 'member' END,
    brand_access_mode = 'all',
    default_brand_role = CASE role WHEN 'editor' THEN 'editor'::public.brand_role
                                   WHEN 'exporter' THEN 'viewer'
                                   WHEN 'viewer' THEN 'viewer'
                                   ELSE NULL END,
    capability_overrides = CASE role
      WHEN 'exporter' THEN jsonb_build_object('grant', jsonb_build_array('designs.export','brand.kit.export','brand.guideline.export'))
      ELSE capability_overrides END
  WHERE role_v2 IS NULL;

  -- e. brand_members → brand_access (only if the legacy table still exists)
  IF to_regclass('public.brand_members') IS NOT NULL THEN
    INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides, created_at)
    SELECT b.workspace_id, bm.brand_id, bm.user_id,
           CASE bm.role WHEN 'owner' THEN 'manager'::public.brand_role WHEN 'admin' THEN 'manager'
                        WHEN 'editor' THEN 'editor' ELSE 'viewer' END,
           CASE bm.role WHEN 'exporter' THEN jsonb_build_object('grant', jsonb_build_array('designs.export','brand.kit.export','brand.guideline.export'))
                        ELSE '{}'::jsonb END,
           bm.created_at
    FROM public.brand_members bm
    JOIN public.brands b ON b.id = bm.brand_id
    JOIN public.workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = bm.user_id
    WHERE m.role_v2 NOT IN ('owner','admin')
    ON CONFLICT (brand_id, user_id) DO NOTHING;

    INSERT INTO public.migration_log (action, target_id, detail)
    SELECT 'brand_member_skipped', bm.id::text,
           jsonb_build_object('brand_id', bm.brand_id, 'user_id', bm.user_id, 'role', bm.role,
             'reason', CASE WHEN m.user_id IS NULL THEN 'not_a_workspace_member' ELSE 'owner_or_admin' END)
    FROM public.brand_members bm
    JOIN public.brands b ON b.id = bm.brand_id
    LEFT JOIN public.workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = bm.user_id
    WHERE (m.user_id IS NULL OR m.role_v2 IN ('owner','admin'))
      AND NOT EXISTS (SELECT 1 FROM public.migration_log l WHERE l.action = 'brand_member_skipped' AND l.target_id = bm.id::text);
  END IF;

  -- f. child tables: workspace_id := the brand's (for brand_id-bearing rows)
  FOREACH t IN ARRAY ARRAY[
    'assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations',
    'brand_identity_publications','image_projects','activity_log','notifications'
  ] LOOP
    EXECUTE format(
      'UPDATE public.%I c SET workspace_id = b.workspace_id FROM public.brands b
        WHERE c.brand_id = b.id AND c.workspace_id IS DISTINCT FROM b.workspace_id', t);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.backfill_tenancy() FROM PUBLIC, anon, authenticated;

SELECT public.backfill_tenancy();

-- ── 5. guard rail ───────────────────────────────────────────────────────────
DO $$
DECLARE n int; t text; bad int := 0;
BEGIN
  SELECT count(*) INTO n FROM public.brands WHERE workspace_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '036 guard: % brands still have no workspace (see migration_log brand_unassigned)', n; END IF;

  SELECT count(*) INTO n FROM public.workspace_members m JOIN public.workspaces w ON w.id = m.workspace_id
   WHERE w.deleted_at IS NULL AND m.role_v2 IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '036 guard: % members of live workspaces have no role_v2', n; END IF;

  SELECT count(*) INTO n FROM public.workspaces w
   WHERE w.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = w.id AND m.role_v2 = 'owner');
  IF n > 0 THEN RAISE EXCEPTION '036 guard: % live workspaces have no owner row', n; END IF;

  FOREACH t IN ARRAY ARRAY['assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations','brand_identity_publications','image_projects'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I c JOIN public.brands b ON b.id = c.brand_id WHERE c.workspace_id IS DISTINCT FROM b.workspace_id', t) INTO n;
    IF n > 0 THEN RAISE EXCEPTION '036 guard: %.workspace_id disagrees with the brand on % rows', t, n; END IF;
  END LOOP;

  RAISE NOTICE '036 OK — tenancy backfilled: % brands moved, % orphan workspaces soft-deleted',
    (SELECT count(*) FROM public.migration_log WHERE action = 'brand_workspace_assigned'),
    (SELECT count(*) FROM public.migration_log WHERE action = 'orphan_workspace_soft_deleted');
END $$;
