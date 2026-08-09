-- 013 — Canonical brand identity column (Stage 2B persistence foundation)
--
-- ADDITIVE and non-destructive. Adds a dedicated home for the canonical
-- BrandIdentity value object (src/domain/brand) so authenticated brands can
-- round-trip the full identity WITHOUT (a) the Supabase update whitelist silently
-- dropping colorSystem/logoSystem/typography, or (b) abusing the `guidelines`
-- JSONB as a second, drifting Brand database.
--
-- Owner Decision 3: "conceptual ownership, not database monolithism." The identity
-- is one cohesive value object read/written whole by the editor → a single bounded
-- JSONB is the right shape (not per-attribute tables, not the guidelines mirror).
-- `identity_schema_version` is stored explicitly so reads never re-derive/migrate
-- on load (the mechanism that let stale mirrors overwrite fresh values — 05/11).
--
-- No existing column is altered or dropped; legacy columns remain the source of
-- truth for un-migrated consumers until each is migrated (Stage 2D onward).
-- Reversible: supabase/migrations/down/013_brand_identity_column.down.sql.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS identity JSONB;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS identity_schema_version INTEGER;
