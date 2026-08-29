-- ============================================================================
-- 045 — Optimistic concurrency, attribution, and ownership succession on account purge
-- (docs/access-architecture/06 §1.1, 02 §4.4)
--
-- Nothing in this product checked a version before writing. Setup autosaves 400ms after
-- you stop typing and the editor every 1.2s, both with a bare
-- `.update(...).eq('id', id)` — so two people on one brand silently overwrote each other,
-- and the loser never knew. Version + updated_by turns that into a conflict the UI can
-- show. Last-write-wins remains fine for single-field writes (renaming a file twice is
-- not a data-loss class); the four resources here hold the brand's identity and work.
-- ============================================================================

ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.brand_kit_state
  ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- version and updated_by are STAMPED, never sent: a client that could write them could
-- defeat the check it exists to lose.
CREATE OR REPLACE FUNCTION public.bump_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  IF (SELECT auth.uid()) IS NOT NULL THEN NEW.updated_by := (SELECT auth.uid()); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_brands_version ON public.brands;
CREATE TRIGGER trg_brands_version BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();
DROP TRIGGER IF EXISTS trg_designs_version ON public.designs;
CREATE TRIGGER trg_designs_version BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();
DROP TRIGGER IF EXISTS trg_workspaces_version ON public.workspaces;
CREATE TRIGGER trg_workspaces_version BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();

-- ── checked writes ──────────────────────────────────────────────────────────
-- The patch is applied only if the row is still the one the caller read. On a conflict
-- nothing is written and the caller is told WHO moved it, so the UI can say so.
CREATE OR REPLACE FUNCTION public.update_brand_checked(
  _brand_id uuid, _expected_version integer, _patch jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE b public.brands%ROWTYPE; ws uuid; k text; sql text := ''; sep text := '';
        allowed text[] := ARRAY['name','logo_url','primary_color','secondary_color','fonts',
                                'tone','audience','strategy','guidelines','identity',
                                'identity_schema_version','brand_assets','logo_system',
                                'identity_meta','business_info','onboarding','workspace_card',
                                'logo_assets','is_public','public_url','custom_domain','slug'];
BEGIN
  SELECT * INTO b FROM public.brands WHERE id = _brand_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such brand';
  END IF;
  ws := b.workspace_id;
  IF NOT (public.has_capability('brand.setup.edit', ws, _brand_id)
          OR public.has_capability('brand.settings.edit', ws, _brand_id)
          OR public.has_capability('brand.card.edit', ws, _brand_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'permission_denied',
      DETAIL = 'you cannot edit this brand';
  END IF;

  IF _expected_version IS NOT NULL AND b.version <> _expected_version THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflict',
      'currentVersion', b.version, 'updatedBy', b.updated_by, 'updatedAt', b.updated_at);
  END IF;

  FOR k IN SELECT jsonb_object_keys(_patch) LOOP
    IF k = ANY (allowed) THEN
      sql := sql || sep || format('%I = ($1->>%L)::text', k, k);
      sep := ', ';
    END IF;
  END LOOP;
  IF sql = '' THEN
    RETURN jsonb_build_object('ok', true, 'version', b.version, 'note', 'nothing to write');
  END IF;

  -- jsonb columns keep their type; the text cast above is only right for scalars, so
  -- json-valued keys are applied separately.
  EXECUTE format(
    'UPDATE public.brands SET %s WHERE id = $2',
    (SELECT string_agg(
       CASE WHEN jsonb_typeof(_patch->key) IN ('object','array')
            THEN format('%I = ($1->%L)::jsonb', key, key)
            WHEN jsonb_typeof(_patch->key) = 'boolean'
            THEN format('%I = ($1->>%L)::boolean', key, key)
            ELSE format('%I = ($1->>%L)', key, key) END, ', ')
       FROM jsonb_object_keys(_patch) AS key WHERE key = ANY (allowed)))
  USING _patch, _brand_id;

  SELECT * INTO b FROM public.brands WHERE id = _brand_id;
  RETURN jsonb_build_object('ok', true, 'version', b.version);
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_brand_checked(uuid, integer, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_design_checked(
  _brand_id uuid, _design_id text, _expected_version integer,
  _data jsonb, _name text DEFAULT NULL, _thumbnail_url text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE d public.designs%ROWTYPE; ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.brands WHERE id = _brand_id;
  IF ws IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such brand';
  END IF;

  SELECT * INTO d FROM public.designs WHERE brand_id = _brand_id AND id = _design_id;
  IF NOT FOUND THEN
    IF NOT public.has_capability('designs.create', ws, _brand_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'permission_denied', DETAIL = 'you cannot create designs here';
    END IF;
    INSERT INTO public.designs (brand_id, id, user_id, data, name, thumbnail_url)
    VALUES (_brand_id, _design_id, (SELECT auth.uid()), _data, _name, _thumbnail_url)
    RETURNING * INTO d;
    RETURN jsonb_build_object('ok', true, 'version', d.version, 'created', true);
  END IF;

  IF NOT public.has_capability('designs.edit', ws, _brand_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'permission_denied', DETAIL = 'you cannot edit designs here';
  END IF;

  -- A canvas document is one blob: there is no sensible merge, so a conflict is reported
  -- and the editor offers Reload or Save a copy rather than silently winning.
  IF _expected_version IS NOT NULL AND d.version <> _expected_version THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflict',
      'currentVersion', d.version, 'updatedBy', d.updated_by, 'updatedAt', d.updated_at);
  END IF;

  UPDATE public.designs
     SET data = _data,
         name = COALESCE(_name, name),
         thumbnail_url = COALESCE(_thumbnail_url, thumbnail_url),
         updated_at = now()
   WHERE brand_id = _brand_id AND id = _design_id
  RETURNING * INTO d;
  RETURN jsonb_build_object('ok', true, 'version', d.version);
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_design_checked(uuid, text, integer, jsonb, text, text) TO authenticated;

-- ── activity gets its workspace, so a workspace-level feed is possible ──────
UPDATE public.activity_log a SET workspace_id = b.workspace_id
  FROM public.brands b WHERE a.brand_id = b.id AND a.workspace_id IS NULL;

-- ── A36/A37 — nobody's account deletion orphans a workspace ─────────────────
-- 029's purge deletes the user's memberships and then any workspace left with none. A
-- workspace with OTHER members would have been left ownerless (guard_last_owner exempts
-- the service context, so nothing stopped it). Succession runs first:
--   • the earliest active admin, else the earliest active member, becomes owner
--   • guests never inherit — they were scoped deliberately, and a workspace whose only
--     other members are guests is soft-deleted with the account instead (A37)
CREATE OR REPLACE FUNCTION public.transfer_ownership_on_purge(_user_id uuid)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE w record; heir uuid; n int := 0;
BEGIN
  FOR w IN
    SELECT ws.id, ws.name
      FROM public.workspaces ws
     WHERE ws.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM public.workspace_members m
                    WHERE m.workspace_id = ws.id AND m.user_id = _user_id AND m.role = 'owner')
       AND NOT EXISTS (SELECT 1 FROM public.workspace_members m
                        WHERE m.workspace_id = ws.id AND m.user_id <> _user_id
                          AND m.role = 'owner' AND m.status = 'active')
  LOOP
    SELECT m.user_id INTO heir
      FROM public.workspace_members m
     WHERE m.workspace_id = w.id AND m.user_id <> _user_id
       AND m.status = 'active' AND m.role IN ('admin','member')
     ORDER BY (m.role = 'admin') DESC, m.joined_at NULLS LAST, m.created_at
     LIMIT 1;

    IF heir IS NULL THEN
      UPDATE public.workspaces SET deleted_at = now() WHERE id = w.id;
      PERFORM public.record_audit(w.id, 'workspace.deleted_on_purge', 'workspace', w.id::text,
        NULL, jsonb_build_object('reason', 'the last owner deleted their account and no member could inherit'));
    ELSE
      UPDATE public.workspace_members
         SET role = 'owner', brand_access_mode = 'all', default_brand_role = NULL, updated_at = now()
       WHERE workspace_id = w.id AND user_id = heir;
      DELETE FROM public.brand_access WHERE workspace_id = w.id AND user_id = heir;
      UPDATE public.workspaces SET owner_id = heir WHERE id = w.id;
      PERFORM public.record_audit(w.id, 'ownership.transferred_on_purge', 'user', heir::text,
        jsonb_build_object('previousOwner', _user_id), jsonb_build_object('newOwner', heir));
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_ownership_on_purge(uuid) FROM PUBLIC, anon, authenticated;

-- hook it into 029's purge, ahead of the membership delete
DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef('public.purge_account_data(uuid)'::regprocedure) INTO def;
  IF def NOT LIKE '%transfer_ownership_on_purge%' THEN
    def := replace(def,
      '  -- ── (2) Membership: leave every workspace and brand ──────────────────────',
      '  -- ── (1b) Succession: never leave a workspace without an owner (045) ──────'
      || chr(10) || '  PERFORM public.transfer_ownership_on_purge(_user_id);' || chr(10) || chr(10)
      || '  -- ── (2) Membership: leave every workspace and brand ──────────────────────');
    EXECUTE def;
  END IF;
END $$;

DO $$
BEGIN
  IF pg_get_functiondef('public.purge_account_data(uuid)'::regprocedure) NOT LIKE '%transfer_ownership_on_purge%' THEN
    RAISE EXCEPTION '045 guard: the purge does not run succession — a workspace could be orphaned';
  END IF;
  PERFORM 'public.update_brand_checked(uuid,integer,jsonb)'::regprocedure,
          'public.save_design_checked(uuid,text,integer,jsonb,text,text)'::regprocedure;
  RAISE NOTICE '045 OK — versioning, checked writes, ownership succession';
END $$;
