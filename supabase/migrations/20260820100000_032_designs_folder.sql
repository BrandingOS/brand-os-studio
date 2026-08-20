-- ═══════════════════════════════════════════════════════════════════════════
-- 032 — Designs join the brand's folder tree
--
-- One brand filesystem, several views into it. `brand_folders` (migration 017)
-- is the brand's ONE folder tree; assets have referenced it since 017 via
-- `assets.folder_id`. This gives designs the same nullable membership so
-- Library, Designs and Kit share the structure instead of each inventing one.
--
-- Kit needs no migration: its state is a single JSONB blob (018), so folder
-- membership there is an additive field.
--
-- Nullable and unset by default. Every existing design therefore reads as
-- unfiled — which is exactly what it is — and the client degrades cleanly when
-- this migration has not been deployed yet (see SupabaseDesignStorage:
-- `hasFolderColumn`).
--
-- Reversible: supabase/migrations/down/032_designs_folder.down.sql
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS folder_id UUID;

-- The pair must match, so a design can never be filed into ANOTHER brand's
-- folder. RLS governs which rows you may READ; it does not constrain which id
-- you may WRITE into a foreign key — the same reasoning as `assets_folder_fk`
-- in 017, and the reason this is a composite key rather than a plain one.
--
-- ON DELETE SET NULL (folder_id) nulls ONLY the folder link. A composite
-- SET NULL would null `brand_id` as well, which is NOT NULL and is the design's
-- tenancy anchor — Postgres would raise, and a folder could then never be
-- deleted while it held a design. Deleting a folder must never delete work.
DO $designs_folder_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'designs_folder_fk'
  ) THEN
    ALTER TABLE public.designs
      ADD CONSTRAINT designs_folder_fk
      FOREIGN KEY (folder_id, brand_id)
      REFERENCES public.brand_folders (id, brand_id)
      ON DELETE SET NULL (folder_id) NOT VALID;
  END IF;
END $designs_folder_fk$;

CREATE INDEX IF NOT EXISTS designs_folder_idx
  ON public.designs (brand_id, folder_id);

COMMENT ON COLUMN public.designs.folder_id IS
  'Membership in the brand''s shared folder tree (public.brand_folders). NULL = unfiled, '
  'shown at the root. The tree is brand-level: Library, Designs and Kit are views over the '
  'same folders, never three separate folder systems.';

-- Guard-rail: fail loudly rather than half-applying.
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'designs' AND column_name = 'folder_id'
  ) THEN
    RAISE EXCEPTION '032: designs.folder_id was not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'designs_folder_fk') THEN
    RAISE EXCEPTION '032: designs_folder_fk was not created';
  END IF;
END $verify$;
