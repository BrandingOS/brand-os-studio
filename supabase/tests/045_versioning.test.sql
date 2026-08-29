-- fixture: access
-- ============================================================================
-- 045 — optimistic concurrency and ownership succession. Covers A36, A37.
-- ============================================================================
BEGIN;

-- a checked write refuses when someone else moved the row, and says who
DO $$
DECLARE r jsonb; v integer;
BEGIN
  SELECT version INTO v FROM public.brands WHERE id = pg_temp.brand('A1');

  PERFORM pg_temp.act_as(pg_temp.uid('emma'));
  r := public.update_brand_checked(pg_temp.brand('A1'), v, '{"name":"Emma''s name"}'::jsonb);
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '045: a clean write was refused (%)', r; END IF;
  IF (r->>'version')::int <> v + 1 THEN RAISE EXCEPTION '045: the version did not advance'; END IF;

  -- Dana still holds the version she loaded, which is now stale
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  r := public.update_brand_checked(pg_temp.brand('A1'), v, '{"name":"Alice''s name"}'::jsonb);
  IF (r->>'error') <> 'conflict' THEN RAISE EXCEPTION '045: a stale write was accepted (%)', r; END IF;
  IF (r->>'updatedBy') <> pg_temp.uid('emma')::text THEN
    RAISE EXCEPTION '045: the conflict does not name who moved it (%)', r->>'updatedBy';
  END IF;
  IF (SELECT name FROM public.brands WHERE id = pg_temp.brand('A1')) <> 'Emma''s name' THEN
    RAISE EXCEPTION '045: the refused write landed anyway';
  END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 045 brand conflict detection';
END $$;

-- a viewer cannot use the checked write to get around the policy
DO $$
DECLARE ok boolean := false; v integer;
BEGIN
  SELECT version INTO v FROM public.brands WHERE id = pg_temp.brand('A1');
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  BEGIN PERFORM public.update_brand_checked(pg_temp.brand('A1'), v, '{"name":"nope"}'::jsonb);
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION '045: a viewer wrote through update_brand_checked'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 045 the checked write is still a capability check';
END $$;

-- designs: no merge, an explicit conflict
DO $$
DECLARE r jsonb; v integer;
BEGIN
  SELECT version INTO v FROM public.designs
   WHERE brand_id = pg_temp.brand('A1') AND id = 'design-a1-emma';

  PERFORM pg_temp.act_as(pg_temp.uid('emma'));
  r := public.save_design_checked(pg_temp.brand('A1'), 'design-a1-emma', v, '{"v":2}'::jsonb);
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '045: a clean design save was refused'; END IF;

  PERFORM pg_temp.act_as(pg_temp.uid('dana'));
  r := public.save_design_checked(pg_temp.brand('A1'), 'design-a1-emma', v, '{"v":3}'::jsonb);
  IF (r->>'error') <> 'conflict' THEN RAISE EXCEPTION '045: a stale design save overwrote (%)', r; END IF;
  IF (SELECT data->>'v' FROM public.designs WHERE brand_id = pg_temp.brand('A1') AND id = 'design-a1-emma') <> '2' THEN
    RAISE EXCEPTION '045: the losing save landed';
  END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 045 design conflict detection';
END $$;

-- version and updated_by are stamped, not accepted from the caller
DO $$
DECLARE v integer;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('emma'));
  UPDATE public.brands SET version = 999, updated_by = pg_temp.uid('bob')
   WHERE id = pg_temp.brand('A1');
  PERFORM pg_temp.back_to_super();
  SELECT version INTO v FROM public.brands WHERE id = pg_temp.brand('A1');
  IF v = 999 THEN RAISE EXCEPTION '045: a client set the version it is checked against'; END IF;
  IF (SELECT updated_by FROM public.brands WHERE id = pg_temp.brand('A1')) <> pg_temp.uid('emma') THEN
    RAISE EXCEPTION '045: updated_by was taken from the client';
  END IF;
  RAISE NOTICE '✓ 045 version and updated_by are stamped';
END $$;

-- A36 — deleting the last owner's account hands the workspace to a member
DO $$
DECLARE n int;
BEGIN
  PERFORM public.transfer_ownership_on_purge(pg_temp.uid('alice'));

  SELECT count(*) INTO n FROM public.workspace_member_state
   WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('adam') AND role = 'owner';
  IF n <> 1 THEN RAISE EXCEPTION 'A36: the earliest admin did not inherit the workspace'; END IF;
  IF (SELECT deleted_at FROM public.workspaces WHERE id = pg_temp.ws('A')) IS NOT NULL THEN
    RAISE EXCEPTION 'A36: a workspace with members was deleted instead of inherited';
  END IF;
  IF (SELECT owner_id FROM public.workspaces WHERE id = pg_temp.ws('A')) <> pg_temp.uid('adam') THEN
    RAISE EXCEPTION 'A36: workspaces.owner_id was not re-pointed';
  END IF;
  RAISE NOTICE '✓ A36 invariant.purge_succession';
END $$;

-- A37 — a workspace whose only other members are GUESTS is not handed to a guest
DO $$
DECLARE ws uuid; n int;
BEGIN
  INSERT INTO public.workspaces (id, name, slug, owner_id, is_personal)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000045','Guests Only','guests-only-045', pg_temp.uid('bob'), false);
  ws := 'aaaaaaaa-0000-0000-0000-000000000045';
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode, default_brand_role)
  VALUES (ws, pg_temp.uid('bob'), 'owner', 'active', 'all', NULL),
         (ws, pg_temp.uid('grace'), 'guest', 'active', 'selected', 'viewer');

  PERFORM public.transfer_ownership_on_purge(pg_temp.uid('bob'));

  SELECT count(*) INTO n FROM public.workspace_member_state
   WHERE workspace_id = ws AND user_id = pg_temp.uid('grace') AND role = 'owner';
  IF n <> 0 THEN RAISE EXCEPTION 'A37: a guest inherited a workspace'; END IF;
  IF (SELECT deleted_at FROM public.workspaces WHERE id = ws) IS NULL THEN
    RAISE EXCEPTION 'A37: a guest-only workspace was left ownerless';
  END IF;
  RAISE NOTICE '✓ A37 invariant.purge_guest_only';
END $$;

-- and the purge itself runs succession, so no path skips it
DO $$
BEGIN
  IF pg_get_functiondef('public.purge_account_data(uuid)'::regprocedure) NOT LIKE '%transfer_ownership_on_purge%' THEN
    RAISE EXCEPTION '045: purge_account_data does not run succession';
  END IF;
  RAISE NOTICE '✓ ALL 045 ASSERTIONS PASSED';
END $$;
ROLLBACK;
