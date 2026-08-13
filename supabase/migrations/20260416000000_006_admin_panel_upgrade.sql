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
--
-- T087/T088 FIX (2026-08-13): the legacy `brands_*_policy` set created by
-- 20250905213225 calls has_role(uuid, app_role), so this DROP failed with
-- "cannot drop function ... because other objects depend on it" on a fresh
-- chain. THIS IS THE ROOT OF T088: the drop-and-recreate never completed, so
-- `user_roles.role` was retyped to app_role_v2 while has_role kept taking
-- app_role — leaving the comparison to raise `operator does not exist` for any
-- NON-OWNER reading a brand.
--
-- The dependent policies are fully superseded by migration 001's membership
-- policies (`brands_select`/`insert`/`update`/`delete`), which are already in
-- place by this point in the chain, so dropping them here loses no access —
-- it removes a duplicate authority. Migration 019 repeats the drop
-- idempotently for databases whose history differs.
DROP POLICY IF EXISTS "brands_select_policy" ON public.brands;
DROP POLICY IF EXISTS "brands_update_policy" ON public.brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON public.brands;

-- These three also depend on the old-signature has_role. Unlike the brands
-- set they are NOT superseded, so they are recreated verbatim below once the
-- new has_role exists — same predicates, corrected enum.
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_only" ON public.user_roles;

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

-- T087/T088 FIX (2026-08-13): restore the three policies dropped in 1c, now
-- that has_role exists against the CURRENT enum. Predicates are unchanged from
-- 20250905213225 — only the underlying type is correct, which is precisely the
-- mismatch that made a non-owner brand read raise
-- "operator does not exist: app_role_v2 = app_role".
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_admin_only"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


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
DROP POLICY IF EXISTS "admin_announcements_manage" ON public.announcements;
CREATE POLICY "admin_announcements_manage" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- All authenticated users can read active announcements
DROP POLICY IF EXISTS "authenticated_read_active_announcements" ON public.announcements;
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
DROP POLICY IF EXISTS "super_admin_config_manage" ON public.platform_config;
CREATE POLICY "super_admin_config_manage" ON public.platform_config
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- All authenticated users can read config
DROP POLICY IF EXISTS "authenticated_read_config" ON public.platform_config;
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
