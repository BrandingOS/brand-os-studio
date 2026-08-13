-- ============================================================================
-- Phase: Super Admin Setup
-- ============================================================================
-- Creates admin-level RLS policies so super admins can access ALL data.
-- Sets up brandingos.ai@gmail.com as the primary super admin.
-- ============================================================================

-- ─── 1. Helper: is_super_admin ──────────────────────────────────────────────
-- Returns true if auth.uid() has 'admin' role in user_roles table.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

-- ─── 2. Admin RLS policies — full read/write on all tables ──────────────────

-- Workspaces: admin can see/edit all
DROP POLICY IF EXISTS "admin_workspaces_all" ON public.workspaces;
CREATE POLICY "admin_workspaces_all" ON public.workspaces
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Workspace members: admin can see/edit all
DROP POLICY IF EXISTS "admin_workspace_members_all" ON public.workspace_members;
CREATE POLICY "admin_workspace_members_all" ON public.workspace_members
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Brands: admin can see/edit all
DROP POLICY IF EXISTS "admin_brands_all" ON public.brands;
CREATE POLICY "admin_brands_all" ON public.brands
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Brand members: admin can see/edit all
DROP POLICY IF EXISTS "admin_brand_members_all" ON public.brand_members;
CREATE POLICY "admin_brand_members_all" ON public.brand_members
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Assets: admin can see/edit all
DROP POLICY IF EXISTS "admin_assets_all" ON public.assets;
CREATE POLICY "admin_assets_all" ON public.assets
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Comments: admin can see/edit all
DROP POLICY IF EXISTS "admin_comments_all" ON public.comments;
CREATE POLICY "admin_comments_all" ON public.comments
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Approvals: admin can see/edit all
DROP POLICY IF EXISTS "admin_approvals_all" ON public.approvals;
CREATE POLICY "admin_approvals_all" ON public.approvals
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Activity log: admin can see all
DROP POLICY IF EXISTS "admin_activity_all" ON public.activity_log;
CREATE POLICY "admin_activity_all" ON public.activity_log
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Notifications: admin can see all
DROP POLICY IF EXISTS "admin_notifications_all" ON public.notifications;
CREATE POLICY "admin_notifications_all" ON public.notifications
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Subscriptions: admin can see/edit all
DROP POLICY IF EXISTS "admin_subscriptions_all" ON public.subscriptions;
CREATE POLICY "admin_subscriptions_all" ON public.subscriptions
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Invoices: admin can see all
DROP POLICY IF EXISTS "admin_invoices_all" ON public.invoices;
CREATE POLICY "admin_invoices_all" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Usage tracking: admin can see all
DROP POLICY IF EXISTS "admin_usage_all" ON public.usage_tracking;
CREATE POLICY "admin_usage_all" ON public.usage_tracking
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Profiles: admin can see all profiles
DROP POLICY IF EXISTS "admin_profiles_all" ON public.profiles;
CREATE POLICY "admin_profiles_all" ON public.profiles
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- User roles: admin can manage roles
DROP POLICY IF EXISTS "admin_user_roles_all" ON public.user_roles;
CREATE POLICY "admin_user_roles_all" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Guideline presentations: admin can see/edit all
DROP POLICY IF EXISTS "admin_presentations_all" ON public.guideline_presentations;
CREATE POLICY "admin_presentations_all" ON public.guideline_presentations
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Guideline slides: admin can see/edit all
DROP POLICY IF EXISTS "admin_slides_all" ON public.guideline_slides;
CREATE POLICY "admin_slides_all" ON public.guideline_slides
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ─── 3. Set up brandingos.ai@gmail.com as super admin ───────────────────────
-- Insert admin role for this email (if the user exists in profiles).

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id FROM public.profiles WHERE email = 'brandingos.ai@gmail.com';

  -- If user exists, grant admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Also grant admin to hamza2007ezzat@gmail.com (project owner)
  SELECT id INTO admin_user_id FROM public.profiles WHERE email = 'hamza2007ezzat@gmail.com';
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ─── 4. Trigger to auto-assign admin on signup for known emails ─────────────

CREATE OR REPLACE FUNCTION public.check_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IN ('brandingos.ai@gmail.com', 'hamza2007ezzat@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_admin_email ON public.profiles;
CREATE TRIGGER trg_check_admin_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_admin_email();
