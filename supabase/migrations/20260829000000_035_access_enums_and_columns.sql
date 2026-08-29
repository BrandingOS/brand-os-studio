-- ============================================================================
-- 035 — Access architecture: enums and columns (ADDITIVE; changes no behaviour)
--
-- Introduces the vocabulary of the workspace/brand access model
-- (docs/access-architecture/02-target-domain-model.md):
--   workspace_role_v2  owner · admin · member · guest      (workspace scope)
--   brand_role         manager · editor · designer · viewer (brand scope)
-- plus membership status / brand-access mode / invitation status / share target.
--
-- `workspace_members.role_v2` sits BESIDE the old `role` until 039 rewrites every
-- policy and helper against it and renames it in the same transaction — a value
-- added to an enum cannot be used in the transaction that added it, and a column
-- rename must land together with everything compiled against the old type.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

DO $$ BEGIN
  IF to_regtype('public.workspace_role_v2') IS NULL THEN
    CREATE TYPE public.workspace_role_v2 AS ENUM ('owner','admin','member','guest');
  END IF;
  IF to_regtype('public.brand_role') IS NULL THEN
    CREATE TYPE public.brand_role AS ENUM ('manager','editor','designer','viewer');
  END IF;
  IF to_regtype('public.member_status') IS NULL THEN
    CREATE TYPE public.member_status AS ENUM ('active','suspended');
  END IF;
  IF to_regtype('public.brand_access_mode') IS NULL THEN
    CREATE TYPE public.brand_access_mode AS ENUM ('all','selected');
  END IF;
  IF to_regtype('public.invitation_status') IS NULL THEN
    CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked','expired');
  END IF;
  IF to_regtype('public.share_target') IS NULL THEN
    CREATE TYPE public.share_target AS ENUM ('identity','design','showcase','guideline');
  END IF;
END $$;

-- ── workspaces ──────────────────────────────────────────────────────────────
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS version     integer NOT NULL DEFAULT 1;

-- ── workspace_members ───────────────────────────────────────────────────────
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role_v2              public.workspace_role_v2,
  ADD COLUMN IF NOT EXISTS status               public.member_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS brand_access_mode    public.brand_access_mode NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS default_brand_role   public.brand_role,
  ADD COLUMN IF NOT EXISTS capability_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credits_monthly_cap  bigint,
  ADD COLUMN IF NOT EXISTS suspended_at         timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by         uuid,
  ADD COLUMN IF NOT EXISTS suspend_reason       text;

-- role ⇒ mode coherence. NULL role_v2 is tolerated until 036 backfills it.
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_mode_check;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_mode_check CHECK (
  role_v2 IS NULL
  OR (role_v2 IN ('owner','admin') AND brand_access_mode = 'all' AND default_brand_role IS NULL)
  OR (role_v2 = 'guest' AND brand_access_mode = 'selected')
  OR (role_v2 = 'member')
);
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_overrides_shape;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_overrides_shape
  CHECK (jsonb_typeof(capability_overrides) = 'object');
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_cap_nonneg;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_cap_nonneg
  CHECK (credits_monthly_cap IS NULL OR credits_monthly_cap >= 0);

-- ── brands ──────────────────────────────────────────────────────────────────
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS version     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by  uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_id_workspace_unique') THEN
    -- Target for the composite FKs that let every child row carry a tenant id the
    -- database guarantees is the brand's own (ADR-005).
    ALTER TABLE public.brands ADD CONSTRAINT brands_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END $$;

-- ── indexes the resolver will lean on ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS brands_workspace_archived_idx
  ON public.brands (workspace_id, archived_at);
CREATE INDEX IF NOT EXISTS workspace_members_user_active_idx
  ON public.workspace_members (user_id, workspace_id) WHERE status = 'active';

-- ── guard rail ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF to_regtype('public.brand_role') IS NULL OR to_regtype('public.workspace_role_v2') IS NULL THEN
    RAISE EXCEPTION '035 guard: enums missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_role_mode_check') THEN
    RAISE EXCEPTION '035 guard: role/mode CHECK missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_id_workspace_unique') THEN
    RAISE EXCEPTION '035 guard: brands (id, workspace_id) unique missing';
  END IF;
  RAISE NOTICE '035 OK — access enums and columns in place';
END $$;
