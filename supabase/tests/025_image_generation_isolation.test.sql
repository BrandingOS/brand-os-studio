-- ============================================================================
-- RLS + money verification for migration 025 — image generation v2.
--
-- Self-asserting; RAISEs on the wrong outcome; wrapped in BEGIN … ROLLBACK (no
-- writes persist). Requires migrations 001..025 applied:
--   supabase db reset
--   psql "$LOCAL_DB_URL" -f supabase/tests/025_image_generation_isolation.test.sql
--
-- Requires 026 as well (can_view_brand / can_edit_brand).
--
-- What this proves:
--   A. a brand member sees their own projects and jobs, and NOT another
--      account's — the whole feature is scoped by brand membership;
--   B. the private diagnostics table is unreadable by any client role, so a
--      provider's raw error (org ids, billing text) cannot leak through the DB
--      even though the job row itself is readable;
--   C. a user cannot write their own credit balance or forge a ledger entry —
--      the only paths are the SECURITY DEFINER functions, and EXECUTE on them
--      is revoked from authenticated;
--   D. reserve → settle → refund arithmetic is correct and ATOMIC: a
--      reservation larger than the balance is refused outright rather than
--      overdrawing, and settling for less than reserved returns the difference;
--   E. reserve and settle are IDEMPOTENT — replaying the same key does not
--      double-charge, which is what makes a retried request safe.
--
-- Principals:
--   USER_A 11111111-… owns workspace WS_A and brand BRAND_A
--   USER_B 22222222-… owns workspace WS_B and brand BRAND_B (unrelated)
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

-- ── Fixtures ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  user_a UUID := '11111111-1111-1111-1111-111111111111';
  user_b UUID := '22222222-2222-2222-2222-222222222222';
  ws_a UUID; ws_b UUID; brand_a UUID; brand_b UUID;
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
                          aud, role)
  VALUES
    (user_a, 'a025@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'),
    (user_b, 'b025@test.local', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES ('WS A 025', 'ws-a-025', user_a) RETURNING id INTO ws_a;
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES ('WS B 025', 'ws-b-025', user_b) RETURNING id INTO ws_b;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_a, user_a, 'owner'), (ws_b, user_b, 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.brands (name, user_id, workspace_id)
  VALUES ('Brand A 025', user_a, ws_a) RETURNING id INTO brand_a;
  INSERT INTO public.brands (name, user_id, workspace_id)
  VALUES ('Brand B 025', user_b, ws_b) RETURNING id INTO brand_b;

  INSERT INTO public.image_projects (id, brand_id, workspace_id, user_id, title)
  VALUES ('aaaaaaaa-0000-4000-8000-000000000001', brand_a, ws_a, user_a, 'A project'),
         ('bbbbbbbb-0000-4000-8000-000000000002', brand_b, ws_b, user_b, 'B project');

  INSERT INTO public.image_generation_jobs
    (id, workspace_id, brand_id, user_id, project_id, status, provider, model, user_prompt, estimated_credits)
  VALUES
    ('aaaaaaaa-0000-4000-8000-00000000000a', ws_a, brand_a, user_a,
     'aaaaaaaa-0000-4000-8000-000000000001', 'succeeded', 'google', 'google:nano-banana', 'A prompt', 14),
    ('bbbbbbbb-0000-4000-8000-00000000000b', ws_b, brand_b, user_b,
     'bbbbbbbb-0000-4000-8000-000000000002', 'succeeded', 'google', 'google:nano-banana', 'B prompt', 14);

  INSERT INTO public.image_generation_job_diagnostics (job_id, provider_status, provider_error)
  VALUES ('aaaaaaaa-0000-4000-8000-00000000000a', 429,
          'openai 429: {"error":{"type":"insufficient_quota","message":"org-SECRET123 over limit"}}');

  PERFORM set_config('test025.ws_a', ws_a::text, true);
  PERFORM set_config('test025.ws_b', ws_b::text, true);
  PERFORM set_config('test025.brand_a', brand_a::text, true);
END $$;

-- ── A. Tenant isolation on projects and jobs ────────────────────────────────

DO $$
DECLARE n INT;
BEGIN
  PERFORM pg_temp.act_as('11111111-1111-1111-1111-111111111111');

  SELECT count(*) INTO n FROM public.image_projects;
  IF n <> 1 THEN RAISE EXCEPTION 'A1: user A should see exactly their own project, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.image_generation_jobs;
  IF n <> 1 THEN RAISE EXCEPTION 'A2: user A should see exactly their own job, saw %', n; END IF;

  SELECT count(*) INTO n FROM public.image_projects
   WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002';
  IF n <> 0 THEN RAISE EXCEPTION 'A3: user A can read another account''s project'; END IF;

  SELECT count(*) INTO n FROM public.image_generation_jobs
   WHERE id = 'bbbbbbbb-0000-4000-8000-00000000000b';
  IF n <> 0 THEN RAISE EXCEPTION 'A4: user A can read another account''s job'; END IF;

  PERFORM pg_temp.back_to_super();
END $$;

-- A client may never invent a job: only the Edge Function (service role) writes.
DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  PERFORM pg_temp.act_as('11111111-1111-1111-1111-111111111111');
  BEGIN
    INSERT INTO public.image_generation_jobs
      (workspace_id, brand_id, user_id, status, provider, model, user_prompt, charged_credits)
    VALUES (current_setting('test025.ws_a')::uuid, current_setting('test025.brand_a')::uuid,
            '11111111-1111-1111-1111-111111111111', 'succeeded', 'google', 'x', 'forged', 0);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'A5: a client could INSERT a generation job'; END IF;
  PERFORM pg_temp.back_to_super();
END $$;

-- ── A2. A directly-owned brand (no workspace) is still the owner's ──────────
-- This is the case that failed in QA: `is_brand_member` only knows the
-- workspace path, so the owner of a legacy brand was locked out of their own
-- projects. `can_edit_brand` (026) mirrors how `brands` itself is scoped.

DO $$
DECLARE
  user_a UUID := '11111111-1111-1111-1111-111111111111';
  user_b UUID := '22222222-2222-2222-2222-222222222222';
  legacy_brand UUID;
  n INT;
BEGIN
  INSERT INTO public.brands (name, user_id, workspace_id)
  VALUES ('Legacy Brand 025', user_a, NULL) RETURNING id INTO legacy_brand;
  PERFORM set_config('test025.legacy_brand', legacy_brand::text, true);

  PERFORM pg_temp.act_as(user_a);
  INSERT INTO public.image_projects (brand_id, user_id, title)
  VALUES (legacy_brand, user_a, 'legacy project');
  SELECT count(*) INTO n FROM public.image_projects WHERE brand_id = legacy_brand;
  IF n <> 1 THEN
    RAISE EXCEPTION 'A6: the owner of a workspace-less brand cannot create a project';
  END IF;
  PERFORM pg_temp.back_to_super();

  -- …and it is still nobody else's.
  PERFORM pg_temp.act_as(user_b);
  SELECT count(*) INTO n FROM public.image_projects WHERE brand_id = legacy_brand;
  IF n <> 0 THEN RAISE EXCEPTION 'A7: another account can read a legacy brand''s project'; END IF;

  BEGIN
    INSERT INTO public.image_projects (brand_id, user_id, title)
    VALUES (legacy_brand, user_b, 'intruder');
    RAISE EXCEPTION 'A8: another account could create a project on a legacy brand';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM pg_temp.back_to_super();
END $$;

-- ── B. Provider diagnostics are invisible to clients ────────────────────────

DO $$
DECLARE n INT;
BEGIN
  PERFORM pg_temp.act_as('11111111-1111-1111-1111-111111111111');
  SELECT count(*) INTO n FROM public.image_generation_job_diagnostics;
  IF n <> 0 THEN
    RAISE EXCEPTION 'B1: provider diagnostics are readable by a client (% rows)', n;
  END IF;
  PERFORM pg_temp.back_to_super();
END $$;

-- ── C. A user cannot move their own balance ─────────────────────────────────

DO $$
DECLARE ok BOOLEAN := false; n INT;
BEGIN
  PERFORM pg_temp.act_as('11111111-1111-1111-1111-111111111111');

  -- Readable…
  SELECT count(*) INTO n FROM public.credit_accounts
   WHERE workspace_id = current_setting('test025.ws_a')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'C1: a member cannot read their own credit account'; END IF;

  -- …but not writable.
  BEGIN
    UPDATE public.credit_accounts SET balance_credits = 999999
     WHERE workspace_id = current_setting('test025.ws_a')::uuid;
    IF FOUND THEN ok := false; ELSE ok := true; END IF;
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'C2: a user could UPDATE their own credit balance'; END IF;

  -- Nor can they post a ledger entry.
  ok := false;
  BEGIN
    INSERT INTO public.credit_ledger (workspace_id, kind, amount, balance_after)
    VALUES (current_setting('test025.ws_a')::uuid, 'grant', 100000, 100000);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'C3: a user could forge a credit ledger entry'; END IF;

  -- Nor call the money functions directly (EXECUTE is revoked).
  ok := false;
  BEGIN
    PERFORM public.grant_credits(current_setting('test025.ws_a')::uuid, 100000, 'self-serve');
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'C4: a user could call grant_credits directly'; END IF;

  PERFORM pg_temp.back_to_super();
END $$;

-- ── D. Reserve / settle / release arithmetic, and the overdraw guard ────────

DO $$
DECLARE
  ws UUID := current_setting('test025.ws_a')::uuid;
  job UUID := 'aaaaaaaa-0000-4000-8000-00000000000a';
  res JSONB; acct public.credit_accounts;
  start_balance BIGINT;
BEGIN
  SELECT balance_credits INTO start_balance FROM public.credit_accounts WHERE workspace_id = ws;
  IF start_balance <> public.default_credit_grant() THEN
    RAISE EXCEPTION 'D0: a new workspace should be granted % credits, has %',
      public.default_credit_grant(), start_balance;
  END IF;

  -- Reserve 14: leaves the spendable balance, enters `reserved`.
  res := public.reserve_credits(ws, job, 14, 'reserve:test-1');
  IF NOT (res->>'ok')::boolean THEN RAISE EXCEPTION 'D1: reserve failed: %', res; END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = ws;
  IF acct.balance_credits <> start_balance - 14 OR acct.reserved_credits <> 14 THEN
    RAISE EXCEPTION 'D2: after reserve expected %/14, got %/%',
      start_balance - 14, acct.balance_credits, acct.reserved_credits;
  END IF;

  -- Settle for less than reserved (fewer images came back): refund the rest.
  res := public.settle_credits(ws, job, 14, 8, 'settle:test-1');
  IF (res->>'charged')::bigint <> 8 OR (res->>'refunded')::bigint <> 6 THEN
    RAISE EXCEPTION 'D3: expected charged 8 / refunded 6, got %', res;
  END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = ws;
  IF acct.balance_credits <> start_balance - 8 OR acct.reserved_credits <> 0 THEN
    RAISE EXCEPTION 'D4: after settle expected %/0, got %/%',
      start_balance - 8, acct.balance_credits, acct.reserved_credits;
  END IF;
  IF acct.lifetime_spent <> 8 THEN
    RAISE EXCEPTION 'D5: lifetime_spent should be 8, is %', acct.lifetime_spent;
  END IF;

  -- A failed job returns the whole reservation: failure costs nothing.
  res := public.reserve_credits(ws, job, 20, 'reserve:test-2');
  res := public.release_credits(ws, job, 20, 'job failed', 'release:test-2');
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = ws;
  IF acct.balance_credits <> start_balance - 8 OR acct.reserved_credits <> 0 THEN
    RAISE EXCEPTION 'D6: release did not restore the balance (got %/%)',
      acct.balance_credits, acct.reserved_credits;
  END IF;

  -- Overdraw is refused rather than allowed to go negative.
  res := public.reserve_credits(ws, job, start_balance * 10, 'reserve:test-overdraw');
  IF (res->>'ok')::boolean THEN RAISE EXCEPTION 'D7: an unaffordable reservation succeeded'; END IF;
  IF res->>'error' <> 'insufficient_credits' THEN
    RAISE EXCEPTION 'D8: expected insufficient_credits, got %', res;
  END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = ws;
  IF acct.balance_credits < 0 THEN RAISE EXCEPTION 'D9: balance went negative'; END IF;
END $$;

-- ── E. Idempotency — a replayed request never charges twice ─────────────────

DO $$
DECLARE
  ws UUID := current_setting('test025.ws_a')::uuid;
  job UUID := 'aaaaaaaa-0000-4000-8000-00000000000a';
  res JSONB; before_balance BIGINT; after_balance BIGINT;
BEGIN
  SELECT balance_credits INTO before_balance FROM public.credit_accounts WHERE workspace_id = ws;

  res := public.reserve_credits(ws, job, 25, 'reserve:idem');
  IF NOT (res->>'ok')::boolean THEN RAISE EXCEPTION 'E1: first reserve failed'; END IF;

  -- Same key again: reported ok, marked duplicate, balance untouched.
  res := public.reserve_credits(ws, job, 25, 'reserve:idem');
  IF NOT (res->>'duplicate')::boolean THEN RAISE EXCEPTION 'E2: replay was not detected'; END IF;

  SELECT balance_credits INTO after_balance FROM public.credit_accounts WHERE workspace_id = ws;
  IF after_balance <> before_balance - 25 THEN
    RAISE EXCEPTION 'E3: a replayed reservation charged twice (% → %)', before_balance, after_balance;
  END IF;

  -- Settling twice is likewise a no-op the second time.
  res := public.settle_credits(ws, job, 25, 25, 'settle:idem');
  res := public.settle_credits(ws, job, 25, 25, 'settle:idem');
  IF NOT (res->>'duplicate')::boolean THEN RAISE EXCEPTION 'E4: a replayed settle was applied'; END IF;

  SELECT balance_credits INTO after_balance FROM public.credit_accounts WHERE workspace_id = ws;
  IF after_balance <> before_balance - 25 THEN
    RAISE EXCEPTION 'E5: replayed settle moved the balance (% → %)', before_balance, after_balance;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '025 image generation isolation + credit tests: PASS'; END $$;

ROLLBACK;
