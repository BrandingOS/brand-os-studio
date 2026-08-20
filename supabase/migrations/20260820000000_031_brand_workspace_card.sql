-- 031 — How a brand presents itself on the dashboard.
--
-- The dashboard is a board of PROJECTS, and a project is not the same thing as
-- the brand inside it. Someone who works on one client's brand twice — a
-- rebrand and its pitch, the same identity in two states — ends up with two
-- cards that are indistinguishable, and renaming either one would rename the
-- brand itself everywhere it appears. So the card gets its own name, and its
-- own cover, and neither touches `brands.name`.
--
-- Shape (validated in TypeScript, not here — a malformed value must never make
-- a brand unopenable):
--   { "label": "<string>",         -- shown on the card INSTEAD of name
--     "coverAssetId": "<uuid|id>", -- canonical: a Library item, resolved live
--     "coverUrl": "<url>" }        -- fallback only, for a cover with no item
--
-- The asset id is the identity. A url is a snapshot of where the bytes were
-- once, and the Library replaces, re-versions and tombstones items underneath
-- it; a card keyed on the url would keep showing material the brand has since
-- deleted. When `coverAssetId` no longer resolves, the card falls back to the
-- brand's own colour and logo rather than to a stale image.
--
-- Additive and nullable: NULL means the card shows the brand's name and its
-- logo, which is what every existing brand already does. No backfill.
--
-- RLS: inherited from the `brands` row policies. The column is part of a row
-- already scoped to its owner, so there is no new policy to write.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS workspace_card jsonb;

COMMENT ON COLUMN public.brands.workspace_card IS
  'Dashboard card presentation: { label, coverAssetId, coverUrl }. NULL means show the brand name and logo. Never affects brands.name.';
