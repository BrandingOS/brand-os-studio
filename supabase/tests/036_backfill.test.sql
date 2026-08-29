-- ============================================================================
-- 036 — tenancy backfill. Exercises public.backfill_tenancy() (idempotent) on a
-- synthetic pre-migration shape. Self-asserting; BEGIN … ROLLBACK.
--
--   U1 owns W1 (personal), created brand B1 with workspace_id NULL   → B1 moves to W1
--   U2 is an old-style `editor` member of W1                          → member/all/editor
--   U3 is an old-style `exporter` member of W1                        → member/all/viewer + export grants
--   9999… owns W-orphan but is not in auth.users                      → W-orphan soft-deleted
--   asset D1 on B1 with no workspace_id                               → denormalised to W1
-- ============================================================================
BEGIN;

INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES ('11111111-0000-0000-0000-000000000036','u1-036@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), '{}', '{}'),
       ('22222222-0000-0000-0000-000000000036','u2-036@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), '{}', '{}'),
       ('33333333-0000-0000-0000-000000000036','u3-036@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), '{}', '{}')
ON CONFLICT (id) DO NOTHING;

-- The signup trigger created personal workspaces for these users via profiles; we want a
-- deterministic one for U1, so delete what the trigger made (test-local) and insert ours.
DELETE FROM public.workspaces WHERE owner_id IN ('11111111-0000-0000-0000-000000000036','22222222-0000-0000-0000-000000000036','33333333-0000-0000-0000-000000000036');

INSERT INTO public.workspaces (id,name,slug,owner_id,is_personal) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000036','W1','w1-036','11111111-0000-0000-0000-000000000036', false),
  ('cccccccc-0000-0000-0000-000000000036','Orphan','orphan-036','99999999-0000-0000-0000-000000000036', false);
INSERT INTO public.workspace_members (workspace_id,user_id,role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000036','11111111-0000-0000-0000-000000000036','owner'),
  ('aaaaaaaa-0000-0000-0000-000000000036','22222222-0000-0000-0000-000000000036','editor'),
  ('aaaaaaaa-0000-0000-0000-000000000036','33333333-0000-0000-0000-000000000036','exporter'),
  ('cccccccc-0000-0000-0000-000000000036','99999999-0000-0000-0000-000000000036','owner');
-- role_v2 was backfilled by the migration for pre-existing rows; these are NEW rows, so NULL it
UPDATE public.workspace_members SET role_v2 = NULL WHERE workspace_id IN ('aaaaaaaa-0000-0000-0000-000000000036','cccccccc-0000-0000-0000-000000000036');

-- Simulate the pre-037 shape inside this transaction (rolled back): a brand with no workspace.
ALTER TABLE public.brands DISABLE TRIGGER trg_brands_default_workspace;
ALTER TABLE public.brands ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE public.assets DISABLE TRIGGER trg_assets_workspace_from_brand;
ALTER TABLE public.assets ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE public.assets DROP CONSTRAINT assets_brand_workspace_fk;
INSERT INTO public.brands (id,user_id,name,primary_color,slug,workspace_id)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000036','11111111-0000-0000-0000-000000000036','B1','#000000','b1-036', NULL);
INSERT INTO public.assets (id,brand_id,name,type,category,url)
  VALUES ('dddddddd-0000-0000-0000-000000000036','bbbbbbbb-0000-0000-0000-000000000036','a','image','logo','x');

SELECT public.backfill_tenancy();
-- idempotent: running it twice changes nothing and raises nothing
SELECT public.backfill_tenancy();

DO $$
DECLARE v_ws uuid; v_role public.workspace_role_v2; v_mode public.brand_access_mode; v_def public.brand_role; v_ov jsonb;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.brands WHERE id='bbbbbbbb-0000-0000-0000-000000000036';
  IF v_ws IS DISTINCT FROM 'aaaaaaaa-0000-0000-0000-000000000036' THEN RAISE EXCEPTION '036: brand not moved to the creator''s personal workspace (got %)', v_ws; END IF;

  IF NOT (SELECT is_personal FROM public.workspaces WHERE id='aaaaaaaa-0000-0000-0000-000000000036') THEN RAISE EXCEPTION '036: is_personal not set on the earliest owned workspace'; END IF;

  IF (SELECT deleted_at FROM public.workspaces WHERE id='cccccccc-0000-0000-0000-000000000036') IS NULL THEN RAISE EXCEPTION '036: orphan workspace not soft-deleted'; END IF;
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id='cccccccc-0000-0000-0000-000000000036') THEN RAISE EXCEPTION '036: orphan member rows not removed'; END IF;

  SELECT role_v2 INTO v_role FROM public.workspace_members WHERE workspace_id='aaaaaaaa-0000-0000-0000-000000000036' AND user_id='11111111-0000-0000-0000-000000000036';
  IF v_role <> 'owner' THEN RAISE EXCEPTION '036: owner not remapped (got %)', v_role; END IF;

  SELECT role_v2, brand_access_mode, default_brand_role INTO v_role, v_mode, v_def FROM public.workspace_members WHERE workspace_id='aaaaaaaa-0000-0000-0000-000000000036' AND user_id='22222222-0000-0000-0000-000000000036';
  IF v_role <> 'member' OR v_mode <> 'all' OR v_def <> 'editor' THEN RAISE EXCEPTION '036: editor remap wrong (% % %)', v_role, v_mode, v_def; END IF;

  SELECT role_v2, brand_access_mode, default_brand_role, capability_overrides INTO v_role, v_mode, v_def, v_ov FROM public.workspace_members WHERE workspace_id='aaaaaaaa-0000-0000-0000-000000000036' AND user_id='33333333-0000-0000-0000-000000000036';
  IF v_role <> 'member' OR v_mode <> 'all' OR v_def <> 'viewer' THEN RAISE EXCEPTION '036: exporter remap wrong (% % %)', v_role, v_mode, v_def; END IF;
  IF NOT (v_ov->'grant') ? 'designs.export' THEN RAISE EXCEPTION '036: exporter did not receive the export grant (%)', v_ov; END IF;

  IF (SELECT workspace_id FROM public.assets WHERE id='dddddddd-0000-0000-0000-000000000036') IS DISTINCT FROM 'aaaaaaaa-0000-0000-0000-000000000036' THEN RAISE EXCEPTION '036: asset workspace_id not denormalised'; END IF;

  IF (SELECT count(*) FROM public.migration_log WHERE action='brand_workspace_assigned' AND target_id='bbbbbbbb-0000-0000-0000-000000000036') <> 1 THEN RAISE EXCEPTION '036: brand move not logged exactly once'; END IF;

  IF to_regclass('public.brand_access') IS NULL THEN RAISE EXCEPTION '036: brand_access table missing'; END IF;
  RAISE NOTICE '✓ ALL 036 ASSERTIONS PASSED';
END $$;
ROLLBACK;
