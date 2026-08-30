-- ============================================================================
-- 039 — THE SECURITY CHANGE. Every tenant table's policies are rewritten against
-- capabilities, and `workspace_members.role_v2` becomes `role`.
--
-- The rename and the rewrite are in ONE migration on purpose. is_workspace_member()
-- compares `role <= _min_role` against the OLD enum and is the transitive dependency of
-- every policy in the database; renaming the column in an earlier migration would make
-- every RLS predicate raise 42883 for every caller until this file ran (DB review B1).
--
-- Order inside this file:
--   1. redefine the four legacy helpers over the new model (nothing else may reference
--      the old column by then)
--   2. drop every policy this file replaces, by name
--   3. create the new policy set — TO authenticated, WITH CHECK on every write
--   4. attach guard_immutable_columns to the tenant keys
--   5. drop `role`, rename `role_v2` → `role`, re-point the one view that reads it
--   6. guard rail
--
-- Rules the policies follow (docs/access-architecture/03 §4.1):
--   • list-shaped policies use the SET-RETURNING helpers, never has_capability()
--   • single-row writes pinned by id may use has_capability()
--   • anon keeps exactly the reads it had; 041 replaces them with resolve_share_link()
-- ============================================================================

-- ── 1. the legacy helpers, re-expressed over capabilities ───────────────────
-- Kept callable so anything outside this repo that still names them keeps working.
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  _workspace_id uuid, _min_role public.workspace_role DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_member_state s
    JOIN public.workspaces w ON w.id = s.workspace_id AND w.deleted_at IS NULL
    WHERE s.workspace_id = _workspace_id
      AND s.user_id = (SELECT auth.uid())
      AND s.status = 'active'
      -- The old enum was ORDINAL (owner > admin > editor > exporter > viewer) and callers
      -- passed a floor. Collapsing everything below `admin` to "any active member" made a
      -- GUEST satisfy a caller asking for 'editor' — no policy does that today, but this
      -- shim is granted for external reuse, so it keeps the ordinal it promises.
      -- (Pass A, F2.)
      AND CASE _min_role
            WHEN 'owner'    THEN s.role = 'owner'
            WHEN 'admin'    THEN s.role IN ('owner','admin')
            WHEN 'editor'   THEN s.role IN ('owner','admin')
                                 OR (s.role = 'member'
                                     AND s.default_brand_role IN ('manager','editor'))
            WHEN 'exporter' THEN s.role IN ('owner','admin','member')
            ELSE s.role IN ('owner','admin','member','guest')   -- viewer: any active member
          END
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_brand(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_capability('brand.view',
           (SELECT b.workspace_id FROM public.brands b WHERE b.id = _brand_id), _brand_id);
$$;

CREATE OR REPLACE FUNCTION public.can_edit_brand(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_capability('brand.setup.edit',
           (SELECT b.workspace_id FROM public.brands b WHERE b.id = _brand_id), _brand_id);
$$;

CREATE OR REPLACE FUNCTION public.is_brand_member(
  _brand_id uuid, _min_role public.workspace_role DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE _min_role
    WHEN 'admin'  THEN public.has_capability('brand.settings.edit',
                         (SELECT b.workspace_id FROM public.brands b WHERE b.id = _brand_id), _brand_id)
    WHEN 'owner'  THEN public.has_capability('brand.settings.edit',
                         (SELECT b.workspace_id FROM public.brands b WHERE b.id = _brand_id), _brand_id)
    WHEN 'editor' THEN public.can_edit_brand(_brand_id)
    ELSE public.can_view_brand(_brand_id)
  END;
$$;

-- ── 2. drop what we replace ─────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('workspaces','workspace_members','brands','assets','brand_folders',
                         'designs','brand_kit_state','brand_kit_adoptions','brand_context_signals',
                         'comments','approvals','activity_log','notifications',
                         'guideline_presentations','guideline_slides','image_projects',
                         'image_generation_jobs','credit_accounts','credit_ledger',
                         'subscriptions','invoices','usage_tracking','user_roles','platform_config')
       AND policyname NOT LIKE 'admin\_%'          -- 004's super-admin policies stay
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── 3. the new policy set ───────────────────────────────────────────────────

-- workspaces: visible while you are an active member and it is not soft-deleted.
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.workspaces_with_capability('workspace.view')));
CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.workspaces_with_capability('workspace.settings.edit')))
  WITH CHECK (id IN (SELECT public.workspaces_with_capability('workspace.settings.edit')));
-- INSERT is create_workspace() only (that is where the entitlement is enforced), and
-- DELETE is a soft delete through an RPC: neither has a policy.

-- workspace_members / brand_access: readable, never client-writable. Every change goes
-- through set_member_role / remove_member / leave_workspace / transfer_ownership /
-- grant_brand_access / revoke_brand_access, which check capabilities and hold the
-- ownership invariants.
CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR workspace_id IN (SELECT public.workspaces_with_capability('members.view')));
ALTER TABLE public.brand_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_access_select ON public.brand_access
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR brand_id IN (SELECT public.brands_with_capability('brand.access.view')));

-- brands
CREATE POLICY brands_select ON public.brands
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brands_select_public ON public.brands
  FOR SELECT TO anon USING (is_public = true AND archived_at IS NULL);
CREATE POLICY brands_insert ON public.brands
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT public.workspaces_with_capability('brands.create')));
-- One UPDATE policy for the whole row: the id is pinned, so the scalar check is one
-- lookup, not one per row. WHICH columns each capability may touch is enforced by
-- update_brand_checked (045) and by the UI; workspace_id/user_id are immutable (§4).
-- `brand.archive` is deliberately NOT here. On an archived brand the resolver grants a
-- manager exactly {brand.view, brand.archive}; including it would have made the archive
-- key a general edit key, so an owner could still rewrite an archived brand. Archiving and
-- restoring go through archive_brand(), which is SECURITY DEFINER and needs no policy.
CREATE POLICY brands_update ON public.brands
  FOR UPDATE TO authenticated
  USING (public.has_capability('brand.setup.edit', workspace_id, id)
      OR public.has_capability('brand.settings.edit', workspace_id, id)
      OR public.has_capability('brand.card.edit', workspace_id, id))
  WITH CHECK (public.has_capability('brand.setup.edit', workspace_id, id)
      OR public.has_capability('brand.settings.edit', workspace_id, id)
      OR public.has_capability('brand.card.edit', workspace_id, id));
-- Deleting is permanent and cascades: only from the archived list (ADR-006).
CREATE POLICY brands_delete ON public.brands
  FOR DELETE TO authenticated
  USING (archived_at IS NOT NULL
         AND workspace_id IN (SELECT public.workspaces_with_capability('brands.delete')));

-- assets
CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY assets_insert ON public.assets FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('library.upload')));
CREATE POLICY assets_update ON public.assets FOR UPDATE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('library.edit')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('library.edit')));
CREATE POLICY assets_delete ON public.assets FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('library.delete')));

-- brand_folders — the tree is part of the library
CREATE POLICY brand_folders_select ON public.brand_folders FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brand_folders_insert ON public.brand_folders FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('library.edit')));
CREATE POLICY brand_folders_update ON public.brand_folders FOR UPDATE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('library.edit')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('library.edit')));
CREATE POLICY brand_folders_delete ON public.brand_folders FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('library.edit')));

-- designs — previously `user_id = auth.uid()` with NO brand check at all, so a design
-- was invisible to the rest of the brand and could be filed against any brand id.
CREATE POLICY designs_select ON public.designs FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY designs_insert ON public.designs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())
              AND brand_id IN (SELECT public.brands_with_capability('designs.create')));
CREATE POLICY designs_update ON public.designs FOR UPDATE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('designs.edit')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('designs.edit')));
-- your own drafts, or anyone's if you may delete designs (03 §4, the one ownership rule)
CREATE POLICY designs_delete ON public.designs FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('designs.delete'))
         OR (user_id = (SELECT auth.uid())
             AND brand_id IN (SELECT public.brands_with_capability('designs.create'))));

-- brand_kit_state / adoptions / context signals
CREATE POLICY brand_kit_state_select ON public.brand_kit_state FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brand_kit_state_insert ON public.brand_kit_state FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('brand.kit.generate')));
CREATE POLICY brand_kit_state_update ON public.brand_kit_state FOR UPDATE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.kit.generate')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('brand.kit.generate')));
CREATE POLICY brand_kit_state_delete ON public.brand_kit_state FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.kit.approve')));

CREATE POLICY brand_kit_adoptions_select ON public.brand_kit_adoptions FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brand_kit_adoptions_insert ON public.brand_kit_adoptions FOR INSERT TO authenticated
  WITH CHECK (adopted_by = (SELECT auth.uid())
              AND brand_id IN (SELECT public.brands_with_capability('brand.kit.approve')));
CREATE POLICY brand_kit_adoptions_delete ON public.brand_kit_adoptions FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.kit.approve')));

CREATE POLICY brand_context_signals_select ON public.brand_context_signals FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brand_context_signals_insert ON public.brand_context_signals FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brand_context_signals_delete ON public.brand_context_signals FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.setup.edit')));

-- comments / approvals: server-side tables the UI does not use yet (ADR-008). Readable by
-- anyone who can see the brand; writes are closed until the feature moves server-side.
CREATE POLICY comments_select ON public.comments FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY approvals_select ON public.approvals FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));

-- guidelines (legacy deck tables)
CREATE POLICY presentations_select ON public.guideline_presentations FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY presentations_insert ON public.guideline_presentations FOR INSERT TO authenticated
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('brand.setup.edit')));
CREATE POLICY presentations_update ON public.guideline_presentations FOR UPDATE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.setup.edit')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('brand.setup.edit')));
CREATE POLICY presentations_delete ON public.guideline_presentations FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.setup.edit')));

CREATE POLICY slides_select ON public.guideline_slides FOR SELECT TO authenticated
  USING (presentation_id IN (SELECT p.id FROM public.guideline_presentations p
          WHERE p.brand_id IN (SELECT public.brands_with_capability('brand.view'))));
CREATE POLICY slides_insert ON public.guideline_slides FOR INSERT TO authenticated
  WITH CHECK (presentation_id IN (SELECT p.id FROM public.guideline_presentations p
          WHERE p.brand_id IN (SELECT public.brands_with_capability('brand.setup.edit'))));
CREATE POLICY slides_update ON public.guideline_slides FOR UPDATE TO authenticated
  USING (presentation_id IN (SELECT p.id FROM public.guideline_presentations p
          WHERE p.brand_id IN (SELECT public.brands_with_capability('brand.setup.edit'))))
  WITH CHECK (presentation_id IN (SELECT p.id FROM public.guideline_presentations p
          WHERE p.brand_id IN (SELECT public.brands_with_capability('brand.setup.edit'))));
CREATE POLICY slides_delete ON public.guideline_slides FOR DELETE TO authenticated
  USING (presentation_id IN (SELECT p.id FROM public.guideline_presentations p
          WHERE p.brand_id IN (SELECT public.brands_with_capability('brand.setup.edit'))));

-- AI: projects are per-brand, jobs are server-written
CREATE POLICY image_projects_select ON public.image_projects FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY image_projects_insert ON public.image_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())
              AND brand_id IN (SELECT public.brands_with_capability('ai.generate')));
CREATE POLICY image_projects_update ON public.image_projects FOR UPDATE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('ai.generate')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('ai.generate')));
CREATE POLICY image_projects_delete ON public.image_projects FOR DELETE TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('ai.generate')));

CREATE POLICY image_generation_jobs_select ON public.image_generation_jobs FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('brand.view')));
-- The old cancel policy allowed the job's owner to UPDATE ANY column — status,
-- charged_credits, cost_usd, output_assets — on a queued or running job. Cancellation is
-- an RPC in 044; until then there is no client UPDATE at all.

-- money and plan: readable by the capability, written only by the server
CREATE POLICY credit_accounts_select ON public.credit_accounts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.usage.view')));
CREATE POLICY credit_ledger_select ON public.credit_ledger FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.usage.view')));
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.billing.view')));
CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.billing.view')));
CREATE POLICY usage_select ON public.usage_tracking FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.workspaces_with_capability('workspace.billing.view')));

-- activity: brand rows follow the brand, workspace rows follow the workspace, and your
-- own actions are always yours to see.
CREATE POLICY activity_select ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())
         OR (brand_id IS NOT NULL AND brand_id IN (SELECT public.brands_with_capability('activity.view')))
         OR (brand_id IS NULL AND workspace_id IS NOT NULL
             AND workspace_id IN (SELECT public.workspaces_with_capability('activity.view'))));
CREATE POLICY activity_insert ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())
              AND (brand_id IS NULL OR brand_id IN (SELECT public.brands_with_capability('brand.view'))));

-- notifications: yours, and the UPDATE now has a WITH CHECK so a row cannot be re-parented
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- platform roles: an admin may not mint a super_admin (A24)
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin_or_above());
CREATE POLICY user_roles_write ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin()
         OR (public.has_role((SELECT auth.uid()), 'admin') AND role IN ('moderator','admin')))
  WITH CHECK (public.is_super_admin()
         OR (public.has_role((SELECT auth.uid()), 'admin') AND role IN ('moderator','admin')));

-- platform_config was readable by every authenticated user
CREATE POLICY platform_config_read ON public.platform_config FOR SELECT TO authenticated
  USING (public.is_moderator_or_above());
CREATE POLICY platform_config_manage ON public.platform_config FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- storage: same shape as 028, re-pointed at capabilities
DROP POLICY IF EXISTS brand_assets_read ON storage.objects;
DROP POLICY IF EXISTS brand_assets_insert ON storage.objects;
DROP POLICY IF EXISTS brand_assets_update ON storage.objects;
DROP POLICY IF EXISTS brand_assets_delete ON storage.objects;
CREATE POLICY brand_assets_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets'
     AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
     AND ((string_to_array(name, '/'))[1])::uuid IN (SELECT public.brands_with_capability('brand.view')));
CREATE POLICY brand_assets_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets'
     AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
     AND ((string_to_array(name, '/'))[1])::uuid IN (SELECT public.brands_with_capability('library.upload')));
CREATE POLICY brand_assets_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets'
     AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
     AND ((string_to_array(name, '/'))[1])::uuid IN (SELECT public.brands_with_capability('library.edit')));
CREATE POLICY brand_assets_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets'
     AND (string_to_array(name, '/'))[1] ~ '^[0-9a-fA-F-]{36}$'
     AND ((string_to_array(name, '/'))[1])::uuid IN (SELECT public.brands_with_capability('library.delete')));

-- ── 4. tenant keys are immutable ────────────────────────────────────────────
-- Re-parenting is the class of bug a missing WITH CHECK used to allow (A23). This makes
-- it impossible even if a policy is later written badly.
DROP TRIGGER IF EXISTS trg_brands_immutable ON public.brands;
CREATE TRIGGER trg_brands_immutable BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id', 'user_id');
DROP TRIGGER IF EXISTS trg_workspace_members_immutable ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_immutable BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id', 'user_id');
DROP TRIGGER IF EXISTS trg_brand_access_immutable ON public.brand_access;
CREATE TRIGGER trg_brand_access_immutable BEFORE UPDATE ON public.brand_access
  FOR EACH ROW EXECUTE FUNCTION public.guard_immutable_columns('workspace_id', 'brand_id', 'user_id');
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['assets','brand_folders','designs','brand_kit_state',
    'brand_kit_adoptions','brand_context_signals','comments','approvals',
    'guideline_presentations','brand_identity_publications','image_projects'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_immutable', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW
                    EXECUTE FUNCTION public.guard_immutable_columns(%L, %L)',
                   'trg_' || t || '_immutable', t, 'brand_id', 'workspace_id');
  END LOOP;
END $$;

-- ── 5. the column rename, in the same transaction as everything above ───────
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_mode_check;
ALTER TABLE public.workspace_members DROP COLUMN role;
ALTER TABLE public.workspace_members RENAME COLUMN role_v2 TO role;
ALTER TABLE public.workspace_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.workspace_members ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_mode_check CHECK (
  (role IN ('owner','admin') AND brand_access_mode = 'all' AND default_brand_role IS NULL)
  OR (role = 'guest' AND brand_access_mode = 'selected')
  OR (role = 'member')
);

-- the ONE view that knows which column holds the role
CREATE OR REPLACE VIEW public.workspace_member_state AS
  SELECT m.id, m.workspace_id, m.user_id,
         m.role AS role,
         m.status, m.brand_access_mode, m.default_brand_role,
         m.capability_overrides, m.credits_monthly_cap
  FROM public.workspace_members m;

-- the triggers and RPCs that named role_v2 directly
CREATE OR REPLACE FUNCTION public.validate_capability_overrides()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE scope text := TG_ARGV[0]; role_text text; allowed text[];
BEGIN
  role_text := NEW.role::text;
  IF role_text IS NULL THEN RETURN NEW; END IF;
  allowed := public.overridable_capabilities(scope, role_text);
  IF jsonb_typeof(NEW.capability_overrides) <> 'object' THEN
    RAISE EXCEPTION 'capability_overrides must be an object' USING ERRCODE = '22023';
  END IF;
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

CREATE OR REPLACE FUNCTION public.guard_last_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws uuid; owners int; was_owner boolean; still_owner boolean;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN COALESCE(NEW, OLD); END IF;
  IF (SELECT auth.uid()) IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  ws := OLD.workspace_id;
  was_owner := COALESCE(OLD.role = 'owner' AND OLD.status = 'active', false);
  IF NOT was_owner THEN RETURN COALESCE(NEW, OLD); END IF;
  still_owner := COALESCE(TG_OP = 'UPDATE' AND NEW.role = 'owner' AND NEW.status = 'active', false);
  IF still_owner THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(pg_catalog.hashtextextended('ws-owner:' || ws::text, 0));
  SELECT count(*) INTO owners FROM public.workspace_members m
   WHERE m.workspace_id = ws AND m.role = 'owner' AND m.status = 'active' AND m.id <> OLD.id;
  IF owners = 0 AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = ws AND w.deleted_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'last_owner',
      DETAIL = 'a workspace must keep at least one owner';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_self_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.bypass_self_role_change', true) = 'true' THEN RETURN NEW; END IF;
  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = OLD.user_id
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'self_role_change',
      DETAIL = 'you cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$;

-- the RPCs and the signup trigger write `role` now
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
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'use_transfer_ownership',
      DETAIL = 'ownership is transferred, not assigned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = _workspace_id AND user_id = _user_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_a_member', DETAIL = 'no such member';
  END IF;
  eff_mode := CASE WHEN _role IN ('owner','admin') THEN 'all'::public.brand_access_mode
                   WHEN _role = 'guest' THEN 'selected' ELSE COALESCE(_mode, 'selected') END;
  eff_default := CASE WHEN _role IN ('owner','admin') THEN NULL
                      ELSE COALESCE(_default_brand_role, 'viewer'::public.brand_role) END;
  UPDATE public.workspace_members
     SET role = _role, brand_access_mode = eff_mode, default_brand_role = eff_default,
         capability_overrides = COALESCE(_overrides, capability_overrides), updated_at = now()
   WHERE workspace_id = _workspace_id AND user_id = _user_id;
  IF _role IN ('owner','admin') THEN
    DELETE FROM public.brand_access WHERE workspace_id = _workspace_id AND user_id = _user_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_ownership(
  _workspace_id uuid, _to_user uuid, _demote_self boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.assert_capability('workspace.transfer_ownership', _workspace_id);
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = _workspace_id AND user_id = _to_user AND status = 'active') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_a_member',
      DETAIL = 'the new owner must already be an active member';
  END IF;
  UPDATE public.workspace_members
     SET role = 'owner', brand_access_mode = 'all', default_brand_role = NULL,
         capability_overrides = '{}'::jsonb, updated_at = now()
   WHERE workspace_id = _workspace_id AND user_id = _to_user;
  DELETE FROM public.brand_access WHERE workspace_id = _workspace_id AND user_id = _to_user;
  IF _demote_self THEN
    PERFORM set_config('app.bypass_self_role_change', 'true', true);
    UPDATE public.workspace_members
       SET role = 'admin', brand_access_mode = 'all', default_brand_role = NULL, updated_at = now()
     WHERE workspace_id = _workspace_id AND user_id = (SELECT auth.uid());
    PERFORM set_config('app.bypass_self_role_change', 'false', true);
  END IF;
  UPDATE public.workspaces w SET owner_id = _to_user WHERE w.id = _workspace_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_workspace(_name text, _slug text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE uid uuid := (SELECT auth.uid()); ws uuid; base text; candidate text; n int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated', DETAIL = 'sign in first';
  END IF;
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
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode)
  VALUES (ws, uid, 'owner', 'active', 'all');
  RETURN ws;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE ws_id UUID; ws_slug TEXT; base_slug TEXT; counter INTEGER := 1;
BEGIN
  base_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  ws_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = ws_slug) LOOP
    counter := counter + 1; ws_slug := base_slug || '-' || counter;
  END LOOP;
  INSERT INTO public.workspaces (name, slug, owner_id, is_personal)
  VALUES (COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)) || '''s Workspace', ws_slug, NEW.id, true)
  RETURNING id INTO ws_id;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, brand_access_mode, joined_at)
  VALUES (ws_id, NEW.id, 'owner', 'active', 'all', now());
  RETURN NEW;
END;
$fn$;

-- 036's backfill named role_v2; it has done its work, so retire it rather than leave a
-- function that no longer compiles against the schema.
DROP FUNCTION IF EXISTS public.backfill_tenancy();

-- ── 6. guard rail ───────────────────────────────────────────────────────────
DO $$
DECLARE n int; r record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='workspace_members' AND column_name='role_v2') THEN
    RAISE EXCEPTION '039 guard: role_v2 still exists';
  END IF;
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='workspace_members' AND column_name='role') <> 'USER-DEFINED' THEN
    RAISE EXCEPTION '039 guard: workspace_members.role is not the new enum';
  END IF;

  -- no policy on a tenant table may still apply to the `public` role
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND 'public' = ANY (roles)
     AND tablename IN ('workspaces','workspace_members','brand_access','brands','assets',
                       'brand_folders','designs','brand_kit_state','brand_kit_adoptions',
                       'brand_context_signals','comments','approvals','activity_log',
                       'notifications','guideline_presentations','guideline_slides',
                       'image_projects','image_generation_jobs','credit_accounts','credit_ledger');
  IF n > 0 THEN RAISE EXCEPTION '039 guard: % tenant policies still target the public role', n; END IF;

  -- every tenant table still has RLS on
  FOR r IN SELECT unnest(ARRAY['workspaces','workspace_members','brand_access','brands','assets',
                               'brand_folders','designs','brand_kit_state','brand_kit_adoptions',
                               'brand_context_signals','comments','approvals','activity_log',
                               'notifications','guideline_presentations','guideline_slides',
                               'image_projects','image_generation_jobs','credit_accounts',
                               'credit_ledger','subscriptions','invoices','usage_tracking']) AS t
  LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || r.t)::regclass) THEN
      RAISE EXCEPTION '039 guard: RLS is off on %', r.t;
    END IF;
  END LOOP;

  -- has_capability() must not appear inside any policy expression (DB review M1)
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND (COALESCE(qual,'') LIKE '%has_capability%' OR COALESCE(with_check,'') LIKE '%has_capability%')
     AND tablename <> 'brands';        -- brands is id-pinned and documented above
  IF n > 0 THEN RAISE EXCEPTION '039 guard: % list-shaped policies call has_capability()', n; END IF;

  -- the client can no longer write a job row
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
              AND tablename='image_generation_jobs' AND cmd = 'UPDATE') THEN
    RAISE EXCEPTION '039 guard: image_generation_jobs is still client-writable';
  END IF;

  RAISE NOTICE '039 OK — % policies over the capability model', (SELECT count(*) FROM pg_policies WHERE schemaname='public');
END $$;
