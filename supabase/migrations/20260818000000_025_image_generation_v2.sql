-- ════════════════════════════════════════════════════════════════════════════
-- 025 — Image Generation v2: projects, jobs, usage metering, credit ledger
-- ════════════════════════════════════════════════════════════════════════════
--
-- Additive only. Nothing existing is dropped or altered destructively.
--
-- What this adds
--   image_projects                    a generation project (the thing at
--                                     /b/:brand/design/:projectId)
--   image_generation_jobs             one row per generation request; the
--                                     durable record of prompt, settings,
--                                     provider, outputs, usage, cost, credits
--   image_generation_job_diagnostics  private provider error/detail; closed to
--                                     every client role (same posture as
--                                     ai_rate_limits)
--   credit_accounts                   one balance per workspace
--   credit_ledger                     append-only; every credit movement
--
-- Money rules encoded here
--   • 1 credit = USD 0.01. Costs round UP to whole credits.
--   • A generation RESERVES estimated credits before the provider is called,
--     then SETTLES against the real/calculated cost and refunds the rest.
--   • Balance can only move through the SECURITY DEFINER functions below, and
--     EXECUTE on those is revoked from anon/authenticated — a user can never
--     write their own balance, only read it.
--   • Every mutation is one atomic UPDATE guarded by a CHECK, so concurrent
--     requests cannot overdraw (no read-then-write race).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Enums ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.generation_job_status AS ENUM (
    'queued', 'running', 'succeeded', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.credit_entry_kind AS ENUM (
    'grant',    -- credits added (signup, top-up, admin)
    'reserve',  -- held for an in-flight job (balance -> reserved)
    'settle',   -- job finished; actual cost consumed from the reservation
    'refund',   -- unused part of a reservation returned
    'release',  -- whole reservation returned (failure / cancellation)
    'adjust'    -- manual correction
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Projects ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.image_projects (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  workspace_id  UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Title is MUTABLE (rename); id is immutable and is the URL segment.
  title         TEXT        NOT NULL DEFAULT 'Untitled project',
  -- Last composer state so a project reopens exactly as it was left.
  last_settings JSONB       NOT NULL DEFAULT '{}'::jsonb,
  cover_url     TEXT,
  archived_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_projects_brand_updated_idx
  ON public.image_projects (brand_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS image_projects_workspace_idx
  ON public.image_projects (workspace_id);

ALTER TABLE public.image_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS image_projects_select ON public.image_projects;
CREATE POLICY image_projects_select ON public.image_projects
  FOR SELECT TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));

DROP POLICY IF EXISTS image_projects_insert ON public.image_projects;
CREATE POLICY image_projects_insert ON public.image_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_brand_member(brand_id, 'editor') AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS image_projects_update ON public.image_projects;
CREATE POLICY image_projects_update ON public.image_projects
  FOR UPDATE TO authenticated
  USING (public.is_brand_member(brand_id, 'editor'))
  WITH CHECK (public.is_brand_member(brand_id, 'editor'));

DROP POLICY IF EXISTS image_projects_delete ON public.image_projects;
CREATE POLICY image_projects_delete ON public.image_projects
  FOR DELETE TO authenticated
  USING (public.is_brand_member(brand_id, 'editor'));

DROP TRIGGER IF EXISTS trg_image_projects_updated_at ON public.image_projects;
CREATE TRIGGER trg_image_projects_updated_at
  BEFORE UPDATE ON public.image_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Jobs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.image_generation_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership. All three are recorded so every job is attributable.
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_id          UUID NOT NULL REFERENCES public.brands(id)     ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  project_id        UUID REFERENCES public.image_projects(id)      ON DELETE CASCADE,
  -- Set when the job was fired from inside a layered design instead of a project.
  design_id         TEXT,

  status            public.generation_job_status NOT NULL DEFAULT 'queued',
  -- generate | variation | refine | regenerate
  operation         TEXT NOT NULL DEFAULT 'generate',

  provider          TEXT NOT NULL,
  model             TEXT NOT NULL,

  -- BOTH prompts are kept. compiled_prompt is what the provider saw.
  user_prompt       TEXT NOT NULL,
  compiled_prompt   TEXT,
  negative_prompt   TEXT,

  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- aspect, size, count, seed, quality
  input_assets      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{role, kind, ref}]
  output_assets     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{storagePath, url, width, height, seed}]

  provider_request_id TEXT,
  usage             JSONB,                    -- normalized provider usage
  cost_usd          NUMERIC(12,6),
  -- provider | calculated | estimated
  cost_source       TEXT,
  pricing_version   TEXT,
  pricing_snapshot  JSONB,

  estimated_credits INTEGER NOT NULL DEFAULT 0,
  charged_credits   INTEGER NOT NULL DEFAULT 0,

  latency_ms        INTEGER,
  -- Normalized taxonomy only. Raw provider text goes to the diagnostics table.
  error_code        TEXT,
  error_message     TEXT,

  -- Same key + same workspace = same job. This is what makes a retry safe.
  idempotency_key   TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS image_generation_jobs_idem_idx
  ON public.image_generation_jobs (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS image_generation_jobs_project_idx
  ON public.image_generation_jobs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS image_generation_jobs_brand_idx
  ON public.image_generation_jobs (brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS image_generation_jobs_workspace_idx
  ON public.image_generation_jobs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS image_generation_jobs_active_idx
  ON public.image_generation_jobs (workspace_id, status)
  WHERE status IN ('queued', 'running');

ALTER TABLE public.image_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Read-only for brand members. Every write goes through the Edge Function with
-- the service role, so a client can never forge a job, a cost, or a status.
DROP POLICY IF EXISTS image_generation_jobs_select ON public.image_generation_jobs;
CREATE POLICY image_generation_jobs_select ON public.image_generation_jobs
  FOR SELECT TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));

-- Cancellation is the ONE client-writable transition, and only on your own
-- in-flight job. Everything else stays server-owned.
DROP POLICY IF EXISTS image_generation_jobs_cancel ON public.image_generation_jobs;
CREATE POLICY image_generation_jobs_cancel ON public.image_generation_jobs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status IN ('queued', 'running'))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ─── 4. Private diagnostics ─────────────────────────────────────────────────
-- Raw provider bodies can carry org ids, billing text and quota internals.
-- They are kept for debugging and are unreachable from any client role.

CREATE TABLE IF NOT EXISTS public.image_generation_job_diagnostics (
  job_id          UUID PRIMARY KEY REFERENCES public.image_generation_jobs(id) ON DELETE CASCADE,
  provider_status INTEGER,
  provider_error  TEXT,
  detail          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.image_generation_job_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS image_generation_job_diagnostics_no_client_access
  ON public.image_generation_job_diagnostics;
CREATE POLICY image_generation_job_diagnostics_no_client_access
  ON public.image_generation_job_diagnostics
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ─── 5. Credits ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_accounts (
  workspace_id     UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Spendable now.
  balance_credits  BIGINT NOT NULL DEFAULT 0 CHECK (balance_credits  >= 0),
  -- Held against in-flight jobs.
  reserved_credits BIGINT NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  lifetime_granted BIGINT NOT NULL DEFAULT 0,
  lifetime_spent   BIGINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_accounts_select ON public.credit_accounts;
CREATE POLICY credit_accounts_select ON public.credit_accounts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, 'viewer'));
-- No INSERT/UPDATE/DELETE policy: balances move only through the functions below.

DROP TRIGGER IF EXISTS trg_credit_accounts_updated_at ON public.credit_accounts;
CREATE TRIGGER trg_credit_accounts_updated_at
  BEFORE UPDATE ON public.credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id             BIGSERIAL PRIMARY KEY,
  workspace_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_id         UUID REFERENCES public.image_generation_jobs(id) ON DELETE SET NULL,
  kind           public.credit_entry_kind NOT NULL,
  -- Signed, in credits. Negative = leaves the spendable balance.
  amount         BIGINT NOT NULL,
  balance_after  BIGINT NOT NULL,
  reason         TEXT,
  meta           JSONB,
  -- Guards double-posting of the same logical movement.
  idempotency_key TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_idem_idx
  ON public.credit_ledger (workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS credit_ledger_workspace_idx
  ON public.credit_ledger (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_ledger_job_idx ON public.credit_ledger (job_id);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_ledger_select ON public.credit_ledger;
CREATE POLICY credit_ledger_select ON public.credit_ledger
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, 'viewer'));
-- Append-only from the server; no client write policy at all.

-- ─── 6. Credit functions (the only way a balance moves) ─────────────────────

-- Default signup grant: 500 credits = USD 5.00.
CREATE OR REPLACE FUNCTION public.default_credit_grant()
RETURNS BIGINT LANGUAGE sql IMMUTABLE AS $$ SELECT 500::BIGINT $$;

CREATE OR REPLACE FUNCTION public.ensure_credit_account(_workspace_id UUID)
RETURNS public.credit_accounts
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  acct public.credit_accounts;
  grant_amount BIGINT := public.default_credit_grant();
BEGIN
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
  IF FOUND THEN RETURN acct; END IF;

  INSERT INTO public.credit_accounts (workspace_id, balance_credits, lifetime_granted)
  VALUES (_workspace_id, grant_amount, grant_amount)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.credit_ledger (workspace_id, kind, amount, balance_after, reason, idempotency_key)
  VALUES (_workspace_id, 'grant', grant_amount, grant_amount, 'signup grant',
          'signup-grant:' || _workspace_id::TEXT)
  ON CONFLICT (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
  RETURN acct;
END;
$$;

-- Reserve credits for a job. Atomic: the guarded UPDATE either moves the
-- credits or matches no row, so two concurrent requests can never overdraw.
-- Re-calling with the same idempotency key is a no-op that reports success.
CREATE OR REPLACE FUNCTION public.reserve_credits(
  _workspace_id UUID,
  _job_id       UUID,
  _amount       BIGINT,
  _idem_key     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_balance BIGINT;
  acct        public.credit_accounts;
BEGIN
  IF _amount < 0 THEN
    RAISE EXCEPTION 'reserve_credits: amount must be >= 0';
  END IF;

  PERFORM public.ensure_credit_account(_workspace_id);

  IF _idem_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key
  ) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object(
      'ok', true, 'duplicate', true,
      'balance', acct.balance_credits, 'reserved', acct.reserved_credits, 'amount', _amount);
  END IF;

  IF _amount = 0 THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object(
      'ok', true, 'duplicate', false,
      'balance', acct.balance_credits, 'reserved', acct.reserved_credits, 'amount', 0);
  END IF;

  UPDATE public.credit_accounts
     SET balance_credits  = balance_credits  - _amount,
         reserved_credits = reserved_credits + _amount
   WHERE workspace_id = _workspace_id
     AND balance_credits >= _amount
  RETURNING balance_credits INTO new_balance;

  IF NOT FOUND THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object(
      'ok', false, 'error', 'insufficient_credits',
      'balance', COALESCE(acct.balance_credits, 0), 'required', _amount);
  END IF;

  INSERT INTO public.credit_ledger
    (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key)
  VALUES
    (_workspace_id, _job_id, 'reserve', -_amount, new_balance, 'job reservation', _idem_key);

  RETURN jsonb_build_object('ok', true, 'duplicate', false,
                            'balance', new_balance, 'amount', _amount);
END;
$$;

-- Settle a reservation against the real cost, refunding the difference.
-- `_actual` is clamped to the reservation: a job can never cost more than was
-- reserved, so a provider surprise cannot push an account negative.
CREATE OR REPLACE FUNCTION public.settle_credits(
  _workspace_id UUID,
  _job_id       UUID,
  _reserved     BIGINT,
  _actual       BIGINT,
  _idem_key     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  charged     BIGINT;
  refund      BIGINT;
  new_balance BIGINT;
  acct        public.credit_accounts;
BEGIN
  charged := GREATEST(0, LEAST(COALESCE(_actual, 0), COALESCE(_reserved, 0)));
  refund  := COALESCE(_reserved, 0) - charged;

  IF _idem_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key
  ) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true,
                              'charged', charged, 'refunded', refund,
                              'balance', acct.balance_credits);
  END IF;

  UPDATE public.credit_accounts
     SET reserved_credits = GREATEST(0, reserved_credits - COALESCE(_reserved, 0)),
         balance_credits  = balance_credits + refund,
         lifetime_spent   = lifetime_spent + charged
   WHERE workspace_id = _workspace_id
  RETURNING balance_credits INTO new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_account');
  END IF;

  INSERT INTO public.credit_ledger
    (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key, meta)
  VALUES
    (_workspace_id, _job_id, 'settle', -charged, new_balance, 'job settled', _idem_key,
     jsonb_build_object('reserved', _reserved, 'charged', charged, 'refunded', refund));

  IF refund > 0 THEN
    INSERT INTO public.credit_ledger
      (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key)
    VALUES
      (_workspace_id, _job_id, 'refund', refund, new_balance, 'unused reservation',
       CASE WHEN _idem_key IS NULL THEN NULL ELSE _idem_key || ':refund' END);
  END IF;

  RETURN jsonb_build_object('ok', true, 'duplicate', false,
                            'charged', charged, 'refunded', refund, 'balance', new_balance);
END;
$$;

-- Return an entire reservation (failure or cancellation).
CREATE OR REPLACE FUNCTION public.release_credits(
  _workspace_id UUID,
  _job_id       UUID,
  _reserved     BIGINT,
  _reason       TEXT DEFAULT 'job failed',
  _idem_key     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_balance BIGINT;
  acct        public.credit_accounts;
BEGIN
  IF _idem_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key
  ) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', acct.balance_credits);
  END IF;

  UPDATE public.credit_accounts
     SET reserved_credits = GREATEST(0, reserved_credits - COALESCE(_reserved, 0)),
         balance_credits  = balance_credits + COALESCE(_reserved, 0)
   WHERE workspace_id = _workspace_id
  RETURNING balance_credits INTO new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_account');
  END IF;

  INSERT INTO public.credit_ledger
    (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key)
  VALUES
    (_workspace_id, _job_id, 'release', COALESCE(_reserved, 0), new_balance, _reason, _idem_key);

  RETURN jsonb_build_object('ok', true, 'duplicate', false,
                            'released', COALESCE(_reserved, 0), 'balance', new_balance);
END;
$$;

-- Admin / top-up grant.
CREATE OR REPLACE FUNCTION public.grant_credits(
  _workspace_id UUID,
  _amount       BIGINT,
  _reason       TEXT DEFAULT 'top-up',
  _idem_key     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_balance BIGINT;
  acct        public.credit_accounts;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'grant_credits: amount must be > 0'; END IF;
  PERFORM public.ensure_credit_account(_workspace_id);

  IF _idem_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key
  ) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', acct.balance_credits);
  END IF;

  UPDATE public.credit_accounts
     SET balance_credits  = balance_credits + _amount,
         lifetime_granted = lifetime_granted + _amount
   WHERE workspace_id = _workspace_id
  RETURNING balance_credits INTO new_balance;

  INSERT INTO public.credit_ledger
    (workspace_id, kind, amount, balance_after, reason, idempotency_key, created_by)
  VALUES
    (_workspace_id, 'grant', _amount, new_balance, _reason, _idem_key, (SELECT auth.uid()));

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'balance', new_balance);
END;
$$;

-- A user must never be able to move their own balance.
REVOKE ALL ON FUNCTION public.ensure_credit_account(UUID)                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_credits(UUID, UUID, BIGINT, TEXT)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_credits(UUID, UUID, BIGINT, BIGINT, TEXT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_credits(UUID, UUID, BIGINT, TEXT, TEXT)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_credits(UUID, BIGINT, TEXT, TEXT)            FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_credit_account(UUID)                      TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, UUID, BIGINT, TEXT)        TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_credits(UUID, UUID, BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_credits(UUID, UUID, BIGINT, TEXT, TEXT)  TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, BIGINT, TEXT, TEXT)          TO service_role;

-- ─── 7. Auto-provision an account for every workspace ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_workspace_credits()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.ensure_credit_account(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspaces_credit_account ON public.workspaces;
CREATE TRIGGER trg_workspaces_credit_account
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_credits();

-- Backfill existing workspaces.
DO $$
DECLARE ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    PERFORM public.ensure_credit_account(ws.id);
  END LOOP;
END $$;

-- ─── 8. Guard rails ─────────────────────────────────────────────────────────
-- Fail the migration loudly if any of the invariants above did not take.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'image_generation_job_diagnostics'
      AND (qual IS DISTINCT FROM 'false')
  ) THEN
    RAISE EXCEPTION '025: diagnostics table must be closed to all client roles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_accounts' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION '025: credit_accounts needs a SELECT policy';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_accounts' AND cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION '025: credit_accounts must not be client-writable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_ledger' AND cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION '025: credit_ledger must be append-only from the server';
  END IF;
END $$;

COMMENT ON TABLE public.image_projects IS
  'An image-generation project. id is immutable (URL segment); title is mutable.';
COMMENT ON TABLE public.image_generation_jobs IS
  'One row per generation request. Written only by the ai-generate-image Edge Function (service role).';
COMMENT ON TABLE public.image_generation_job_diagnostics IS
  'Private provider errors. No client role can read this table.';
COMMENT ON TABLE public.credit_accounts IS
  '1 credit = USD 0.01. Balance moves only through reserve/settle/release/grant SECURITY DEFINER functions.';
COMMENT ON TABLE public.credit_ledger IS
  'Append-only record of every credit movement.';
