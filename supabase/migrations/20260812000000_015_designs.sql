-- 015 — Designs table (server-backed durable Design/Document persistence)
--
-- ADDITIVE and non-destructive. Until now the editor's saved designs went through
-- `IDesignStorage` = `LocalDesignStorage` (localStorage) EVEN FOR AUTHENTICATED
-- USERS (see boot.ts) — so a logged-in user's saved work never left the browser:
-- no cross-device, no share, lost on cache clear. This table is the intentional
-- server home so `SupabaseDesignStorage` can persist authenticated designs.
--
-- The design BODY is a JSONB `data` blob (the editor document); the remaining
-- columns are the `DesignSummary` fields (src/core/types/services.ts) so
-- `listDesigns` can render the My Designs grid without loading every body.
--
-- Ownership is per-user (`user_id`), RLS owner-scoped — the safe default for a
-- test-stage product (brand/workspace-member SHARING of designs is a deliberate
-- follow-on, tracked in the control center, not required for durable save/reload).
--
-- Reversible: supabase/migrations/down/015_designs.down.sql.

CREATE TABLE IF NOT EXISTS public.designs (
  brand_id            UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  id                  TEXT        NOT NULL,               -- app-generated design id (slug/uuid)
  user_id             UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data                JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- the editor document body
  -- DesignSummary projection (for listDesigns without loading bodies)
  name                TEXT,
  thumbnail_url       TEXT,
  content_type        TEXT,
  width               INTEGER,
  height              INTEGER,
  source_template_id  TEXT,
  is_template         BOOLEAN     NOT NULL DEFAULT FALSE,
  family_id           TEXT,
  source_design_id    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, id)
);

CREATE INDEX IF NOT EXISTS designs_brand_updated_idx
  ON public.designs (brand_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS designs_user_idx
  ON public.designs (user_id);

ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Owner-scoped: a user reads/writes only their own designs. (Brand-member
-- sharing of designs is a documented follow-on; owner-scoping is the safe
-- baseline that guarantees no cross-tenant leak.)
DROP POLICY IF EXISTS designs_owner_all ON public.designs;
CREATE POLICY designs_owner_all ON public.designs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Keep updated_at fresh on UPDATE (mirrors the brands trigger convention).
DROP TRIGGER IF EXISTS trg_designs_updated_at ON public.designs;
CREATE TRIGGER trg_designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
