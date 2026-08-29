-- ============================================================================
-- 037 — validate and tighten. Self-asserting; BEGIN … ROLLBACK.
-- ============================================================================
BEGIN;
INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES ('11111111-0000-0000-0000-000000000037','u1-037@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), '{}', '{}'),
       ('22222222-0000-0000-0000-000000000037','u2-037@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated', now(), now(), '{}', '{}')
ON CONFLICT (id) DO NOTHING;
DELETE FROM public.workspaces WHERE owner_id IN ('11111111-0000-0000-0000-000000000037','22222222-0000-0000-0000-000000000037');
INSERT INTO public.workspaces (id,name,slug,owner_id,is_personal) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000037','W1','w1-037','11111111-0000-0000-0000-000000000037', true),
  ('bbbbbbbb-0000-0000-0000-000000000037','W2','w2-037','22222222-0000-0000-0000-000000000037', true);
INSERT INTO public.workspace_members (workspace_id,user_id,role,role_v2) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000037','11111111-0000-0000-0000-000000000037','owner','owner'),
  ('aaaaaaaa-0000-0000-0000-000000000037','22222222-0000-0000-0000-000000000037','editor','member'),
  ('bbbbbbbb-0000-0000-0000-000000000037','22222222-0000-0000-0000-000000000037','owner','owner');
INSERT INTO public.brands (id,user_id,name,primary_color,slug,workspace_id) VALUES
  ('cccccccc-0000-0000-0000-000000000037','11111111-0000-0000-0000-000000000037','B1','#000000','b1-037','aaaaaaaa-0000-0000-0000-000000000037');

DO $$
DECLARE ok bool;
BEGIN
  -- brands.workspace_id is NOT NULL
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='brands' AND column_name='workspace_id') <> 'NO'
    THEN RAISE EXCEPTION '037: brands.workspace_id still nullable'; END IF;

  -- a child row cannot claim a workspace other than its brand's
  ok := false;
  BEGIN
    INSERT INTO public.assets (brand_id, workspace_id, name, type, category, url)
    VALUES ('cccccccc-0000-0000-0000-000000000037','bbbbbbbb-0000-0000-0000-000000000037','a','image','logo','x');
  EXCEPTION WHEN foreign_key_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION '037: asset with a foreign workspace_id was accepted'; END IF;

  -- and with the right one it works
  INSERT INTO public.assets (id, brand_id, workspace_id, name, type, category, url)
  VALUES ('dddddddd-0000-0000-0000-000000000037','cccccccc-0000-0000-0000-000000000037','aaaaaaaa-0000-0000-0000-000000000037','a','image','logo','x');

  -- brand_access: cross-tenant grant is unrepresentable
  ok := false;
  BEGIN
    INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000037','cccccccc-0000-0000-0000-000000000037','22222222-0000-0000-0000-000000000037','editor');
  -- either guard may speak first: the composite FK, or the implicit-manager trigger
  -- (user 2222 owns workspace B). Both mean "refused", which is what this asserts.
  EXCEPTION WHEN foreign_key_violation OR check_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION '037: brand_access with a foreign workspace_id was accepted'; END IF;

  -- a grant for a non-member is unrepresentable
  ok := false;
  BEGIN
    INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000037','cccccccc-0000-0000-0000-000000000037','99999999-0000-0000-0000-000000000037','editor');
  EXCEPTION WHEN foreign_key_violation THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION '037: brand_access for a non-member was accepted'; END IF;

  -- a real grant works, and removing the membership cascades it
  INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000037','cccccccc-0000-0000-0000-000000000037','22222222-0000-0000-0000-000000000037','editor');
  DELETE FROM public.workspace_members WHERE workspace_id='aaaaaaaa-0000-0000-0000-000000000037' AND user_id='22222222-0000-0000-0000-000000000037';
  IF EXISTS (SELECT 1 FROM public.brand_access WHERE brand_id='cccccccc-0000-0000-0000-000000000037' AND user_id='22222222-0000-0000-0000-000000000037')
    THEN RAISE EXCEPTION '037: brand_access did not cascade on membership removal'; END IF;

  -- deleting a brand cascades through the composite FK
  DELETE FROM public.brands WHERE id='cccccccc-0000-0000-0000-000000000037';
  IF EXISTS (SELECT 1 FROM public.assets WHERE id='dddddddd-0000-0000-0000-000000000037') THEN RAISE EXCEPTION '037: asset survived its brand'; END IF;

  IF to_regclass('public.brand_members') IS NOT NULL THEN RAISE EXCEPTION '037: brand_members still exists'; END IF;
  IF to_regclass('public.brand_members_legacy') IS NULL THEN RAISE EXCEPTION '037: brand_members_legacy view missing'; END IF;

  -- the four NOT VALID constraints are now validated
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('assets_origin_check','assets_fav_dislike_exclusive','assets_folder_fk','designs_folder_fk') AND NOT convalidated)
    THEN RAISE EXCEPTION '037: a 017/032 constraint is still NOT VALID'; END IF;

  RAISE NOTICE '✓ ALL 037 ASSERTIONS PASSED';
END $$;
ROLLBACK;
