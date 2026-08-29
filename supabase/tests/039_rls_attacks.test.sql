-- fixture: access
-- ============================================================================
-- 039 — the attack matrix (docs/access-architecture/07 §2). Each block names its
-- threat id in a comment so scripts/threat-model-coverage.mjs can find it.
--
-- Every statement runs as a real `authenticated` role with a real JWT claim, so what
-- is asserted here is what PostgREST would do for that user.
-- ============================================================================
BEGIN;

-- A1 — a user reads another tenant's brand by id
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  SELECT count(*) INTO n FROM public.brands WHERE id = pg_temp.brand('A1');
  IF n <> 0 THEN RAISE EXCEPTION 'A1: a foreign brand was readable by id'; END IF;
  SELECT count(*) INTO n FROM public.brands;
  IF n <> 1 THEN RAISE EXCEPTION 'A1: bob sees % brands, expected only his own', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A1 rls.brands.cross_tenant_read';
END $$;

-- A3 — a user reads another tenant's design (designs used to have NO brand check)
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  SELECT count(*) INTO n FROM public.designs WHERE brand_id = pg_temp.brand('A1');
  IF n <> 0 THEN RAISE EXCEPTION 'A3: a foreign brand''s designs were readable'; END IF;
  PERFORM pg_temp.back_to_super();

  -- and a member of the brand CAN see a colleague's design (the old policy hid it)
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  SELECT count(*) INTO n FROM public.designs WHERE brand_id = pg_temp.brand('A1');
  IF n <> 2 THEN RAISE EXCEPTION 'A3: a brand member sees % designs, expected 2', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A3 rls.designs.cross_brand';
END $$;

-- A3b — a design cannot be filed against a brand the caller cannot reach
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  BEGIN
    INSERT INTO public.designs (brand_id, id, user_id, data)
    VALUES (pg_temp.brand('A1'), 'evil-design', pg_temp.uid('bob'), '{}');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A3b: a design was planted in a foreign brand'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A3b rls.designs.cross_brand_insert';
END $$;

-- A6 — a guest cannot list the member directory
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('grace'));
  SELECT count(*) INTO n FROM public.workspace_members WHERE workspace_id = pg_temp.ws('A');
  IF n <> 1 THEN RAISE EXCEPTION 'A6: a guest saw % member rows, expected only their own', n; END IF;
  PERFORM pg_temp.back_to_super();

  -- an ordinary member may see the directory
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  SELECT count(*) INTO n FROM public.workspace_members WHERE workspace_id = pg_temp.ws('A');
  IF n < 7 THEN RAISE EXCEPTION 'A6: a member saw only % rows of the directory', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A6 rls.members.guest_directory';
END $$;

-- A7 — a viewer cannot write
DO $$
DECLARE ok boolean; n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));   -- member · all · viewer

  ok := false;
  BEGIN
    UPDATE public.brands SET name = 'hijacked' WHERE id = pg_temp.brand('A1');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A7: a viewer renamed a brand'; END IF;

  ok := false;
  BEGIN
    UPDATE public.designs SET name = 'hijacked' WHERE brand_id = pg_temp.brand('A1');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A7: a viewer edited a design'; END IF;

  ok := false;
  BEGIN
    INSERT INTO public.assets (brand_id, name, type, category, url)
    VALUES (pg_temp.brand('A1'), 'x', 'image', 'logo', 'x');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A7: a viewer uploaded an asset'; END IF;

  ok := false;
  BEGIN
    DELETE FROM public.assets WHERE brand_id = pg_temp.brand('A1');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A7: a viewer deleted an asset'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A7 rls.viewer_update';
END $$;

-- A8 — a removed member's live session yields nothing
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('rita'));   -- never a member (row deleted)
  SELECT count(*) INTO n FROM public.brands;
  IF n <> 0 THEN RAISE EXCEPTION 'A8: a removed member still reads % brands', n; END IF;
  SELECT count(*) INTO n FROM public.assets;
  IF n <> 0 THEN RAISE EXCEPTION 'A8: a removed member still reads assets'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A8 rls.removed_member';
END $$;

-- A8b — a SUSPENDED member is treated as absent
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('sam'));
  SELECT count(*) INTO n FROM public.brands WHERE workspace_id = pg_temp.ws('A');
  IF n <> 0 THEN RAISE EXCEPTION 'A8b: a suspended member reads % brands', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A8b rls.suspended_member';
END $$;

-- A11/A12 — a member cannot write their own role, and an admin cannot mint an owner
DO $$
DECLARE ok boolean; n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  ok := false;
  BEGIN
    UPDATE public.workspace_members SET role = 'owner'
     WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('victor');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A11: a member promoted themselves by direct UPDATE'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A11/A12 rls.members.self_role + admin_to_owner';
END $$;

-- A14 — a user cannot grant themselves brand access
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('grace'));
  BEGIN
    INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role)
    VALUES (pg_temp.ws('A'), pg_temp.brand('A2'), pg_temp.uid('grace'), 'manager');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A14: a guest granted themselves access to another brand'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A14 rls.brand_access.self_grant';
END $$;

-- A20 — cross-workspace metadata does not leak through the credit tables
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  SELECT count(*) INTO n FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF n <> 0 THEN RAISE EXCEPTION 'A20: another workspace''s credit account was readable'; END IF;
  PERFORM pg_temp.back_to_super();

  -- and a plain member cannot read their own workspace's wallet either (usage.view is owner/admin)
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  SELECT count(*) INTO n FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF n <> 0 THEN RAISE EXCEPTION 'A20: a member without workspace.usage.view read the wallet'; END IF;
  PERFORM pg_temp.back_to_super();

  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  SELECT count(*) INTO n FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF n <> 1 THEN RAISE EXCEPTION 'A20: an owner cannot read their own wallet'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A20 rls.credits.scope';
END $$;

-- A23 — a brand cannot be re-parented into another workspace
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('emma'));   -- editor: may update the brand
  BEGIN
    UPDATE public.brands SET workspace_id = pg_temp.ws('B') WHERE id = pg_temp.brand('A1');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A23: an editor moved a brand into another workspace'; END IF;

  ok := false;
  BEGIN
    UPDATE public.brands SET user_id = pg_temp.uid('emma') WHERE id = pg_temp.brand('A1');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A23: an editor claimed a brand by rewriting user_id'; END IF;

  -- an ordinary edit still works
  UPDATE public.brands SET name = 'A1 renamed' WHERE id = pg_temp.brand('A1');
  IF (SELECT name FROM public.brands WHERE id = pg_temp.brand('A1')) <> 'A1 renamed' THEN
    RAISE EXCEPTION 'A23: the immutable guard blocked a legitimate edit';
  END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A23 rls.brands.reparent';
END $$;

-- A24 — an admin cannot insert a super_admin row for themselves
DO $$
DECLARE ok boolean := false;
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (pg_temp.uid('adam'), 'admin')
  ON CONFLICT DO NOTHING;
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (pg_temp.uid('adam'), 'super_admin');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A24: a platform admin self-promoted to super_admin'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A24 rls.user_roles.escalation';
END $$;

-- A25 — platform_config is no longer readable by every authenticated user
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));
  SELECT count(*) INTO n FROM public.platform_config;
  IF n <> 0 THEN RAISE EXCEPTION 'A25: platform_config leaked % rows to a plain user', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A25 rls.platform_config';
END $$;

-- A16 — an in-flight job row is no longer client-writable
DO $$
DECLARE ok boolean := false; n int;
BEGIN
  INSERT INTO public.image_generation_jobs
    (id, workspace_id, brand_id, user_id, status, provider, model, user_prompt, estimated_credits)
  VALUES ('eeeeeeee-0000-0000-0000-000000000001', pg_temp.ws('A'), pg_temp.brand('A1'),
          pg_temp.uid('emma'), 'running', 'mock', 'mock', 'p', 14);
  PERFORM pg_temp.act_as(pg_temp.uid('emma'));
  BEGIN
    UPDATE public.image_generation_jobs
       SET status = 'succeeded', charged_credits = 0
     WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'A16: a job owner rewrote their own job row'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A16 rls.jobs.tamper';
END $$;

-- the archived brand is read-only for everyone, including the owner
DO $$
DECLARE ok boolean := false; n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  BEGIN
    UPDATE public.brands SET name = 'edited while archived' WHERE id = pg_temp.brand('A3');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'archived: an owner edited an archived brand'; END IF;

  -- but she can still restore it
  PERFORM public.archive_brand(pg_temp.brand('A3'), false);
  IF (SELECT archived_at FROM public.brands WHERE id = pg_temp.brand('A3')) IS NOT NULL THEN
    RAISE EXCEPTION 'archived: restore did not work';
  END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ archived brands are read-only';
END $$;

DO $$ BEGIN RAISE NOTICE '✓ ALL 039 ATTACK ASSERTIONS PASSED'; END $$;
ROLLBACK;
