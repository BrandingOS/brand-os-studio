-- ============================================================================
-- RLS verification for migration 017 — Library, folders, adoptions, context.
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no
-- writes persist). Requires migrations 001..017 applied (Supabase local/shadow):
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/017_library_kit_context_isolation.test.sql
--
-- What this proves, for every new brand-scoped surface:
--   1. a brand member can use it;
--   2. a stranger can neither read nor write it;
--   3. an adoption cannot be attributed to another user (self-attribution);
--   4. the new Library columns on public.assets inherit assets' isolation.
--
-- Principals:
--   USER_A 11111111-… owns BRAND_A   |   USER_B 22222222-… stranger (other workspace)
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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'WS A', 'ws-a-017',
   '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'WS B', 'ws-b-017',
   '22222222-2222-2222-2222-222222222222');

INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

INSERT INTO public.brands (id, user_id, workspace_id, name, slug, primary_color) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Brand A', 'brand-a-017', '#123456');

INSERT INTO public.brand_folders (id, brand_id, name) VALUES
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Logos');

INSERT INTO public.assets (id, brand_id, name, type, category, url, origin, folder_id,
                           is_favorite, use_as_reference)
VALUES ('a5e70000-0000-0000-0000-000000000001',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'logo.svg', 'image', 'logo', 'https://example.test/logo.svg',
        'uploaded', 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', true, true);

INSERT INTO public.brand_kit_adoptions (brand_id, target_kind, target_ref, adopted_by) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'library_item',
   'a5e70000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');

INSERT INTO public.brand_context_signals (brand_id, kind, target_kind, target_ref, source) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'favorite', 'library_item',
   'a5e70000-0000-0000-0000-000000000001', 'user-action');

-- ── Member can read every new surface ───────────────────────────────────────
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE folders INT; assets INT; adoptions INT; signals INT; fav BOOLEAN;
BEGIN
  SELECT count(*) INTO folders   FROM public.brand_folders
    WHERE brand_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  SELECT count(*) INTO assets    FROM public.assets
    WHERE brand_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  SELECT count(*) INTO adoptions FROM public.brand_kit_adoptions
    WHERE brand_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  SELECT count(*) INTO signals   FROM public.brand_context_signals
    WHERE brand_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  SELECT is_favorite INTO fav    FROM public.assets
    WHERE id = 'a5e70000-0000-0000-0000-000000000001';

  IF folders   <> 1 THEN RAISE EXCEPTION 'FAILED: member cannot read own brand_folders'; END IF;
  IF assets    <> 1 THEN RAISE EXCEPTION 'FAILED: member cannot read own Library items'; END IF;
  IF adoptions <> 1 THEN RAISE EXCEPTION 'FAILED: member cannot read own kit adoptions'; END IF;
  IF signals   <> 1 THEN RAISE EXCEPTION 'FAILED: member cannot read own context signals'; END IF;
  IF NOT COALESCE(fav, false) THEN RAISE EXCEPTION 'FAILED: Library flags not readable'; END IF;
  RAISE NOTICE 'PASSED: member reads folders, Library items + flags, adoptions, signals';
END $$;
RESET ROLE;

-- ── Stranger cannot READ any of them ────────────────────────────────────────
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE folders INT; assets INT; adoptions INT; signals INT;
BEGIN
  SELECT count(*) INTO folders   FROM public.brand_folders;
  SELECT count(*) INTO assets    FROM public.assets;
  SELECT count(*) INTO adoptions FROM public.brand_kit_adoptions;
  SELECT count(*) INTO signals   FROM public.brand_context_signals;

  IF folders   > 0 THEN RAISE EXCEPTION 'FAILED: cross-tenant leak — stranger read brand_folders'; END IF;
  IF assets    > 0 THEN RAISE EXCEPTION 'FAILED: cross-tenant leak — stranger read Library items'; END IF;
  IF adoptions > 0 THEN RAISE EXCEPTION 'FAILED: cross-tenant leak — stranger read kit adoptions'; END IF;
  IF signals   > 0 THEN RAISE EXCEPTION 'FAILED: cross-tenant leak — stranger read context signals'; END IF;
  RAISE NOTICE 'PASSED: stranger reads nothing from any new surface';
END $$;
RESET ROLE;

-- ── Stranger cannot WRITE any of them ───────────────────────────────────────
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222');
DO $$
DECLARE denied INT := 0; affected INT;
BEGIN
  BEGIN
    INSERT INTO public.brand_folders (brand_id, name)
      VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Intruder');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN denied := denied + 1;
  END;

  BEGIN
    INSERT INTO public.brand_kit_adoptions (brand_id, target_kind, target_ref, adopted_by)
      VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'library_item',
              'a5e70000-0000-0000-0000-000000000001',
              '22222222-2222-2222-2222-222222222222');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN denied := denied + 1;
  END;

  BEGIN
    INSERT INTO public.brand_context_signals (brand_id, kind, source)
      VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'favorite', 'user-action');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN denied := denied + 1;
  END;

  IF denied <> 3 THEN
    RAISE EXCEPTION 'FAILED: stranger INSERT was not denied on all three tables (denied=%)', denied;
  END IF;

  -- Updates must silently affect zero rows (RLS filters the row out).
  UPDATE public.assets SET is_favorite = false
    WHERE id = 'a5e70000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 0 THEN
    RAISE EXCEPTION 'FAILED: stranger modified another brand''s Library item flags';
  END IF;

  RAISE NOTICE 'PASSED: stranger denied INSERT on all three tables and cannot flag Library items';
END $$;
RESET ROLE;

-- ── A member cannot attribute an adoption to ANOTHER user ───────────────────
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE spoofed BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.brand_kit_adoptions (brand_id, target_kind, target_ref, adopted_by)
      VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'kit_deliverable',
              'stationery::Business Card', '22222222-2222-2222-2222-222222222222');
    spoofed := true;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    spoofed := false;
  END;

  IF spoofed THEN
    RAISE EXCEPTION 'FAILED: adoption was attributed to a different user (self-attribution not enforced)';
  END IF;
  RAISE NOTICE 'PASSED: adoption self-attribution enforced (adopted_by must equal auth.uid())';
END $$;
RESET ROLE;

-- ── Favourite/dislike exclusivity is enforced for new writes ────────────────
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111');
DO $$
DECLARE violated BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.assets SET is_favorite = true, is_disliked = true
      WHERE id = 'a5e70000-0000-0000-0000-000000000001';
    violated := true;
  EXCEPTION WHEN check_violation THEN violated := false;
  END;

  IF violated THEN
    RAISE EXCEPTION 'FAILED: an item was both favourited and disliked';
  END IF;
  RAISE NOTICE 'PASSED: favourite/dislike mutual exclusion enforced on write';
END $$;
RESET ROLE;

-- ── Cross-brand folder references are impossible (CodeRabbit #11) ───────────
-- RLS governs which rows you may READ. It does not constrain which id you may
-- WRITE into a foreign key, so folder references need composite FKs.
INSERT INTO public.brands (id, user_id, workspace_id, name, slug, primary_color) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Brand A2', 'brand-a2-017', '#222222');

DO $$
DECLARE parent_blocked BOOLEAN := false; asset_blocked BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.brand_folders (brand_id, name, parent_id)
      VALUES ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'stolen',
              'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0');
  EXCEPTION WHEN foreign_key_violation THEN parent_blocked := true;
  END;

  BEGIN
    INSERT INTO public.assets (brand_id, name, type, category, url, folder_id)
      VALUES ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'x', 'image', 'photo', 'u',
              'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0');
  EXCEPTION WHEN foreign_key_violation THEN asset_blocked := true;
  END;

  IF NOT parent_blocked THEN
    RAISE EXCEPTION 'FAILED: a folder was parented under another brand''s folder';
  END IF;
  IF NOT asset_blocked THEN
    RAISE EXCEPTION 'FAILED: an asset was filed into another brand''s folder';
  END IF;
  RAISE NOTICE 'PASSED: folder references cannot cross a brand boundary';
END $$;

-- ── Adoptions are immutable (CodeRabbit #12) ────────────────────────────────
DO $$
DECLARE update_policies INT;
BEGIN
  SELECT count(*) INTO update_policies
    FROM pg_policies
   WHERE tablename = 'brand_kit_adoptions' AND cmd = 'UPDATE';

  IF update_policies > 0 THEN
    RAISE EXCEPTION 'FAILED: an UPDATE policy exists on brand_kit_adoptions — adopted_by could be rewritten';
  END IF;
  RAISE NOTICE 'PASSED: adoptions are immutable (no UPDATE policy; adopted_by cannot be reattributed)';
END $$;

-- ── The demo-brand blanket grants are gone (CodeRabbit #6) ──────────────────
DO $$
DECLARE demo_policies INT;
BEGIN
  SELECT count(*) INTO demo_policies
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'brands' AND policyname ILIKE '%demo%';

  IF demo_policies > 0 THEN
    RAISE EXCEPTION 'FAILED: % demo-brand policy/policies still grant blanket access', demo_policies;
  END IF;
  RAISE NOTICE 'PASSED: no demo-brand blanket grants on public.brands';
END $$;

DO $$ BEGIN RAISE NOTICE '✓ ALL 017 RLS ASSERTIONS PASSED'; END $$;

ROLLBACK;
