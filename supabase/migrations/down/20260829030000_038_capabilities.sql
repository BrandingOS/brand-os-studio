-- Down for 038. CASCADE throughout: these functions back triggers created here AND in
-- 039/040, and a rollback must not depend on this file knowing about all of them.
-- (Rollback rehearsal, 2026-08-30.)
DROP TRIGGER IF EXISTS trg_workspace_members_self_role ON public.workspace_members;
DROP TRIGGER IF EXISTS trg_workspace_members_guard_last_owner ON public.workspace_members;
DROP TRIGGER IF EXISTS trg_workspace_members_validate_overrides ON public.workspace_members;
DROP TRIGGER IF EXISTS trg_brand_access_validate_overrides ON public.brand_access;
DROP TRIGGER IF EXISTS trg_brand_access_refuse_implicit ON public.brand_access;
DROP FUNCTION IF EXISTS public.create_workspace(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.archive_brand(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_brand_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.grant_brand_access(uuid, uuid, public.brand_role, jsonb, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.transfer_ownership(uuid, uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.leave_workspace(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.remove_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_member_role(uuid, uuid, public.workspace_role_v2, public.brand_access_mode, public.brand_role, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.assert_capability(text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.guard_immutable_columns() CASCADE;
DROP FUNCTION IF EXISTS public.guard_self_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.guard_last_owner() CASCADE;
DROP FUNCTION IF EXISTS public.brand_access_refuse_implicit_manager() CASCADE;
DROP FUNCTION IF EXISTS public.validate_capability_overrides() CASCADE;
DROP FUNCTION IF EXISTS public.my_brand_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.my_access() CASCADE;
DROP FUNCTION IF EXISTS public.brands_with_capability(text) CASCADE;
DROP FUNCTION IF EXISTS public.workspaces_with_capability(text) CASCADE;
DROP FUNCTION IF EXISTS public.has_capability(text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.effective_capabilities(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.overridable_capabilities(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.reserved_capabilities() CASCADE;
DROP TABLE IF EXISTS public.role_capabilities CASCADE;
-- The view is what 035's down needs gone before it can drop the column.
DROP VIEW IF EXISTS public.workspace_member_state CASCADE;
