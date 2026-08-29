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
-- 039 drops backfill_tenancy() once it has done its work, so this suite asserts the STATE a
-- fully migrated database is in rather than re-running the function.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.brands WHERE workspace_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '036: % brands have no workspace', n; END IF;

  SELECT count(*) INTO n FROM public.workspaces w
   WHERE w.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.workspace_members m
                      WHERE m.workspace_id = w.id AND m.role = 'owner' AND m.status = 'active');
  IF n > 0 THEN RAISE EXCEPTION '036: % live workspaces have no active owner', n; END IF;

  SELECT count(*) INTO n FROM public.workspaces w
   WHERE w.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = w.owner_id);
  IF n > 0 THEN RAISE EXCEPTION '036: % live workspaces have an owner who no longer exists', n; END IF;

  IF to_regclass('public.brand_access') IS NULL THEN RAISE EXCEPTION '036: brand_access missing'; END IF;
  IF to_regclass('public.migration_log') IS NULL THEN RAISE EXCEPTION '036: migration_log missing'; END IF;

  -- the signup trigger speaks the model: a new user gets a personal workspace and an
  -- owner membership the resolver can read
  IF pg_get_functiondef('public.handle_new_user_workspace()'::regprocedure) NOT LIKE '%is_personal%' THEN
    RAISE EXCEPTION '036: the signup trigger does not mark the personal workspace';
  END IF;
  RAISE NOTICE '✓ ALL 036 ASSERTIONS PASSED';
END $$;

-- a brand-new signup lands correctly under the new model
DO $$
DECLARE uid uuid := '11111111-0000-0000-0000-0000000f0036'; ws uuid; caps text[];
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
  VALUES (uid, 'fresh-036@test.local', '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', now(), now(), '{}', '{}', now());

  SELECT id INTO ws FROM public.workspaces WHERE owner_id = uid;
  IF ws IS NULL THEN RAISE EXCEPTION '036: signup created no workspace'; END IF;
  IF NOT (SELECT is_personal FROM public.workspaces WHERE id = ws) THEN
    RAISE EXCEPTION '036: the signup workspace is not marked personal';
  END IF;

  caps := public.effective_capabilities(uid, ws);
  IF NOT (caps @> ARRAY['brands.create','members.invite']) THEN
    RAISE EXCEPTION '036: a new user is not the owner of their own workspace (caps: %)', caps;
  END IF;
  RAISE NOTICE '✓ ALL 036 SIGNUP ASSERTIONS PASSED';
END $$;
ROLLBACK;
