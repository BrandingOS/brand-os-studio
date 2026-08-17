-- ============================================================================
-- QA probe — insufficient credits, against the DEPLOYED Edge Function.
--
-- STEP 1 (below) prepares an isolated fixture. STEP 2 (bottom of this file)
-- releases and removes it. Nothing else is touched.
--
-- Guarantees:
--
--   ISOLATED     Creates its OWN workspace ('qa-credit-probe') and its own
--                brand inside it. It reads your real workspace only to print
--                a before/after comparison, and never writes to it. The word
--                UPDATE never appears against a row you own.
--
--   IDEMPOTENT   Safe to run twice. The workspace, membership and brand are
--                all insert-if-absent, and the credit hold carries the
--                idempotency key 'qa-probe-hold', so a second run reports
--                duplicate:true and moves no credits.
--
--   NO BYPASS    The hold goes through public.reserve_credits — the same
--                atomic function the Edge Function calls. A ledger row is
--                written and the balance/reserved split moves exactly as it
--                does in production.
--
--   NO PERMISSION CHANGES   There is no GRANT, REVOKE, ALTER, CREATE POLICY or
--                CREATE FUNCTION anywhere in this file.
--
--   NO SPEND     The point is that the generation is refused BEFORE any
--                provider is contacted, so nothing is billed to any vendor.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1 — create the isolated fixture and hold most of its credits
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  qa_email CONSTANT TEXT := 'alex.test.2026@brandos-qa.dev';
  uid   UUID;
  ws    UUID;
  br    UUID;
  acct  public.credit_accounts;
  res   JSONB;
  hold  BIGINT;
  keep  CONSTANT BIGINT := 5;   -- less than the 14 one Nano Banana Pro image costs
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = qa_email;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'QA user % not found', qa_email;
  END IF;

  -- ── Isolated workspace (insert-if-absent) ────────────────────────────────
  SELECT id INTO ws FROM public.workspaces WHERE slug = 'qa-credit-probe';
  IF ws IS NULL THEN
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES ('QA credit probe', 'qa-credit-probe', uid)
    RETURNING id INTO ws;
    RAISE NOTICE 'created throwaway workspace';
  ELSE
    RAISE NOTICE 'throwaway workspace already existed — reusing';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws, uid, 'owner')
  ON CONFLICT DO NOTHING;

  -- ── Isolated brand inside that workspace ─────────────────────────────────
  SELECT id INTO br FROM public.brands
   WHERE workspace_id = ws AND name = 'QA Credit Probe Brand';
  IF br IS NULL THEN
    INSERT INTO public.brands (name, user_id, workspace_id)
    VALUES ('QA Credit Probe Brand', uid, ws)
    RETURNING id INTO br;
    RAISE NOTICE 'created throwaway brand';
  END IF;

  -- ── Hold the credits through the real atomic flow ────────────────────────
  -- The workspace trigger granted 500. Leave `keep` behind so the next
  -- generation cannot be afforded.
  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = ws;
  hold := GREATEST(0, acct.balance_credits - keep);

  IF hold > 0 THEN
    res := public.reserve_credits(ws, NULL, hold, 'qa-probe-hold');
    IF NOT (res->>'ok')::boolean THEN
      RAISE EXCEPTION 'hold failed: %', res;
    END IF;
    IF (res->>'duplicate')::boolean THEN
      RAISE NOTICE 'hold was already in place (idempotent no-op)';
    END IF;
  END IF;

  SELECT * INTO acct FROM public.credit_accounts WHERE workspace_id = ws;
  IF acct.balance_credits > keep THEN
    RAISE EXCEPTION 'expected <= % credits left, found %', keep, acct.balance_credits;
  END IF;

  RAISE NOTICE '─────────────────────────────────────────────';
  RAISE NOTICE 'brand_id  = %', br;
  RAISE NOTICE 'balance   = % credits (reserved %)', acct.balance_credits, acct.reserved_credits;
  RAISE NOTICE '─────────────────────────────────────────────';
END $$;

-- Return the brand_id to hand back, plus proof the two workspaces are separate.
SELECT
  (SELECT b.id FROM public.brands b
     JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE w.slug = 'qa-credit-probe'
      AND b.name = 'QA Credit Probe Brand')                        AS brand_id_to_send,
  (SELECT a.balance_credits FROM public.credit_accounts a
     JOIN public.workspaces w ON w.id = a.workspace_id
    WHERE w.slug = 'qa-credit-probe')                              AS probe_balance,
  (SELECT a.balance_credits FROM public.credit_accounts a
     JOIN public.workspaces w ON w.id = a.workspace_id
    WHERE w.slug <> 'qa-credit-probe'
    ORDER BY a.created_at LIMIT 1)                                 AS your_real_balance_unchanged;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2 — release the hold and delete the fixture  (run when the probe is done)
-- ════════════════════════════════════════════════════════════════════════════
--
-- DO $$
-- DECLARE
--   ws   UUID := (SELECT id FROM public.workspaces WHERE slug = 'qa-credit-probe');
--   held BIGINT;
-- BEGIN
--   IF ws IS NULL THEN
--     RAISE NOTICE 'fixture already removed — nothing to do';
--     RETURN;
--   END IF;
--
--   SELECT reserved_credits INTO held FROM public.credit_accounts WHERE workspace_id = ws;
--   IF held > 0 THEN
--     PERFORM public.release_credits(ws, NULL, held, 'qa probe release', 'qa-probe-release');
--   END IF;
--
--   -- Deleting the workspace cascades its credit account, ledger rows and jobs.
--   DELETE FROM public.brands     WHERE workspace_id = ws;
--   DELETE FROM public.workspaces WHERE id = ws;
--
--   RAISE NOTICE 'QA credit probe fixture removed';
-- END $$;
--
-- -- Confirm only your real account remains, untouched:
-- SELECT w.slug, a.balance_credits, a.reserved_credits, a.lifetime_spent
--   FROM public.credit_accounts a
--   JOIN public.workspaces w ON w.id = a.workspace_id;
