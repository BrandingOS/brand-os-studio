-- Down for 036. Undoes the reversible moves by query (brand → NULL workspace, orphan
-- workspaces un-deleted), then drops what 036 added. brand_access rows are lost.
UPDATE public.brands b SET workspace_id = NULL
  FROM public.migration_log l WHERE l.action = 'brand_workspace_assigned' AND l.target_id = b.id::text;
UPDATE public.workspaces w SET deleted_at = NULL
  FROM public.migration_log l WHERE l.action = 'orphan_workspace_soft_deleted' AND l.target_id = w.id::text;
-- 039's down re-creates role_v2 as NOT NULL, so relax it before clearing. (Rollback
-- rehearsal, 2026-08-30.)
ALTER TABLE public.workspace_members ALTER COLUMN role_v2 DROP NOT NULL;
UPDATE public.workspace_members SET role_v2 = NULL, default_brand_role = NULL, brand_access_mode = 'all', capability_overrides = '{}'::jsonb;
DROP FUNCTION IF EXISTS public.backfill_tenancy();
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['assets','brand_folders','designs','brand_kit_state','brand_kit_adoptions',
    'brand_context_signals','comments','approvals','guideline_presentations','brand_identity_publications','activity_log','notifications'] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS workspace_id', t);
  END LOOP;
END $$;
DROP TABLE IF EXISTS public.migration_log;
DROP TABLE IF EXISTS public.brand_access;
