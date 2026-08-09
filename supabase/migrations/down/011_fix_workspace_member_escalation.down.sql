-- Down migration for 011 — restores the migration-001 workspace_members policies
-- EXACTLY as they were (including the known escalation hole). Use only to revert
-- 011; re-applying 011 re-closes the vulnerability.

-- Restore original INSERT policy (VULNERABLE — unconditional self-owner clause).
DROP POLICY IF EXISTS "wm_insert_admin" ON public.workspace_members;
CREATE POLICY "wm_insert_admin"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, 'admin')
    -- Also allow the auto-workspace trigger (owner inserting self)
    OR (user_id = auth.uid() AND role = 'owner')
  );

-- Restore original UPDATE policy (USING only, no WITH CHECK, no owner guard).
DROP POLICY IF EXISTS "wm_update_admin" ON public.workspace_members;
CREATE POLICY "wm_update_admin"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id, 'admin'));

-- Drop the ownership helper 011 introduced (nothing else references it).
DROP FUNCTION IF EXISTS public.is_workspace_owner(UUID);
