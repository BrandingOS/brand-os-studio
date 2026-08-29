-- ============================================================================
-- 043 — Plan entitlements (docs/access-architecture/04 §3)
--
-- Packaging is DATA, not a constant in a TypeScript file: `_shared/plan-limits.ts` meant
-- every repackaging was a deploy. `entitlement(ws, key)` is override ?? plan ?? free, and
-- the numbers below are the owner's to change with an UPDATE.
--
-- Also closes the unbounded-free-credit hole: every workspace insert granted 500 credits
-- and nothing capped how many workspaces one account could create.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  plan_key text NOT NULL,
  key      text NOT NULL,
  value    bigint NOT NULL,        -- -1 = unlimited, 0/1 for booleans
  PRIMARY KEY (plan_key, key)
);
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_entitlements_read ON public.plan_entitlements;
CREATE POLICY plan_entitlements_read ON public.plan_entitlements
  FOR SELECT TO authenticated USING (true);   -- what each plan includes is a price list

CREATE TABLE IF NOT EXISTS public.workspace_entitlement_overrides (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key          text NOT NULL,
  value        bigint NOT NULL,
  reason       text,
  set_by       uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, key)
);
ALTER TABLE public.workspace_entitlement_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_entitlement_overrides_read ON public.workspace_entitlement_overrides;
CREATE POLICY workspace_entitlement_overrides_read ON public.workspace_entitlement_overrides
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.billing.view')));
-- written by support/admins through the service role only

INSERT INTO public.plan_entitlements (plan_key, key, value) VALUES
  ('free','workspaces.owned',1), ('free','brands',2), ('free','seats',1), ('free','guest_seats',0),
  ('free','storage_mb',500), ('free','credits.monthly',0), ('free','credits.signup_grant',500),
  ('free','ai.models.premium',0), ('free','share_links',3), ('free','exports_month',20),
  ('free','audit.retention_days',30), ('free','advanced_access',0),
  ('pro','workspaces.owned',3), ('pro','brands',10), ('pro','seats',5), ('pro','guest_seats',5),
  ('pro','storage_mb',10000), ('pro','credits.monthly',2000), ('pro','credits.signup_grant',500),
  ('pro','ai.models.premium',1), ('pro','share_links',-1), ('pro','exports_month',-1),
  ('pro','audit.retention_days',180), ('pro','advanced_access',1),
  ('agency','workspaces.owned',10), ('agency','brands',-1), ('agency','seats',25), ('agency','guest_seats',50),
  ('agency','storage_mb',100000), ('agency','credits.monthly',10000), ('agency','credits.signup_grant',500),
  ('agency','ai.models.premium',1), ('agency','share_links',-1), ('agency','exports_month',-1),
  ('agency','audit.retention_days',400), ('agency','advanced_access',1)
ON CONFLICT (plan_key, key) DO UPDATE SET value = EXCLUDED.value;

-- ── reading an entitlement ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.workspace_plan(_workspace_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((SELECT s.plan FROM public.subscriptions s
                    WHERE s.workspace_id = _workspace_id
                      AND s.status IN ('active','trialing','past_due')
                    ORDER BY s.updated_at DESC LIMIT 1), 'free');
$$;

CREATE OR REPLACE FUNCTION public.entitlement(_workspace_id uuid, _key text)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(
    (SELECT o.value FROM public.workspace_entitlement_overrides o
      WHERE o.workspace_id = _workspace_id AND o.key = _key),
    (SELECT p.value FROM public.plan_entitlements p
      WHERE p.plan_key = public.workspace_plan(_workspace_id) AND p.key = _key),
    (SELECT p.value FROM public.plan_entitlements p WHERE p.plan_key = 'free' AND p.key = _key),
    0);
$$;
GRANT EXECUTE ON FUNCTION public.entitlement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_plan(uuid) TO authenticated;

-- ── current usage, and whether one more is allowed ──────────────────────────
CREATE OR REPLACE FUNCTION public.entitlement_usage(_workspace_id uuid, _key text)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE n bigint;
BEGIN
  CASE _key
    WHEN 'brands' THEN
      SELECT count(*) INTO n FROM public.brands
       WHERE workspace_id = _workspace_id AND archived_at IS NULL;
    WHEN 'seats' THEN
      -- a pending invitation holds a seat: otherwise ten invitations fit in one seat
      SELECT (SELECT count(*) FROM public.workspace_members m
               WHERE m.workspace_id = _workspace_id AND m.role <> 'guest' AND m.status = 'active')
           + (SELECT count(*) FROM public.workspace_invitations i
               WHERE i.workspace_id = _workspace_id AND i.role <> 'guest'
                 AND i.status = 'pending' AND i.expires_at > now())
        INTO n;
    WHEN 'guest_seats' THEN
      SELECT (SELECT count(*) FROM public.workspace_members m
               WHERE m.workspace_id = _workspace_id AND m.role = 'guest' AND m.status = 'active')
           + (SELECT count(*) FROM public.workspace_invitations i
               WHERE i.workspace_id = _workspace_id AND i.role = 'guest'
                 AND i.status = 'pending' AND i.expires_at > now())
        INTO n;
    WHEN 'storage_mb' THEN
      SELECT COALESCE(sum(a.size), 0) / 1048576 INTO n FROM public.assets a
       WHERE a.workspace_id = _workspace_id AND a.deleted_at IS NULL;
    WHEN 'share_links' THEN
      SELECT count(*) INTO n FROM public.share_links
       WHERE workspace_id = _workspace_id AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > now());
    WHEN 'workspaces.owned' THEN
      SELECT count(*) INTO n FROM public.workspaces
       WHERE owner_id = (SELECT auth.uid()) AND deleted_at IS NULL;
    ELSE n := 0;
  END CASE;
  RETURN COALESCE(n, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.entitlement_usage(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_limit(_workspace_id uuid, _key text, _adding bigint DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE lim bigint; used bigint;
BEGIN
  lim := public.entitlement(_workspace_id, _key);
  IF lim < 0 THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'used', 0, 'plan', public.workspace_plan(_workspace_id));
  END IF;
  used := public.entitlement_usage(_workspace_id, _key);
  RETURN jsonb_build_object(
    'allowed', used + _adding <= lim,
    'limit', lim, 'used', used,
    'plan', public.workspace_plan(_workspace_id),
    'reason', CASE WHEN used + _adding <= lim THEN NULL
                   ELSE replace(_key, '.', '_') || '_limit_reached' END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_limit(uuid, text, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_limit(_workspace_id uuid, _key text, _adding bigint DEFAULT 1)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r jsonb;
BEGIN
  r := public.check_limit(_workspace_id, _key, _adding);
  IF NOT (r->>'allowed')::boolean THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = r->>'reason',
      DETAIL = format('%s of %s used on the %s plan', r->>'used', r->>'limit', r->>'plan');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_limit(uuid, text, bigint) FROM PUBLIC, anon, authenticated;

-- ── the limits now bind where the action happens ────────────────────────────
CREATE OR REPLACE FUNCTION public.create_workspace(_name text, _slug text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE uid uuid := (SELECT auth.uid()); ws uuid; base text; candidate text; n int := 0;
        owned bigint; allowed bigint;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated', DETAIL = 'sign in first';
  END IF;
  IF COALESCE(btrim(_name), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_name', DETAIL = 'a workspace needs a name';
  END IF;

  -- The cap is read from the caller's BEST plan across the workspaces they own: a Pro
  -- customer creating their third workspace should not be judged by the free plan of the
  -- empty one they are standing in.
  SELECT count(*) INTO owned FROM public.workspaces WHERE owner_id = uid AND deleted_at IS NULL;
  SELECT COALESCE(max(public.entitlement(w.id, 'workspaces.owned')), 1) INTO allowed
    FROM public.workspaces w WHERE w.owner_id = uid AND w.deleted_at IS NULL;
  IF allowed >= 0 AND owned >= allowed THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'workspace_limit_reached',
      DETAIL = format('%s of %s workspaces used', owned, allowed);
  END IF;

  base := COALESCE(NULLIF(regexp_replace(lower(COALESCE(_slug, _name)), '[^a-z0-9]+', '-', 'g'), ''), 'workspace');
  base := btrim(base, '-');
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = candidate) LOOP
    n := n + 1; candidate := base || '-' || n::text;
  END LOOP;

  INSERT INTO public.workspaces (name, slug, owner_id, is_personal)
  VALUES (btrim(_name), candidate, uid, false) RETURNING id INTO ws;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode)
  VALUES (ws, uid, 'owner', 'active', 'all');
  RETURN ws;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text) TO authenticated;

-- seats are counted when the invitation is created, not when it is accepted
CREATE OR REPLACE FUNCTION public.invitation_seat_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.assert_limit(NEW.workspace_id,
      CASE WHEN NEW.role = 'guest' THEN 'guest_seats' ELSE 'seats' END, 1);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_invitations_seat_guard ON public.workspace_invitations;
CREATE TRIGGER trg_workspace_invitations_seat_guard
  BEFORE INSERT ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.invitation_seat_guard();

CREATE OR REPLACE FUNCTION public.brand_limit_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN     -- migrations and the purge are exempt
    PERFORM public.assert_limit(NEW.workspace_id, 'brands', 1);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_brands_limit_guard ON public.brands;
CREATE TRIGGER trg_brands_limit_guard
  BEFORE INSERT ON public.brands FOR EACH ROW EXECUTE FUNCTION public.brand_limit_guard();

-- ── the signup grant is once per PERSON, not once per workspace ─────────────
-- Before this, every workspace insert minted 500 credits and nothing capped workspace
-- creation: free credits were unbounded (A25).
CREATE OR REPLACE FUNCTION public.ensure_credit_account(_workspace_id uuid)
RETURNS public.credit_accounts
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE acct public.credit_accounts%ROWTYPE; grant_amount bigint := 0; is_personal boolean;
BEGIN
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
  IF FOUND THEN RETURN acct; END IF;

  SELECT w.is_personal INTO is_personal FROM public.workspaces w WHERE w.id = _workspace_id;
  IF COALESCE(is_personal, false) THEN
    grant_amount := public.entitlement(_workspace_id, 'credits.signup_grant');
  END IF;

  INSERT INTO public.credit_accounts (workspace_id, balance_credits, lifetime_granted)
  VALUES (_workspace_id, grant_amount, grant_amount)
  ON CONFLICT (workspace_id) DO NOTHING
  RETURNING * INTO acct;
  IF acct.workspace_id IS NULL THEN
    SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = _workspace_id;
    RETURN acct;
  END IF;

  IF grant_amount > 0 THEN
    INSERT INTO public.credit_ledger (workspace_id, kind, amount, balance_after, reason, idempotency_key)
    VALUES (_workspace_id, 'grant', grant_amount, grant_amount, 'signup grant',
            'signup-grant:' || _workspace_id::text)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN acct;
END;
$$;

DO $$
DECLARE n bigint;
BEGIN
  IF (SELECT count(*) FROM public.plan_entitlements) < 30 THEN
    RAISE EXCEPTION '043 guard: the plan table looks unseeded';
  END IF;
  IF public.entitlement('00000000-0000-0000-0000-000000000000', 'brands') <> 2 THEN
    RAISE EXCEPTION '043 guard: an unknown workspace does not fall back to the free plan';
  END IF;
  IF public.entitlement('00000000-0000-0000-0000-000000000000', 'nonsense.key') <> 0 THEN
    RAISE EXCEPTION '043 guard: an unknown key does not answer 0';
  END IF;
  RAISE NOTICE '043 OK — entitlements';
END $$;
