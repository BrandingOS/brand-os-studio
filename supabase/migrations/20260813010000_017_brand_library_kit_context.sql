-- 017 — Brand Library semantics, folders, Official Kit adoptions, Context signals
--
-- ADDITIVE and non-destructive. Nine nullable/defaulted columns on the EXISTING
-- public.assets table plus three new brand-scoped tables. No column is altered
-- or dropped, no data is rewritten, no trigger is added.
--
-- WHY EXTEND public.assets INSTEAD OF A NEW TABLE:
-- Brand material lives in THREE places today — brand.assets[] (legacy inline
-- array, written by useUpload), brand.brandAssets[] (v3 inline array, written by
-- assetOperations and referenced by logoSystem), and public.assets (the DAM,
-- read by the Folders page). Only the third has membership-aware RLS, a storage
-- bucket with brand-scoped policies, and a local+server service pair. Creating a
-- `library_items` table would rename a correct table and leave a dead twin. So
-- public.assets BECOMES the Brand Library and the two inline arrays migrate into
-- it (application-layer ingest, keyed on legacy_ref_id, idempotent).
--
-- `legacy_ref_id` exists for exactly one reason: logoSystem slots are
-- AssetRef{assetId} pointing into brand.brandAssets[], whose ids are
-- app-generated strings, while assets.id is a uuid. Ingest preserves the old id
-- here so unrewritten refs still resolve during the transition. It is dropped
-- (migration 018) once zero rows populate it and no reader uses the fallback.
--
-- `deleted_at` is a TOMBSTONE, not a versioning system: deleting a Library item
-- must never corrupt saved work, so the row keeps id/name/origin as an inert
-- lineage record while leaving every Library view. There is no history table, no
-- prior versions, no restore-to-point-in-time. `archived_at` is the reversible
-- operation; delete is one-way apart from the inert record.
--
-- CHECK constraints are added NOT VALID so this migration cannot fail on an
-- unexpected legacy row (the repo rule is "if db push errors, do NOT force").
-- They are enforced for all new and updated rows immediately; VALIDATE
-- CONSTRAINT runs as its own re-runnable step after the Library ingest.
--
-- The three new tables use the SAME membership-aware RLS as public.assets —
-- public.is_brand_member() — because brand isolation must be enforced at the
-- data layer, never by UI filtering. brand_kit_adoptions additionally requires
-- adopted_by = auth.uid() on INSERT so an adoption cannot be attributed to
-- another user.
--
-- Official Kit adoptions store a REFERENCE plus adoption metadata and never a
-- copy of the adopted object: the Library item (or Core value) remains the one
-- canonical object. There is deliberately NO trigger and NO default insert path
-- — nothing creates an adoption except an explicit human action.
--
-- Context signals are Brand Context v1: plain rows recording favourites,
-- dislikes, references, approvals and usage. No embeddings, no vectors, no
-- scheduled recomputation, no cross-brand reads. It cannot write Brand Core.
--
-- Reversible: supabase/migrations/down/017_brand_library_kit_context.down.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 017.1 — Library semantics on public.assets
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS origin           TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS folder_id        UUID,
  ADD COLUMN IF NOT EXISTS is_favorite      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_disliked      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS use_as_reference BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance       JSONB,
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_ref_id    TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_origin_check'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_origin_check
      CHECK (origin IN ('uploaded', 'generated', 'reference')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_fav_dislike_exclusive'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_fav_dislike_exclusive
      CHECK (NOT (is_favorite AND is_disliked)) NOT VALID;
  END IF;
END $$;

-- Default Library view = active items only.
CREATE INDEX IF NOT EXISTS idx_assets_brand_active
  ON public.assets (brand_id)
  WHERE deleted_at IS NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_legacy_ref ON public.assets (legacy_ref_id);
CREATE INDEX IF NOT EXISTS idx_assets_folder     ON public.assets (folder_id);

COMMENT ON COLUMN public.assets.legacy_ref_id IS
  'Pre-migration brandAssets[]/assets[] id, preserved so logoSystem AssetRefs resolve '
  'during convergence. Dropped once zero rows populate it and no reader uses it.';
COMMENT ON COLUMN public.assets.deleted_at IS
  'Tombstone marker. The row is retained as an inert lineage record (id/name/origin) so '
  'existing Work/Outputs never dangle. NOT a versioning system.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 017.2 — Folders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.brand_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  parent_id  UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, parent_id, name),
  -- Target for the composite foreign keys below, so a folder reference can
  -- never cross a brand boundary.
  UNIQUE (id, brand_id)
);

-- Postgres treats NULLs as DISTINCT in UNIQUE, so the constraint above does not
-- prevent two ROOT folders sharing a name. Cover that case explicitly.
CREATE UNIQUE INDEX IF NOT EXISTS brand_folders_root_name_unique
  ON public.brand_folders (brand_id, name)
  WHERE parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_brand_folders_brand ON public.brand_folders (brand_id);

-- A folder's parent must belong to the SAME brand. A plain FK on `id` alone
-- would let an editor who knows another brand's folder UUID nest under it —
-- and deleting that foreign parent would then cascade into this brand's
-- folders. RLS governs which rows you can READ; it does not constrain which
-- id you may WRITE into a foreign key.
DO $fk$
BEGIN
  ALTER TABLE public.brand_folders
    ADD CONSTRAINT brand_folders_parent_same_brand
    FOREIGN KEY (parent_id, brand_id)
    REFERENCES public.brand_folders (id, brand_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $fk$;

-- Same reasoning for an asset's folder: the pair must match, so an asset can
-- never be filed into another brand's folder.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_folder_fk'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_folder_fk FOREIGN KEY (folder_id, brand_id)
      REFERENCES public.brand_folders (id, brand_id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 017.3 — Official Brand Kit adoptions (references, never copies)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.brand_kit_adoptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('core_value', 'library_item', 'kit_deliverable')),
  target_ref  TEXT NOT NULL,
  adopted_by  UUID NOT NULL,
  adopted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  UNIQUE (brand_id, target_kind, target_ref)
);

CREATE INDEX IF NOT EXISTS idx_kit_adoptions_brand ON public.brand_kit_adoptions (brand_id);

COMMENT ON TABLE public.brand_kit_adoptions IS
  'What the brand OFFICIALLY owns. Each row is a reference (target_kind + target_ref) '
  'plus adoption metadata — never a copy of the adopted object. No trigger and no '
  'default insert path exists: only an explicit human action creates a row.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 017.4 — Brand Context v1 signals
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.brand_context_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('favorite', 'dislike', 'reference', 'approval', 'preference', 'usage')),
  target_kind TEXT CHECK (target_kind IN ('library_item', 'core_value', 'design')),
  target_ref  TEXT,
  value       JSONB,
  source      TEXT NOT NULL CHECK (source IN ('user-action', 'derived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_context_brand_created
  ON public.brand_context_signals (brand_id, created_at DESC);

COMMENT ON TABLE public.brand_context_signals IS
  'Brand Context v1 — plain recorded signals (favourites, dislikes, references, '
  'approvals, usage). Inspectable and deletable by the user. Never writes Brand Core.';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — membership-aware, mirroring public.assets (migration 001)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brand_folders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_adoptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_context_signals ENABLE ROW LEVEL SECURITY;

-- brand_folders
DROP POLICY IF EXISTS brand_folders_select ON public.brand_folders;
CREATE POLICY brand_folders_select ON public.brand_folders
  FOR SELECT USING (public.is_brand_member(brand_id, 'viewer'));
DROP POLICY IF EXISTS brand_folders_insert ON public.brand_folders;
CREATE POLICY brand_folders_insert ON public.brand_folders
  FOR INSERT WITH CHECK (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS brand_folders_update ON public.brand_folders;
CREATE POLICY brand_folders_update ON public.brand_folders
  FOR UPDATE USING (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS brand_folders_delete ON public.brand_folders;
CREATE POLICY brand_folders_delete ON public.brand_folders
  FOR DELETE USING (public.is_brand_member(brand_id, 'admin'));

-- brand_kit_adoptions — INSERT additionally self-attributes.
DROP POLICY IF EXISTS brand_kit_adoptions_select ON public.brand_kit_adoptions;
CREATE POLICY brand_kit_adoptions_select ON public.brand_kit_adoptions
  FOR SELECT USING (public.is_brand_member(brand_id, 'viewer'));
DROP POLICY IF EXISTS brand_kit_adoptions_insert ON public.brand_kit_adoptions;
CREATE POLICY brand_kit_adoptions_insert ON public.brand_kit_adoptions
  FOR INSERT WITH CHECK (
    public.is_brand_member(brand_id, 'editor')
    AND adopted_by = (SELECT auth.uid())
  );
-- NO UPDATE POLICY, deliberately. An adoption is a historical fact: who
-- adopted what, and when. An UPDATE policy that checked only membership would
-- let an editor rewrite `adopted_by` to another user, defeating the
-- self-attribution the INSERT policy enforces and corrupting provenance.
-- Changing an adoption means un-adopting and adopting again, which records the
-- new decision honestly.
DROP POLICY IF EXISTS brand_kit_adoptions_update ON public.brand_kit_adoptions;
DROP POLICY IF EXISTS brand_kit_adoptions_delete ON public.brand_kit_adoptions;
CREATE POLICY brand_kit_adoptions_delete ON public.brand_kit_adoptions
  FOR DELETE USING (public.is_brand_member(brand_id, 'admin'));

-- brand_context_signals
DROP POLICY IF EXISTS brand_context_signals_select ON public.brand_context_signals;
CREATE POLICY brand_context_signals_select ON public.brand_context_signals
  FOR SELECT USING (public.is_brand_member(brand_id, 'viewer'));
DROP POLICY IF EXISTS brand_context_signals_insert ON public.brand_context_signals;
CREATE POLICY brand_context_signals_insert ON public.brand_context_signals
  FOR INSERT WITH CHECK (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS brand_context_signals_update ON public.brand_context_signals;
CREATE POLICY brand_context_signals_update ON public.brand_context_signals
  FOR UPDATE USING (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS brand_context_signals_delete ON public.brand_context_signals;
CREATE POLICY brand_context_signals_delete ON public.brand_context_signals
  FOR DELETE USING (public.is_brand_member(brand_id, 'admin'));

-- updated_at trigger for folders (mirrors the brands/designs convention).
DROP TRIGGER IF EXISTS trg_brand_folders_updated_at ON public.brand_folders;
CREATE TRIGGER trg_brand_folders_updated_at
  BEFORE UPDATE ON public.brand_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
