-- ============================================================================
-- RLS verification for migration 011 — workspace-member escalation containment.
--
-- Self-asserting: every case RAISEs EXCEPTION on the wrong outcome, so the script
-- either runs to the final "ALL 011 RLS ASSERTIONS PASSED" notice or aborts with a
-- non-zero exit. It writes no permanent data (wrapped in BEGIN … ROLLBACK).
--
-- Requires migrations 001..011 applied to the target DB (Supabase local/shadow),
-- because it exercises public.is_workspace_member() and auth.uid(). Run with:
--
--     supabase db reset                       # applies all migrations locally
--     psql "$LOCAL_DB_URL" \
--       -f supabase/tests/011_workspace_member_escalation.test.sql
--
-- The session role must be a superuser/owner (the default for the local shadow DB)
-- so the setup INSERTs bypass RLS and the role can be switched to `authenticated`.
--
-- Principals (arbitrary UUIDs — workspace_members.user_id / workspaces.owner_id
-- have no FK to auth.users, so no auth rows are needed):
--   USER_A 11111111-… legitimate OWNER of WS_VICTIM
--   USER_B 22222222-… ATTACKER (owner of their own WS_ATTACKER)
--   USER_C 33333333-… legitimate ADMIN (not owner) of WS_VICTIM
--   USER_D 44444444-… unrelated user, to be added as editor
--   WS_VICTIM   aaaaaaaa-…   WS_ATTACKER bbbbbbbb-…
-- ============================================================================

BEGIN;

-- Helper: switch the effective identity to an authenticated user.
CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', _uid, 'role', 'authenticated')::text,
                     true);  -- true = local to transaction
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

-- ── Setup (runs as superuser → RLS bypassed) ────────────────────────────────
INSERT INTO public.workspaces (id, name, slug, owner_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Victim WS',  'victim-ws',  '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Attacker WS','attacker-ws','22222222-2222-2222-2222-222222222222');

INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),  -- A owns victim
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin'),  -- C admin of victim
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');  -- B owns attacker

-- ── PROOF 1 — a user cannot add themselves to an unrelated workspace ─────────
-- Attacker B tries to plant an owner row in the victim workspace. Must be blocked.
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            '22222222-2222-2222-2222-222222222222', 'owner');
    RAISE EXCEPTION 'PROOF 1 FAILED: attacker planted an owner row in a foreign workspace';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PROOF 1 PASSED: cross-tenant self-insert blocked by RLS';
  END;
END $$;

-- Also block the non-owner variants (editor / viewer) into the foreign workspace.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            '22222222-2222-2222-2222-222222222222', 'member');
    RAISE EXCEPTION 'PROOF 1b FAILED: attacker self-inserted as editor into a foreign workspace';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PROOF 1b PASSED: cross-tenant self-insert (editor) blocked';
  END;
END $$;
RESET ROLE;

-- ── PROOF 4 — cross-tenant escalation impossible through helper functions ────
-- After the blocked inserts, the attacker must NOT be seen as a member/admin of
-- the victim workspace by the SECURITY DEFINER helper that gates every other policy.
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
BEGIN
  IF public.is_workspace_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin') THEN
    RAISE EXCEPTION 'PROOF 4 FAILED: is_workspace_member() reports attacker as admin of victim';
  END IF;
  IF public.is_workspace_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'viewer') THEN
    RAISE EXCEPTION 'PROOF 4 FAILED: is_workspace_member() reports attacker as member of victim';
  END IF;
  RAISE NOTICE 'PROOF 4 PASSED: helper does not treat attacker as authoritative in victim WS';
END $$;
RESET ROLE;

-- ── PROOF 2 — admins still manage members, but only through the RPC ─────────
-- Migration 039 removed every client write policy on workspace_members: membership
-- changes go through set_member_role / remove_member, which check capabilities and hold
-- the ownership invariants. So the proof is now twofold — a direct write is refused for
-- everyone, and the sanctioned path still works for an admin.
SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333');
DO $$
DECLARE ok boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','member');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'PROOF 2a FAILED: a member row was written directly'; END IF;
  RAISE NOTICE 'PROOF 2a PASSED: workspace_members is not client-writable';
END $$;
RESET ROLE;

-- the member exists (in production an invitation puts them here)
INSERT INTO public.workspace_members (workspace_id, user_id, role, brand_access_mode, default_brand_role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','44444444-4444-4444-4444-444444444444','member','all','editor');

SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333');
DO $$
BEGIN
  PERFORM public.set_member_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                                 '44444444-4444-4444-4444-444444444444',
                                 'guest', 'selected', 'viewer');
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
                    AND user_id = '44444444-4444-4444-4444-444444444444'
                    AND role = 'guest') THEN
    RAISE EXCEPTION 'PROOF 2b FAILED: an admin could not manage a member through the RPC';
  END IF;
  RAISE NOTICE 'PROOF 2b PASSED: admin manages members through set_member_role';
END $$;
RESET ROLE;

-- ── PROOF 3 — owners remain protected ───────────────────────────────────────
-- (3a) Admin C cannot self-promote to owner (blocked by the new UPDATE WITH CHECK).
SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333');
DO $$
DECLARE affected INT;
BEGIN
  BEGIN
    UPDATE public.workspace_members
       SET role = 'owner'
     WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       AND user_id = '33333333-3333-3333-3333-333333333333';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected > 0 THEN
      RAISE EXCEPTION 'PROOF 3a FAILED: admin self-promoted to owner';
    END IF;
    RAISE NOTICE 'PROOF 3a PASSED: admin→owner self-promotion updated 0 rows';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PROOF 3a PASSED: admin→owner self-promotion blocked by RLS';
  END;
END $$;

-- (3b) Admin C cannot modify the real owner's membership row (USING role<>'owner').
DO $$
DECLARE affected INT;
BEGIN
  BEGIN
    UPDATE public.workspace_members
       SET role = 'member'
     WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       AND user_id = '11111111-1111-1111-1111-111111111111';  -- the owner
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected > 0 THEN
      RAISE EXCEPTION 'PROOF 3b FAILED: admin demoted the workspace owner';
    END IF;
    RAISE NOTICE 'PROOF 3b PASSED: owner row not updatable by admin (0 rows)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PROOF 3b PASSED: owner-row update blocked by RLS';
  END;
END $$;

-- (3c) Admin C cannot delete the owner's row (pre-existing wm_delete_admin guard).
DO $$
DECLARE affected INT;
BEGIN
  DELETE FROM public.workspace_members
   WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     AND user_id = '11111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 0 THEN
    RAISE EXCEPTION 'PROOF 3c FAILED: admin deleted the workspace owner';
  END IF;
  RAISE NOTICE 'PROOF 3c PASSED: owner row not deletable by admin (0 rows)';
END $$;
RESET ROLE;

-- ── REGRESSION — the legitimate create-workspace bootstrap still works ───────
-- 039 removed the direct INSERT policy on workspaces: creation is create_workspace(),
-- which is where the owned-workspace entitlement is enforced. The bootstrap it replaces
-- must still work, and the two steps must still be atomic.
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE ws uuid; ok boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.workspaces (id, name, slug, owner_id)
    VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'B New WS', 'b-new-ws',
            '22222222-2222-2222-2222-222222222222');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'REGRESSION FAILED: workspaces is still directly insertable'; END IF;

  ws := public.create_workspace('B New WS', 'b-new-ws');
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
     WHERE workspace_id = ws AND user_id = '22222222-2222-2222-2222-222222222222' AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'REGRESSION FAILED: create_workspace did not make the caller its owner';
  END IF;
  IF NOT public.has_capability('members.invite', ws) THEN
    RAISE EXCEPTION 'REGRESSION FAILED: the creator cannot manage their own new workspace';
  END IF;
  RAISE NOTICE 'REGRESSION PASSED: genuine owner bootstraps a workspace through create_workspace()';
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE '✓ ALL 011 RLS ASSERTIONS PASSED'; END $$;

ROLLBACK;
