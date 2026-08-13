-- ============================================================================
-- RLS verification for migration 021 — two confirmed cross-account holes.
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no
-- writes persist). Requires migrations 001..021 applied (Supabase local/shadow):
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/021_cross_account_holes.test.sql
--
-- What this proves:
--   1. a user can still notify THEMSELVES (the only thing the client ever did);
--   2. a user CANNOT create a notification addressed to someone else;
--   3. onboarding-scratch objects are readable only by their uploader;
--   4. the delete policy is owner-scoped too (asserted on the predicate — see
--      the note in section B for why deletion cannot be exercised in SQL).
--
-- Both holes are PRE-EXISTING (001-era and 007-era), not introduced by the
-- Brand System Foundation work. They are covered here because a confirmed
-- cross-account hole is a release blocker, and because the storage policies
-- were NAMED "…_own" while not being owner-scoped — exactly the kind of gap
-- that reappears silently without a test.
--
-- Principals:
--   USER_A 11111111-…  |  USER_B 22222222-… (unrelated account)
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

CREATE OR REPLACE FUNCTION pg_temp.back_to_super() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);
END;
$$;

-- ── A. notifications ────────────────────────────────────────────────────────
DO $$
DECLARE self_ok BOOLEAN := false; other_denied BOOLEAN := false;
BEGIN
  PERFORM pg_temp.act_as('11111111-1111-1111-1111-111111111111');

  -- 1. Self-addressed insert still works.
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES ('11111111-1111-1111-1111-111111111111', 'system', 'own', 'own');
    self_ok := true;
  EXCEPTION WHEN insufficient_privilege THEN
    self_ok := false;
  END;

  -- 2. Insert addressed to ANOTHER account must be denied. This was the hole:
  --    `WITH CHECK (true)` let anyone push a titled, linked notification into
  --    any other user's tray — spam, and phishing inside a trusted surface.
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, href)
    VALUES ('22222222-2222-2222-2222-222222222222', 'system', 'Action required',
            'Click to verify your account', 'https://evil.example/');
    other_denied := false;
  EXCEPTION WHEN insufficient_privilege THEN
    other_denied := true;
  END;

  PERFORM pg_temp.back_to_super();

  IF NOT self_ok THEN
    RAISE EXCEPTION 'FAILED: a user can no longer create their OWN notification';
  END IF;
  IF NOT other_denied THEN
    RAISE EXCEPTION 'FAILED: cross-account hole — a user created a notification for another account';
  END IF;
  RAISE NOTICE 'PASSED: notification inserts are self-scoped (own allowed, cross-account denied)';
END $$;

-- ── B. onboarding-scratch storage objects ───────────────────────────────────
-- Seeded as superuser so `owner` is set explicitly to each uploader.
--
-- READ is exercised for real below. DELETE cannot be: Supabase guards
-- storage.objects with a STATEMENT-level `protect_objects_delete` trigger that
-- rejects every direct SQL delete regardless of RLS, and only
-- `supabase_storage_admin` may lift it — which the test role is not. Section C
-- therefore asserts the delete policy's own predicate. That is a real check:
-- `scratch_delete_own` USING is the clause Postgres evaluates per row, and the
-- bug being guarded against was precisely that this clause named no owner.
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-scratch', 'onboarding-scratch', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES
  ('onboarding-scratch', 'a/logo.png',
   '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('onboarding-scratch', 'b/logo.png',
   '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  -- A null-owner row: only the service role can create one. It must NOT be
  -- visible to an ordinary authenticated user, because `owner IS NULL` matches
  -- for everyone — the same hole this migration closes, in miniature.
  ('onboarding-scratch', 'orphan/logo.png', NULL, NULL);

DO $$
DECLARE own_visible INT; others_visible INT; ownerless_visible INT;
BEGIN
  PERFORM pg_temp.act_as('11111111-1111-1111-1111-111111111111');

  SELECT count(*) INTO own_visible
    FROM storage.objects
   WHERE bucket_id = 'onboarding-scratch'
     AND owner = '11111111-1111-1111-1111-111111111111';

  -- The hole: the predicate was `bucket_id = 'onboarding-scratch'` ONLY, so
  -- USER_A could read (and DELETE) USER_B's onboarding uploads — logos and
  -- brand imagery uploaded before a brand record even exists.
  SELECT count(*) INTO others_visible
    FROM storage.objects
   WHERE bucket_id = 'onboarding-scratch'
     AND owner = '22222222-2222-2222-2222-222222222222';

  SELECT count(*) INTO ownerless_visible
    FROM storage.objects
   WHERE bucket_id = 'onboarding-scratch'
     AND owner IS NULL;

  PERFORM pg_temp.back_to_super();

  IF own_visible <> 1 THEN
    RAISE EXCEPTION 'FAILED: uploader can no longer read their own onboarding scratch object';
  END IF;
  IF others_visible > 0 THEN
    RAISE EXCEPTION 'FAILED: cross-account leak — read another user''s onboarding upload';
  END IF;
  IF ownerless_visible > 0 THEN
    RAISE EXCEPTION 'FAILED: a null-owner object is visible — that predicate matches every user';
  END IF;
  RAISE NOTICE 'PASSED: onboarding scratch reads are owner-scoped';
END $$;

-- ── C. the policies themselves, so a future migration cannot silently reopen ─
DO $$
DECLARE open_insert INT; unscoped INT;
BEGIN
  SELECT count(*) INTO open_insert
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'notifications'
     AND cmd = 'INSERT' AND coalesce(with_check, '') = 'true';
  IF open_insert > 0 THEN
    RAISE EXCEPTION 'FAILED: an unrestricted notifications INSERT policy exists again';
  END IF;

  SELECT count(*) INTO unscoped
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND policyname IN ('scratch_select_own', 'scratch_delete_own')
     AND (qual NOT LIKE '%owner%' OR qual LIKE '%owner IS NULL%');
  IF unscoped > 0 THEN
    RAISE EXCEPTION 'FAILED: an onboarding-scratch "own" policy is not STRICTLY owner-scoped';
  END IF;

  RAISE NOTICE 'PASSED: final policy set carries no unrestricted insert and no unscoped "own" policy';
END $$;

DO $$ BEGIN RAISE NOTICE '✓ ALL 021 RLS ASSERTIONS PASSED'; END $$;

ROLLBACK;
