-- Down for 039. Restores the pre-039 shape: the legacy role column and enum, and the
-- policy set as 001/002/003/006/012/015/017/018/021/023/024/025/026/028 left it.
-- NOTE: this is a break-glass path. The application release that ships 035–039 expects the
-- new model; rolling the database back without rolling the app back will not work.

-- 1. put the legacy column back and fill it from the new one
ALTER TABLE public.workspace_members RENAME COLUMN role TO role_v2;
ALTER TABLE public.workspace_members ADD COLUMN role public.workspace_role;
UPDATE public.workspace_members SET role = CASE role_v2
  WHEN 'owner' THEN 'owner'::public.workspace_role
  WHEN 'admin' THEN 'admin'
  WHEN 'guest' THEN 'viewer'
  ELSE COALESCE(default_brand_role::text, 'viewer')::public.workspace_role END;
ALTER TABLE public.workspace_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.workspace_members ALTER COLUMN role SET DEFAULT 'viewer';
CREATE OR REPLACE VIEW public.workspace_member_state AS
  SELECT m.id, m.workspace_id, m.user_id, m.role_v2 AS role, m.status, m.brand_access_mode,
         m.default_brand_role, m.capability_overrides, m.credits_monthly_cap
  FROM public.workspace_members m;

-- 2. drop the capability policies and triggers
DO $$
DECLARE r record; t text;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
            WHERE schemaname = 'public' AND policyname NOT LIKE 'admin\_%'
              AND tablename IN ('workspaces','workspace_members','brand_access','brands','assets',
                                'brand_folders','designs','brand_kit_state','brand_kit_adoptions',
                                'brand_context_signals','comments','approvals','activity_log',
                                'notifications','guideline_presentations','guideline_slides',
                                'image_projects','image_generation_jobs','credit_accounts',
                                'credit_ledger','subscriptions','invoices','usage_tracking',
                                'user_roles','platform_config')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename); END LOOP;

  FOREACH t IN ARRAY ARRAY['brands','workspace_members','brand_access','assets','brand_folders',
    'designs','brand_kit_state','brand_kit_adoptions','brand_context_signals','comments',
    'approvals','guideline_presentations','brand_identity_publications','image_projects'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_immutable', t);
  END LOOP;
END $$;

-- 3. the legacy helpers, as 001/026 defined them
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _min_role public.workspace_role DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = _workspace_id AND m.user_id = (SELECT auth.uid()) AND m.role <= _min_role);
$$;
CREATE OR REPLACE FUNCTION public.can_view_brand(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.brands b WHERE b.id = _brand_id
    AND ((b.workspace_id IS NULL AND b.user_id = (SELECT auth.uid())) OR public.is_brand_member(b.id, 'viewer')));
$$;
CREATE OR REPLACE FUNCTION public.can_edit_brand(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.brands b WHERE b.id = _brand_id
    AND ((b.workspace_id IS NULL AND b.user_id = (SELECT auth.uid())) OR public.is_brand_member(b.id, 'editor')));
$$;

-- 4. the pre-039 policies (the security-relevant subset; see 001/002/003 for the rest)
CREATE POLICY workspaces_select_member ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, 'viewer'));
CREATE POLICY workspaces_insert_auth ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY workspaces_update_admin ON public.workspaces FOR UPDATE TO authenticated
  USING (public.is_workspace_member(id, 'admin'));
CREATE POLICY workspaces_delete_owner ON public.workspaces FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY wm_select_fellow ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, 'viewer'));
CREATE POLICY wm_insert_admin ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, 'admin')
    OR (user_id = (SELECT auth.uid()) AND role = 'owner' AND public.is_workspace_owner(workspace_id)));
CREATE POLICY wm_update_admin ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id,'admin') AND role <> 'owner')
  WITH CHECK (public.is_workspace_member(workspace_id,'admin') AND role <> 'owner');
CREATE POLICY wm_delete_admin ON public.workspace_members FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id,'admin') AND role <> 'owner');
CREATE POLICY brands_select ON public.brands FOR SELECT TO authenticated
  USING ((workspace_id IS NULL AND user_id = (SELECT auth.uid()))
         OR public.is_workspace_member(workspace_id,'viewer') OR is_public = true);
CREATE POLICY brands_select_public ON public.brands FOR SELECT TO anon USING (is_public = true);
CREATE POLICY brands_insert ON public.brands FOR INSERT TO authenticated
  WITH CHECK ((workspace_id IS NULL AND user_id = (SELECT auth.uid()))
              OR public.is_workspace_member(workspace_id,'editor'));
CREATE POLICY brands_update ON public.brands FOR UPDATE TO authenticated
  USING ((workspace_id IS NULL AND user_id = (SELECT auth.uid())) OR public.is_brand_member(id,'editor'));
CREATE POLICY brands_delete ON public.brands FOR DELETE TO authenticated
  USING ((workspace_id IS NULL AND user_id = (SELECT auth.uid())) OR public.is_brand_member(id,'admin'));
CREATE POLICY assets_select ON public.assets FOR SELECT USING (public.can_view_brand(brand_id));
CREATE POLICY assets_insert ON public.assets FOR INSERT WITH CHECK (public.can_edit_brand(brand_id));
CREATE POLICY assets_update ON public.assets FOR UPDATE USING (public.can_edit_brand(brand_id)) WITH CHECK (public.can_edit_brand(brand_id));
CREATE POLICY assets_delete ON public.assets FOR DELETE USING (public.can_edit_brand(brand_id));
CREATE POLICY designs_owner_all ON public.designs FOR ALL
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY credit_accounts_select ON public.credit_accounts FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id,'viewer'));
CREATE POLICY credit_ledger_select ON public.credit_ledger FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id,'viewer'));
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id,'viewer'));
CREATE POLICY authenticated_read_config ON public.platform_config FOR SELECT TO authenticated USING (true);
CREATE POLICY super_admin_config_manage ON public.platform_config FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
