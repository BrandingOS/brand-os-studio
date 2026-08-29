-- fixture: access
-- ============================================================================
-- 041 — share links (docs/access-architecture/05 §2). Covers A15, A30.
-- ============================================================================
BEGIN;

-- A30 — anon can no longer read any tenant table, only resolve a token
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.brands;
  IF n <> 0 THEN RAISE EXCEPTION 'A30: anon read % brands directly', n; END IF;
  SELECT count(*) INTO n FROM public.share_links;
  IF n <> 0 THEN RAISE EXCEPTION 'A30: anon read the share-link table'; END IF;
  SELECT count(*) INTO n FROM public.brand_identity_publications;
  IF n <> 0 THEN RAISE EXCEPTION 'A30: anon enumerated published snapshots'; END IF;
  RESET ROLE;
  RAISE NOTICE '✓ A30 share.enumerate';
END $$;

-- an editor may share a design; only a manager may publish the brand
DO $$
DECLARE r jsonb; ok boolean := false;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('emma'));       -- member · all · editor
  r := public.create_share_link(pg_temp.brand('A1'), 'design', 'design-a1-emma');
  IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION '041: an editor could not share a design'; END IF;
  PERFORM set_config('test041.design_token', r->>'token', true);

  BEGIN r := public.create_share_link(pg_temp.brand('A1'), 'identity');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION '041: an editor published the brand publicly'; END IF;
  PERFORM pg_temp.back_to_super();

  PERFORM pg_temp.act_as(pg_temp.uid('alice'));      -- owner ⇒ manager everywhere
  r := public.create_share_link(pg_temp.brand('A1'), 'identity');
  PERFORM set_config('test041.identity_token', r->>'token', true);
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 041 create_share_link capability split';
END $$;

-- a designer cannot share at all, and a viewer certainly cannot
DO $$
DECLARE ok boolean := false; r jsonb;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('dana'));       -- designer on A1
  BEGIN r := public.create_share_link(pg_temp.brand('A1'), 'design', 'design-a1-dana');
  EXCEPTION WHEN OTHERS THEN ok := (SQLERRM = 'permission_denied'); END;
  IF NOT ok THEN RAISE EXCEPTION '041: a designer minted a share link'; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ 041 share.link is not a designer capability';
END $$;

-- A15 — a token resolves, a wrong one does not, and neither reveals anything
DO $$
DECLARE r jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  r := public.resolve_share_link(current_setting('test041.design_token'));
  IF (r->>'valid')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'A15: a live link did not resolve'; END IF;
  IF (r->'payload'->'design'->>'id') <> 'design-a1-emma' THEN
    RAISE EXCEPTION 'A15: the link resolved to the wrong design';
  END IF;

  r := public.resolve_share_link('nope-nope-nope-nope-nope-nope-nope-nope-000');
  IF (r->>'valid')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'A15: a guessed token resolved'; END IF;
  IF r ? 'brandName' OR r ? 'payload' THEN RAISE EXCEPTION 'A15: an invalid token leaked brand data'; END IF;
  RESET ROLE;
  RAISE NOTICE '✓ A15 share.guess';
END $$;

-- a link reaches ONE artifact: the design link does not carry the brand's identity
DO $$
DECLARE r jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  r := public.resolve_share_link(current_setting('test041.design_token'));
  IF r->'payload' ? 'brand' OR r->'payload' ? 'snapshot' THEN
    RAISE EXCEPTION 'A15b: a design link exposed the brand record';
  END IF;
  RESET ROLE;
  RAISE NOTICE '✓ A15b a link reaches one artifact';
END $$;

-- password-protected links
DO $$
DECLARE r jsonb; tok text;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  r := public.create_share_link(pg_temp.brand('A2'), 'showcase', NULL, false, NULL, 'hunter2');
  tok := r->>'token';
  PERFORM pg_temp.back_to_super();

  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  r := public.resolve_share_link(tok);
  IF (r->>'valid')::boolean IS NOT FALSE OR (r->>'needsPassword')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '041: a protected link opened without the password';
  END IF;
  r := public.resolve_share_link(tok, 'wrong');
  IF (r->>'valid')::boolean IS NOT FALSE THEN RAISE EXCEPTION '041: a wrong password opened the link'; END IF;
  r := public.resolve_share_link(tok, 'hunter2');
  IF (r->>'valid')::boolean IS NOT TRUE THEN RAISE EXCEPTION '041: the right password did not open the link'; END IF;
  RESET ROLE;
  RAISE NOTICE '✓ 041 password-protected links';
END $$;

-- going private revokes every live link for that brand
DO $$
DECLARE r jsonb; n int;
BEGIN
  UPDATE public.brands SET is_public = true WHERE id = pg_temp.brand('A1');
  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  UPDATE public.brands SET is_public = false WHERE id = pg_temp.brand('A1');
  PERFORM pg_temp.back_to_super();

  SELECT count(*) INTO n FROM public.share_links
   WHERE brand_id = pg_temp.brand('A1') AND revoked_at IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '041: % links survived the brand going private', n; END IF;

  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  r := public.resolve_share_link(current_setting('test041.design_token'));
  IF (r->>'valid')::boolean IS NOT FALSE THEN RAISE EXCEPTION '041: a revoked link still resolves'; END IF;
  RESET ROLE;
  RAISE NOTICE '✓ 041 private revokes links';
END $$;

-- the showcase route is gated server-side on is_public
DO $$
DECLARE r jsonb; a2_slug text;
BEGIN
  -- set_brand_slug() regenerates the slug on INSERT (OLD is NULL, so the name always
  -- "changed"), so read what the row actually carries rather than what the fixture asked for.
  SELECT slug INTO a2_slug FROM public.brands WHERE id = pg_temp.brand('A2');

  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  r := public.resolve_showcase(a2_slug);
  IF (r->>'valid')::boolean IS NOT FALSE THEN RAISE EXCEPTION '041: a private brand showcased'; END IF;
  RESET ROLE;

  UPDATE public.brands SET is_public = true WHERE id = pg_temp.brand('A2');
  PERFORM set_config('request.jwt.claims', NULL, true);
  SET LOCAL ROLE anon;
  r := public.resolve_showcase(a2_slug);
  IF (r->>'valid')::boolean IS NOT TRUE THEN RAISE EXCEPTION '041: a public brand did not showcase'; END IF;
  IF r->'brand' ? 'business_info' THEN RAISE EXCEPTION '041: the showcase leaked business info'; END IF;
  RESET ROLE;
  RAISE NOTICE '✓ ALL 041 ASSERTIONS PASSED';
END $$;
ROLLBACK;
