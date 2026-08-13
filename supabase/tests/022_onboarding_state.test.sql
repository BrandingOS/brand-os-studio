-- 022 — Onboarding progress column: isolation proof.
--
-- The column carries no policy of its own; it rides the `brands` row policies.
-- That is the claim under test: another account can neither READ nor WRITE a
-- brand's onboarding marker, because it cannot reach the row at all.
--
-- Self-asserting. Every check RAISEs on failure, so a green run is the result —
-- there is no output to interpret.
--
-- Run:  supabase db query --linked -f supabase/tests/022_onboarding_state.test.sql

BEGIN;

DO $$
DECLARE
  owner_id  uuid := '00000000-0000-4000-a000-000000000221';
  other_id  uuid := '00000000-0000-4000-a000-000000000222';
  brand_id  uuid;
  visible   int;
  updated   int;
  marker    jsonb;
BEGIN
  -- ── Fixture ───────────────────────────────────────────────────────
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, aud, role)
  VALUES (owner_id, 'onb-owner-022@test.local', crypt('x', gen_salt('bf')), now(),
          now(), now(), 'authenticated', 'authenticated'),
         (other_id, 'onb-other-022@test.local', crypt('x', gen_salt('bf')), now(),
          now(), now(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.brands (user_id, name, slug, primary_color, fonts, tone, audience, onboarding)
  VALUES (owner_id, 'Onboarding RLS 022', 'onboarding-rls-022', '#111113',
          '{"primary":"Inter"}'::jsonb, '', '',
          '{"step":"material","branch":"existing","startedAt":"2026-08-14T00:00:00.000Z","completedAt":null}'::jsonb)
  RETURNING id INTO brand_id;

  -- ── 1. The owner can read their own marker ────────────────────────
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT onboarding INTO marker FROM public.brands WHERE id = brand_id;
  IF marker IS NULL OR marker->>'step' <> 'material' THEN
    RAISE EXCEPTION 'FAIL: owner cannot read their own onboarding marker (got %)', marker;
  END IF;

  RESET ROLE;

  -- ── 2. Another account cannot READ it ─────────────────────────────
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', other_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO visible FROM public.brands WHERE id = brand_id;
  IF visible <> 0 THEN
    RAISE EXCEPTION 'FAIL: another account can read a brand carrying an onboarding marker (% rows)', visible;
  END IF;

  -- ── 3. Another account cannot WRITE it ────────────────────────────
  -- A cross-account update must affect zero rows rather than silently
  -- rewriting someone else's progress.
  WITH u AS (
    UPDATE public.brands SET onboarding = '{"step":"review"}'::jsonb
    WHERE id = brand_id RETURNING 1
  )
  SELECT count(*) INTO updated FROM u;
  IF updated <> 0 THEN
    RAISE EXCEPTION 'FAIL: another account updated a brand onboarding marker (% rows)', updated;
  END IF;

  RESET ROLE;

  -- ── 4. The marker survived the attempted write ────────────────────
  SELECT onboarding INTO marker FROM public.brands WHERE id = brand_id;
  IF marker->>'step' <> 'material' THEN
    RAISE EXCEPTION 'FAIL: onboarding marker was modified cross-account (now %)', marker;
  END IF;

  -- ── 5. The column is nullable — pre-002 brands carry nothing ──────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands'
      AND column_name = 'onboarding' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'FAIL: brands.onboarding is NOT NULL — every pre-existing brand would need a backfill';
  END IF;

  RAISE NOTICE 'PASS: 022 onboarding marker is owner-scoped for read and write, and nullable.';
END $$;

ROLLBACK;
