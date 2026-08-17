-- Reverses 026: policies go back to is_brand_member (which locks the owner out
-- of a workspace-less brand — that is the bug 026 fixed).
DROP POLICY IF EXISTS image_projects_select ON public.image_projects;
CREATE POLICY image_projects_select ON public.image_projects
  FOR SELECT TO authenticated USING (public.is_brand_member(brand_id, 'viewer'));

DROP POLICY IF EXISTS image_projects_insert ON public.image_projects;
CREATE POLICY image_projects_insert ON public.image_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_brand_member(brand_id, 'editor') AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS image_projects_update ON public.image_projects;
CREATE POLICY image_projects_update ON public.image_projects
  FOR UPDATE TO authenticated
  USING (public.is_brand_member(brand_id, 'editor'))
  WITH CHECK (public.is_brand_member(brand_id, 'editor'));

DROP POLICY IF EXISTS image_projects_delete ON public.image_projects;
CREATE POLICY image_projects_delete ON public.image_projects
  FOR DELETE TO authenticated USING (public.is_brand_member(brand_id, 'editor'));

DROP POLICY IF EXISTS image_generation_jobs_select ON public.image_generation_jobs;
CREATE POLICY image_generation_jobs_select ON public.image_generation_jobs
  FOR SELECT TO authenticated USING (public.is_brand_member(brand_id, 'viewer'));

DROP FUNCTION IF EXISTS public.can_edit_brand(UUID);
DROP FUNCTION IF EXISTS public.can_view_brand(UUID);
