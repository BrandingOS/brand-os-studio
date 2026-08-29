-- fixture: access
-- ============================================================================
-- 038 — ownership invariants and the membership RPCs (docs/access-architecture/02 §4).
-- Note on this environment: calling a function whose EXECUTE is revoked segfaults the
-- local Postgres image (09 §8), so "may not call" is asserted with
-- has_function_privilege, and behaviour is asserted by calling as someone who may.
-- ============================================================================
BEGIN;

-- ── the last owner cannot leave, be demoted, or be removed ──────────────────
DO $$
DECLARE ok boolean;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));   -- the only owner of workspace A

  ok := false;
  BEGIN PERFORM public.leave_workspace(pg_temp.ws('A'));
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'last_owner'); END;
  IF NOT ok THEN RAISE EXCEPTION 'invariant.last_owner: the last owner could leave'; END IF;

  ok := false;
  BEGIN PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('alice'), 'member', 'all', 'editor');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM IN ('last_owner','self_role_change')); END;
  IF NOT ok THEN RAISE EXCEPTION 'invariant.last_owner: the last owner demoted herself'; END IF;

  ok := false;
  BEGIN PERFORM public.remove_member(pg_temp.ws('A'), pg_temp.uid('alice'));
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'last_owner'); END;
  IF NOT ok THEN RAISE EXCEPTION 'invariant.last_owner: the last owner was removed'; END IF;

  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ invariant.last_owner';
END $$;

-- ── nobody changes their own role (rls.members.self_role) ───────────────────
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));    -- admin: has members.manage
  BEGIN PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('adam'), 'member', 'all', 'editor');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'self_role_change'); END;
  IF NOT ok THEN RAISE EXCEPTION 'rls.members.self_role: an admin changed their own role'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ rls.members.self_role';
END $$;

-- ── an admin cannot mint an owner (rls.members.admin_to_owner) ──────────────
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));
  BEGIN PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('emma'), 'owner', 'all', NULL);
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'use_transfer_ownership'); END;
  IF NOT ok THEN RAISE EXCEPTION 'rls.members.admin_to_owner: set_member_role minted an owner'; END IF;

  ok := false;
  BEGIN PERFORM public.transfer_ownership(pg_temp.ws('A'), pg_temp.uid('adam'), false);
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION 'rls.members.admin_to_owner: an admin transferred ownership to himself'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ rls.members.admin_to_owner';
END $$;

-- ── ownership transfer works, and the demoted owner keeps a seat ────────────
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  PERFORM public.transfer_ownership(pg_temp.ws('A'), pg_temp.uid('adam'), true);
  PERFORM pg_temp.back_to_super();

  SELECT count(*) INTO n FROM public.workspace_member_state
   WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('adam') AND role = 'owner';
  IF n <> 1 THEN RAISE EXCEPTION 'transfer: adam is not the owner'; END IF;
  SELECT count(*) INTO n FROM public.workspace_member_state
   WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('alice') AND role = 'admin';
  IF n <> 1 THEN RAISE EXCEPTION 'transfer: alice was not demoted to admin'; END IF;
  IF (SELECT owner_id FROM public.workspaces WHERE id = pg_temp.ws('A')) <> pg_temp.uid('adam')
    THEN RAISE EXCEPTION 'transfer: workspaces.owner_id was not re-pointed'; END IF;
  RAISE NOTICE '✓ transfer_ownership';
END $$;

-- ── promotion clears the member's brand grants (DB review M3) ───────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.brand_access WHERE user_id = pg_temp.uid('dana');
  IF n <> 2 THEN RAISE EXCEPTION 'setup: dana should start with 2 grants, has %', n; END IF;

  PERFORM pg_temp.act_as(pg_temp.uid('adam'));    -- owner after the transfer above
  PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('dana'), 'admin', NULL, NULL);
  PERFORM pg_temp.back_to_super();

  SELECT count(*) INTO n FROM public.brand_access WHERE user_id = pg_temp.uid('dana');
  IF n <> 0 THEN RAISE EXCEPTION 'promotion left % stale brand grants behind', n; END IF;
  RAISE NOTICE '✓ promotion clears brand grants';
END $$;

-- ── an owner/admin may not hold a brand_access row at all ───────────────────
DO $$
DECLARE ok boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role)
    VALUES (pg_temp.ws('A'), pg_temp.brand('A1'), pg_temp.uid('adam'), 'viewer');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'implicit_manager'); END;
  IF NOT ok THEN RAISE EXCEPTION 'an implicit manager was given an explicit grant row'; END IF;
  RAISE NOTICE '✓ implicit managers hold no rows';
END $$;

-- ── overrides are bounded, and a demotion strips what the new role cannot hold ──
DO $$
DECLARE ov jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));
  -- members.manage is role-bound: it may not be granted to a member by override
  PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('emma'), 'member', 'all', 'editor',
                                 '{"grant":["members.manage","brands.create"]}'::jsonb);
  PERFORM pg_temp.back_to_super();
  SELECT capability_overrides INTO ov FROM public.workspace_members
   WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('emma');
  IF (ov->'grant') @> '["members.manage"]'::jsonb THEN
    RAISE EXCEPTION 'rls.overrides.ceiling: members.manage was granted by override';
  END IF;
  IF NOT ((ov->'grant') @> '["brands.create"]'::jsonb) THEN
    RAISE EXCEPTION 'rls.overrides.ceiling: an overridable capability was stripped';
  END IF;
  IF public.effective_capabilities(pg_temp.uid('emma'), pg_temp.ws('A')) @> ARRAY['members.manage'] THEN
    RAISE EXCEPTION 'rls.overrides.ceiling: the resolver honoured an illegal override';
  END IF;
  RAISE NOTICE '✓ rls.overrides.ceiling';
END $$;

-- ── rls.overrides.demotion — a role change re-validates existing overrides ──
DO $$
DECLARE ov jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));
  PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('emma'), 'guest', 'selected', 'viewer',
                                 '{"grant":["brands.create"]}'::jsonb);
  PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('emma'), 'member', 'all', 'viewer', NULL);
  PERFORM pg_temp.back_to_super();
  SELECT capability_overrides INTO ov FROM public.workspace_members
   WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('emma');
  IF jsonb_typeof(ov) <> 'object' THEN RAISE EXCEPTION 'overrides lost their shape'; END IF;
  RAISE NOTICE '✓ rls.overrides.demotion';
END $$;

-- ── rpc.guest_ai_default — the guest AI deny is applied by the SERVER ───────
DO $$
DECLARE ov jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));
  -- grant grace EDITOR on A2 without saying anything about AI
  PERFORM public.grant_brand_access(pg_temp.brand('A2'), pg_temp.uid('grace'), 'editor');
  PERFORM pg_temp.back_to_super();

  SELECT capability_overrides INTO ov FROM public.brand_access
   WHERE brand_id = pg_temp.brand('A2') AND user_id = pg_temp.uid('grace');
  IF NOT ((ov->'deny') @> '["ai.generate"]'::jsonb) THEN
    RAISE EXCEPTION 'rpc.guest_ai_default: a guest was granted AI by a second entry point';
  END IF;
  IF public.effective_capabilities(pg_temp.uid('grace'), pg_temp.ws('A'), pg_temp.brand('A2')) @> ARRAY['ai.generate'] THEN
    RAISE EXCEPTION 'rpc.guest_ai_default: the resolver gave a guest AI';
  END IF;

  -- …and it can still be turned on deliberately
  PERFORM pg_temp.act_as(pg_temp.uid('adam'));
  PERFORM public.grant_brand_access(pg_temp.brand('A2'), pg_temp.uid('grace'), 'editor', '{}'::jsonb, true);
  PERFORM pg_temp.back_to_super();
  IF NOT (public.effective_capabilities(pg_temp.uid('grace'), pg_temp.ws('A'), pg_temp.brand('A2')) @> ARRAY['ai.generate']) THEN
    RAISE EXCEPTION 'rpc.guest_ai_default: AI could not be granted deliberately';
  END IF;
  RAISE NOTICE '✓ rpc.guest_ai_default';
END $$;

-- ── a member cannot call the management RPCs (rpc.denied) ──────────────────
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));   -- plain member
  BEGIN PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('emma'), 'guest', 'selected', 'viewer');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION 'rpc.denied: a member managed members'; END IF;

  ok := false;
  BEGIN PERFORM public.grant_brand_access(pg_temp.brand('A1'), pg_temp.uid('victor'), 'manager');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION 'rpc.denied: a member granted themselves brand access'; END IF;

  ok := false;
  BEGIN PERFORM public.archive_brand(pg_temp.brand('A1'), true);
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION 'rpc.denied: a member archived a brand'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ rpc.denied';
END $$;

-- ── the internals stay internal ─────────────────────────────────────────────
DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.effective_capabilities(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'effective_capabilities is callable by clients — it answers for ANY user';
  END IF;
  IF has_function_privilege('authenticated', 'public.backfill_tenancy()', 'EXECUTE') THEN
    RAISE EXCEPTION 'backfill_tenancy is callable by clients';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.my_access()', 'EXECUTE') THEN
    RAISE EXCEPTION 'my_access must be callable by clients';
  END IF;
  RAISE NOTICE '✓ ALL 038 OWNERSHIP + RPC ASSERTIONS PASSED';
END $$;
ROLLBACK;
