-- Down migration for 012 — restores the migration-001 profiles SELECT policy
-- (VULNERABLE — exposes all profiles/emails to any authenticated user). Use only to
-- revert 012; re-applying 012 re-closes the exposure.

DROP POLICY IF EXISTS "profiles_select_coworkers" ON public.profiles;
CREATE POLICY "profiles_select_by_member"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);  -- Any authenticated user can see profiles (needed for member lists)

DROP FUNCTION IF EXISTS public.shares_workspace_with(UUID);
