-- 012 — Restrict profiles visibility to self + workspace co-members
--       (fix cross-tenant email/PII exposure; S3-A, docs/phase-2/stage-1/03-SECURITY-VERIFICATION.md)
--
-- Confirmed finding (11 §8): migration 001's
--   CREATE POLICY "profiles_select_by_member" ON public.profiles FOR SELECT
--     TO authenticated USING (true);
-- lets ANY authenticated user SELECT EVERY row of public.profiles, including the
-- `email TEXT NOT NULL` column — a whole-user-base email/PII harvest by any single
-- signed-in account. It is authenticated-only (anon has no profiles SELECT policy),
-- but it is still cross-tenant PII access → FIX NOW.
--
-- Fix: replace the `USING (true)` policy with visibility limited to (a) the caller's
-- own row and (b) profiles of users who share at least one workspace with the caller
-- (the legitimate "member lists" use case). Super-admins retain full access via
-- migration 004's `admin_profiles_all` (unchanged). A SECURITY DEFINER helper is used
-- (mirroring is_workspace_member / is_workspace_owner) so the workspace-membership
-- lookup bypasses workspace_members' own RLS and cannot recurse.
--
-- Scope: this migration changes ONLY the one over-broad profiles SELECT policy and
-- adds one helper. It does not touch other profiles policies, other tables, or any
-- data. Idempotent (DROP IF EXISTS + CREATE OR REPLACE). Reversible — see
-- supabase/migrations/down/012_restrict_profiles_visibility.down.sql.
--
-- Legitimate flows preserved (VERIFIED against code 2026-08-09):
--   * Workspace member lists (co-members' name/avatar/email) — clause (b).
--   * Self profile — clause (a) / existing profiles_select_own.
--   * Admin user management (adminService reads all profiles) — via admin_profiles_all
--     (004:76), which checks is_super_admin(); regular users lose the all-profiles read.
--   * Public pages read denormalized data, not profiles (anon has no profiles policy) —
--     no regression.

-- ── Helper: does the caller share any workspace with the target user? ─────────
CREATE OR REPLACE FUNCTION public.shares_workspace_with(_other_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members a
    JOIN public.workspace_members b ON a.workspace_id = b.workspace_id
    WHERE a.user_id = (SELECT auth.uid())
      AND b.user_id = _other_user
  );
$$;

-- ── Replace the over-broad SELECT policy ─────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_by_member" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_coworkers" ON public.profiles;
CREATE POLICY "profiles_select_coworkers"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.shares_workspace_with(id)
  );
