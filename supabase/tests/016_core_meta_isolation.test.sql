-- ============================================================================
-- RLS verification for migration 016 — Brand Core metadata + Business Info.
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no
-- writes persist). Requires migrations 001..016 applied (Supabase local/shadow):
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/016_core_meta_isolation.test.sql
--
-- What this proves: the new columns are governed by the EXISTING brands
-- policies, i.e. a stranger can neither read a brand's authority/provenance
-- sidecar nor its business facts, and cannot write them. Brand isolation is
-- enforced at the data layer, never by UI filtering (constitution XI).
--
-- Principals:
--   USER_A 11111111-… owns BRAND_A (workspace WS_A)
--   USER_B 22222222-… is a stranger — member of a DIFFERENT workspace
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

-- ── Setup (superuser → RLS bypassed) ────────────────────────────────────────
INSERT INTO public.workspaces (id, name, slug, owner_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'WS A', 'ws-a-016',
   '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'WS B', 'ws-b-016',
   '22222222-2222-2222-2222-222222222222');

INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

INSERT INTO public.brands (id, user_id, workspace_id, name, slug, primary_color,
                           identity_meta, business_info)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Brand A', 'brand-a-016', '#123456',
  '{"colors.primary":{"authority":"confirmed","provenance":"user-entered",
     "setBy":"11111111-1111-1111-1111-111111111111","setAt":"2026-08-13T00:00:00.000Z"}}'::jsonb,
  '{"legalName":"Brand A Ltd","contact":{"email":"secret@brand-a.example"}}'::jsonb
);

-- ── Owner can read its own Core metadata + business info ────────────────────
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE meta_ok BOOLEAN; biz_ok BOOLEAN;
BEGIN
  SELECT identity_meta ? 'colors.primary' INTO meta_ok
    FROM public.brands WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  SELECT business_info ->> 'legalName' = 'Brand A Ltd' INTO biz_ok
    FROM public.brands WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF NOT COALESCE(meta_ok, false) THEN
    RAISE EXCEPTION 'FAILED: owner cannot read own identity_meta';
  END IF;
  IF NOT COALESCE(biz_ok, false) THEN
    RAISE EXCEPTION 'FAILED: owner cannot read own business_info';
  END IF;
  RAISE NOTICE 'PASSED: owner reads own identity_meta + business_info';
END $$;
RESET ROLE;

-- ── Stranger cannot READ the sidecar or business facts ──────────────────────
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE leaked_rows INT;
BEGIN
  SELECT count(*) INTO leaked_rows
    FROM public.brands WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF leaked_rows > 0 THEN
    RAISE EXCEPTION 'FAILED: cross-tenant leak — stranger read another brand''s row (identity_meta/business_info exposed)';
  END IF;
  RAISE NOTICE 'PASSED: stranger cannot read the brand row at all';
END $$;
RESET ROLE;

-- ── Stranger cannot WRITE the sidecar (silently affects zero rows) ──────────
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE affected INT;
BEGIN
  UPDATE public.brands
     SET identity_meta = '{"colors.primary":{"authority":"official","provenance":"ai-suggested"}}'::jsonb
   WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected > 0 THEN
    RAISE EXCEPTION 'FAILED: stranger promoted another brand''s Core value to official';
  END IF;
  RAISE NOTICE 'PASSED: stranger cannot write identity_meta';
END $$;
RESET ROLE;

-- ── Confirm the owner's data is intact after the attempted write ────────────
DO $$
DECLARE still_confirmed BOOLEAN;
BEGIN
  SELECT identity_meta -> 'colors.primary' ->> 'authority' = 'confirmed'
    INTO still_confirmed
    FROM public.brands WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF NOT COALESCE(still_confirmed, false) THEN
    RAISE EXCEPTION 'FAILED: identity_meta was modified by an unauthorized write';
  END IF;
  RAISE NOTICE 'PASSED: owner authority unchanged after stranger write attempt';
END $$;

DO $$ BEGIN RAISE NOTICE '✓ ALL 016 RLS ASSERTIONS PASSED'; END $$;

ROLLBACK;
