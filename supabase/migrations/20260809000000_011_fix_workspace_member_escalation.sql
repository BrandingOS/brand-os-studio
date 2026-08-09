-- 011 — Fix cross-tenant workspace-membership privilege escalation (RLS containment)
--
-- Confirmed vulnerability — see docs/codebase-intelligence/11-CRITICAL-VERIFICATION.md
-- §7 (Verified P0 #1) and docs/codebase-intelligence/12-RLS-CONTAINMENT.md.
--
-- The `wm_insert_admin` policy created in migration
-- 20260412000000_001_workspaces_and_rls.sql allowed ANY authenticated user to
-- insert  (workspace_id = <arbitrary>, user_id = self, role = 'owner')  because of
-- the unconditional disjunct:  OR (user_id = auth.uid() AND role = 'owner').
-- The victim workspace's UUID is even readable by `anon` via `brands_select_public`
-- (public brand rows carry `workspace_id`). Because `is_workspace_member()` is
-- SECURITY DEFINER and reads `workspace_members` directly, the planted 'owner' row
-- immediately became authoritative — granting full cross-tenant read/write takeover
-- (workspaces_update_admin, member management, brands/assets via is_brand_member's
-- workspace fallback, subscription/invoice reads). Migration 004's
-- `admin_workspace_members_all` is permissive and cannot close the hole.
--
-- This migration makes the smallest change that closes the takeover while
-- preserving every legitimate membership flow:
--
--   1. INSERT — self-insert-as-owner is permitted ONLY when the caller genuinely
--      owns the target workspace (public.workspaces.owner_id = auth.uid()).
--      `workspaces_insert_auth` (migration 001) guarantees owner_id is set to the
--      creator at workspace-creation time and an attacker cannot forge it for a
--      victim workspace (INSERT requires owner_id = auth.uid(); changing owner_id
--      later requires workspace-admin, which this very fix prevents planting).
--
--   2. UPDATE — add a WITH CHECK and an owner-row guard so an already-legitimate
--      admin cannot self-promote to 'owner' or overwrite/seize the owner's row
--      (a related workspace-membership escalation path, in scope per the task).
--
-- Legitimate flows preserved (verified against code, 2026-08-09):
--   * public.handle_new_user_workspace() signup trigger — SECURITY DEFINER, bypasses
--     RLS entirely, so it never needed and does not use the removed clause.
--   * SupabaseWorkspaceService.create() (src/core/adapters/database/…:40-58, called
--     from workspaceStore.ts:85) — creates a workspace with owner_id = self, then
--     self-inserts the owner membership row → satisfied by the ownership-gated clause.
--   * Admins adding / updating editor/exporter/viewer members → clause (a) / UPDATE.
--   * Super-admin full control → migration 004 admin_workspace_members_all (FOR ALL).
--   * admin-invite Edge Function uses the service role (RLS bypassed) and does not
--     insert workspace_members at all.
--
-- Idempotent (DROP POLICY IF EXISTS + CREATE). Reversible — see
-- supabase/migrations/down/011_fix_workspace_member_escalation.down.sql.

-- ── 0. Ownership helper (SECURITY DEFINER — mirrors is_workspace_member) ──────
-- Needed by clause (b) below. It MUST be SECURITY DEFINER so it bypasses the
-- `workspaces` table's own RLS: at the moment SupabaseWorkspaceService.create()
-- self-inserts the owner membership row, no workspace_members row exists yet, so
-- `workspaces_select_member` would hide the just-created workspace from its own
-- creator and an inline sub-SELECT would wrongly evaluate to false (blocking the
-- legitimate bootstrap). A definer function reads owner_id directly and correctly.
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id
      AND owner_id = (SELECT auth.uid())
  );
$$;

-- ── 1. INSERT: close the cross-tenant self-owner hole ────────────────────────
DROP POLICY IF EXISTS "wm_insert_admin" ON public.workspace_members;
CREATE POLICY "wm_insert_admin"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- (a) An existing admin (or owner) of the workspace may add members.
    public.is_workspace_member(workspace_id, 'admin')
    -- (b) The genuine creator of a workspace may bootstrap themselves as owner.
    --     Gated on real ownership (definer helper) so it cannot target a workspace
    --     the caller does not own — this is what closes the cross-tenant takeover.
    OR (
      user_id = (SELECT auth.uid())
      AND role = 'owner'
      AND public.is_workspace_owner(workspace_id)
    )
  );

-- ── 2. UPDATE: prevent admin→owner self-promotion & owner-row seizure ─────────
DROP POLICY IF EXISTS "wm_update_admin" ON public.workspace_members;
CREATE POLICY "wm_update_admin"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id, 'admin')
    AND role <> 'owner'            -- an admin cannot modify the owner's membership row
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id, 'admin')
    AND role <> 'owner'            -- …and cannot promote anyone (incl. self) to 'owner'
  );

-- ── 3. DELETE: intentionally unchanged ───────────────────────────────────────
-- `wm_delete_admin` (migration 001) already requires workspace-admin membership
-- AND forbids deleting a row with role = 'owner', so it carries no cross-tenant
-- or owner-seizure variant of this bug. Left as-is to keep this migration minimal.
