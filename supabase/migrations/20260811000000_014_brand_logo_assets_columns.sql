-- 014 — Durable logo Asset records + logo-system refs (Logo subsystem finalization)
--
-- ADDITIVE and non-destructive. The canonical logo model references logos by a
-- durable Asset id (`logoSystem.<role>.assetId`), with the Asset RECORDS (formats,
-- urls) held in `brandAssets[]`. Until now neither had a column, so the Supabase
-- update whitelist dropped both and `migrateBrandToCurrent` RE-DERIVED them from
-- the legacy `logo`/`logo_assets` URLs on every read — minting ids as a hash of
-- the URL. That inverts the intended invariant: the URL became the durable
-- reference and the assetId a throwaway, so replacing a logo's URL silently
-- changed its id and broke every ref that pointed at it.
--
-- These two columns give the refs and records a durable home, so ids are minted
-- ONCE (by `stageLogoAssignment`) and preserved across reads — "the assetId is the
-- durable reference; the URL is a storage/output detail." No existing column is
-- altered; legacy `logo`/`logo_assets` remain a one-way projection for un-migrated
-- readers and the bootstrap source for brands that predate this column.
--
-- Owner Decision 3: Assets are a SEPARATE lifecycle entity that a brand references
-- by id — so they get their own columns, NOT a nesting inside the `identity` blob
-- (which is the cohesive BrandIdentity value object only).
--
-- Reversible: supabase/migrations/down/014_brand_logo_assets_columns.down.sql.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS brand_assets JSONB;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS logo_system JSONB;
