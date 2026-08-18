-- ============================================================================
-- RLS verification for migration 030 — user_preferences (self-scoped only).
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK.
-- Requires migrations 001..030 applied. Run with:
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/030_user_preferences.test.sql
--
--   USER_A 11111111-…   USER_B 22222222-…
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

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

-- ── A. A user owns their own row ────────────────────────────────────────────

SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE got JSONB;
BEGIN
  INSERT INTO public.user_preferences (user_id, preferences)
  VALUES ('11111111-1111-1111-1111-111111111111',
          '{"theme":"dark","uiPreference":"classic"}'::jsonb);

  SELECT preferences INTO got FROM public.user_preferences
   WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF got->>'theme' <> 'dark' THEN RAISE EXCEPTION 'A1: own row did not round-trip'; END IF;

  UPDATE public.user_preferences
     SET preferences = preferences || '{"innerNavOpen":true}'::jsonb
   WHERE user_id = '11111111-1111-1111-1111-111111111111';

  SELECT preferences INTO got FROM public.user_preferences
   WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF got->>'innerNavOpen' <> 'true' THEN RAISE EXCEPTION 'A2: own update did not apply'; END IF;
  RAISE NOTICE 'PASS A — a user can read and write their own preferences';
END $$;

-- ── B. Nobody else can ──────────────────────────────────────────────────────

SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE leaked INT; touched INT; ok BOOLEAN := false;
BEGIN
  SELECT count(*) INTO leaked FROM public.user_preferences;
  IF leaked <> 0 THEN RAISE EXCEPTION 'B1: stranger can read % preference row(s)', leaked; END IF;

  UPDATE public.user_preferences SET preferences = '{"theme":"light"}'::jsonb;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 0 THEN RAISE EXCEPTION 'B2: stranger updated % row(s)', touched; END IF;

  DELETE FROM public.user_preferences;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 0 THEN RAISE EXCEPTION 'B3: stranger deleted % row(s)', touched; END IF;

  -- Cannot create a row that belongs to someone else.
  BEGIN
    INSERT INTO public.user_preferences (user_id, preferences)
    VALUES ('11111111-1111-1111-1111-111111111111', '{"theme":"light"}'::jsonb);
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'B4: stranger inserted a row for another user'; END IF;
  RAISE NOTICE 'PASS B — preferences are invisible and unwritable to a stranger';
END $$;

-- ── C. A user cannot re-parent their row onto someone else ──────────────────

SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.user_preferences
       SET user_id = '22222222-2222-2222-2222-222222222222'
     WHERE user_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'C1: WITH CHECK did not stop a row hand-off'; END IF;
  RAISE NOTICE 'PASS C — the UPDATE WITH CHECK blocks re-parenting';
END $$;

-- ── D. Shape and size are bounded ───────────────────────────────────────────

DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.user_preferences SET preferences = '"not an object"'::jsonb
     WHERE user_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN check_violation THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'D1: a non-object payload was accepted'; END IF;

  ok := false;
  BEGIN
    UPDATE public.user_preferences
       SET preferences = jsonb_build_object('junk', repeat('x', 20000))
     WHERE user_id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN OTHERS THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'D2: a 20 KB payload was accepted'; END IF;
  RAISE NOTICE 'PASS D — payload must be an object and stay under 16 KB';
END $$;

-- ── E. 029's purge removes the row ──────────────────────────────────────────

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
DO $$
BEGIN
  PERFORM public.purge_account_data('11111111-1111-1111-1111-111111111111');
  IF EXISTS (SELECT 1 FROM public.user_preferences
              WHERE user_id='11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'E1: preferences survived the account purge';
  END IF;
  RAISE NOTICE 'PASS E — 029 purges the preferences row';
END $$;

DO $$ BEGIN RAISE NOTICE '030 — ALL CHECKS PASSED'; END $$;

ROLLBACK;
