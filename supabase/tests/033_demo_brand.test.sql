-- ============================================================================
-- Verification for migration 033 — the demo brand every new account is given.
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no
-- writes persist). Requires migrations 001..033 applied. Run with either:
--   supabase db reset && psql "$LOCAL_DB_URL" -f supabase/tests/033_demo_brand.test.sql
--   supabase/tests/run.sh          (no Docker; stubs auth/storage, runs the real migrations)
--
-- The trigger under test fires on auth.users INSERT, so the principals here are
-- real auth.users rows and the act of creating one IS the thing being tested.
--
--   OWNER  99999999-… owns the template (designs.user_id references auth.users)
--   USER_A 11111111-… first signup
--   USER_B 22222222-… second signup, must be independent of A
--   USER_C 33333333-… signs up while the clone is deliberately broken
--   USER_D 44444444-… signs up with no template at all
--   USER_E 55555555-… signs up after a column was added to brands
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.expect(label text, got anyelement, want anyelement)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION '033 FAILED: % — got %, want %', label, got, want;
  END IF;
  RAISE NOTICE '  ok  %', label;
END $$;

-- ── 0. the template landed ──────────────────────────────────────────────────
SELECT pg_temp.expect('template exists', (SELECT count(*)::int FROM brands WHERE is_demo_template), 1);
SELECT pg_temp.expect('template slug',   (SELECT slug FROM brands WHERE is_demo_template), 'brandingos');
SELECT pg_temp.expect('template logos',  (SELECT jsonb_array_length(brand_assets) FROM brands WHERE is_demo_template), 6);
SELECT pg_temp.expect('primary ref resolves',
  (SELECT (b.logo_system->'primary'->>'assetId') IN (SELECT jsonb_array_elements(b.brand_assets)->>'id')
     FROM brands b WHERE is_demo_template), true);
SELECT pg_temp.expect('mono.white ref resolves',
  (SELECT (b.logo_system->'mono'->'white'->>'assetId') IN (SELECT jsonb_array_elements(b.brand_assets)->>'id')
     FROM brands b WHERE is_demo_template), true);

-- ── 1. the template's own content, plus what only a test can add ───────────
-- The migration seeds the folder tree (Logos · Photography · Campaigns/Launch)
-- and the six logo files. Designs it cannot seed, because designs.user_id
-- references auth.users and the template's owner may not exist at migrate time.
SELECT pg_temp.expect('template ships a folder tree',
  (SELECT count(*)::int FROM brand_folders WHERE brand_id = (SELECT id FROM brands WHERE is_demo_template)), 4);
SELECT pg_temp.expect('template ships its logos in the Library',
  (SELECT count(*)::int FROM assets WHERE brand_id = (SELECT id FROM brands WHERE is_demo_template)), 6);
SELECT pg_temp.expect('Launch is nested under Campaigns',
  (SELECT p.name FROM brand_folders c JOIN brand_folders p ON p.id = c.parent_id
    WHERE c.brand_id = (SELECT id FROM brands WHERE is_demo_template) AND c.name = 'Launch'), 'Campaigns');

INSERT INTO auth.users (id, email) VALUES ('99999999-9999-9999-9999-999999999999', 'owner@example.com');
UPDATE brands SET user_id = '99999999-9999-9999-9999-999999999999' WHERE is_demo_template;

DO $$
DECLARE t uuid; f_launch uuid;
BEGIN
  SELECT id INTO t FROM brands WHERE is_demo_template;
  SELECT id INTO f_launch FROM brand_folders WHERE brand_id = t AND name = 'Launch';

  -- A filed asset and an unfiled one, so the clone is tested on both paths.
  INSERT INTO assets (brand_id, name, type, category, url, folder_id)
  VALUES (t, 'Hero', 'image', 'photo', '/x/hero.png', f_launch),
         (t, 'Loose', 'image', 'photo', '/x/loose.png', NULL);

  INSERT INTO designs (brand_id, id, user_id, data, name, folder_id)
  VALUES (t, 'welcome', '99999999-9999-9999-9999-999999999999',
          '{"pages":[{"id":"p1"}]}'::jsonb, 'Welcome poster', f_launch);
END $$;

-- ── 2. a signup clones it ───────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'a@example.com');

SELECT pg_temp.expect('signup made 1 brand',
  (SELECT count(*)::int FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), 1);
SELECT pg_temp.expect('clone is not the template',
  (SELECT is_demo_template FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), false);
SELECT pg_temp.expect('clone is flagged is_demo',
  (SELECT is_demo FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), true);
SELECT pg_temp.expect('clone slug is derived from the name',
  (SELECT slug LIKE 'brandingos%' FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), true);
SELECT pg_temp.expect('every slug is unique',
  (SELECT count(DISTINCT slug) = count(*) FROM brands), true);
SELECT pg_temp.expect('clone kept the logo library',
  (SELECT jsonb_array_length(brand_assets) FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), 6);
SELECT pg_temp.expect('clone kept guidelines.strategy.values',
  (SELECT jsonb_array_length(guidelines->'strategy'->'values') FROM brands
    WHERE user_id = '11111111-1111-1111-1111-111111111111'), 5);

-- folders
SELECT pg_temp.expect('clone folder count',
  (SELECT count(*)::int FROM brand_folders WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 4);
SELECT pg_temp.expect('clone nesting preserved',
  (SELECT p.name FROM brand_folders c JOIN brand_folders p ON p.id = c.parent_id
    WHERE c.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND c.name = 'Launch'), 'Campaigns');
SELECT pg_temp.expect('clone parent stays inside the clone',
  (SELECT bool_and(p.brand_id = c.brand_id) FROM brand_folders c JOIN brand_folders p ON p.id = c.parent_id
    WHERE c.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), true);

-- assets
SELECT pg_temp.expect('clone asset count — six seeded logos plus the two added here',
  (SELECT count(*)::int FROM assets WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 8);
SELECT pg_temp.expect('the seeded logos are filed under Logos in the clone',
  (SELECT count(*)::int FROM assets a JOIN brand_folders f ON f.id = a.folder_id
    WHERE a.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND f.name = 'Logos'), 6);
SELECT pg_temp.expect('filed asset points at the CLONE folder',
  (SELECT f.name FROM assets a JOIN brand_folders f ON f.id = a.folder_id
    WHERE a.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND a.name = 'Hero'), 'Launch');
SELECT pg_temp.expect('filed asset folder belongs to the clone',
  (SELECT f.brand_id = a.brand_id FROM assets a JOIN brand_folders f ON f.id = a.folder_id
    WHERE a.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND a.name = 'Hero'), true);
SELECT pg_temp.expect('unfiled asset stays unfiled',
  (SELECT folder_id IS NULL FROM assets
    WHERE brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND name = 'Loose'), true);

-- designs
SELECT pg_temp.expect('clone design count',
  (SELECT count(*)::int FROM designs WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 1);
SELECT pg_temp.expect('design is owned by the new user',
  (SELECT user_id FROM designs WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')),
  '11111111-1111-1111-1111-111111111111'::uuid);
SELECT pg_temp.expect('design body survived',
  (SELECT data->'pages'->0->>'id' FROM designs WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 'p1');
SELECT pg_temp.expect('design filed in the CLONE folder',
  (SELECT f.brand_id = d.brand_id FROM designs d JOIN brand_folders f ON f.id = d.folder_id
    WHERE d.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), true);

-- ── 3. two users are independent ────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES ('22222222-2222-2222-2222-222222222222', 'b@example.com');
UPDATE brands SET name = 'Renamed by A' WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.expect('B unaffected by A''s edit',
  (SELECT name FROM brands WHERE user_id = '22222222-2222-2222-2222-222222222222'), 'BrandingOS');
SELECT pg_temp.expect('B got a different slug from A',
  (SELECT count(DISTINCT slug)::int FROM brands WHERE is_demo), 3);
DELETE FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.expect('deleting A''s demo leaves B''s alone',
  (SELECT count(*)::int FROM brands WHERE user_id = '22222222-2222-2222-2222-222222222222'), 1);
SELECT pg_temp.expect('delete cascaded A''s assets',
  (SELECT count(*)::int FROM assets a WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = a.brand_id)), 0);

-- ── 4. deleted stays deleted ────────────────────────────────────────────────
-- Nothing re-runs for an existing user, so there is nothing to re-create.
UPDATE auth.users SET last_sign_in_at = now() WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT pg_temp.expect('A still has no brand after signing in again',
  (SELECT count(*)::int FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), 0);

-- ── 5. a broken template must not break signup ──────────────────────────────
-- name is NOT NULL, so a template with a null name cannot be inserted; break
-- it in a way the clone will hit instead — a duplicate design primary key.

DO $$ BEGIN
  -- force a failure inside clone_demo_brand by making the folder map lie
  EXECUTE 'ALTER TABLE brand_folders ADD CONSTRAINT tmp_no_inserts CHECK (name <> ''Campaigns'') NOT VALID';
END $$;
INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 'c@example.com');
SELECT pg_temp.expect('SIGNUP SURVIVES a failing clone',
  (SELECT count(*)::int FROM auth.users WHERE id = '33333333-3333-3333-3333-333333333333'), 1);
SELECT pg_temp.expect('and that user simply has no demo brand',
  (SELECT count(*)::int FROM brands WHERE user_id = '33333333-3333-3333-3333-333333333333'), 0);
ALTER TABLE brand_folders DROP CONSTRAINT tmp_no_inserts;

-- ── 6. only one template ────────────────────────────────────────────────────
SAVEPOINT second_template;
DO $$ BEGIN
  UPDATE brands SET is_demo_template = true
   WHERE user_id = '22222222-2222-2222-2222-222222222222';
  RAISE EXCEPTION '033 FAILED: a second demo template was allowed';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE '  ok  a second template is refused';
END $$;
ROLLBACK TO SAVEPOINT second_template;

-- ── 7. no template → feature off, signup still fine ─────────────────────────
DELETE FROM brands WHERE is_demo_template;
INSERT INTO auth.users (id, email) VALUES ('44444444-4444-4444-4444-444444444444', 'd@example.com');
SELECT pg_temp.expect('no template → no brand, no error',
  (SELECT count(*)::int FROM brands WHERE user_id = '44444444-4444-4444-4444-444444444444'), 0);
SELECT pg_temp.expect('user still created', (SELECT email FROM auth.users
  WHERE id = '44444444-4444-4444-4444-444444444444'), 'd@example.com');

-- ── 8. a column added later is still cloned ─────────────────────────────────
-- The whole reason the clone round-trips through jsonb instead of naming
-- columns. Restore a template first (section 7 deleted it).
INSERT INTO brands (user_id, name, primary_color, is_demo_template)
VALUES ('99999999-9999-9999-9999-999999999999', 'BrandingOS', '#111113', true);
ALTER TABLE brands ADD COLUMN a_column_from_the_future text;
UPDATE brands SET a_column_from_the_future = 'carried' WHERE is_demo_template;
INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'e@example.com');
SELECT pg_temp.expect('a column added after the function was written is still copied',
  (SELECT a_column_from_the_future FROM brands
    WHERE user_id = '55555555-5555-5555-5555-555555555555'), 'carried');

DO $$ BEGIN RAISE NOTICE 'ALL 033 ASSERTIONS PASSED'; END $$;

ROLLBACK;
