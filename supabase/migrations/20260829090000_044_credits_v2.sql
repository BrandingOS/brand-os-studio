-- ============================================================================
-- 044 — Credits v2 (docs/access-architecture/04 §2)
--
-- What migration 025 got right is kept exactly: BIGINT credits at 1 credit = USD 0.01,
-- one guarded atomic UPDATE for a reservation (so overdraw is structurally impossible),
-- settlement clamped to the reservation, and ledger idempotency by
-- (workspace_id, idempotency_key). The Edge Function's existing calls keep working —
-- every new argument has a default that reproduces today's behaviour.
--
-- What it adds:
--   • a hold is a ROW, so it can expire. Before, a crashed function held money for ever:
--     `reserved_credits` went up and nothing ever brought it down.
--   • settle/release/reap transition that row with a guarded UPDATE and touch
--     credit_accounts only if they WON it, so the reaper and a late settle cannot both
--     return the same credits (DB review H1).
--   • a job follows its reservation: if the reaper got there first, settlement refuses and
--     the caller is told, rather than delivering work nobody was charged for (F2).
--   • ai_usage_events — one immutable row per paid call, which is what "who is consuming
--     credits" on the Usage page reads.
--   • a per-member monthly ceiling, so one designer cannot spend the month in an afternoon.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_id        uuid,
  user_id         uuid,
  purpose         text NOT NULL DEFAULT 'image',
  amount          bigint NOT NULL CHECK (amount > 0),
  status          text NOT NULL DEFAULT 'held' CHECK (status IN ('held','settled','released','expired')),
  idempotency_key text,
  ref_kind        text,
  ref_id          text,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS credit_reservations_idem_idx
  ON public.credit_reservations (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS credit_reservations_expiring_idx
  ON public.credit_reservations (expires_at) WHERE status = 'held';
-- A ref_id is how settle/release find the hold, so at most ONE hold may answer to it.
-- Without this, two held reservations sharing a ref_id would both flip to settled in one
-- UPDATE while the account moved by a single amount, orphaning the other's reserved
-- credits for ever. (Pass B, F3.)
CREATE UNIQUE INDEX IF NOT EXISTS credit_reservations_ref_held_idx
  ON public.credit_reservations (workspace_id, ref_id) WHERE status = 'held' AND ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS credit_reservations_member_month_idx
  ON public.credit_reservations (workspace_id, user_id, created_at);
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_reservations_select ON public.credit_reservations;
CREATE POLICY credit_reservations_select ON public.credit_reservations FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.usage.view')));

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id                bigserial PRIMARY KEY,
  workspace_id      uuid NOT NULL,
  brand_id          uuid,
  user_id           uuid,
  reservation_id    uuid,
  job_id            uuid,
  provider          text,
  model             text,
  operation         text,
  input_tokens      integer,
  output_tokens     integer,
  image_count       integer,
  image_size        text,
  provider_cost_usd numeric(12,6),
  credits_charged   bigint NOT NULL DEFAULT 0,
  pricing_version   text,
  pricing_snapshot  jsonb,
  latency_ms        integer,
  status            text NOT NULL DEFAULT 'succeeded'
                    CHECK (status IN ('succeeded','failed','cancelled','expired_unbilled')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_events_workspace_idx ON public.ai_usage_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_idx ON public.ai_usage_events (workspace_id, user_id, created_at DESC);
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_usage_events_select ON public.ai_usage_events;
-- provider_cost_usd is ours, not the customer's business: the Usage page reads credits.
CREATE POLICY ai_usage_events_select ON public.ai_usage_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.usage.view')));

-- ── reserve ─────────────────────────────────────────────────────────────────
-- Same first four arguments as 025, so `rpc('reserve_credits', {_workspace_id, _job_id,
-- _amount, _idem_key})` from ai-generate-image is unchanged.
CREATE OR REPLACE FUNCTION public.reserve_credits(
  _workspace_id uuid,
  _job_id uuid,
  _amount bigint,
  _idem_key text DEFAULT NULL,
  _ttl interval DEFAULT interval '10 minutes',
  _purpose text DEFAULT 'image',
  _brand_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _ref_kind text DEFAULT 'image_job',
  _ref_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  acct     public.credit_accounts%ROWTYPE;
  eff_user uuid := _user_id;
  eff_brand uuid := _brand_id;
  cap      bigint;
  spent    bigint;
  res_id   uuid;
BEGIN
  IF _amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  PERFORM public.ensure_credit_account(_workspace_id);

  -- replaying the same key is not a second charge
  IF _idem_key IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.credit_ledger
        WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', acct.balance_credits);
  END IF;

  IF _amount = 0 THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'balance', acct.balance_credits, 'reserved', acct.reserved_credits);
  END IF;

  -- fill in what the caller did not say from the job row (the image path passes only ids)
  IF (eff_user IS NULL OR eff_brand IS NULL) AND _job_id IS NOT NULL THEN
    SELECT COALESCE(eff_user, j.user_id), COALESCE(eff_brand, j.brand_id)
      INTO eff_user, eff_brand
      FROM public.image_generation_jobs j WHERE j.id = _job_id;
  END IF;

  -- a per-person ceiling, if one is set: the wallet is shared, the blast radius need not be
  SELECT m.credits_monthly_cap INTO cap
    FROM public.workspace_members m
   WHERE m.workspace_id = _workspace_id AND m.user_id = eff_user;
  -- An unresolved user means the cap CANNOT be evaluated. Today both callers always
  -- resolve one; this is the floor for the next one that does not. (Pass B, F6.)
  IF eff_user IS NULL AND EXISTS (
       SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = _workspace_id AND m.credits_monthly_cap IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount',
                              'detail', 'a capped workspace requires a user id');
  END IF;
  IF cap IS NOT NULL AND eff_user IS NOT NULL THEN
    SELECT COALESCE(sum(r.amount), 0) INTO spent
      FROM public.credit_reservations r
     WHERE r.workspace_id = _workspace_id AND r.user_id = eff_user
       AND r.status IN ('held','settled')
       AND r.created_at >= date_trunc('month', now());
    IF spent + _amount > cap THEN
      RETURN jsonb_build_object('ok', false, 'error', 'member_credit_cap_reached',
                                'cap', cap, 'used', spent, 'required', _amount);
    END IF;
  END IF;

  -- THE guard: one statement, and the row only moves if it can pay
  UPDATE public.credit_accounts
     SET balance_credits  = balance_credits - _amount,
         reserved_credits = reserved_credits + _amount,
         updated_at = now()
   WHERE workspace_id = _workspace_id AND balance_credits >= _amount
  RETURNING * INTO acct;

  IF NOT FOUND THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits',
                              'balance', COALESCE(acct.balance_credits, 0), 'required', _amount);
  END IF;

  INSERT INTO public.credit_reservations
    (workspace_id, brand_id, user_id, purpose, amount, idempotency_key, ref_kind, ref_id, expires_at)
  VALUES (_workspace_id, eff_brand, eff_user, COALESCE(_purpose, 'image'), _amount,
          _idem_key, COALESCE(_ref_kind, 'image_job'), COALESCE(_ref_id, _job_id::text),
          now() + COALESCE(_ttl, interval '10 minutes'))
  RETURNING id INTO res_id;

  INSERT INTO public.credit_ledger
    (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key, created_by)
  VALUES (_workspace_id, _job_id, 'reserve', -_amount, acct.balance_credits,
          'reserved for ' || COALESCE(_purpose, 'image'), _idem_key, eff_user);

  RETURN jsonb_build_object('ok', true, 'balance', acct.balance_credits,
                            'reserved', acct.reserved_credits, 'reservationId', res_id);
END;
$$;

-- ── settle ──────────────────────────────────────────────────────────────────
-- `_ref_id` names the reservation for callers that have no job row (text AI); the image
-- path passes only _job_id and is unchanged.
CREATE OR REPLACE FUNCTION public.settle_credits(
  _workspace_id uuid, _job_id uuid, _reserved bigint, _actual bigint, _idem_key text DEFAULT NULL,
  _ref_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE acct public.credit_accounts%ROWTYPE; charged bigint; refund bigint;
        res_id uuid; res_amount bigint;
BEGIN
  IF _idem_key IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.credit_ledger
        WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', acct.balance_credits);
  END IF;

  -- Claim the hold FIRST. Whoever transitions the row is the one who may move money;
  -- the reaper uses the same guarded UPDATE, so exactly one of us wins.
  UPDATE public.credit_reservations
     SET status = 'settled', resolved_at = now()
   WHERE workspace_id = _workspace_id AND status = 'held'
     AND ref_id = COALESCE(_ref_id, _job_id::text)
  RETURNING id, amount INTO res_id, res_amount;

  IF res_id IS NULL THEN
    -- the reaper already returned these credits: charge nothing and say so, rather than
    -- billing for work we could not confirm or delivering work nobody paid for
    RETURN jsonb_build_object('ok', false, 'error', 'reservation_expired');
  END IF;

  -- The ROW is the authority for what was held, not the caller's `_reserved`: a caller bug
  -- would otherwise desync credit_accounts from the ledger with nothing to catch it.
  -- (Pass B, F4.)
  res_amount := COALESCE(res_amount, _reserved, 0);
  charged := GREATEST(0, LEAST(COALESCE(_actual, 0), res_amount));
  refund  := res_amount - charged;

  UPDATE public.credit_accounts
     SET reserved_credits = GREATEST(0, reserved_credits - res_amount),
         balance_credits  = balance_credits + refund,
         lifetime_spent   = lifetime_spent + charged,
         updated_at = now()
   WHERE workspace_id = _workspace_id
  RETURNING * INTO acct;

  INSERT INTO public.credit_ledger
    (workspace_id, job_id, kind, amount, balance_after, reason, meta, idempotency_key)
  VALUES (_workspace_id, _job_id, 'settle', -charged, acct.balance_credits, 'settled',
          jsonb_build_object('reserved', res_amount, 'charged', charged, 'refunded', refund), _idem_key);

  IF refund > 0 THEN
    INSERT INTO public.credit_ledger
      (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key)
    VALUES (_workspace_id, _job_id, 'refund', refund, acct.balance_credits, 'unused reservation',
            CASE WHEN _idem_key IS NULL THEN NULL ELSE _idem_key || ':refund' END);
  END IF;

  RETURN jsonb_build_object('ok', true, 'charged', charged, 'refunded', refund,
                            'balance', acct.balance_credits, 'reserved', acct.reserved_credits);
END;
$$;

-- ── release ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_credits(
  _workspace_id uuid, _job_id uuid, _reserved bigint,
  _reason text DEFAULT 'job failed', _idem_key text DEFAULT NULL, _ref_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE acct public.credit_accounts%ROWTYPE; res_id uuid; res_amount bigint;
BEGIN
  IF _idem_key IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.credit_ledger
        WHERE workspace_id = _workspace_id AND idempotency_key = _idem_key) THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', acct.balance_credits);
  END IF;

  UPDATE public.credit_reservations
     SET status = 'released', resolved_at = now()
   WHERE workspace_id = _workspace_id AND status = 'held'
     AND ref_id = COALESCE(_ref_id, _job_id::text)
  RETURNING id, amount INTO res_id, res_amount;

  IF res_id IS NULL THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN jsonb_build_object('ok', true, 'noop', true, 'balance', COALESCE(acct.balance_credits, 0));
  END IF;

  res_amount := COALESCE(res_amount, _reserved, 0);   -- the row, not the caller (F4)
  UPDATE public.credit_accounts
     SET reserved_credits = GREATEST(0, reserved_credits - res_amount),
         balance_credits  = balance_credits + res_amount,
         updated_at = now()
   WHERE workspace_id = _workspace_id
  RETURNING * INTO acct;

  INSERT INTO public.credit_ledger
    (workspace_id, job_id, kind, amount, balance_after, reason, idempotency_key)
  VALUES (_workspace_id, _job_id, 'release', res_amount, acct.balance_credits,
          _reason, _idem_key);

  RETURN jsonb_build_object('ok', true, 'balance', acct.balance_credits, 'reserved', acct.reserved_credits);
END;
$$;

-- ── the reaper ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_stale_reservations()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r record; n int := 0; acct public.credit_accounts%ROWTYPE;
BEGIN
  FOR r IN
    UPDATE public.credit_reservations
       SET status = 'expired', resolved_at = now()
     WHERE status = 'held' AND expires_at < now()
    RETURNING *
  LOOP
    UPDATE public.credit_accounts
       SET reserved_credits = GREATEST(0, reserved_credits - r.amount),
           balance_credits  = balance_credits + r.amount,
           updated_at = now()
     WHERE workspace_id = r.workspace_id
    RETURNING * INTO acct;

    INSERT INTO public.credit_ledger
      (workspace_id, kind, amount, balance_after, reason, idempotency_key)
    VALUES (r.workspace_id, 'release', r.amount, acct.balance_credits,
            'reservation expired', 'release:' || r.id::text || ':expired')
    ON CONFLICT DO NOTHING;

    PERFORM public.record_audit(r.workspace_id, 'credits.reservation_expired',
      'credit_reservation', r.id::text, NULL,
      jsonb_build_object('amount', r.amount, 'purpose', r.purpose), r.brand_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ── reconciliation: every balance must be explainable ───────────────────────
-- The balance must be explainable by the ledger. WHICH entries move the balance matters:
-- `reserve` takes the full amount out of it, so the later `settle` row records the SPEND
-- (for lifetime_spent and reporting) and does NOT move the balance again — only the
-- `refund` beside it does. Summing every row would double-count every settled job.
CREATE OR REPLACE FUNCTION public.reconcile_credit_account(_workspace_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE acct public.credit_accounts%ROWTYPE; moves bigint; spent bigint; held bigint;
BEGIN
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'note', 'no account'); END IF;

  SELECT COALESCE(sum(amount), 0) INTO moves
    FROM public.credit_ledger
   WHERE workspace_id = _workspace_id AND kind <> 'settle';
  SELECT COALESCE(sum(-amount), 0) INTO spent
    FROM public.credit_ledger
   WHERE workspace_id = _workspace_id AND kind = 'settle';
  SELECT COALESCE(sum(amount), 0) INTO held
    FROM public.credit_reservations
   WHERE workspace_id = _workspace_id AND status = 'held';

  RETURN jsonb_build_object(
    'ok', moves = acct.balance_credits
          AND held = acct.reserved_credits
          AND spent = acct.lifetime_spent,
    'balance', acct.balance_credits, 'ledgerMoves', moves,
    'reserved', acct.reserved_credits, 'heldRows', held,
    'lifetimeSpent', acct.lifetime_spent, 'ledgerSpent', spent);
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_all_credit_accounts()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r record; res jsonb; bad int := 0;
BEGIN
  FOR r IN SELECT workspace_id FROM public.credit_accounts LOOP
    res := public.reconcile_credit_account(r.workspace_id);
    IF NOT (res->>'ok')::boolean THEN
      bad := bad + 1;
      PERFORM public.record_audit(r.workspace_id, 'credits.reconcile_mismatch',
        'credit_account', r.workspace_id::text, NULL, res);
    END IF;
  END LOOP;
  RETURN bad;
END;
$$;

-- ── cancellation is an RPC, not a client UPDATE ─────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_generation_job(_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE j public.image_generation_jobs%ROWTYPE;
BEGIN
  SELECT * INTO j FROM public.image_generation_jobs WHERE id = _job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such job';
  END IF;
  -- your own job, or anyone's if you manage the brand
  IF j.user_id <> (SELECT auth.uid())
     AND NOT public.has_capability('brand.access.manage', j.workspace_id, j.brand_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'permission_denied',
      DETAIL = 'that job belongs to someone else';
  END IF;
  IF j.status NOT IN ('queued','running') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_cancellable', 'status', j.status);
  END IF;

  UPDATE public.image_generation_jobs
     SET status = 'cancelled', completed_at = now(), error_code = 'cancelled'
   WHERE id = _job_id;
  PERFORM public.release_credits(j.workspace_id, _job_id, j.estimated_credits,
                                 'cancelled by user', 'release:' || _job_id::text);
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_generation_job(uuid) TO authenticated;

-- credits are BIGINT in the ledger; the job columns were INTEGER
ALTER TABLE public.image_generation_jobs
  ALTER COLUMN estimated_credits TYPE bigint,
  ALTER COLUMN charged_credits   TYPE bigint;

-- ── server-only, as before ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, uuid, bigint, text, interval, text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_credits(uuid, uuid, bigint, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_credits(uuid, uuid, bigint, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_reservations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_all_credit_accounts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, uuid, bigint, text, interval, text, uuid, uuid, text, text) TO service_role;
-- 025's 4-argument reserve_credits must GO, not merely be superseded. Every new argument
-- has a default, so a 4-arg call matches BOTH overloads and Postgres refuses with
-- "could not choose a best candidate function" — and PostgREST, which resolves by argument
-- NAME, hits exactly the same wall. The Edge Function calls it with four named arguments,
-- so leaving the old one in place breaks image generation the moment 044 lands.
DROP FUNCTION IF EXISTS public.reserve_credits(uuid, uuid, bigint, text);
GRANT EXECUTE ON FUNCTION public.settle_credits(uuid, uuid, bigint, bigint, text, text) TO service_role;
-- 025's 5-argument forms are dropped so no caller can reach a body that ignores the
-- reservation row.
DROP FUNCTION IF EXISTS public.settle_credits(uuid, uuid, bigint, bigint, text);
GRANT EXECUTE ON FUNCTION public.release_credits(uuid, uuid, bigint, text, text, text) TO service_role;
DROP FUNCTION IF EXISTS public.release_credits(uuid, uuid, bigint, text, text);
GRANT EXECUTE ON FUNCTION public.expire_stale_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_credit_account(uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_all_credit_accounts() TO service_role;

-- ── schedules (pg_cron is preloaded on Supabase; enabling it is idempotent) ──
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  PERFORM extensions.cron.schedule('expire-stale-reservations', '* * * * *',
    'SELECT public.expire_stale_reservations()');
  PERFORM extensions.cron.schedule('reconcile-credit-accounts', '17 3 * * *',
    'SELECT public.reconcile_all_credit_accounts()');
  PERFORM extensions.cron.schedule('prune-audit-events', '41 3 * * *',
    'SELECT public.prune_audit_events()');
EXCEPTION WHEN OTHERS THEN
  -- A local stack without pg_cron must not fail the migration; the runbook schedules
  -- these in production and the functions are callable by hand either way.
  RAISE NOTICE '044: pg_cron unavailable (%), schedule expire_stale_reservations() manually', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
              AND tablename='image_generation_jobs' AND cmd = 'UPDATE') THEN
    RAISE EXCEPTION '044 guard: the client can still UPDATE a job row';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname IN ('settle_credits','release_credits')
                AND p.pronargs = 5) THEN
    RAISE EXCEPTION '044 guard: a pre-044 money function survived';
  END IF;
  -- Exactly ONE of each, or a named-argument call from PostgREST cannot be resolved.
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'reserve_credits') <> 1 THEN
    RAISE EXCEPTION '044 guard: reserve_credits is overloaded — a 4-arg call is ambiguous';
  END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname IN ('settle_credits','release_credits')
       GROUP BY p.proname HAVING count(*) <> 1 LIMIT 1) IS NOT NULL THEN
    RAISE EXCEPTION '044 guard: settle/release is overloaded';
  END IF;
  IF has_function_privilege('authenticated', 'public.reserve_credits(uuid,uuid,bigint,text,interval,text,uuid,uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION '044 guard: reserve_credits is callable by clients';
  END IF;
  RAISE NOTICE '044 OK — credit reservations, usage events, reaper and reconciliation';
END $$;
