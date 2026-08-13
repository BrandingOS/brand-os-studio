-- Down for 022 — Onboarding progress.
--
-- DATA LOSS WARNING: dropping this column discards every in-progress
-- onboarding marker. Brands themselves are untouched and stay fully usable —
-- they simply all read as "finished", so anyone mid-flow loses their place and
-- lands in Setup instead of resuming. Nothing about the brand's Core, Library
-- or Business Info depends on this column.

DROP INDEX IF EXISTS public.brands_onboarding_unfinished_idx;

ALTER TABLE public.brands
  DROP COLUMN IF EXISTS onboarding;
