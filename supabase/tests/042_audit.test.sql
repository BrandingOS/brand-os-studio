-- fixture: access
-- ============================================================================
-- 042 — the audit log (docs/access-architecture/06 §4). Covers A22.
-- ============================================================================
BEGIN;

-- privilege changes are recorded, with what they replaced
DO $$
DECLARE n int; ev public.audit_events%ROWTYPE;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  PERFORM public.set_member_role(pg_temp.ws('A'), pg_temp.uid('victor'), 'admin', NULL, NULL);
  PERFORM pg_temp.back_to_super();

  SELECT * INTO ev FROM public.audit_events
   WHERE workspace_id = pg_temp.ws('A') AND action = 'member.promoted_admin'
     AND target_id = pg_temp.uid('victor')::text ORDER BY id DESC LIMIT 1;
  IF ev.id IS NULL THEN RAISE EXCEPTION '042: promoting a member to admin was not audited'; END IF;
  IF (ev.before->>'role') <> 'member' OR (ev.after->>'role') <> 'admin' THEN
    RAISE EXCEPTION '042: the audit record does not say what changed (% → %)', ev.before, ev.after;
  END IF;
  IF ev.actor_id <> pg_temp.uid('alice') THEN RAISE EXCEPTION '042: the wrong actor was recorded'; END IF;
  RAISE NOTICE '✓ 042 role changes are audited with before/after';
END $$;

-- brand access, invitations, sharing and credit grants all leave a trace
DO $$
DECLARE n int; r jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  PERFORM public.grant_brand_access(pg_temp.brand('A2'), pg_temp.uid('emma'), 'editor');
  r := public.create_invitation(pg_temp.ws('A'), 'audit@example.com', 'admin', 'all', NULL);
  PERFORM public.create_share_link(pg_temp.brand('A1'), 'identity');
  PERFORM pg_temp.back_to_super();
  PERFORM public.grant_credits(pg_temp.ws('A'), 100, 'test top-up', 'audit-042');

  SELECT count(*) INTO n FROM public.audit_events
   WHERE workspace_id = pg_temp.ws('A')
     AND action IN ('brand_access.granted','invitation.created_admin','share.created','credits.grant');
  IF n < 4 THEN RAISE EXCEPTION '042: only % of the 4 sensitive actions were audited', n; END IF;
  RAISE NOTICE '✓ 042 sensitive actions are audited';
END $$;

-- the log outlives what it describes
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  PERFORM public.archive_brand(pg_temp.brand('A2'), true);
  PERFORM pg_temp.back_to_super();
  DELETE FROM public.brands WHERE id = pg_temp.brand('A2');
  SELECT count(*) INTO n FROM public.audit_events
   WHERE action = 'brand.deleted' AND target_id = pg_temp.brand('A2')::text;
  IF n <> 1 THEN RAISE EXCEPTION '042: deleting a brand left no audit record'; END IF;
  SELECT count(*) INTO n FROM public.audit_events WHERE brand_id = pg_temp.brand('A2');
  IF n = 0 THEN RAISE EXCEPTION '042: the brand''s audit history vanished with it'; END IF;
  RAISE NOTICE '✓ 042 the audit log outlives its subject';
END $$;

-- A22 — the log is per tenant, and only for those who may read it
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  SELECT count(*) INTO n FROM public.audit_events WHERE workspace_id = pg_temp.ws('A');
  IF n <> 0 THEN RAISE EXCEPTION 'A22: another tenant read % audit rows', n; END IF;
  PERFORM pg_temp.back_to_super();

  -- emma owns her own personal workspace and may read ITS audit; workspace A's is
  -- what she must not see.
  PERFORM pg_temp.act_as(pg_temp.uid('emma'));      -- member of A: no audit.view there
  SELECT count(*) INTO n FROM public.audit_events WHERE workspace_id = pg_temp.ws('A');
  IF n <> 0 THEN RAISE EXCEPTION 'A22: a member without audit.view read % rows', n; END IF;
  PERFORM pg_temp.back_to_super();

  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  SELECT count(*) INTO n FROM public.audit_events WHERE workspace_id = pg_temp.ws('A');
  IF n = 0 THEN RAISE EXCEPTION 'A22: an owner cannot read their own audit log'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ A22 rls.audit.cross_tenant';
END $$;

-- append-only: nobody edits history
DO $$
DECLARE ok boolean := false; n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  BEGIN
    UPDATE public.audit_events SET action = 'nothing.happened' WHERE workspace_id = pg_temp.ws('A');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION '042: an owner rewrote the audit log'; END IF;

  ok := false;
  BEGIN
    DELETE FROM public.audit_events WHERE workspace_id = pg_temp.ws('A');
    GET DIAGNOSTICS n = ROW_COUNT; ok := (n = 0);
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION '042: an owner deleted audit history'; END IF;

  ok := false;
  BEGIN
    INSERT INTO public.audit_events (workspace_id, action) VALUES (pg_temp.ws('A'), 'forged');
  EXCEPTION WHEN insufficient_privilege THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION '042: a client forged an audit record'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ ALL 042 ASSERTIONS PASSED';
END $$;
ROLLBACK;
