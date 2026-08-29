-- ============================================================================
-- RLS verification for migration 012 — profiles visibility (self + co-workers only).
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no writes
-- persist). Requires migrations 001..012 applied (Supabase local/shadow). Run with:
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/012_profiles_visibility.test.sql
--
-- Principals (arbitrary UUIDs; workspace_members.user_id has no FK to auth.users):
--   USER_A 11111111-… and USER_C 33333333-… share WS_SHARED
--   USER_B 22222222-… is in a DIFFERENT workspace WS_OTHER (a stranger to A)
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

-- Setup (superuser → RLS bypassed).
--
-- These have to be real auth.users rows: profiles.id carries
-- `REFERENCES auth.users(id) ON DELETE CASCADE` (profiles_id_fkey, added by the
-- original 20250905213158 migration; 001 recreates the table with
-- CREATE TABLE IF NOT EXISTS, so it never dropped the constraint). Inserting
-- bare profiles rows raised 23503 and this whole file could not run.
-- handle_new_user() then creates the profile — hence the UPDATE for full_name
-- rather than an INSERT.
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.com')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET full_name = 'User A' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET full_name = 'User B' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET full_name = 'User C' WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO public.workspaces (id, name, slug, owner_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Shared WS', 'shared-ws',
   '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other WS', 'other-ws',
   '22222222-2222-2222-2222-222222222222');
INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

-- Act as USER_A.
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE self_ok BOOLEAN; coworker_ok BOOLEAN; stranger_leak BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id='11111111-1111-1111-1111-111111111111') INTO self_ok;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id='33333333-3333-3333-3333-333333333333') INTO coworker_ok;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id='22222222-2222-2222-2222-222222222222') INTO stranger_leak;

  IF NOT self_ok THEN RAISE EXCEPTION 'FAILED: user cannot read own profile'; END IF;
  IF NOT coworker_ok THEN RAISE EXCEPTION 'FAILED: user cannot read a workspace co-member profile (member lists broken)'; END IF;
  IF stranger_leak THEN RAISE EXCEPTION 'FAILED: cross-tenant leak — user read a stranger''s profile/email'; END IF;
  RAISE NOTICE 'PASSED: self + co-member visible; stranger NOT visible';
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE '✓ ALL 012 PROFILES-VISIBILITY ASSERTIONS PASSED'; END $$;

ROLLBACK;
