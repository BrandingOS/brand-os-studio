-- 024 — workspace_members: break the RLS self-reference
--
-- Every signed-in user hit `500 42P17 infinite recursion detected in policy
-- for relation "workspace_members"` on the first `workspaces` read after
-- login (found 2026-08-17 while rebuilding auth). The cause is
-- `wm_select_fellow` (001): a SELECT policy on workspace_members whose USING
-- clause SELECTs from workspace_members — which is evaluated under the same
-- policy, forever. `workspaces_select_member` reaches the same table through
-- its EXISTS and recurses too.
--
-- The fix is the helper that already exists for exactly this: 
-- `public.is_workspace_member(_workspace_id, _min_role)` is SECURITY DEFINER,
-- so its own read of workspace_members is not subject to the policy being
-- evaluated. Semantics are unchanged: a member may read the membership rows
-- of workspaces they belong to, and the workspaces themselves.

DROP POLICY IF EXISTS "wm_select_fellow" ON public.workspace_members;
CREATE POLICY "wm_select_fellow"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, 'viewer'));

DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(id, 'viewer'));
