-- Phase 4 — Content Universe (templates + categories).
--
-- Two new tables: template_categories (the taxonomy) and templates
-- (the content). Source-discriminated single table covers all five
-- content kinds (curated / ai_editable / ai_rasterized /
-- ai_prompt_preset / user_uploaded) so the gallery / search / admin
-- queue all read from one shape.
--
-- Phase 4 ships a LOCAL adapter (LocalTemplatesService, localStorage)
-- as the dev default. This SQL migration defines the SHAPE the
-- production Supabase-backed adapter will swap to once the user runs
-- `npx supabase db push` interactively. Until then the local adapter
-- mirrors the schema and tests run against it.
--
-- Idempotent — every CREATE has IF NOT EXISTS / IF NOT EXISTS guards
-- so re-runs are safe (Phase 3 migration repair lesson).

-- ─── template_categories ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,                                 -- lucide icon name
  display_order INT NOT NULL DEFAULT 0,
  parent_category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
  content_type_config_id TEXT NOT NULL,           -- maps to ContentTypeConfig.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS template_categories_parent_idx
  ON template_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS template_categories_display_order_idx
  ON template_categories(display_order);

-- ─── templates ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN (
    'curated', 'ai_editable', 'ai_rasterized', 'ai_prompt_preset', 'user_uploaded'
  )),
  category_id UUID NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
  document JSONB,                                 -- BrandOSDocument; null for ai_rasterized + ai_prompt_preset
  thumbnail_url TEXT NOT NULL,
  preview_image_url TEXT,                         -- larger preview
  width INT NOT NULL,
  height INT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  mood TEXT,                                      -- 'professional' | 'playful' | 'minimal' | 'bold' | etc.
  -- AI-specific fields
  prompt_text TEXT,                               -- for ai_prompt_preset
  prompt_system_hints TEXT,                       -- additional context for AI
  raster_image_url TEXT,                          -- for ai_rasterized
  -- User-uploaded fields
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upload_status TEXT CHECK (upload_status IN ('pending', 'approved', 'rejected') OR upload_status IS NULL),
  uploaded_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  -- Visibility (used by 4.4)
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public')),
  -- Premium fields (forward-compatibility — no UI in Phase 4)
  is_premium BOOLEAN DEFAULT FALSE,
  required_plan TEXT,
  -- Stats
  use_count INT DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS templates_category_idx ON templates(category_id);
CREATE INDEX IF NOT EXISTS templates_source_idx ON templates(source);
CREATE INDEX IF NOT EXISTS templates_tags_idx ON templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS templates_status_idx
  ON templates(upload_status) WHERE upload_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS templates_visibility_idx ON templates(visibility);
CREATE INDEX IF NOT EXISTS templates_use_count_idx ON templates(use_count DESC);

-- ─── designs additions (Phase 4.2 — added here to keep migrations atomic) ─
--
-- Phase 4.2 needs designs.thumbnail_url + designs.is_template +
-- designs.template_category_id + designs.source_template_id. We
-- consolidate Phase 4.2's design table additions here so there's a
-- single migration to deploy for Phase 4. Backwards-compatible
-- additions only (all NULL-tolerant).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'designs') THEN
    ALTER TABLE designs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE designs ADD COLUMN IF NOT EXISTS source_template_id UUID
      REFERENCES templates(id) ON DELETE SET NULL;
    ALTER TABLE designs ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
    ALTER TABLE designs ADD COLUMN IF NOT EXISTS template_category_id UUID
      REFERENCES template_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 4.4 prep — admin role flag on user profile ─────────────────────────
--
-- Used by admin templates queue route. Default false; set true for
-- admins via direct DB or future admin UI. Owed: full RBAC review.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ─── RLS policies ───────────────────────────────────────────────────────
--
-- template_categories: readable by all (anon ok); writable by service role.
-- templates:
--   • SELECT: visibility = 'public' AND (upload_status = 'approved' OR
--     source != 'user_uploaded'); private templates only by uploader.
--   • INSERT: authenticated users only; user_uploaded with status 'pending'.
--   • UPDATE: only the uploader (until approval), or admins.
--   • DELETE: only the uploader OR admins.

ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS template_categories_anon_read ON template_categories;
CREATE POLICY template_categories_anon_read ON template_categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS templates_anon_read_public ON templates;
CREATE POLICY templates_anon_read_public ON templates
  FOR SELECT TO anon, authenticated
  USING (
    visibility = 'public' AND
    (source != 'user_uploaded' OR upload_status = 'approved')
  );

DROP POLICY IF EXISTS templates_owner_read_private ON templates;
CREATE POLICY templates_owner_read_private ON templates
  FOR SELECT TO authenticated
  USING (uploaded_by_user_id = auth.uid());

DROP POLICY IF EXISTS templates_owner_insert ON templates;
CREATE POLICY templates_owner_insert ON templates
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_user_id = auth.uid());

DROP POLICY IF EXISTS templates_owner_update ON templates;
CREATE POLICY templates_owner_update ON templates
  FOR UPDATE TO authenticated
  USING (uploaded_by_user_id = auth.uid())
  WITH CHECK (uploaded_by_user_id = auth.uid());

DROP POLICY IF EXISTS templates_owner_delete ON templates;
CREATE POLICY templates_owner_delete ON templates
  FOR DELETE TO authenticated
  USING (uploaded_by_user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_categories_set_updated_at ON template_categories;
CREATE TRIGGER template_categories_set_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS templates_set_updated_at ON templates;
CREATE TRIGGER templates_set_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
