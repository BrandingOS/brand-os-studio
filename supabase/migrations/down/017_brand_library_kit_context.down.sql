-- Down migration for 017 — removes Library semantics, folders, adoptions, context.
--
-- Order matters: drop the FK-bearing column reference before the folders table.
--
-- Safe with one caveat worth stating plainly: dropping these columns/tables
-- DISCARDS Library organization (folders, favourites, archive state, reference
-- flags), Official Kit adoption records, generative-media provenance, and
-- Context signals. It does NOT delete any asset — asset rows, files in the
-- brand-assets bucket, and the legacy brand.assets[]/brand.brandAssets[] arrays
-- are untouched, so the DAM keeps working exactly as it did pre-017.

-- Adoptions + context first (no dependants).
DROP TABLE IF EXISTS public.brand_kit_adoptions;
DROP TABLE IF EXISTS public.brand_context_signals;

-- Detach assets from folders, then drop the folders table.
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_folder_fk;
DROP TRIGGER IF EXISTS trg_brand_folders_updated_at ON public.brand_folders;
DROP TABLE IF EXISTS public.brand_folders;

-- Library columns on public.assets.
DROP INDEX IF EXISTS public.idx_assets_brand_active;
DROP INDEX IF EXISTS public.idx_assets_legacy_ref;
DROP INDEX IF EXISTS public.idx_assets_folder;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_origin_check;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_fav_dislike_exclusive;

ALTER TABLE public.assets
  DROP COLUMN IF EXISTS origin,
  DROP COLUMN IF EXISTS folder_id,
  DROP COLUMN IF EXISTS is_favorite,
  DROP COLUMN IF EXISTS is_disliked,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS use_as_reference,
  DROP COLUMN IF EXISTS provenance,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS legacy_ref_id;
