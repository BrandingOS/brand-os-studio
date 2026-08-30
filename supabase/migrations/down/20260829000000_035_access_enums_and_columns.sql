-- Down for 035. Leaves the citext extension installed (harmless, other objects may use it).
-- Anything still depending on these columns (the access view, a CHECK) must go first; a
-- rollback cannot assume the later down files all succeeded. (Rollback rehearsal, 2026-08-30.)
DROP VIEW IF EXISTS public.workspace_member_state CASCADE;
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_mode_check;
DROP INDEX IF EXISTS public.workspace_members_user_active_idx;
DROP INDEX IF EXISTS public.brands_workspace_archived_idx;
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_id_workspace_unique;
ALTER TABLE public.brands
  DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS version, DROP COLUMN IF EXISTS updated_by;
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_mode_check,
  DROP CONSTRAINT IF EXISTS workspace_members_overrides_shape,
  DROP CONSTRAINT IF EXISTS workspace_members_cap_nonneg;
ALTER TABLE public.workspace_members
  DROP COLUMN IF EXISTS role_v2, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS brand_access_mode,
  DROP COLUMN IF EXISTS default_brand_role, DROP COLUMN IF EXISTS capability_overrides,
  DROP COLUMN IF EXISTS credits_monthly_cap, DROP COLUMN IF EXISTS suspended_at,
  DROP COLUMN IF EXISTS suspended_by, DROP COLUMN IF EXISTS suspend_reason;
ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS is_personal, DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS version;
DROP TYPE IF EXISTS public.share_target CASCADE;
DROP TYPE IF EXISTS public.invitation_status CASCADE;
DROP TYPE IF EXISTS public.brand_access_mode CASCADE;
DROP TYPE IF EXISTS public.member_status CASCADE;
DROP TYPE IF EXISTS public.brand_role CASCADE;
DROP TYPE IF EXISTS public.workspace_role_v2 CASCADE;
