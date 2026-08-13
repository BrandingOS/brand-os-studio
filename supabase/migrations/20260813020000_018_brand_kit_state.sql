-- 018 — Server home for Brand Kit deliverable state
--
-- ADDITIVE and non-destructive. One new table; nothing existing is altered.
--
-- WHY: `KitStateRepository` has always been the swap seam for kit state
-- (candidates, approvals, per-item customization), but the only implementation
-- was localStorage — so a user's Brand Kit never left the browser: no
-- cross-device, lost on cache clear. Migration 017 gave the Official Kit its
-- ADOPTION records; this gives the working state behind them a durable home.
-- The two are deliberately separate: an adoption is a small, attributed,
-- queryable fact about what the brand owns, while this is the editor's working
-- blob. Collapsing them would make "what does this brand officially own?" a
-- JSON scan.
--
-- Shape mirrors the localStorage payload exactly (`BrandKitState`: a version
-- plus a deliverables map), so the Supabase implementation is a transport swap
-- rather than a data-model change and the two modes cannot drift.
--
-- One row per brand, so `state` is a natural primary key target — no surrogate
-- id, and an upsert on brand_id is the whole write path.
--
-- RLS mirrors public.assets and the 017 tables: membership-aware via
-- public.is_brand_member(). Kit state is brand-scoped material, not per-user
-- preference, so a brand's editors share one kit — matching how the feature
-- already behaves for everyone reading the same localStorage key.
--
-- Reversible: supabase/migrations/down/018_brand_kit_state.down.sql

CREATE TABLE IF NOT EXISTS public.brand_kit_state (
  brand_id   UUID PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
  version    INTEGER NOT NULL DEFAULT 1,
  state      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.brand_kit_state IS
  'Brand Kit working state (candidates, approvals, per-item customization), one '
  'row per brand. The Official Kit''s ADOPTION records live in '
  'brand_kit_adoptions — this is the editor state behind them.';

ALTER TABLE public.brand_kit_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_kit_state_select ON public.brand_kit_state;
CREATE POLICY brand_kit_state_select ON public.brand_kit_state
  FOR SELECT USING (public.is_brand_member(brand_id, 'viewer'));
DROP POLICY IF EXISTS brand_kit_state_insert ON public.brand_kit_state;
CREATE POLICY brand_kit_state_insert ON public.brand_kit_state
  FOR INSERT WITH CHECK (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS brand_kit_state_update ON public.brand_kit_state;
CREATE POLICY brand_kit_state_update ON public.brand_kit_state
  FOR UPDATE USING (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS brand_kit_state_delete ON public.brand_kit_state;
CREATE POLICY brand_kit_state_delete ON public.brand_kit_state
  FOR DELETE USING (public.is_brand_member(brand_id, 'admin'));

DROP TRIGGER IF EXISTS trg_brand_kit_state_updated_at ON public.brand_kit_state;
CREATE TRIGGER trg_brand_kit_state_updated_at
  BEFORE UPDATE ON public.brand_kit_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
