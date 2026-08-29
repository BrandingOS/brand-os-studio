-- fixture: access
-- ============================================================================
-- 043 — plan entitlements and limits (docs/access-architecture/04 §3). Covers A25.
-- ============================================================================
BEGIN;

-- the plan decides, an override beats the plan, and an unknown key is 0
DO $$
BEGIN
  IF public.entitlement(pg_temp.ws('A'), 'brands') <> -1 THEN
    RAISE EXCEPTION '043: the agency plan should have unlimited brands';
  END IF;
  IF public.entitlement(pg_temp.ws('B'), 'brands') <> 2 THEN
    RAISE EXCEPTION '043: the free plan should allow 2 brands';
  END IF;

  INSERT INTO public.workspace_entitlement_overrides (workspace_id, key, value, reason)
  VALUES (pg_temp.ws('B'), 'brands', 7, 'support grant');
  IF public.entitlement(pg_temp.ws('B'), 'brands') <> 7 THEN
    RAISE EXCEPTION '043: an override did not beat the plan';
  END IF;
  DELETE FROM public.workspace_entitlement_overrides WHERE workspace_id = pg_temp.ws('B');
  RAISE NOTICE '✓ 043 entitlement resolution';
END $$;

-- a free workspace cannot exceed its brands, and unlimited means unlimited
DO $$
DECLARE ok boolean := false; r jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));           -- owner of B, free plan, 1 brand
  r := public.check_limit(pg_temp.ws('B'), 'brands', 1);
  IF NOT (r->>'allowed')::boolean THEN RAISE EXCEPTION '043: the 2nd brand should be allowed'; END IF;

  INSERT INTO public.brands (user_id, workspace_id, name, primary_color)
  VALUES (pg_temp.uid('bob'), pg_temp.ws('B'), 'B2', '#555555');

  BEGIN
    INSERT INTO public.brands (user_id, workspace_id, name, primary_color)
    VALUES (pg_temp.uid('bob'), pg_temp.ws('B'), 'B3', '#666666');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'brands_limit_reached'); END;
  IF NOT ok THEN RAISE EXCEPTION '043: the free plan allowed a third brand'; END IF;
  PERFORM pg_temp.back_to_super();

  PERFORM pg_temp.act_as(pg_temp.uid('alice'));         -- agency: unlimited
  INSERT INTO public.brands (user_id, workspace_id, name, primary_color)
  VALUES (pg_temp.uid('alice'), pg_temp.ws('A'), 'A4', '#777777');
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 043 brand limit';
END $$;

-- a pending invitation holds a seat, so ten invitations cannot fit in one seat
DO $$
DECLARE ok boolean := false; before bigint; after bigint;
BEGIN
  -- accounting, on a plan with headroom
  before := public.entitlement_usage(pg_temp.ws('A'), 'seats');
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  PERFORM public.create_invitation(pg_temp.ws('A'), 'seat1@example.com', 'member', 'all', 'viewer');
  PERFORM pg_temp.back_to_super();
  after := public.entitlement_usage(pg_temp.ws('A'), 'seats');
  IF after <> before + 1 THEN
    RAISE EXCEPTION '043: a pending invitation did not take a seat (% → %)', before, after;
  END IF;

  -- and the refusal, on a plan without: free is ONE seat, which the owner already occupies
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  BEGIN PERFORM public.create_invitation(pg_temp.ws('B'), 'seat2@example.com', 'member', 'all', 'viewer');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'seats_limit_reached'); END;
  IF NOT ok THEN RAISE EXCEPTION '043: the free plan allowed a second seat'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 043 seats are held by pending invitations';
END $$;

-- guests are counted separately, and the free plan has none
DO $$
DECLARE ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  BEGIN PERFORM public.create_invitation(pg_temp.ws('B'), 'guest@example.com', 'guest', 'selected', 'viewer');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'guest_seats_limit_reached'); END;
  IF NOT ok THEN RAISE EXCEPTION '043: the free plan allowed a guest'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 043 guest seats';
END $$;

-- A25 — the signup grant is once per person's personal workspace, not per workspace
DO $$
DECLARE ws uuid; bal bigint;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  ws := public.create_workspace('Second Kaafex');
  PERFORM pg_temp.back_to_super();
  PERFORM public.ensure_credit_account(ws);
  SELECT balance_credits INTO bal FROM public.credit_accounts WHERE workspace_id = ws;
  IF bal <> 0 THEN
    RAISE EXCEPTION 'A25: a second workspace minted % free credits', bal;
  END IF;
  RAISE NOTICE '✓ A25 entitlement.workspace_cap + signup grant';
END $$;

-- and the reason a client gets back is a semantic id, not prose
DO $$
DECLARE r jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  r := public.check_limit(pg_temp.ws('B'), 'seats', 1);
  IF (r->>'allowed')::boolean THEN RAISE EXCEPTION '043: the seat check should refuse'; END IF;
  IF (r->>'reason') <> 'seats_limit_reached' THEN
    RAISE EXCEPTION '043: check_limit returned "%" instead of a semantic reason', r->>'reason';
  END IF;
  IF (r->>'plan') <> 'free' THEN RAISE EXCEPTION '043: check_limit lost the plan name'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ ALL 043 ASSERTIONS PASSED';
END $$;
ROLLBACK;
