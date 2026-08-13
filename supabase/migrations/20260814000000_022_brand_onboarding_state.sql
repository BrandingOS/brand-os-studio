-- 022 — Onboarding progress on the brand (spec 002).
--
-- Brand-first onboarding creates the brand at the naming step, so a brand can
-- exist while onboarding is still in progress. This column records where the
-- user got to, which is what makes resume work across sessions and devices.
--
-- Additive and nullable by design:
--   * NULL / absent  → not created by onboarding. Every pre-existing brand
--                      reads as finished, so there is no backfill.
--   * completed_at   → set once when the user finishes. Never cleared.
--
-- Shape (validated in TypeScript, not here — a malformed marker must never
-- make a brand unopenable):
--   { "step": "basics"|"material"|"review",
--     "branch": "existing"|"new",
--     "startedAt": "<iso>",
--     "completedAt": "<iso>"|null }
--
-- RLS: inherited from the `brands` row policies. No new policy — the column is
-- part of a row that is already scoped to its owner. See
-- supabase/tests/022_onboarding_state.test.sql for the proof.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS onboarding jsonb;

COMMENT ON COLUMN public.brands.onboarding IS
  'Onboarding progress (spec 002). NULL means the brand was not created by onboarding and is treated as finished. completedAt non-null means finished.';

-- Partial index: the only query that filters on this column is "show me my
-- unfinished brands", which is a small subset of a small table.
CREATE INDEX IF NOT EXISTS brands_onboarding_unfinished_idx
  ON public.brands (user_id)
  WHERE onboarding IS NOT NULL AND onboarding->>'completedAt' IS NULL;
