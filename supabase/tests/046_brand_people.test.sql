-- ============================================================================
-- 046 — brand_people(). "Who can reach this brand?"
--
-- The case this function exists for is the GUEST who runs one client brand. `members.view`
-- belongs to owner/admin/member and NOT to guest, while `brand.access.view` belongs to a
-- brand editor or manager — so a guest brand manager holds the capability to see that
-- brand's access list, and plain SQL would have served them one row of `workspace_members`
-- (their own). The owner, the admins and every all-mode teammate would have been missing
-- from a list that reads as complete.
--
-- An ordinary Member CAN read `workspace_members`, and this file pins that too, so the
-- reason for the function stays honest.
--
--   W1        a shared (non-personal) workspace
--   U-own     owner                                   → via 'role',      manager
--   U-all     member, mode all, editor                → via 'workspace',  editor
--   U-mgr     member, mode selected, MANAGER of B1    → via 'direct',     manager
--   U-des     member, mode selected, designer of B1   → via 'direct',     designer, refused a read
--   U-out     member, mode selected, no grant on B1   → absent
--   U-guest   guest,  MANAGER of B1                   → via 'direct', and sees the whole list
--
-- Self-asserting; BEGIN … ROLLBACK.
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;

CREATE OR REPLACE FUNCTION pg_temp.mkuser(_id uuid, _email text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at)
  VALUES (_id, _email, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (_id, _email, initcap(split_part(_email, '@', 1)))
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
END; $$;

DO $$
DECLARE
  u_own uuid := '46000000-0000-0000-0000-000000000001';
  u_all uuid := '46000000-0000-0000-0000-000000000002';
  u_mgr uuid := '46000000-0000-0000-0000-000000000003';
  u_des uuid := '46000000-0000-0000-0000-000000000004';
  u_out uuid := '46000000-0000-0000-0000-000000000005';
  u_gst uuid := '46000000-0000-0000-0000-000000000006';
  w1    uuid := '46000000-0000-0000-0000-0000000000a1';
  b1    uuid := '46000000-0000-0000-0000-0000000000b1';
  res   jsonb;
  n     int;
BEGIN
  PERFORM pg_temp.mkuser(u_own, 'own@t046.test');
  PERFORM pg_temp.mkuser(u_all, 'all@t046.test');
  PERFORM pg_temp.mkuser(u_mgr, 'mgr@t046.test');
  PERFORM pg_temp.mkuser(u_des, 'des@t046.test');
  PERFORM pg_temp.mkuser(u_out, 'out@t046.test');
  PERFORM pg_temp.mkuser(u_gst, 'gst@t046.test');

  -- The signup trigger gives each of them a personal workspace; this is the shared one.
  INSERT INTO public.workspaces (id, name, slug, owner_id, is_personal)
  VALUES (w1, 'T046', 't046', u_own, false);

  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode, default_brand_role)
  -- owner/admin must carry a NULL default_brand_role (workspace_members_role_mode_check):
  -- they are managers of every brand by ROLE, so a stored brand role would be a second,
  -- disagreeable opinion. brand_people() reports 'manager' for them from the role itself.
  VALUES (w1, u_own, 'owner',  'active', 'all',      NULL),
         (w1, u_all, 'member', 'active', 'all',      'editor'),
         (w1, u_mgr, 'member', 'active', 'selected', 'manager'),
         (w1, u_des, 'member', 'active', 'selected', 'designer'),
         (w1, u_out, 'member', 'active', 'selected', 'editor'),
         (w1, u_gst, 'guest',  'active', 'selected', 'viewer');

  INSERT INTO public.brands (id, name, slug, workspace_id, user_id, primary_color)
  VALUES (b1, 'T046 Brand', 't046-brand', w1, u_own, '#000000');

  INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides)
  VALUES (w1, b1, u_mgr, 'manager',  '{}'::jsonb),
         (w1, b1, u_gst, 'manager',  '{}'::jsonb),
         (w1, b1, u_des, 'designer', '{"grant":["ai.generate"]}'::jsonb);

  -- ── the owner sees everyone, with the reason each is there ────────────────
  PERFORM pg_temp.act_as(u_own);
  res := public.brand_people(b1);
  RESET ROLE;

  SELECT count(*) INTO n FROM jsonb_array_elements(res->'people');
  IF n <> 5 THEN
    RAISE EXCEPTION '046: owner sees % people, expected 5 (owner, all-mode, manager, guest-manager, designer)', n;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(res->'people') p
                  WHERE p->>'userId' = u_own::text AND p->>'via' = 'role'
                    AND p->>'brandRole' = 'manager') THEN
    RAISE EXCEPTION '046: the owner is not reported as a manager via role';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(res->'people') p
                  WHERE p->>'userId' = u_all::text AND p->>'via' = 'workspace'
                    AND p->>'brandRole' = 'editor') THEN
    RAISE EXCEPTION '046: the all-mode member is not reported as an editor via workspace';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(res->'people') p
                  WHERE p->>'userId' = u_des::text AND p->>'via' = 'direct'
                    AND p->'overrides'->'grant' ? 'ai.generate') THEN
    RAISE EXCEPTION '046: the direct grant does not carry its exception';
  END IF;

  -- a member with no grant and no all-mode is NOT on this brand
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(res->'people') p WHERE p->>'userId' = u_out::text) THEN
    RAISE EXCEPTION '046: a member with no grant on this brand is listed';
  END IF;
  -- a guest is never on a brand by SCOPE; this one is here by an explicit grant
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(res->'people') p
                  WHERE p->>'userId' = u_gst::text AND p->>'via' = 'direct') THEN
    RAISE EXCEPTION '046: the guest with a direct grant is missing';
  END IF;

  -- ── an ordinary member CAN read the member table ─────────────────────────
  -- Pinned so the reason this function exists cannot quietly become wrong: if
  -- `members.view` ever leaves the member preset, this assertion fails and says so.
  PERFORM pg_temp.act_as(u_mgr);
  SELECT count(*) INTO n FROM public.workspace_members WHERE workspace_id = w1;
  RESET ROLE;
  IF n <> 6 THEN
    RAISE EXCEPTION '046: a member reads % workspace_members rows, expected all 6', n;
  END IF;

  -- ── THE CASE THIS FUNCTION EXISTS FOR ────────────────────────────────────
  -- A GUEST who manages one client brand. Plain SQL shows them one row of
  -- workspace_members (their own), so an assembled list would silently omit the owner,
  -- the admins and every all-mode teammate. The function must show them the whole brand.
  PERFORM pg_temp.act_as(u_gst);
  SELECT count(*) INTO n FROM public.workspace_members WHERE workspace_id = w1;
  IF n <> 1 THEN
    RAISE EXCEPTION '046: a guest reads % workspace_members rows, expected 1 (their own)', n;
  END IF;
  res := public.brand_people(b1);
  RESET ROLE;

  SELECT count(*) INTO n FROM jsonb_array_elements(res->'people');
  IF n <> 5 THEN
    RAISE EXCEPTION '046: the guest brand manager sees % people, expected 5', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(res->'people') p
                  WHERE p->>'userId' = u_own::text) THEN
    RAISE EXCEPTION '046: the guest brand manager cannot see the owner who outranks them';
  END IF;

  -- ── a designer holds no brand.access.view, so the answer is a refusal ─────
  PERFORM pg_temp.act_as(u_des);
  BEGIN
    res := public.brand_people(b1);
    RESET ROLE;
    RAISE EXCEPTION '046: a designer was allowed to read the access list';
  EXCEPTION WHEN sqlstate '42501' THEN
    RESET ROLE;   -- permission_denied, as it should be
  END;

  -- ── a brand in another workspace does not exist ──────────────────────────
  PERFORM pg_temp.act_as(u_out);
  BEGIN
    res := public.brand_people(b1);
    RESET ROLE;
    RAISE EXCEPTION '046: a member with no access to the brand read its access list';
  EXCEPTION WHEN sqlstate '42501' THEN
    RESET ROLE;
  END;

  -- ── an id that is not a brand is not found ───────────────────────────────
  PERFORM pg_temp.act_as(u_own);
  BEGIN
    res := public.brand_people('46000000-0000-0000-0000-0000000000ff');
    RESET ROLE;
    RAISE EXCEPTION '046: a missing brand did not raise';
  EXCEPTION WHEN sqlstate 'P0002' THEN
    RESET ROLE;
  END;

  RAISE NOTICE '✓ ALL 046 ASSERTIONS PASSED';
END $$;

ROLLBACK;
