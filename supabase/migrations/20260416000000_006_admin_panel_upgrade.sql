-- ============================================================================
-- Phase: Super Admin Panel Upgrade
-- ============================================================================
-- Upgrades the platform role system from binary (admin/user) to 4-tier
-- (super_admin/admin/moderator/user). Adds account status, announcements,
-- and platform config tables.
-- ============================================================================

-- ─── 1. Expand app_role enum ────────────────────────────────────────────────
-- Postgres can't ALTER TYPE ADD VALUE inside a transaction, so we recreate.

-- 1a. Create new enum with all 4 values
CREATE TYPE public.app_role_v2 AS ENUM ('super_admin', 'admin', 'moderator', 'user');

-- 1b. Migrate user_roles column
ALTER TABLE public.user_roles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.app_role_v2 USING (role::text::public.app_role_v2);

-- 1c. Drop has_role function that depends on old enum
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- 1d. Drop old enum and rename
DROP TYPE IF EXISTS public.app_role;
ALTER TYPE public.app_role_v2 RENAME TO app_role;

-- 1e. Set default back
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'user';

-- ─── 2. Migrate existing admin users to super_admin ─────────────────────────
-- IMPORTANT: Do this BEFORE updating is_super_admin() function

UPDATE public.user_roles
SET role = 'super_admin'
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE email IN ('brandingos.ai@gmail.com', 'hamza2007ezzat@gmail.com')
)
AND role = 'admin';

-- ─── 3. Update is_super_admin() — now checks for 'super_admin' ─────────────

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
      AND role = 'super_admin'
  );
$$;

-- ─── 4. Add is_admin_or_above() ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('super_admin', 'admin')
  );
$$;

-- ─── 5. Add is_moderator_or_above() ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_moderator_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('super_admin', 'admin', 'moderator')
  );
$$;

-- ─── 6. Update has_role() to use new enum ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = p_role
  );
$$;

-- ─── 7. Update check_admin_email() — assign super_admin ────────────────────

CREATE OR REPLACE FUNCTION public.check_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IN ('brandingos.ai@gmail.com', 'hamza2007ezzat@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 8. ALTER profiles — add status & admin fields ──────────────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in TIMESTAMPTZ;

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('active', 'suspended', 'banned'));
  END IF;
END;
$$;

-- ─── 9. CREATE announcements table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance', 'release')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'free', 'pro', 'agency', 'admins')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY "admin_announcements_manage" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- All authenticated users can read active announcements
CREATE POLICY "authenticated_read_active_announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
  );

-- ─── 10. CREATE platform_config table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Super admins can manage config
CREATE POLICY "super_admin_config_manage" ON public.platform_config
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- All authenticated users can read config
CREATE POLICY "authenticated_read_config" ON public.platform_config
  FOR SELECT TO authenticated
  USING (true);

-- Seed default config values
INSERT INTO public.platform_config (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('registration_enabled', 'true'::jsonb),
  ('feature_overrides', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── 11. Indexes ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON public.announcements (is_active, starts_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles (status);
