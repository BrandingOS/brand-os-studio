-- fixture: access
-- ============================================================================
-- 038 — the resolver against the shared truth table
-- (supabase/tests/fixtures/access-cases.json, expanded from the matrix in
-- docs/access-architecture/03 §2 and the rules in §3). The SAME file drives the
-- TypeScript resolver's unit test, so the two cannot drift.
-- ============================================================================
BEGIN;

DO $$
DECLARE
  cases   jsonb := '__ACCESS_CASES__'::jsonb;
  c       jsonb;
  got     boolean;
  fails   text[] := ARRAY[]::text[];
  n       int := 0;
BEGIN
  FOR c IN SELECT jsonb_array_elements(cases) LOOP
    n := n + 1;
    got := public.effective_capabilities(
             pg_temp.uid(c->>'actor'),
             pg_temp.ws(c->>'workspace'),
             CASE WHEN c->>'brand' IS NULL THEN NULL ELSE pg_temp.brand(c->>'brand') END
           ) @> ARRAY[c->>'capability'];
    IF got IS DISTINCT FROM (c->>'expected')::boolean THEN
      fails := fails || format('%s %s %s/%s: expected %s got %s',
        c->>'actor', c->>'capability', c->>'workspace', COALESCE(c->>'brand','-'), c->>'expected', got);
    END IF;
  END LOOP;

  IF array_length(fails, 1) > 0 THEN
    RAISE EXCEPTION E'038 resolver: % of % cells wrong:\n%',
      array_length(fails, 1), n, array_to_string(fails[1:25], E'\n');
  END IF;
  RAISE NOTICE '✓ ALL 038 RESOLVER ASSERTIONS PASSED (% cells)', n;
END $$;

-- my_access / my_brand_access shape, as the client will read them
DO $$
DECLARE j jsonb; n int;
BEGIN
  -- Every user also owns the personal workspace the signup trigger made for them, so the
  -- assertion names workspace A rather than counting rows.
  PERFORM pg_temp.act_as(pg_temp.uid('dana'));
  j := public.my_access();
  SELECT count(*) INTO n FROM jsonb_array_elements(j->'workspaces') w
   WHERE (w->>'id')::uuid = pg_temp.ws('A') AND w->>'role' = 'member' AND w->>'mode' = 'selected';
  IF n <> 1 THEN RAISE EXCEPTION '038: dana should appear in workspace A as a selected-brands member'; END IF;
  SELECT count(*) INTO n FROM jsonb_array_elements(j->'workspaces') w
   WHERE (w->>'id')::uuid = pg_temp.ws('B');
  IF n <> 0 THEN RAISE EXCEPTION '038: dana must not see workspace B'; END IF;
  -- her own personal workspace makes her an owner there, and nowhere else
  SELECT count(*) INTO n FROM jsonb_array_elements(j->'workspaces') w WHERE w->>'role' = 'owner';
  IF n <> 1 THEN RAISE EXCEPTION '038: dana should own exactly her personal workspace, owns %', n; END IF;

  j := public.my_brand_access(pg_temp.ws('A'));
  SELECT count(*) INTO n FROM jsonb_array_elements(j->'brands');
  -- dana has selected access to A1 and A2; A3 is archived and she has no grant on it
  IF n <> 2 THEN RAISE EXCEPTION '038: dana should reach 2 brands, reached %', n; END IF;

  PERFORM pg_temp.act_as(pg_temp.uid('grace'));
  j := public.my_brand_access(pg_temp.ws('A'));
  SELECT count(*) INTO n FROM jsonb_array_elements(j->'brands');
  IF n <> 1 THEN RAISE EXCEPTION '038: grace should reach exactly 1 brand, reached %', n; END IF;

  PERFORM pg_temp.act_as(pg_temp.uid('bob'));
  j := public.my_brand_access(pg_temp.ws('A'));
  SELECT count(*) INTO n FROM jsonb_array_elements(j->'brands');
  IF n <> 0 THEN RAISE EXCEPTION '038: bob must reach no brand in workspace A, reached %', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ ALL 038 my_access ASSERTIONS PASSED';
END $$;

-- the helpers RLS will use return the same answer as the resolver
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(pg_temp.uid('victor'));   -- member · all · viewer
  SELECT count(*) INTO n FROM public.brands_with_capability('brand.view');
  IF n <> 3 THEN RAISE EXCEPTION '038: victor should see 3 brands (A1,A2,A3), saw %', n; END IF;
  SELECT count(*) INTO n FROM public.brands_with_capability('designs.edit');
  IF n <> 0 THEN RAISE EXCEPTION '038: a viewer must not edit designs anywhere, got %', n; END IF;
  -- victor owns his own personal workspace, where he may invite; the assertion is about
  -- workspace A, where he is only a member.
  SELECT count(*) INTO n FROM public.workspaces_with_capability('members.invite') w
   WHERE w = pg_temp.ws('A');
  IF n <> 0 THEN RAISE EXCEPTION '038: a member must not invite in workspace A, got %', n; END IF;

  PERFORM pg_temp.act_as(pg_temp.uid('emma'));     -- member · all · editor
  SELECT count(*) INTO n FROM public.brands_with_capability('designs.edit');
  IF n <> 2 THEN RAISE EXCEPTION '038: emma should edit designs in 2 live brands, got %', n; END IF;
  SELECT count(*) INTO n FROM public.brands_with_capability('brand.view');
  IF n <> 3 THEN RAISE EXCEPTION '038: emma should view 3 brands incl. the archived one, got %', n; END IF;

  PERFORM pg_temp.act_as(pg_temp.uid('alice'));
  SELECT count(*) INTO n FROM public.workspaces_with_capability('members.invite') w
   WHERE w = pg_temp.ws('A');
  IF n <> 1 THEN RAISE EXCEPTION '038: alice should invite in workspace A, got %', n; END IF;
  PERFORM pg_temp.back_to_super();
  RAISE NOTICE '✓ ALL 038 HELPER ASSERTIONS PASSED';
END $$;
ROLLBACK;
