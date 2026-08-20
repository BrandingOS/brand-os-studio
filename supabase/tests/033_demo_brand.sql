\set ON_ERROR_STOP off
\pset pager off

CREATE OR REPLACE FUNCTION expect(label text, got anyelement, want anyelement)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS NOT DISTINCT FROM want THEN
    RAISE NOTICE 'PASS  % (%)', label, got;
  ELSE
    RAISE WARNING 'FAIL  % — got %, want %', label, got, want;
  END IF;
END $$;

-- ── 0. the template landed ──────────────────────────────────────────────────
SELECT expect('template exists', (SELECT count(*)::int FROM brands WHERE is_demo_template), 1);
SELECT expect('template slug',   (SELECT slug FROM brands WHERE is_demo_template), 'brandingos');
SELECT expect('template logos',  (SELECT jsonb_array_length(brand_assets) FROM brands WHERE is_demo_template), 6);
SELECT expect('primary ref resolves',
  (SELECT (b.logo_system->'primary'->>'assetId') IN (SELECT jsonb_array_elements(b.brand_assets)->>'id')
     FROM brands b WHERE is_demo_template), true);
SELECT expect('mono.white ref resolves',
  (SELECT (b.logo_system->'mono'->'white'->>'assetId') IN (SELECT jsonb_array_elements(b.brand_assets)->>'id')
     FROM brands b WHERE is_demo_template), true);

-- ── 1. give the template child rows to clone ────────────────────────────────
-- The template's designs need a real owner (designs.user_id -> auth.users).
-- Inserting that user fires the trigger too, so they get a clone as well.
INSERT INTO auth.users (id, email) VALUES ('99999999-9999-9999-9999-999999999999', 'owner@example.com');
UPDATE brands SET user_id = '99999999-9999-9999-9999-999999999999' WHERE is_demo_template;

DO $$
DECLARE t uuid; f_root uuid; f_child uuid;
BEGIN
  SELECT id INTO t FROM brands WHERE is_demo_template;

  INSERT INTO brand_folders (brand_id, name) VALUES (t, 'Campaigns') RETURNING id INTO f_root;
  INSERT INTO brand_folders (brand_id, name, parent_id) VALUES (t, 'Launch', f_root) RETURNING id INTO f_child;
  INSERT INTO brand_folders (brand_id, name) VALUES (t, 'Photography');

  INSERT INTO assets (brand_id, name, type, category, url, folder_id)
  VALUES (t, 'Hero', 'image', 'photo', '/x/hero.png', f_child),
         (t, 'Loose', 'image', 'photo', '/x/loose.png', NULL);

  INSERT INTO designs (brand_id, id, user_id, data, name, folder_id)
  VALUES (t, 'welcome', '99999999-9999-9999-9999-999999999999',
          '{"pages":[{"id":"p1"}]}'::jsonb, 'Welcome poster', f_child);
END $$;

-- ── 2. a signup clones it ───────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'a@example.com');

SELECT expect('signup made 1 brand',
  (SELECT count(*)::int FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), 1);
SELECT expect('clone is not the template',
  (SELECT is_demo_template FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), false);
SELECT expect('clone is flagged is_demo',
  (SELECT is_demo FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), true);
SELECT expect('clone slug is derived from the name',
  (SELECT slug LIKE 'brandingos%' FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), true);
SELECT expect('every slug is unique',
  (SELECT count(DISTINCT slug) = count(*) FROM brands), true);
SELECT expect('clone kept the logo library',
  (SELECT jsonb_array_length(brand_assets) FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), 6);
SELECT expect('clone kept guidelines.strategy.values',
  (SELECT jsonb_array_length(guidelines->'strategy'->'values') FROM brands
    WHERE user_id = '11111111-1111-1111-1111-111111111111'), 5);

-- folders
SELECT expect('clone folder count',
  (SELECT count(*)::int FROM brand_folders WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 3);
SELECT expect('clone nesting preserved',
  (SELECT p.name FROM brand_folders c JOIN brand_folders p ON p.id = c.parent_id
    WHERE c.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND c.name = 'Launch'), 'Campaigns');
SELECT expect('clone parent stays inside the clone',
  (SELECT bool_and(p.brand_id = c.brand_id) FROM brand_folders c JOIN brand_folders p ON p.id = c.parent_id
    WHERE c.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), true);

-- assets
SELECT expect('clone asset count',
  (SELECT count(*)::int FROM assets WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 2);
SELECT expect('filed asset points at the CLONE folder',
  (SELECT f.name FROM assets a JOIN brand_folders f ON f.id = a.folder_id
    WHERE a.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND a.name = 'Hero'), 'Launch');
SELECT expect('filed asset folder belongs to the clone',
  (SELECT f.brand_id = a.brand_id FROM assets a JOIN brand_folders f ON f.id = a.folder_id
    WHERE a.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND a.name = 'Hero'), true);
SELECT expect('unfiled asset stays unfiled',
  (SELECT folder_id IS NULL FROM assets
    WHERE brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')
      AND name = 'Loose'), true);

-- designs
SELECT expect('clone design count',
  (SELECT count(*)::int FROM designs WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 1);
SELECT expect('design is owned by the new user',
  (SELECT user_id FROM designs WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')),
  '11111111-1111-1111-1111-111111111111'::uuid);
SELECT expect('design body survived',
  (SELECT data->'pages'->0->>'id' FROM designs WHERE brand_id =
     (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), 'p1');
SELECT expect('design filed in the CLONE folder',
  (SELECT f.brand_id = d.brand_id FROM designs d JOIN brand_folders f ON f.id = d.folder_id
    WHERE d.brand_id = (SELECT id FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111')), true);

-- ── 3. two users are independent ────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES ('22222222-2222-2222-2222-222222222222', 'b@example.com');
UPDATE brands SET name = 'Renamed by A' WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT expect('B unaffected by A''s edit',
  (SELECT name FROM brands WHERE user_id = '22222222-2222-2222-2222-222222222222'), 'BrandingOS');
SELECT expect('B got a different slug from A',
  (SELECT count(DISTINCT slug)::int FROM brands WHERE is_demo), 3);
DELETE FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111';
SELECT expect('deleting A''s demo leaves B''s alone',
  (SELECT count(*)::int FROM brands WHERE user_id = '22222222-2222-2222-2222-222222222222'), 1);
SELECT expect('delete cascaded A''s assets',
  (SELECT count(*)::int FROM assets a WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.id = a.brand_id)), 0);

-- ── 4. deleted stays deleted ────────────────────────────────────────────────
-- Nothing re-runs for an existing user, so there is nothing to re-create.
UPDATE auth.users SET last_sign_in_at = now() WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT expect('A still has no brand after signing in again',
  (SELECT count(*)::int FROM brands WHERE user_id = '11111111-1111-1111-1111-111111111111'), 0);

-- ── 5. a broken template must not break signup ──────────────────────────────
-- name is NOT NULL, so a template with a null name cannot be inserted; break
-- it in a way the clone will hit instead — a duplicate design primary key.

DO $$ BEGIN
  -- force a failure inside clone_demo_brand by making the folder map lie
  EXECUTE 'ALTER TABLE brand_folders ADD CONSTRAINT tmp_no_inserts CHECK (name <> ''Campaigns'') NOT VALID';
END $$;
INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 'c@example.com');
SELECT expect('SIGNUP SURVIVES a failing clone',
  (SELECT count(*)::int FROM auth.users WHERE id = '33333333-3333-3333-3333-333333333333'), 1);
SELECT expect('and that user simply has no demo brand',
  (SELECT count(*)::int FROM brands WHERE user_id = '33333333-3333-3333-3333-333333333333'), 0);
ALTER TABLE brand_folders DROP CONSTRAINT tmp_no_inserts;

-- ── 6. only one template ────────────────────────────────────────────────────
DO $$ BEGIN
  UPDATE brands SET is_demo_template = true
   WHERE user_id = '22222222-2222-2222-2222-222222222222';
  RAISE WARNING 'FAIL  a second template was allowed';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASS  a second template is refused';
END $$;

-- ── 7. no template → feature off, signup still fine ─────────────────────────
DELETE FROM brands WHERE is_demo_template;
INSERT INTO auth.users (id, email) VALUES ('44444444-4444-4444-4444-444444444444', 'd@example.com');
SELECT expect('no template → no brand, no error',
  (SELECT count(*)::int FROM brands WHERE user_id = '44444444-4444-4444-4444-444444444444'), 0);
SELECT expect('user still created', (SELECT email FROM auth.users
  WHERE id = '44444444-4444-4444-4444-444444444444'), 'd@example.com');

-- ── 8. a column added later is still cloned ─────────────────────────────────
-- The whole reason the clone round-trips through jsonb instead of naming
-- columns. Restore a template first (section 7 deleted it).
INSERT INTO brands (user_id, name, primary_color, is_demo_template)
VALUES ('99999999-9999-9999-9999-999999999999', 'BrandingOS', '#111113', true);
ALTER TABLE brands ADD COLUMN a_column_from_the_future text;
UPDATE brands SET a_column_from_the_future = 'carried' WHERE is_demo_template;
INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'e@example.com');
SELECT expect('a column added after the function was written is still copied',
  (SELECT a_column_from_the_future FROM brands
    WHERE user_id = '55555555-5555-5555-5555-555555555555'), 'carried');
