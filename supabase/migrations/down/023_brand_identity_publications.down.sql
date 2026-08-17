-- Down for 023 — Brand Identity publications.
--
-- DATA LOSS WARNING: dropping this table revokes every share link that has
-- been handed out. Anyone holding one gets a "not found" page. Nothing about
-- the brands themselves is touched — the identity page keeps working inside
-- BrandingOS, because a publication is a copy of what the brand already holds
-- and never the original.
--
-- Safe to run: the client falls back to browser-local publications when the
-- table is absent, exactly as 015/017/018 do, so the Publish control keeps
-- working for the owner and simply stops being shareable off-device.

DROP POLICY IF EXISTS "identity_publications_write" ON public.brand_identity_publications;
DROP POLICY IF EXISTS "identity_publications_select_auth" ON public.brand_identity_publications;
DROP POLICY IF EXISTS "identity_publications_select_anon" ON public.brand_identity_publications;

DROP INDEX IF EXISTS public.brand_identity_publications_brand_uniq;

DROP TABLE IF EXISTS public.brand_identity_publications;
