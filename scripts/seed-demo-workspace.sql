-- ============================================================================
-- A demo agency, for looking at the access model with your own eyes.
--
-- LOCAL ONLY. It writes to auth.users with a known password and must never be pointed at
-- a real project. `npm run seed:demo` refuses anything but 127.0.0.1.
--
-- It exists because this data was first built ad hoc, in a psql session, and a
-- `supabase db reset` took it with it. The shapes below are the ones worth being able to
-- see, so they are worth being able to recreate:
--
--   alice@demo.test   Owner                                     everything
--   emma@demo.test    Member · all brands · Editor              the ordinary teammate
--   dana@demo.test    Member · 2 of 3 brands · Designer         AI OFF across the
--                     · AI granted back on Client B             workspace, excepted on one
--                                                               brand — the precedence rule
--   grace@demo.test   Guest · 1 brand · Viewer + exports        the outside collaborator
--
-- Password for all four: demo12345
-- Idempotent: re-running replaces the demo workspace and leaves everything else alone.
-- ============================================================================
BEGIN;

-- ── clear any previous run ──────────────────────────────────────────────────
DELETE FROM public.workspaces WHERE slug = 'kaafex';
DELETE FROM auth.users WHERE email IN
  ('alice@demo.test','emma@demo.test','dana@demo.test','grace@demo.test');

-- ── people ──────────────────────────────────────────────────────────────────
-- The signup trigger gives each of them a personal workspace; that is deliberate, it is
-- the state a real user is in, and it is why the app opens on the personal workspace.
CREATE OR REPLACE FUNCTION pg_temp.mkuser(_id uuid, _email text, _name text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    _id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    _email, extensions.crypt('demo12345', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', _name), now(), now());
  UPDATE public.profiles SET full_name = _name, email = _email WHERE id = _id;
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (_id, _email, _name) ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
END; $$;

DO $$
DECLARE
  alice uuid := 'd0000000-0000-4000-a000-0000000000a1';
  emma  uuid := 'd0000000-0000-4000-a000-0000000000e1';
  dana  uuid := 'd0000000-0000-4000-a000-0000000000da';
  grace uuid := 'd0000000-0000-4000-a000-0000000000c4';
  ws    uuid := 'd0000000-0000-4000-b000-000000000751';
  b_a   uuid := 'd0000000-0000-4000-c000-0000000000a1';
  b_b   uuid := 'd0000000-0000-4000-c000-0000000000b1';
  b_c   uuid := 'd0000000-0000-4000-c000-0000000000c1';
BEGIN
  PERFORM pg_temp.mkuser(alice, 'alice@demo.test', 'Alice Hamza');
  PERFORM pg_temp.mkuser(emma,  'emma@demo.test',  'Emma Said');
  PERFORM pg_temp.mkuser(dana,  'dana@demo.test',  'Dana Ortiz');
  PERFORM pg_temp.mkuser(grace, 'grace@demo.test', 'Grace Lee');

  -- ── the agency ────────────────────────────────────────────────────────────
  INSERT INTO public.workspaces (id, name, slug, owner_id, is_personal)
  VALUES (ws, 'Kaafex', 'kaafex', alice, false);

  -- An agency plan, so the seat counts on the People screen are the interesting ones
  -- (25 seats + 50 guest seats) rather than free's.
  -- stripe ids are NOT NULL; a demo row carries obvious placeholders rather than
  -- anything that could be mistaken for a real customer.
  INSERT INTO public.subscriptions (workspace_id, plan, status, stripe_customer_id, stripe_subscription_id)
  VALUES (ws, 'agency', 'active', 'cus_demo_kaafex', 'sub_demo_kaafex');

  INSERT INTO public.credit_accounts (workspace_id, balance_credits, lifetime_granted)
  VALUES (ws, 5000, 5000)
  ON CONFLICT (workspace_id) DO UPDATE SET balance_credits = 5000;

  -- owner/admin carry a NULL default_brand_role: they are managers of every brand by
  -- ROLE, and workspace_members_role_mode_check enforces it.
  INSERT INTO public.workspace_members
    (workspace_id, user_id, role, status, brand_access_mode, default_brand_role, capability_overrides)
  VALUES
    (ws, alice, 'owner',  'active', 'all',      NULL,       '{}'::jsonb),
    (ws, emma,  'member', 'active', 'all',      'editor',   '{}'::jsonb),
    -- Dana: AI off everywhere. The exception below is what makes her row interesting.
    (ws, dana,  'member', 'active', 'selected', 'designer',
       '{"grant":["designs.export","brand.kit.export"],"deny":["ai.generate"]}'::jsonb),
    -- Grace: a guest who may nonetheless download what she reviews.
    (ws, grace, 'guest',  'active', 'selected', 'viewer',
       '{"grant":["designs.export","brand.kit.export"],"deny":["ai.generate"]}'::jsonb);

  INSERT INTO public.brands (id, name, slug, workspace_id, user_id, primary_color)
  VALUES (b_a, 'Client A', 'client-a', ws, alice, '#2F6FED'),
         (b_b, 'Client B', 'client-b', ws, alice, '#C2410C'),
         (b_c, 'Client C', 'client-c', ws, alice, '#15803D');

  -- ── the grants ────────────────────────────────────────────────────────────
  INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides)
  VALUES
    (ws, b_a, dana,  'designer', '{"grant":[],"deny":[]}'::jsonb),
    -- THE exception: AI is denied for Dana across the workspace and granted back here.
    -- A per-brand grant beats a workspace-wide deny (03 §3), and this row is the one that
    -- makes the People list say "AI on 1 of 2" rather than a flat "no AI".
    (ws, b_b, dana,  'designer', '{"grant":["ai.generate"],"deny":[]}'::jsonb),
    (ws, b_a, grace, 'viewer',   '{"grant":[],"deny":[]}'::jsonb);

  RAISE NOTICE 'demo seeded — kaafex: 3 brands, 4 people. password: demo12345';
END $$;

COMMIT;
