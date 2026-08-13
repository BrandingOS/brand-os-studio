-- Down migration for 019 — restores the stale brands_*_policy set.
--
-- Provided for symmetry with the rest of the chain, but think before running
-- it: these policies carry the app_role/app_role_v2 defect that 019 exists to
-- remove, so restoring them re-introduces `ERROR: operator does not exist` for
-- any NON-OWNER reading a brand. They are also redundant with migration 001's
-- membership policies, which remain in force either way.
--
-- Recreated with USING (not the original invalid WITH CHECK on SELECT).

DROP POLICY IF EXISTS brands_select_policy ON public.brands;
CREATE POLICY "brands_select_policy"
ON public.brands
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS brands_update_policy ON public.brands;
CREATE POLICY "brands_update_policy"
ON public.brands
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS brands_delete_policy ON public.brands;
CREATE POLICY "brands_delete_policy"
ON public.brands
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
