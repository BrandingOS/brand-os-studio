-- fixture: access
-- ============================================================================
-- 044 — credits (docs/access-architecture/04). Covers A17, A18, A19, A32.
-- Concurrency across sessions is exercised by the integration suite; here the
-- arithmetic, the idempotency and the reservation lifecycle are pinned.
-- ============================================================================
BEGIN;

-- a wallet with a known balance
DO $$
DECLARE r jsonb;
BEGIN
  PERFORM public.ensure_credit_account(pg_temp.ws('A'));
  UPDATE public.credit_accounts
     SET balance_credits = 100, reserved_credits = 0, lifetime_granted = 100, lifetime_spent = 0
   WHERE workspace_id = pg_temp.ws('A');
  DELETE FROM public.credit_ledger WHERE workspace_id = pg_temp.ws('A');
  INSERT INTO public.credit_ledger (workspace_id, kind, amount, balance_after, reason)
  VALUES (pg_temp.ws('A'), 'grant', 100, 100, 'test opening balance');
END $$;

-- A17 — a reservation cannot overdraw, and the second of two large holds is refused
DO $$
DECLARE a jsonb; b jsonb; acct public.credit_accounts%ROWTYPE;
BEGIN
  a := public.reserve_credits(pg_temp.ws('A'), NULL, 70, 'res-a', interval '10 minutes',
                              'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-a');
  IF (a->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'A17: the first hold failed'; END IF;

  b := public.reserve_credits(pg_temp.ws('A'), NULL, 70, 'res-b', interval '10 minutes',
                              'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-b');
  IF (b->>'ok')::boolean IS NOT FALSE OR (b->>'error') <> 'insufficient_credits' THEN
    RAISE EXCEPTION 'A17: two 70-credit holds both succeeded on a 100-credit wallet (%)', b;
  END IF;

  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> 30 OR acct.reserved_credits <> 70 THEN
    RAISE EXCEPTION 'A17: wallet is % / % after one hold, expected 30 / 70',
      acct.balance_credits, acct.reserved_credits;
  END IF;
  RAISE NOTICE '✓ A17 credits.concurrent_reserve (guarded update)';
END $$;

-- A18 — replaying a key charges once
DO $$
DECLARE r jsonb; n int;
BEGIN
  r := public.reserve_credits(pg_temp.ws('A'), NULL, 10, 'res-a', interval '10 minutes',
                              'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-a');
  IF (r->>'duplicate')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'A18: a replayed key reserved again'; END IF;
  SELECT count(*) INTO n FROM public.credit_ledger
   WHERE workspace_id = pg_temp.ws('A') AND idempotency_key = 'res-a';
  IF n <> 1 THEN RAISE EXCEPTION 'A18: % ledger rows for one key', n; END IF;
  RAISE NOTICE '✓ A18 credits.retry_idempotent';
END $$;

-- settlement charges the actual, refunds the rest, and cannot exceed the hold
DO $$
DECLARE r jsonb; acct public.credit_accounts%ROWTYPE;
BEGIN
  r := public.settle_credits(pg_temp.ws('A'), NULL, 70, 55, 'settle-a', 'job-a');
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '044: settlement failed (%)', r; END IF;
  IF (r->>'charged')::bigint <> 55 OR (r->>'refunded')::bigint <> 15 THEN
    RAISE EXCEPTION '044: settled % charged / % refunded, expected 55 / 15', r->>'charged', r->>'refunded';
  END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> 45 OR acct.reserved_credits <> 0 OR acct.lifetime_spent <> 55 THEN
    RAISE EXCEPTION '044: wallet is %/%/% after settlement, expected 45/0/55',
      acct.balance_credits, acct.reserved_credits, acct.lifetime_spent;
  END IF;

  -- settling twice does not charge twice
  r := public.settle_credits(pg_temp.ws('A'), NULL, 70, 55, 'settle-a', 'job-a');
  IF (r->>'duplicate')::boolean IS NOT TRUE THEN RAISE EXCEPTION '044: a second settle was not a no-op'; END IF;
  RAISE NOTICE '✓ 044 settlement arithmetic and idempotency';
END $$;

-- a provider that reports MORE than was held cannot charge more than was held
DO $$
DECLARE r jsonb; acct public.credit_accounts%ROWTYPE; before bigint;
BEGIN
  SELECT balance_credits INTO before FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  PERFORM public.reserve_credits(pg_temp.ws('A'), NULL, 10, 'res-clamp', interval '10 minutes',
                                 'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-clamp');
  r := public.settle_credits(pg_temp.ws('A'), NULL, 10, 999, 'settle-clamp', 'job-clamp');
  IF (r->>'charged')::bigint <> 10 THEN
    RAISE EXCEPTION '044: a 999-credit actual charged % against a 10-credit hold', r->>'charged';
  END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> before - 10 THEN
    RAISE EXCEPTION '044: the clamp did not hold (% → %)', before, acct.balance_credits;
  END IF;
  RAISE NOTICE '✓ 044 settlement is clamped to the reservation';
END $$;

-- A19/A32 — an abandoned hold expires, and a late settle is refused
DO $$
DECLARE r jsonb; acct public.credit_accounts%ROWTYPE; before bigint; n int;
BEGIN
  SELECT balance_credits INTO before FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  PERFORM public.reserve_credits(pg_temp.ws('A'), NULL, 20, 'res-stale', interval '-1 second',
                                 'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-stale');
  SELECT balance_credits INTO acct.balance_credits FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> before - 20 THEN RAISE EXCEPTION 'A19: the hold did not take the credits'; END IF;

  n := public.expire_stale_reservations();
  IF n < 1 THEN RAISE EXCEPTION 'A19: the reaper expired nothing'; END IF;

  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> before OR acct.reserved_credits <> 0 THEN
    RAISE EXCEPTION 'A19: the expired hold was not returned (% vs %)', acct.balance_credits, before;
  END IF;

  -- A32: the provider finished late; settlement must refuse rather than deliver free work
  r := public.settle_credits(pg_temp.ws('A'), NULL, 20, 20, 'settle-stale', 'job-stale');
  IF (r->>'error') <> 'reservation_expired' THEN
    RAISE EXCEPTION 'A32: a late settle after expiry was accepted (%)', r;
  END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> before THEN
    RAISE EXCEPTION 'A32: the late settle moved money (% vs %)', acct.balance_credits, before;
  END IF;
  RAISE NOTICE '✓ A19 credits.reservation_expiry + ✓ A32 credits.expired_settle';
END $$;

-- release returns the whole hold, and twice is once
DO $$
DECLARE r jsonb; before bigint; acct public.credit_accounts%ROWTYPE;
BEGIN
  SELECT balance_credits INTO before FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  PERFORM public.reserve_credits(pg_temp.ws('A'), NULL, 12, 'res-rel', interval '10 minutes',
                                 'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-rel');
  PERFORM public.release_credits(pg_temp.ws('A'), NULL, 12, 'provider failed', 'rel-1', 'job-rel');
  r := public.release_credits(pg_temp.ws('A'), NULL, 12, 'provider failed', 'rel-1', 'job-rel');
  IF (r->>'duplicate')::boolean IS NOT TRUE THEN RAISE EXCEPTION '044: a second release was not a no-op'; END IF;
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> before THEN
    RAISE EXCEPTION '044: release did not return exactly the hold (% vs %)', acct.balance_credits, before;
  END IF;
  RAISE NOTICE '✓ 044 release';
END $$;

-- a per-member ceiling bounds one person without bounding the workspace
DO $$
DECLARE r jsonb;
BEGIN
  -- top up through the ledger, not by writing the column: the reconcile assertion at the
  -- end of this file is exactly the rule that a balance must be explainable.
  PERFORM public.grant_credits(pg_temp.ws('A'), 1000, 'test top-up', 'top-up-044');
  UPDATE public.workspace_members SET credits_monthly_cap = 30
   WHERE workspace_id = pg_temp.ws('A') AND user_id = pg_temp.uid('dana');

  r := public.reserve_credits(pg_temp.ws('A'), NULL, 25, 'cap-1', interval '10 minutes',
                              'image', pg_temp.brand('A1'), pg_temp.uid('dana'), 'test', 'job-cap1');
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '044: a hold within the cap failed'; END IF;

  r := public.reserve_credits(pg_temp.ws('A'), NULL, 25, 'cap-2', interval '10 minutes',
                              'image', pg_temp.brand('A1'), pg_temp.uid('dana'), 'test', 'job-cap2');
  IF (r->>'error') <> 'member_credit_cap_reached' THEN
    RAISE EXCEPTION '044: the per-member cap did not bind (%)', r;
  END IF;

  -- someone else is unaffected: the cap is per person, not per wallet
  r := public.reserve_credits(pg_temp.ws('A'), NULL, 25, 'cap-3', interval '10 minutes',
                              'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-cap3');
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '044: one member''s cap blocked another'; END IF;
  RAISE NOTICE '✓ 044 per-member monthly cap';
END $$;

-- every balance is explainable by the ledger
DO $$
DECLARE r jsonb;
BEGIN
  r := public.reconcile_credit_account(pg_temp.ws('A'));
  IF (r->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '044: the wallet does not reconcile with its ledger (%)', r;
  END IF;
  RAISE NOTICE '✓ 044 reconciliation';
END $$;

-- Pass B F3: a ref_id identifies at most ONE held reservation
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM public.grant_credits(pg_temp.ws('A'), 500, 'test', 'topup-f3');
  PERFORM public.reserve_credits(pg_temp.ws('A'), NULL, 5, 'f3-a', interval '10 minutes',
                                 'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'shared-ref');
  BEGIN
    PERFORM public.reserve_credits(pg_temp.ws('A'), NULL, 5, 'f3-b', interval '10 minutes',
                                   'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'shared-ref');
  EXCEPTION WHEN unique_violation THEN ok := true; END;
  IF NOT ok THEN
    RAISE EXCEPTION 'F3: two held reservations share a ref_id — settle would orphan one';
  END IF;
  PERFORM public.release_credits(pg_temp.ws('A'), NULL, 5, 'cleanup', 'f3-rel', 'shared-ref');
  RAISE NOTICE '✓ F3 one held reservation per ref_id';
END $$;

-- Pass B F4: the ROW's amount is what unwinds, not the caller's number
DO $$
DECLARE before bigint; held_before bigint; acct public.credit_accounts%ROWTYPE;
BEGIN
  -- earlier blocks leave holds open on purpose, so compare DELTAS, not absolutes
  SELECT balance_credits, reserved_credits INTO before, held_before
    FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  PERFORM public.reserve_credits(pg_temp.ws('A'), NULL, 30, 'f4-res', interval '10 minutes',
                                 'image', pg_temp.brand('A1'), pg_temp.uid('emma'), 'test', 'job-f4');
  -- a caller that lies about what it held must not be able to desync the wallet
  PERFORM public.settle_credits(pg_temp.ws('A'), NULL, 999, 0, 'f4-settle', 'job-f4');
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = pg_temp.ws('A');
  IF acct.balance_credits <> before OR acct.reserved_credits <> held_before THEN
    RAISE EXCEPTION 'F4: a wrong _reserved desynced the wallet (%/%, expected %/%)',
      acct.balance_credits, acct.reserved_credits, before, held_before;
  END IF;
  IF NOT (public.reconcile_credit_account(pg_temp.ws('A'))->>'ok')::boolean THEN
    RAISE EXCEPTION 'F4: the wallet no longer reconciles';
  END IF;
  RAISE NOTICE '✓ F4 the reservation row is the authority';
END $$;

-- the money functions stay server-side
DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.settle_credits(uuid,uuid,bigint,bigint,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.release_credits(uuid,uuid,bigint,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.expire_stale_reservations()', 'EXECUTE') THEN
    RAISE EXCEPTION '044: a money function is callable from the browser';
  END IF;
  RAISE NOTICE '✓ ALL 044 ASSERTIONS PASSED';
END $$;
ROLLBACK;
