-- Restores the 001 predicates (which lock the owner out of a workspace-less brand).
DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select" ON public.assets FOR SELECT TO authenticated
  USING (public.is_brand_member(brand_id, 'viewer'));
DROP POLICY IF EXISTS "assets_insert" ON public.assets;
CREATE POLICY "assets_insert" ON public.assets FOR INSERT TO authenticated
  WITH CHECK (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS "assets_update" ON public.assets;
CREATE POLICY "assets_update" ON public.assets FOR UPDATE TO authenticated
  USING (public.is_brand_member(brand_id, 'editor'));
DROP POLICY IF EXISTS "assets_delete" ON public.assets;
CREATE POLICY "assets_delete" ON public.assets FOR DELETE TO authenticated
  USING (public.is_brand_member(brand_id, 'admin'));

DROP POLICY IF EXISTS "brand_assets_read" ON storage.objects;
CREATE POLICY "brand_assets_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_brand_member((string_to_array(name,'/'))[1]::uuid,'viewer'));
DROP POLICY IF EXISTS "brand_assets_insert" ON storage.objects;
CREATE POLICY "brand_assets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_brand_member((string_to_array(name,'/'))[1]::uuid,'editor'));
DROP POLICY IF EXISTS "brand_assets_update" ON storage.objects;
CREATE POLICY "brand_assets_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_brand_member((string_to_array(name,'/'))[1]::uuid,'editor'));
DROP POLICY IF EXISTS "brand_assets_delete" ON storage.objects;
CREATE POLICY "brand_assets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_brand_member((string_to_array(name,'/'))[1]::uuid,'admin'));
