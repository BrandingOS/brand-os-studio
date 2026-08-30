-- ============================================================================
-- 038 — Capabilities: the catalog, the resolver, ownership invariants, and the
-- RPCs that are the ONLY way membership and brand access change.
--
-- docs/access-architecture/03-authorization-model.md is the specification; this
-- file is its implementation. Nothing here changes any policy — 039 does that.
--
-- Conventions (docs/access-architecture/08-migration-plan.md §1.1):
--   • SECURITY DEFINER + SET search_path = '' on everything
--   • extension calls schema-qualified (extensions.*)
--   • (SELECT auth.uid()), never bare auth.uid(), inside predicates
--   • has_capability() is scalar and is NEVER used in a list-shaped policy;
--     brands_with_capability()/workspaces_with_capability() are, and the planner
--     evaluates them once per statement when used uncorrelated.
--
-- THE ROLE COLUMN IS READ THROUGH ONE VIEW. `workspace_members.role_v2` is
-- renamed to `role` in 039; every function below reads
-- `public.workspace_member_state`, so 039 replaces exactly one object rather
-- than a dozen function bodies (DB review B1).
-- ============================================================================

-- ── the one place that knows which column holds the role ────────────────────
CREATE OR REPLACE VIEW public.workspace_member_state AS
  SELECT m.id, m.workspace_id, m.user_id,
         m.role_v2 AS role,
         m.status, m.brand_access_mode, m.default_brand_role,
         m.capability_overrides, m.credits_monthly_cap
  FROM public.workspace_members m;
REVOKE ALL ON public.workspace_member_state FROM PUBLIC, anon, authenticated;
COMMENT ON VIEW public.workspace_member_state IS
  'Column-stable read of workspace_members for the access resolver. 039 re-points role_v2 → role here and nowhere else.';

-- ── the catalog ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_capabilities (
  scope      text NOT NULL CHECK (scope IN ('workspace','brand')),
  role       text NOT NULL,
  capability text NOT NULL,
  PRIMARY KEY (scope, role, capability)
);
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_capabilities_read ON public.role_capabilities;
CREATE POLICY role_capabilities_read ON public.role_capabilities
  FOR SELECT TO authenticated USING (true);   -- the matrix is product documentation, not a secret
COMMENT ON TABLE public.role_capabilities IS
  'Role → capability presets (docs/access-architecture/03 §2). Mirrored in src/shared/access/catalog.ts; a unit test asserts parity.';

DELETE FROM public.role_capabilities;
INSERT INTO public.role_capabilities (scope, role, capability) VALUES
  ('workspace','owner','workspace.view'),
  ('workspace','admin','workspace.view'),
  ('workspace','member','workspace.view'),
  ('workspace','guest','workspace.view'),
  ('workspace','owner','workspace.settings.view'),
  ('workspace','admin','workspace.settings.view'),
  ('workspace','member','workspace.settings.view'),
  ('workspace','owner','workspace.settings.edit'),
  ('workspace','admin','workspace.settings.edit'),
  ('workspace','owner','workspace.delete'),
  ('workspace','owner','workspace.transfer_ownership'),
  ('workspace','owner','workspace.billing.view'),
  ('workspace','admin','workspace.billing.view'),
  ('workspace','owner','workspace.billing.manage'),
  ('workspace','admin','workspace.billing.manage'),
  ('workspace','owner','workspace.usage.view'),
  ('workspace','admin','workspace.usage.view'),
  ('workspace','owner','members.view'),
  ('workspace','admin','members.view'),
  ('workspace','member','members.view'),
  ('workspace','owner','members.invite'),
  ('workspace','admin','members.invite'),
  ('workspace','owner','members.manage'),
  ('workspace','admin','members.manage'),
  ('workspace','owner','members.remove'),
  ('workspace','admin','members.remove'),
  ('workspace','owner','brands.list'),
  ('workspace','admin','brands.list'),
  ('workspace','member','brands.list'),
  ('workspace','guest','brands.list'),
  ('workspace','owner','brands.create'),
  ('workspace','admin','brands.create'),
  ('workspace','owner','brands.delete'),
  ('workspace','admin','brands.delete'),
  ('workspace','owner','audit.view'),
  ('workspace','admin','audit.view'),
  ('workspace','owner','activity.view'),
  ('workspace','admin','activity.view'),
  ('workspace','member','activity.view'),
  ('brand','manager','brand.view'),
  ('brand','editor','brand.view'),
  ('brand','designer','brand.view'),
  ('brand','viewer','brand.view'),
  ('brand','manager','brand.settings.view'),
  ('brand','editor','brand.settings.view'),
  ('brand','manager','brand.settings.edit'),
  ('brand','manager','brand.card.edit'),
  ('brand','editor','brand.card.edit'),
  ('brand','manager','brand.archive'),
  ('brand','manager','brand.access.view'),
  ('brand','editor','brand.access.view'),
  ('brand','manager','brand.access.manage'),
  ('brand','manager','brand.setup.edit'),
  ('brand','editor','brand.setup.edit'),
  ('brand','manager','brand.strategy.edit'),
  ('brand','editor','brand.strategy.edit'),
  ('brand','manager','brand.kit.generate'),
  ('brand','editor','brand.kit.generate'),
  ('brand','designer','brand.kit.generate'),
  ('brand','manager','brand.kit.approve'),
  ('brand','editor','brand.kit.approve'),
  ('brand','manager','brand.kit.export'),
  ('brand','editor','brand.kit.export'),
  ('brand','designer','brand.kit.export'),
  ('brand','manager','designs.create'),
  ('brand','editor','designs.create'),
  ('brand','designer','designs.create'),
  ('brand','manager','designs.edit'),
  ('brand','editor','designs.edit'),
  ('brand','designer','designs.edit'),
  ('brand','manager','designs.delete'),
  ('brand','editor','designs.delete'),
  ('brand','manager','designs.export'),
  ('brand','editor','designs.export'),
  ('brand','designer','designs.export'),
  ('brand','manager','templates.save'),
  ('brand','editor','templates.save'),
  ('brand','designer','templates.save'),
  ('brand','manager','templates.submit_community'),
  ('brand','manager','library.upload'),
  ('brand','editor','library.upload'),
  ('brand','designer','library.upload'),
  ('brand','manager','library.edit'),
  ('brand','editor','library.edit'),
  ('brand','designer','library.edit'),
  ('brand','manager','library.delete'),
  ('brand','editor','library.delete'),
  ('brand','manager','ai.generate'),
  ('brand','editor','ai.generate'),
  ('brand','designer','ai.generate'),
  ('brand','manager','share.view'),
  ('brand','editor','share.view'),
  ('brand','manager','share.link'),
  ('brand','editor','share.link'),
  ('brand','manager','share.publish_public'),
  ('brand','manager','activity.view'),
  ('brand','editor','activity.view'),
  ('brand','designer','activity.view')
ON CONFLICT DO NOTHING;

-- ── reserved and overridable sets ───────────────────────────────────────────
-- RESERVED: the capability id exists so UI and future policies share a name, but the
-- resource is still per-device (ADR-008). Nobody may hold one — nothing can be
-- "granted" for a thing the server cannot enforce.
CREATE OR REPLACE FUNCTION public.reserved_capabilities()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT ARRAY['brand.guideline.edit','brand.guideline.export','comments.create',
               'approvals.review','workspace.credits.manage']::text[];
$$;

-- What a per-member / per-brand override may touch. Everything else is role-bound:
-- you change the role, not the override (ADR-003).
CREATE OR REPLACE FUNCTION public.overridable_capabilities(_scope text, _role text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN _scope = 'workspace' AND _role IN ('member','guest') THEN
      -- The last three are BRAND capabilities held at workspace scope: a member whose mode
      -- is `all` has no brand_access row to hang the named switches on, so "can export" /
      -- "can use AI" for every brand they reach lives here. A per-brand deny still wins
      -- (see effective_capabilities: brand denies are applied over the union).
      ARRAY['brands.create','workspace.usage.view','workspace.billing.view',
            'workspace.billing.manage','members.view','activity.view',
            'designs.export','brand.kit.export','ai.generate']::text[]
    WHEN _scope = 'workspace' THEN ARRAY[]::text[]          -- owner/admin take no overrides
    -- Brand scope is deliberately role-BLIND: the only writer of
    -- brand_access.capability_overrides is grant_brand_access, which requires
    -- brand.access.manage — a manager, who already holds everything in this list. Narrowing
    -- per role would add a ceiling nobody can currently exceed. (Pass A, F3.)
    WHEN _scope = 'brand' THEN
      ARRAY['brand.settings.view','brand.card.edit','brand.access.view','brand.setup.edit',
            'brand.strategy.edit','brand.kit.generate','brand.kit.approve','brand.kit.export',
            'designs.create','designs.edit','designs.delete','designs.export','templates.save',
            'library.upload','library.edit','library.delete','ai.generate','share.view',
            'share.link','activity.view']::text[]
    ELSE ARRAY[]::text[]
  END;
$$;

-- ── the resolver (docs/access-architecture/03 §3) ───────────────────────────
-- Platform super_admins are deliberately NOT special-cased here: the admin panel has its
-- own admin_*_all policies, and a product surface must not silently show one user every
-- tenant's work.
CREATE OR REPLACE FUNCTION public.effective_capabilities(
  _user_id uuid, _workspace_id uuid, _brand_id uuid DEFAULT NULL)
RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  m           public.workspace_member_state%ROWTYPE;
  b           public.brands%ROWTYPE;
  ws_caps     text[] := ARRAY[]::text[];
  br_caps     text[] := ARRAY[]::text[];
  brole       public.brand_role;
  grant_ov    text[];
  deny_ov     text[];
  ws_deny     text[] := ARRAY[]::text[];
  br_grant    text[] := ARRAY[]::text[];
  ba          public.brand_access%ROWTYPE;
BEGIN
  IF _user_id IS NULL OR _workspace_id IS NULL THEN RETURN ARRAY[]::text[]; END IF;

  -- 2. an active membership of a live workspace, or nothing at all
  SELECT s.* INTO m
    FROM public.workspace_member_state s
    JOIN public.workspaces w ON w.id = s.workspace_id AND w.deleted_at IS NULL
   WHERE s.workspace_id = _workspace_id AND s.user_id = _user_id AND s.status = 'active';
  IF NOT FOUND OR m.role IS NULL THEN RETURN ARRAY[]::text[]; END IF;

  -- 3. workspace preset ⊕ overrides
  SELECT COALESCE(array_agg(rc.capability), ARRAY[]::text[]) INTO ws_caps
    FROM public.role_capabilities rc
   WHERE rc.scope = 'workspace' AND rc.role = m.role::text;
  SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO grant_ov
    FROM jsonb_array_elements_text(COALESCE(m.capability_overrides->'grant','[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO deny_ov
    FROM jsonb_array_elements_text(COALESCE(m.capability_overrides->'deny','[]'::jsonb)) x;
  ws_caps := ARRAY(SELECT DISTINCT unnest(ws_caps || grant_ov) EXCEPT SELECT unnest(deny_ov));
  -- Held for the FINAL subtraction. A workspace-level deny must survive the brand preset:
  -- "Can use AI generation" is stored here for an `all`-mode member, and step 8 re-adds
  -- ai.generate from the brand role, silently undoing the switch. (Pass C, F1.)
  ws_deny := deny_ov;

  -- 4. workspace scope only
  IF _brand_id IS NULL THEN
    RETURN ARRAY(SELECT unnest(ws_caps) EXCEPT SELECT unnest(public.reserved_capabilities()));
  END IF;

  -- 5. a brand in another workspace does not exist for this context
  SELECT * INTO b FROM public.brands WHERE id = _brand_id;
  IF NOT FOUND OR b.workspace_id IS DISTINCT FROM _workspace_id THEN RETURN ARRAY[]::text[]; END IF;

  -- 7. which brand role, if any
  SELECT * INTO ba FROM public.brand_access WHERE brand_id = _brand_id AND user_id = _user_id;
  IF m.role IN ('owner','admin') THEN
    brole := 'manager';
  ELSIF FOUND THEN
    brole := ba.role;
  ELSIF m.brand_access_mode = 'all' THEN
    brole := m.default_brand_role;
  ELSE
    brole := NULL;
  END IF;
  IF brole IS NULL THEN
    RETURN ARRAY(SELECT unnest(ws_caps) EXCEPT SELECT unnest(public.reserved_capabilities()));
  END IF;

  -- 6. an archived brand is read-only for EVERYONE; managers keep the key to restore it
  IF b.archived_at IS NOT NULL THEN
    ws_caps := ws_caps || ARRAY['brand.view']::text[];
    IF m.role IN ('owner','admin') OR brole = 'manager' THEN
      ws_caps := ws_caps || ARRAY['brand.archive']::text[];
    END IF;
    RETURN ARRAY(SELECT DISTINCT unnest(ws_caps) EXCEPT SELECT unnest(public.reserved_capabilities()));
  END IF;

  -- 8. brand preset ⊕ per-brand overrides
  SELECT COALESCE(array_agg(rc.capability), ARRAY[]::text[]) INTO br_caps
    FROM public.role_capabilities rc
   WHERE rc.scope = 'brand' AND rc.role = brole::text;
  deny_ov := ARRAY[]::text[];
  IF ba.brand_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO grant_ov
      FROM jsonb_array_elements_text(COALESCE(ba.capability_overrides->'grant','[]'::jsonb)) x;
    SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO deny_ov
      FROM jsonb_array_elements_text(COALESCE(ba.capability_overrides->'deny','[]'::jsonb)) x;
    br_grant := grant_ov;
    br_caps := ARRAY(SELECT DISTINCT unnest(br_caps || grant_ov));
  END IF;

  -- a guest never publishes a client's work to a public catalogue, whatever their brand role
  IF m.role = 'guest' THEN
    br_caps := ARRAY(SELECT unnest(br_caps) EXCEPT SELECT 'templates.submit_community');
  END IF;

  -- Precedence, applied last so nothing downstream can undo it:
  --   per-brand GRANT   beats a workspace-wide deny  ("no AI, except on Client A")
  --   workspace DENY    beats every role preset      (the named switches live here)
  --   per-brand DENY    beats everything             ("…except on Client B")
  RETURN ARRAY(
    SELECT DISTINCT unnest(ws_caps || br_caps)
    EXCEPT SELECT unnest(ARRAY(SELECT unnest(ws_deny) EXCEPT SELECT unnest(br_grant)))
    EXCEPT SELECT unnest(deny_ov)
    EXCEPT SELECT unnest(public.reserved_capabilities()));
END;
$$;

CREATE OR REPLACE FUNCTION public.has_capability(
  _capability text, _workspace_id uuid, _brand_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.effective_capabilities((SELECT auth.uid()), _workspace_id, _brand_id) @> ARRAY[_capability];
$$;
COMMENT ON FUNCTION public.has_capability(text, uuid, uuid) IS
  'Scalar check for Edge Functions, RPC preludes and single-row WITH CHECK. NEVER use in a list-shaped policy — use brands_with_capability()/workspaces_with_capability() there.';

-- ── set-returning helpers: what RLS uses ────────────────────────────────────
-- Uncorrelated in a policy (`x IN (SELECT …)`), so the planner runs them once per
-- statement over the caller's OWN memberships, not once per scanned row.
CREATE OR REPLACE FUNCTION public.workspaces_with_capability(_capability text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.workspace_id
    FROM public.workspace_member_state s
    JOIN public.workspaces w ON w.id = s.workspace_id AND w.deleted_at IS NULL
   WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'active'
     AND public.effective_capabilities(s.user_id, s.workspace_id, NULL) @> ARRAY[_capability];
$$;

CREATE OR REPLACE FUNCTION public.brands_with_capability(_capability text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  -- Evaluated ONCE per statement when used uncorrelated in a policy, but it still had to
  -- call the resolver once per brand — 500 plpgsql calls for an agency's dashboard, ~150ms.
  --
  -- For a brand with NO brand_access row that is NOT archived, every input the resolver
  -- reads is identical across the workspace (workspace role, mode, default brand role,
  -- workspace overrides), so the answer is too. Those are evaluated once on a
  -- representative brand and the answer reused; brands with an explicit grant, and
  -- archived brands, are still evaluated individually. The resolver remains the single
  -- authority — this changes how OFTEN it is asked, never what it answers.
  WITH mem AS (
    SELECT s.workspace_id, s.user_id
      FROM public.workspace_member_state s
      JOIN public.workspaces w ON w.id = s.workspace_id AND w.deleted_at IS NULL
     WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'active'
  ),
  tagged AS (
    SELECT b.id, b.workspace_id, m.user_id,
           (b.archived_at IS NOT NULL
            OR EXISTS (SELECT 1 FROM public.brand_access ba
                        WHERE ba.brand_id = b.id AND ba.user_id = m.user_id)) AS individual
      FROM public.brands b
      JOIN mem m ON m.workspace_id = b.workspace_id
  ),
  bulk AS (
    SELECT workspace_id, user_id, (array_agg(id ORDER BY id))[1] AS rep   -- no min(uuid) in pg
      FROM tagged WHERE NOT individual
     GROUP BY workspace_id, user_id
  ),
  bulk_answer AS (
    SELECT workspace_id,
           public.effective_capabilities(user_id, workspace_id, rep) @> ARRAY[_capability] AS held
      FROM bulk
  )
  SELECT t.id FROM tagged t
    JOIN bulk_answer a ON a.workspace_id = t.workspace_id
   WHERE NOT t.individual AND a.held
  UNION
  SELECT t.id FROM tagged t
   WHERE t.individual
     AND public.effective_capabilities(t.user_id, t.workspace_id, t.id) @> ARRAY[_capability];
$$;

-- A GRANT does not undo the `public` schema's default EXECUTE, so each of these would
-- still carry an `anon=X` ACL entry and be callable with no session at all. They fail
-- closed today only because auth.uid() is NULL for anon — one mistake away from being the
-- whole boundary. Revoke first, then grant. NOTE: CREATE OR REPLACE resets a function's
-- ACL, so these must stay AFTER every definition above. (Pass A, F1.)
REVOKE ALL ON FUNCTION public.has_capability(text, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workspaces_with_capability(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.brands_with_capability(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_capability(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspaces_with_capability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.brands_with_capability(text) TO authenticated;
-- effective_capabilities takes an arbitrary _user_id, so it stays server-side: granting it
-- would let any member ask what any other member can do. Clients use my_access()/has_capability().
REVOKE ALL ON FUNCTION public.effective_capabilities(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── what the client hydrates from ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_access()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('workspaces', COALESCE(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb))
  FROM (
    SELECT jsonb_build_object(
             'id', w.id, 'name', w.name, 'slug', w.slug, 'isPersonal', w.is_personal,
             'role', s.role, 'mode', s.brand_access_mode, 'defaultBrandRole', s.default_brand_role,
             'overrides', s.capability_overrides, 'creditsMonthlyCap', s.credits_monthly_cap,
             'capabilities', public.effective_capabilities(s.user_id, w.id, NULL)) AS x
      FROM public.workspace_member_state s
      JOIN public.workspaces w ON w.id = s.workspace_id AND w.deleted_at IS NULL
     WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'active'
  ) q;
$$;

-- Brand-level access for ONE workspace, fetched on switch (03 §4.2 — my_access() must not
-- carry every brand of an agency with an unlimited brand entitlement).
CREATE OR REPLACE FUNCTION public.my_brand_access(_workspace_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  -- One resolver call per brand, not two. This filtered on
  -- effective_capabilities(...) @> ARRAY['brand.view'] and then called it AGAIN to build
  -- the payload — 1000 plpgsql calls for a 500-brand agency. The LATERAL computes it once.
  SELECT jsonb_build_object('brands', COALESCE(jsonb_agg(x ORDER BY x->>'id'), '[]'::jsonb))
  FROM (
    SELECT jsonb_build_object(
             'id', b.id, 'slug', b.slug, 'archived', b.archived_at IS NOT NULL,
             'capabilities', c.caps) AS x
      FROM public.brands b
      CROSS JOIN LATERAL (
        SELECT public.effective_capabilities((SELECT auth.uid()), b.workspace_id, b.id) AS caps
      ) c
     WHERE b.workspace_id = _workspace_id
       AND c.caps @> ARRAY['brand.view']
  ) q;
$$;
-- After every CREATE OR REPLACE above, for the reason noted at has_capability.
REVOKE ALL ON FUNCTION public.my_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_brand_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_brand_access(uuid) TO authenticated;

-- ── validators: an override may never exceed its role's ceiling ─────────────
-- Fires on EVERY insert/update, not `OF capability_overrides`: a demotion must re-check and
-- strip overrides the new role cannot hold (security review F7).
CREATE OR REPLACE FUNCTION public.validate_capability_overrides()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  scope     text := TG_ARGV[0];
  role_text text;
  allowed   text[];
  bad       text;
BEGIN
  IF scope = 'workspace' THEN role_text := NEW.role_v2::text; ELSE role_text := NEW.role::text; END IF;
  IF role_text IS NULL THEN RETURN NEW; END IF;
  allowed := public.overridable_capabilities(scope, role_text);

  IF jsonb_typeof(NEW.capability_overrides) <> 'object' THEN
    RAISE EXCEPTION 'capability_overrides must be an object' USING ERRCODE = '22023';
  END IF;

  -- silently strip rather than raise: a role change is a legitimate write that must not fail
  -- because of an override the old role happened to carry.
  NEW.capability_overrides := jsonb_strip_nulls(jsonb_build_object(
    'grant', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
                FROM jsonb_array_elements_text(COALESCE(NEW.capability_overrides->'grant','[]'::jsonb)) x
               WHERE x = ANY (allowed) AND NOT (x = ANY (public.reserved_capabilities()))),
    'deny',  (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
                FROM jsonb_array_elements_text(COALESCE(NEW.capability_overrides->'deny','[]'::jsonb)) x
               WHERE x = ANY (allowed))));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_members_validate_overrides ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_validate_overrides
  BEFORE INSERT OR UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_overrides('workspace');
DROP TRIGGER IF EXISTS trg_brand_access_validate_overrides ON public.brand_access;
CREATE TRIGGER trg_brand_access_validate_overrides
  BEFORE INSERT OR UPDATE ON public.brand_access
  FOR EACH ROW EXECUTE FUNCTION public.validate_capability_overrides('brand');

-- A brand_access row for an owner/admin would be a second source of truth: they are
-- implicit managers everywhere (03 §3 step 7).
CREATE OR REPLACE FUNCTION public.brand_access_refuse_implicit_manager()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r public.workspace_role_v2;
BEGIN
  SELECT s.role INTO r FROM public.workspace_member_state s
   WHERE s.workspace_id = NEW.workspace_id AND s.user_id = NEW.user_id;
  IF r IN ('owner','admin') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'implicit_manager', DETAIL = 'owners and admins are managers of every brand; no grant row is stored';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_brand_access_refuse_implicit ON public.brand_access;
CREATE TRIGGER trg_brand_access_refuse_implicit
  BEFORE INSERT OR UPDATE ON public.brand_access
  FOR EACH ROW EXECUTE FUNCTION public.brand_access_refuse_implicit_manager();

-- ── ownership invariants ────────────────────────────────────────────────────
-- Serialised on the WORKSPACE, not the row: two admins demoting two different owner rows
-- concurrently would both pass a naive count under READ COMMITTED (DB review H3).
CREATE OR REPLACE FUNCTION public.guard_last_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws uuid; owners int; was_owner boolean; still_owner boolean;
BEGIN
  -- A workspace losing its last owner because the WORKSPACE is going away is not an
  -- orphan: an FK cascade runs our trigger one level deeper than the RI action.
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Internal/service context (migrations, prepare_account_purge) carries its own rules —
  -- the purge promotes a successor deliberately (02 §4.4). Same carve-out as
  -- profiles_guard_privileged_columns (029) and guard_immutable_columns.
  IF (SELECT auth.uid()) IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  ws := OLD.workspace_id;
  -- COALESCE, not a bare comparison: a legacy row whose role_v2 is NULL yields NULL here,
  -- `IF NOT NULL` is not true, and the guard would fall through and fire on a NON-owner row.
  was_owner := COALESCE(OLD.role_v2 = 'owner' AND OLD.status = 'active', false);
  IF NOT was_owner THEN RETURN COALESCE(NEW, OLD); END IF;

  still_owner := COALESCE(TG_OP = 'UPDATE' AND NEW.role_v2 = 'owner' AND NEW.status = 'active', false);
  IF still_owner THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(pg_catalog.hashtextextended('ws-owner:' || ws::text, 0));
  SELECT count(*) INTO owners
    FROM public.workspace_members m
   WHERE m.workspace_id = ws AND m.role_v2 = 'owner' AND m.status = 'active' AND m.id <> OLD.id;
  IF owners = 0 AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = ws AND w.deleted_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'last_owner', DETAIL = 'a workspace must keep at least one owner';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_members_guard_last_owner ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_guard_last_owner
  BEFORE UPDATE OR DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_owner();

-- Nobody promotes themselves. transfer_ownership's own self-demote sets a transaction-local
-- GUC the trigger honours (DB review H4).
CREATE OR REPLACE FUNCTION public.guard_self_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.bypass_self_role_change', true) = 'true' THEN RETURN NEW; END IF;
  IF (SELECT auth.uid()) IS NOT NULL
     AND (SELECT auth.uid()) = OLD.user_id
     AND NEW.role_v2 IS DISTINCT FROM OLD.role_v2 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'self_role_change', DETAIL = 'you cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workspace_members_self_role ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_self_role
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_self_role_change();

-- ── generic immutable-column guard (attached to tables in 039) ──────────────
-- Exempts internal writes exactly as profiles_guard_privileged_columns (029) does:
-- prepare_account_purge legitimately reassigns ownership (security review F3).
CREATE OR REPLACE FUNCTION public.guard_immutable_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE col text; old_v text; new_v text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR public.is_super_admin() THEN RETURN NEW; END IF;
  FOREACH col IN ARRAY TG_ARGV LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col, col) INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'immutable_column', DETAIL = format('%s.%s cannot be changed', TG_TABLE_NAME, col);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- RPCs — the only sanctioned way membership and brand access change.
-- Each starts with a capability check and raises a STABLE reason id the client maps
-- (docs/access-architecture/04 §4): permission_denied, last_owner, self_role_change,
-- not_a_member, implicit_manager, already_member.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assert_capability(
  _capability text, _workspace_id uuid, _brand_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_capability(_capability, _workspace_id, _brand_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'permission_denied', DETAIL = format('missing capability %s', _capability);
  END IF;
END; $$;

-- Role and brand-access mode are written TOGETHER: the CHECK is evaluated per statement,
-- and a partial write would either be rejected or leave an incoherent row (DB review M4).
-- Promotion to owner/admin deletes the member's brand_access rows (DB review M3).
CREATE OR REPLACE FUNCTION public.set_member_role(
  _workspace_id uuid, _user_id uuid,
  _role public.workspace_role_v2, _mode public.brand_access_mode DEFAULT NULL,
  _default_brand_role public.brand_role DEFAULT NULL, _overrides jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE eff_mode public.brand_access_mode; eff_default public.brand_role;
BEGIN
  PERFORM public.assert_capability('members.manage', _workspace_id);
  IF _role = 'owner' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'use_transfer_ownership', DETAIL = 'ownership is transferred, not assigned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = _workspace_id AND user_id = _user_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_a_member', DETAIL = 'no such member';
  END IF;

  eff_mode := CASE WHEN _role IN ('owner','admin') THEN 'all'::public.brand_access_mode
                   WHEN _role = 'guest' THEN 'selected'
                   ELSE COALESCE(_mode, 'selected') END;
  eff_default := CASE WHEN _role IN ('owner','admin') THEN NULL
                      ELSE COALESCE(_default_brand_role, 'viewer'::public.brand_role) END;

  UPDATE public.workspace_members
     SET role_v2 = _role,
         brand_access_mode = eff_mode,
         default_brand_role = eff_default,
         capability_overrides = COALESCE(_overrides, capability_overrides),
         updated_at = now()
   WHERE workspace_id = _workspace_id AND user_id = _user_id;

  IF _role IN ('owner','admin') THEN
    DELETE FROM public.brand_access WHERE workspace_id = _workspace_id AND user_id = _user_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_member(_workspace_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.assert_capability('members.remove', _workspace_id);
  -- brand_access cascades through brand_access_membership_fk (037)
  DELETE FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.leave_workspace(_workspace_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = _workspace_id AND user_id = (SELECT auth.uid())) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_a_member', DETAIL = 'not a member';
  END IF;
  -- guard_last_owner refuses if this is the last owner
  DELETE FROM public.workspace_members
   WHERE workspace_id = _workspace_id AND user_id = (SELECT auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_ownership(
  _workspace_id uuid, _to_user uuid, _demote_self boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.assert_capability('workspace.transfer_ownership', _workspace_id);
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = _workspace_id AND user_id = _to_user AND status = 'active') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_a_member', DETAIL = 'the new owner must already be an active member';
  END IF;

  UPDATE public.workspace_members
     SET role_v2 = 'owner', brand_access_mode = 'all', default_brand_role = NULL,
         capability_overrides = '{}'::jsonb, updated_at = now()
   WHERE workspace_id = _workspace_id AND user_id = _to_user;
  DELETE FROM public.brand_access WHERE workspace_id = _workspace_id AND user_id = _to_user;

  IF _demote_self THEN
    -- the caller's own row: legitimate, so the self-role guard is bypassed for this
    -- transaction only (`true` = local, cleared at commit/rollback)
    PERFORM set_config('app.bypass_self_role_change', 'true', true);
    UPDATE public.workspace_members
       SET role_v2 = 'admin', brand_access_mode = 'all', default_brand_role = NULL, updated_at = now()
     WHERE workspace_id = _workspace_id AND user_id = (SELECT auth.uid());
    PERFORM set_config('app.bypass_self_role_change', 'false', true);
  END IF;

  -- workspaces.owner_id is derived: keep it pointed at an actual owner
  UPDATE public.workspaces w SET owner_id = _to_user WHERE w.id = _workspace_id;
END; $$;

-- Every brand grant goes through here, so the guest default cannot be bypassed by a second
-- UI entry point (security review F6). _allow_ai = NULL means "apply the role default".
CREATE OR REPLACE FUNCTION public.grant_brand_access(
  _brand_id uuid, _user_id uuid, _role public.brand_role,
  _overrides jsonb DEFAULT '{}'::jsonb, _allow_ai boolean DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws uuid; wrole public.workspace_role_v2; ov jsonb := COALESCE(_overrides, '{}'::jsonb); deny jsonb;
BEGIN
  SELECT workspace_id INTO ws FROM public.brands WHERE id = _brand_id;
  IF ws IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such brand'; END IF;
  PERFORM public.assert_capability('brand.access.manage', ws, _brand_id);

  SELECT s.role INTO wrole FROM public.workspace_member_state s
   WHERE s.workspace_id = ws AND s.user_id = _user_id;
  IF wrole IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_a_member', DETAIL = 'grant a workspace membership first';
  END IF;

  -- A guest never gets AI unless someone deliberately says so.
  IF (wrole = 'guest' AND COALESCE(_allow_ai, false) = false)
     OR (_allow_ai IS NOT NULL AND _allow_ai = false) THEN
    deny := COALESCE(ov->'deny', '[]'::jsonb);
    IF NOT (deny @> '["ai.generate"]'::jsonb) THEN deny := deny || '["ai.generate"]'::jsonb; END IF;
    ov := jsonb_set(ov, '{deny}', deny);
  END IF;

  INSERT INTO public.brand_access (workspace_id, brand_id, user_id, role, capability_overrides, granted_by)
  VALUES (ws, _brand_id, _user_id, _role, ov, (SELECT auth.uid()))
  ON CONFLICT (brand_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, capability_overrides = EXCLUDED.capability_overrides, updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_brand_access(_brand_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.brands WHERE id = _brand_id;
  IF ws IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such brand'; END IF;
  PERFORM public.assert_capability('brand.access.manage', ws, _brand_id);
  DELETE FROM public.brand_access WHERE brand_id = _brand_id AND user_id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.archive_brand(_brand_id uuid, _archived boolean)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.brands WHERE id = _brand_id;
  IF ws IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such brand'; END IF;
  PERFORM public.assert_capability('brand.archive', ws, _brand_id);
  UPDATE public.brands SET archived_at = CASE WHEN _archived THEN now() ELSE NULL END WHERE id = _brand_id;
END; $$;

-- Direct INSERT on workspaces is removed in 039; this is the only way in, and it is where
-- the owned-workspace entitlement is enforced (Plan B replaces the hook with check_limit).
CREATE OR REPLACE FUNCTION public.create_workspace(_name text, _slug text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE uid uuid := (SELECT auth.uid()); ws uuid; base text; candidate text; n int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated', DETAIL = 'sign in first'; END IF;
  IF COALESCE(btrim(_name), '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_name', DETAIL = 'a workspace needs a name';
  END IF;

  base := COALESCE(NULLIF(regexp_replace(lower(COALESCE(_slug, _name)), '[^a-z0-9]+', '-', 'g'), ''), 'workspace');
  base := btrim(base, '-');
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = candidate) LOOP
    n := n + 1; candidate := base || '-' || n::text;
  END LOOP;

  INSERT INTO public.workspaces (name, slug, owner_id, is_personal)
  VALUES (btrim(_name), candidate, uid, false) RETURNING id INTO ws;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, role_v2, status, brand_access_mode)
  VALUES (ws, uid, 'owner', 'owner', 'active', 'all');
  RETURN ws;
END; $$;

REVOKE ALL ON FUNCTION public.assert_capability(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_member_role(uuid, uuid, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_ownership(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_brand_access(uuid, uuid, public.brand_role, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_brand_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_brand(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_workspace(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, uuid, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_brand_access(uuid, uuid, public.brand_role, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_brand_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_brand(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text) TO authenticated;

-- ── guard rail ──────────────────────────────────────────────────────────────
DO $$
DECLARE n int; r record;
BEGIN
  -- Exact counts: a changed matrix is a decision, so it should make someone look here.
  SELECT count(*) INTO n FROM public.role_capabilities WHERE scope = 'workspace';
  IF n <> 39 THEN RAISE EXCEPTION '038 guard: workspace matrix has % rows, expected 39', n; END IF;
  SELECT count(*) INTO n FROM public.role_capabilities WHERE scope = 'brand';
  IF n <> 59 THEN RAISE EXCEPTION '038 guard: brand matrix has % rows, expected 59', n; END IF;

  -- Monotonicity: each role holds everything the next weaker one holds. A typo that gives a
  -- Designer something an Editor lacks is a real bug, and this is what catches it.
  FOR r IN SELECT * FROM (VALUES
      ('workspace','owner','admin'), ('workspace','admin','member'), ('workspace','member','guest'),
      ('brand','manager','editor'), ('brand','editor','designer'), ('brand','designer','viewer')
    ) AS t(scope, stronger, weaker)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.role_capabilities w
       WHERE w.scope = r.scope AND w.role = r.weaker
         AND NOT EXISTS (SELECT 1 FROM public.role_capabilities s
                          WHERE s.scope = r.scope AND s.role = r.stronger AND s.capability = w.capability)
    ) THEN
      RAISE EXCEPTION '038 guard: % % lacks something % holds', r.scope, r.stronger, r.weaker;
    END IF;
  END LOOP;

  -- every seeded capability must be resolvable, and no reserved capability may be seeded
  IF EXISTS (SELECT 1 FROM public.role_capabilities rc
              WHERE rc.capability = ANY (public.reserved_capabilities())) THEN
    RAISE EXCEPTION '038 guard: a reserved capability is in the role matrix';
  END IF;

  -- the resolver answers for a stranger without raising
  IF public.effective_capabilities('00000000-0000-0000-0000-000000000000',
                                   '00000000-0000-0000-0000-000000000000') <> ARRAY[]::text[] THEN
    RAISE EXCEPTION '038 guard: a stranger resolved to something';
  END IF;

  -- every function this migration promises exists with the promised signature
  PERFORM 'public.has_capability(text,uuid,uuid)'::regprocedure,
          'public.brands_with_capability(text)'::regprocedure,
          'public.workspaces_with_capability(text)'::regprocedure,
          'public.my_access()'::regprocedure,
          'public.my_brand_access(uuid)'::regprocedure,
          'public.set_member_role(uuid,uuid,public.workspace_role_v2,public.brand_access_mode,public.brand_role,jsonb)'::regprocedure,
          'public.transfer_ownership(uuid,uuid,boolean)'::regprocedure,
          'public.leave_workspace(uuid)'::regprocedure,
          'public.remove_member(uuid,uuid)'::regprocedure,
          'public.grant_brand_access(uuid,uuid,public.brand_role,jsonb,boolean)'::regprocedure,
          'public.revoke_brand_access(uuid,uuid)'::regprocedure,
          'public.archive_brand(uuid,boolean)'::regprocedure,
          'public.create_workspace(text,text)'::regprocedure,
          'public.guard_immutable_columns()'::regprocedure;

  RAISE NOTICE '038 OK — % capability presets, resolver and RPCs in place',
    (SELECT count(*) FROM public.role_capabilities);
END $$;
