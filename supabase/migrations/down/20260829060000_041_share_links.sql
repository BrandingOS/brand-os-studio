-- Down for 041. Restores the anon reads 023/001 had.
DROP TRIGGER IF EXISTS trg_brands_revoke_links ON public.brands;
DROP FUNCTION IF EXISTS public.revoke_links_on_private();
DROP FUNCTION IF EXISTS public.resolve_showcase(text);
DROP FUNCTION IF EXISTS public.resolve_share_link(text, text);
DROP FUNCTION IF EXISTS public.revoke_share_link(uuid);
DROP FUNCTION IF EXISTS public.create_share_link(uuid, public.share_target, text, boolean, timestamptz, text);
DROP TABLE IF EXISTS public.share_links;
DROP POLICY IF EXISTS identity_publications_select ON public.brand_identity_publications;
CREATE POLICY identity_publications_select_anon ON public.brand_identity_publications
  FOR SELECT TO anon USING (true);
CREATE POLICY identity_publications_select_auth ON public.brand_identity_publications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY brands_select_public ON public.brands FOR SELECT TO anon USING (is_public = true);
