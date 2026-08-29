-- ============================================================================
-- Shared access fixture (docs/access-architecture/09-test-plan.md §2).
-- Concatenated by scripts/db-test.mjs in front of any test whose first line is
--   -- fixture: access
-- Deterministic ids: users 1111…000N, workspaces aaaa…000N, brands bbbb…000N.
-- Inserted as superuser inside the test's own transaction; rolled back with it.
-- ============================================================================

-- users (auth.users rows so FKs and the orphan rule behave)
INSERT INTO auth.users (id, email, instance_id, aud, role, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
VALUES
  ('11111111-0000-0000-0000-000000000001','alice@kaafex.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000002','adam@kaafex.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000003','emma@kaafex.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000004','dana@kaafex.test',  '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000005','victor@kaafex.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000006','grace@external.test','00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000007','sam@kaafex.test',   '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000008','bob@bobco.test',    '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now()),
  ('11111111-0000-0000-0000-000000000009','rita@removed.test', '00000000-0000-0000-0000-000000000000','authenticated','authenticated',now(),now(),'{}','{}',now())
ON CONFLICT (id) DO NOTHING;

-- the signup trigger made a personal workspace per user; keep them (they are real)
-- but make sure the ones we reason about are ours:
DELETE FROM public.workspaces WHERE slug IN ('kaafex-fx','bobco-fx');

INSERT INTO public.workspaces (id, name, slug, owner_id, is_personal) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','Kaafex','kaafex-fx','11111111-0000-0000-0000-000000000001', false),
  ('aaaaaaaa-0000-0000-0000-000000000002','Bob Co','bobco-fx', '11111111-0000-0000-0000-000000000008', false);

-- memberships
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode, default_brand_role, capability_overrides) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','owner', 'active','all',      NULL,      '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','admin', 'active','all',      NULL,      '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003','member','active','all',      'editor',  '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','member','active','selected', 'designer','{}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005','member','active','all',      'viewer',  '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000006','guest', 'active','selected', 'viewer',  '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000007','member','suspended','all',   'editor',  '{}'),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000008','owner', 'active','all',      NULL,      '{}');

-- plans: A is an agency, B is free (docs/access-architecture/09 §2). Without these both
-- would fall back to `free`, whose single seat the fixture's own cast already exceeds.
INSERT INTO public.subscriptions (workspace_id, stripe_customer_id, plan, status) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','cus_fixture_a','agency','active'),
  ('aaaaaaaa-0000-0000-0000-000000000002','cus_fixture_b','free','active')
ON CONFLICT (workspace_id) DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status;

-- brands (A3 archived)
INSERT INTO public.brands (id, user_id, workspace_id, name, primary_color, slug, archived_at) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','A1','#111111','a1-fx', NULL),
  ('bbbbbbbb-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','A2','#222222','a2-fx', NULL),
  ('bbbbbbbb-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','A3','#333333','a3-fx', now()),
  ('bbbbbbbb-0000-0000-0000-000000000011','11111111-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000002','B1','#444444','b1-fx', NULL);

-- brand grants (inserted directly as superuser; validation triggers still run)
INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides, granted_by) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004','designer','{}','11111111-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','designer','{"deny":["ai.generate"]}','11111111-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000006','viewer',  '{"grant":["designs.export"]}','11111111-0000-0000-0000-000000000001');

-- a design each on A1 (by emma) and B1 (by bob), and an asset on A1
INSERT INTO public.designs (brand_id, id, user_id, data, name) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001','design-a1-emma','11111111-0000-0000-0000-000000000003','{}','Emma A1'),
  ('bbbbbbbb-0000-0000-0000-000000000001','design-a1-dana','11111111-0000-0000-0000-000000000004','{}','Dana A1'),
  ('bbbbbbbb-0000-0000-0000-000000000011','design-b1-bob', '11111111-0000-0000-0000-000000000008','{}','Bob B1');
INSERT INTO public.assets (id, brand_id, name, type, category, url, uploaded_by) VALUES
  ('dddddddd-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','logo.png','image','logo','x','11111111-0000-0000-0000-000000000001'),
  ('dddddddd-0000-0000-0000-000000000011','bbbbbbbb-0000-0000-0000-000000000011','b1.png','image','logo','x','11111111-0000-0000-0000-000000000008');

-- helpers every access test uses
CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END; $$;
CREATE OR REPLACE FUNCTION pg_temp.back_to_super() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);
END; $$;
CREATE OR REPLACE FUNCTION pg_temp.uid(_who text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _who
    WHEN 'alice' THEN '11111111-0000-0000-0000-000000000001'::uuid
    WHEN 'adam'  THEN '11111111-0000-0000-0000-000000000002'
    WHEN 'emma'  THEN '11111111-0000-0000-0000-000000000003'
    WHEN 'dana'  THEN '11111111-0000-0000-0000-000000000004'
    WHEN 'victor' THEN '11111111-0000-0000-0000-000000000005'
    WHEN 'grace' THEN '11111111-0000-0000-0000-000000000006'
    WHEN 'sam'   THEN '11111111-0000-0000-0000-000000000007'
    WHEN 'bob'   THEN '11111111-0000-0000-0000-000000000008'
    WHEN 'rita'  THEN '11111111-0000-0000-0000-000000000009'
  END $$;
CREATE OR REPLACE FUNCTION pg_temp.ws(_which text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _which WHEN 'A' THEN 'aaaaaaaa-0000-0000-0000-000000000001'::uuid WHEN 'B' THEN 'aaaaaaaa-0000-0000-0000-000000000002' END $$;
CREATE OR REPLACE FUNCTION pg_temp.brand(_which text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _which WHEN 'A1' THEN 'bbbbbbbb-0000-0000-0000-000000000001'::uuid WHEN 'A2' THEN 'bbbbbbbb-0000-0000-0000-000000000002'
                     WHEN 'A3' THEN 'bbbbbbbb-0000-0000-0000-000000000003' WHEN 'B1' THEN 'bbbbbbbb-0000-0000-0000-000000000011' END $$;
