-- ============================================================================
-- Phase 1: Workspaces, Expanded Brands, Assets, RLS Foundation
-- ============================================================================
-- This migration introduces multi-tenant workspaces, expands the brands table
-- to hold the full Brand type, adds an assets table, and locks down every
-- table with Row-Level Security policies.
-- ============================================================================

-- ─── 0. Profiles Table + Auth Trigger ───────────────────────────────────────
-- The profiles table mirrors auth.users with public-facing fields.
-- It's created automatically when a new user signs up via the trigger.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_by_member"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);  -- Any authenticated user can see profiles (needed for member lists)

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth users
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 0b. User Roles Table ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  role        public.app_role NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper function for role checking (used by existing code)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ─── 0c. Guideline Presentations + Slides (if not yet created) ──────────────
-- These may have been created by an earlier migration on a previous project.
-- Using IF NOT EXISTS to be safe.

CREATE TABLE IF NOT EXISTS public.guideline_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Brand Guidelines',
  description TEXT,
  version TEXT DEFAULT '1.0',
  layout_type TEXT DEFAULT 'canvas',
  theme_settings JSONB DEFAULT '{}'::jsonb,
  slides JSONB DEFAULT '[]'::jsonb,
  slide_order TEXT[] DEFAULT '{}',
  export_settings JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guideline_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.guideline_presentations(id) ON DELETE CASCADE,
  slide_type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  content JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  background_color TEXT,
  text_color TEXT,
  custom_styles JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS not available for indexes, use DO block)
DO $$ BEGIN
  CREATE INDEX idx_guideline_presentations_brand_id ON public.guideline_presentations(brand_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX idx_guideline_presentations_user_id ON public.guideline_presentations(user_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  CREATE INDEX idx_guideline_slides_presentation_id ON public.guideline_slides(presentation_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

ALTER TABLE public.guideline_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guideline_slides ENABLE ROW LEVEL SECURITY;

-- Slug column and infrastructure on brands (may already exist)
DO $$ BEGIN
  ALTER TABLE public.brands ADD COLUMN slug TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.generate_brand_slug(brand_name TEXT, brand_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    base_slug := lower(trim(regexp_replace(brand_name, '[^a-zA-Z0-9\s]', '', 'g')));
    base_slug := regexp_replace(base_slug, '\s+', '_', 'g');
    final_slug := base_slug;
    WHILE EXISTS (
        SELECT 1 FROM public.brands
        WHERE slug = final_slug
        AND (brand_id IS NULL OR id != brand_id)
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '_' || counter;
    END LOOP;
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_brand_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR (OLD.name IS DISTINCT FROM NEW.name) THEN
        NEW.slug := public.generate_brand_slug(NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brands_set_slug ON public.brands;
CREATE TRIGGER brands_set_slug
    BEFORE INSERT OR UPDATE ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION public.set_brand_slug();

-- Populate existing brands with slugs
UPDATE public.brands
SET slug = public.generate_brand_slug(name, id)
WHERE slug IS NULL;

-- Make slug NOT NULL + UNIQUE after populating
DO $$ BEGIN
  ALTER TABLE public.brands ADD CONSTRAINT brands_slug_unique UNIQUE (slug);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.brands ALTER COLUMN slug SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Storage bucket (may already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', false)
ON CONFLICT (id) DO NOTHING;

-- ─── 1. Workspace Role Enum ─────────────────────────────────────────────────
-- Enum ordering matters: owner < admin < editor < exporter < viewer
-- This allows role comparison via <= for hierarchical access checks.

CREATE TYPE public.workspace_role AS ENUM (
  'owner',
  'admin',
  'editor',
  'exporter',
  'viewer'
);

-- ─── 2. Workspaces Table ────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  owner_id    UUID NOT NULL,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_workspaces_slug ON public.workspaces (slug);

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Workspace Members Table ─────────────────────────────────────────────

CREATE TABLE public.workspace_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  role          public.workspace_role NOT NULL DEFAULT 'viewer',
  invited_by    UUID,
  invited_at    TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members (user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members (workspace_id);

CREATE TRIGGER trg_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Expand Brands Table ─────────────────────────────────────────────────
-- Add workspace_id (nullable initially, backfilled, then NOT NULL),
-- plus columns for the full Brand type.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS workspace_id   UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS logo_assets    JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS strategy       TEXT,
  ADD COLUMN IF NOT EXISTS guidelines     JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_public      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_url     TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain  TEXT;

CREATE INDEX IF NOT EXISTS idx_brands_workspace ON public.brands (workspace_id);

-- ─── 5. Brand Members Table (per-brand role overrides) ──────────────────────

CREATE TABLE public.brand_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  role        public.workspace_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, user_id)
);

CREATE INDEX idx_brand_members_brand ON public.brand_members (brand_id);
CREATE INDEX idx_brand_members_user ON public.brand_members (user_id);

-- ─── 6. Assets Table ────────────────────────────────────────────────────────

CREATE TABLE public.assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  category      TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'upload',
  url           TEXT NOT NULL,
  storage_path  TEXT,
  size          BIGINT DEFAULT 0,
  tags          TEXT[] DEFAULT '{}',
  metadata      JSONB DEFAULT '{}'::jsonb,
  uploaded_by   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_brand ON public.assets (brand_id);
CREATE INDEX idx_assets_brand_type ON public.assets (brand_id, type);
CREATE INDEX idx_assets_tags ON public.assets USING GIN (tags);

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 7. Helper Function: is_workspace_member ────────────────────────────────
-- Returns true if auth.uid() is a member of the workspace with the given role
-- or a higher role. Uses enum ordering: owner < admin < editor < exporter < viewer.

CREATE OR REPLACE FUNCTION public.is_workspace_member(
  _workspace_id UUID,
  _min_role public.workspace_role DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = (SELECT auth.uid())
      AND role <= _min_role
  );
$$;

-- ─── 8. Helper Function: get_brand_workspace_id ─────────────────────────────
-- Returns the workspace_id for a given brand.

CREATE OR REPLACE FUNCTION public.get_brand_workspace_id(_brand_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace_id FROM public.brands WHERE id = _brand_id;
$$;

-- ─── 9. Helper Function: is_brand_member ────────────────────────────────────
-- Checks brand_members first (override), falls back to workspace_members.

CREATE OR REPLACE FUNCTION public.is_brand_member(
  _brand_id UUID,
  _min_role public.workspace_role DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    -- Check brand-level override first
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id
      AND user_id = (SELECT auth.uid())
      AND role <= _min_role
  )
  OR EXISTS (
    -- Fall back to workspace-level membership
    SELECT 1 FROM public.workspace_members wm
    JOIN public.brands b ON b.workspace_id = wm.workspace_id
    WHERE b.id = _brand_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.role <= _min_role
  );
$$;

-- ─── 10. Auto-Workspace on User Signup ──────────────────────────────────────
-- Creates a personal workspace when a new user signs up and is inserted into
-- the profiles table.

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ws_id UUID;
  ws_slug TEXT;
  base_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate slug from email prefix
  base_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  ws_slug := base_slug;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = ws_slug) LOOP
    counter := counter + 1;
    ws_slug := base_slug || '-' || counter;
  END LOOP;

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)) || '''s Workspace',
    ws_slug,
    NEW.id
  )
  RETURNING id INTO ws_id;

  -- Add owner as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (ws_id, NEW.id, 'owner', now());

  RETURN NEW;
END;
$$;

-- Fire after insert on profiles (profiles is created by Supabase auth trigger)
DROP TRIGGER IF EXISTS trg_new_user_workspace ON public.profiles;
CREATE TRIGGER trg_new_user_workspace
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_workspace();

-- ─── 11. Backfill: Create workspaces for existing users ─────────────────────
-- For every existing profile that doesn't already have a workspace, create one
-- and assign their brands to it.

DO $$
DECLARE
  r RECORD;
  ws_id UUID;
  ws_slug TEXT;
  base_slug TEXT;
  counter INTEGER;
BEGIN
  FOR r IN
    SELECT p.id, p.email, p.full_name
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = p.id AND wm.role = 'owner'
    )
  LOOP
    base_slug := lower(regexp_replace(split_part(r.email, '@', 1), '[^a-z0-9]', '-', 'g'));
    ws_slug := base_slug;
    counter := 1;

    WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = ws_slug) LOOP
      counter := counter + 1;
      ws_slug := base_slug || '-' || counter;
    END LOOP;

    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
      COALESCE(r.full_name, split_part(r.email, '@', 1)) || '''s Workspace',
      ws_slug,
      r.id
    )
    RETURNING id INTO ws_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (ws_id, r.id, 'owner', now());

    -- Assign this user's brands to the new workspace
    UPDATE public.brands
    SET workspace_id = ws_id
    WHERE user_id = r.id AND workspace_id IS NULL;
  END LOOP;
END;
$$;

-- ─── 12. RLS Policies ──────────────────────────────────────────────────────

-- == Workspaces ==
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select_member"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_insert_auth"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_admin"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(id, 'admin'));

CREATE POLICY "workspaces_delete_owner"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- == Workspace Members ==
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wm_select_fellow"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members AS self
      WHERE self.workspace_id = workspace_members.workspace_id
        AND self.user_id = auth.uid()
    )
  );

CREATE POLICY "wm_insert_admin"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, 'admin')
    -- Also allow the auto-workspace trigger (owner inserting self)
    OR (user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "wm_update_admin"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id, 'admin'));

CREATE POLICY "wm_delete_admin"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id, 'admin')
    AND role != 'owner'  -- Cannot remove the owner
  );

-- == Brands (replace existing user_id-only policies) ==
-- Drop old policies that only check user_id
DROP POLICY IF EXISTS "brands_select_own" ON public.brands;
DROP POLICY IF EXISTS "brands_insert_own" ON public.brands;
DROP POLICY IF EXISTS "brands_update_own" ON public.brands;
DROP POLICY IF EXISTS "brands_delete_own" ON public.brands;

CREATE POLICY "brands_select"
  ON public.brands FOR SELECT
  TO authenticated
  USING (
    -- Legacy personal brands (no workspace yet)
    (workspace_id IS NULL AND user_id = auth.uid())
    -- Workspace member can view
    OR public.is_workspace_member(workspace_id, 'viewer')
    -- Public brands visible to all
    OR is_public = true
  );

-- Allow anon to see public brands
CREATE POLICY "brands_select_public"
  ON public.brands FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "brands_insert"
  ON public.brands FOR INSERT
  TO authenticated
  WITH CHECK (
    (workspace_id IS NULL AND user_id = auth.uid())
    OR public.is_workspace_member(workspace_id, 'editor')
  );

CREATE POLICY "brands_update"
  ON public.brands FOR UPDATE
  TO authenticated
  USING (
    (workspace_id IS NULL AND user_id = auth.uid())
    OR public.is_brand_member(id, 'editor')
  );

CREATE POLICY "brands_delete"
  ON public.brands FOR DELETE
  TO authenticated
  USING (
    (workspace_id IS NULL AND user_id = auth.uid())
    OR public.is_brand_member(id, 'admin')
  );

-- == Brand Members ==
ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bm_select"
  ON public.brand_members FOR SELECT
  TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));

CREATE POLICY "bm_insert"
  ON public.brand_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_brand_member(brand_id, 'admin'));

CREATE POLICY "bm_update"
  ON public.brand_members FOR UPDATE
  TO authenticated
  USING (public.is_brand_member(brand_id, 'admin'));

CREATE POLICY "bm_delete"
  ON public.brand_members FOR DELETE
  TO authenticated
  USING (public.is_brand_member(brand_id, 'admin'));

-- == Assets ==
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_select"
  ON public.assets FOR SELECT
  TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));

CREATE POLICY "assets_insert"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_brand_member(brand_id, 'editor'));

CREATE POLICY "assets_update"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (public.is_brand_member(brand_id, 'editor'));

CREATE POLICY "assets_delete"
  ON public.assets FOR DELETE
  TO authenticated
  USING (public.is_brand_member(brand_id, 'admin'));

-- == Update storage policies for workspace-based access ==
-- Drop old owner-only storage policies
DROP POLICY IF EXISTS "brand-assets_read_own" ON storage.objects;
DROP POLICY IF EXISTS "brand-assets_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "brand-assets_update_own" ON storage.objects;
DROP POLICY IF EXISTS "brand-assets_delete_own" ON storage.objects;

-- New storage policies: check workspace membership via brand_id in path
-- Storage paths follow: {brand_id}/logos/... or {brand_id}/assets/...
-- The first path segment is the brand_id.
CREATE POLICY "brand_assets_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND public.is_brand_member(
      (string_to_array(name, '/'))[1]::uuid,
      'viewer'
    )
  );

CREATE POLICY "brand_assets_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND public.is_brand_member(
      (string_to_array(name, '/'))[1]::uuid,
      'editor'
    )
  );

CREATE POLICY "brand_assets_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND public.is_brand_member(
      (string_to_array(name, '/'))[1]::uuid,
      'editor'
    )
  );

CREATE POLICY "brand_assets_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND public.is_brand_member(
      (string_to_array(name, '/'))[1]::uuid,
      'admin'
    )
  );

-- == Update guideline_presentations RLS for workspace access ==
DROP POLICY IF EXISTS "Users can view their own presentations" ON public.guideline_presentations;
DROP POLICY IF EXISTS "Users can create their own presentations" ON public.guideline_presentations;
DROP POLICY IF EXISTS "Users can update their own presentations" ON public.guideline_presentations;
DROP POLICY IF EXISTS "Users can delete their own presentations" ON public.guideline_presentations;

CREATE POLICY "presentations_select"
  ON public.guideline_presentations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_brand_member(brand_id, 'viewer')
  );

CREATE POLICY "presentations_insert"
  ON public.guideline_presentations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_brand_member(brand_id, 'editor')
  );

CREATE POLICY "presentations_update"
  ON public.guideline_presentations FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_brand_member(brand_id, 'editor')
  );

CREATE POLICY "presentations_delete"
  ON public.guideline_presentations FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_brand_member(brand_id, 'admin')
  );

-- == Update guideline_slides RLS for workspace access ==
DROP POLICY IF EXISTS "Users can view slides of their presentations" ON public.guideline_slides;
DROP POLICY IF EXISTS "Users can create slides in their presentations" ON public.guideline_slides;
DROP POLICY IF EXISTS "Users can update slides in their presentations" ON public.guideline_slides;
DROP POLICY IF EXISTS "Users can delete slides in their presentations" ON public.guideline_slides;

CREATE POLICY "slides_select"
  ON public.guideline_slides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guideline_presentations gp
      WHERE gp.id = guideline_slides.presentation_id
        AND (gp.user_id = auth.uid() OR public.is_brand_member(gp.brand_id, 'viewer'))
    )
  );

CREATE POLICY "slides_insert"
  ON public.guideline_slides FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guideline_presentations gp
      WHERE gp.id = guideline_slides.presentation_id
        AND (gp.user_id = auth.uid() OR public.is_brand_member(gp.brand_id, 'editor'))
    )
  );

CREATE POLICY "slides_update"
  ON public.guideline_slides FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guideline_presentations gp
      WHERE gp.id = guideline_slides.presentation_id
        AND (gp.user_id = auth.uid() OR public.is_brand_member(gp.brand_id, 'editor'))
    )
  );

CREATE POLICY "slides_delete"
  ON public.guideline_slides FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guideline_presentations gp
      WHERE gp.id = guideline_slides.presentation_id
        AND (gp.user_id = auth.uid() OR public.is_brand_member(gp.brand_id, 'admin'))
    )
  );
