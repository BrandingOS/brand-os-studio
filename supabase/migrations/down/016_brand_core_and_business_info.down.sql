-- Down migration for 016 — drops the Brand Core metadata + Business Info columns.
--
-- Safe: both columns are nullable, additive, and read through the canonical
-- brand model, which defaults missing metadata to
-- {authority: 'provisional', provenance: 'imported'} at read time. Dropping
-- them loses recorded authority/provenance and business facts, but no code
-- breaks — brands resolve exactly as they did pre-016.

ALTER TABLE public.brands DROP COLUMN IF EXISTS identity_meta;
ALTER TABLE public.brands DROP COLUMN IF EXISTS business_info;
