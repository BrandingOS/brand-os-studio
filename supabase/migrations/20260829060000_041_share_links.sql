-- ============================================================================
-- 041 — Share links (docs/access-architecture/05 §2)
--
-- Public sharing and authenticated collaboration are different grants. A share link has
-- no user, reaches exactly one artifact, and is resolved by ONE function — there is no
-- anon SELECT on any table any more.
--
-- What this closes:
--   • `identity_publications_select_anon USING (true)` let anon enumerate every published
--     brand snapshot in the database; the client-side `.eq('token', …)` was the only thing
--     standing between a share link and a directory (A30)
--   • turning a brand private did not revoke its links (05 §2.3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.share_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL,
  brand_id       uuid NOT NULL,
  target_kind    public.share_target NOT NULL,
  target_id      text,
  token_hash     bytea NOT NULL UNIQUE,
  allow_download boolean NOT NULL DEFAULT false,
  password_hash  text,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  revoked_by     uuid,
  created_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  view_count     bigint NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  CONSTRAINT share_links_brand_workspace_fk FOREIGN KEY (brand_id, workspace_id)
    REFERENCES public.brands (id, workspace_id) ON DELETE CASCADE,
  -- a design link names a design; identity/showcase links are the brand itself
  CONSTRAINT share_links_target CHECK (
    (target_kind = 'design' AND target_id IS NOT NULL) OR (target_kind <> 'design'))
);
CREATE INDEX IF NOT EXISTS share_links_brand_idx ON public.share_links (brand_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS share_links_workspace_idx ON public.share_links (workspace_id) WHERE revoked_at IS NULL;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_links_select ON public.share_links;
CREATE POLICY share_links_select ON public.share_links FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('share.view')));
-- No INSERT/UPDATE/DELETE policy: links are minted and revoked by RPC, and read by
-- resolve_share_link(). anon has no policy at all.

-- ── minting and revoking ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_share_link(
  _brand_id uuid,
  _target_kind public.share_target,
  _target_id text DEFAULT NULL,
  _allow_download boolean DEFAULT false,
  _expires_at timestamptz DEFAULT NULL,
  _password text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws uuid; tok text; row_id uuid; cap text;
BEGIN
  SELECT workspace_id INTO ws FROM public.brands WHERE id = _brand_id AND archived_at IS NULL;
  IF ws IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such live brand';
  END IF;

  -- publishing the brand itself is a bigger act than sharing one design (AX-05)
  cap := CASE WHEN _target_kind IN ('identity','showcase') THEN 'share.publish_public' ELSE 'share.link' END;
  PERFORM public.assert_capability(cap, ws, _brand_id);

  IF _target_kind = 'design' AND NOT EXISTS (
       SELECT 1 FROM public.designs d WHERE d.brand_id = _brand_id AND d.id = _target_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found',
      DETAIL = 'that design does not belong to this brand';
  END IF;

  tok := public.new_invite_token();
  INSERT INTO public.share_links
    (workspace_id, brand_id, target_kind, target_id, token_hash, allow_download,
     password_hash, expires_at, created_by)
  VALUES (ws, _brand_id, _target_kind, _target_id, public.hash_token(tok), COALESCE(_allow_download, false),
          CASE WHEN _password IS NULL OR _password = '' THEN NULL
               ELSE extensions.crypt(_password, extensions.gen_salt('bf')) END,
          _expires_at, (SELECT auth.uid()))
  RETURNING id INTO row_id;

  RETURN jsonb_build_object('ok', true, 'id', row_id, 'token', tok);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_share_link(_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE l public.share_links%ROWTYPE; cap text;
BEGIN
  SELECT * INTO l FROM public.share_links WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such link';
  END IF;
  cap := CASE WHEN l.target_kind IN ('identity','showcase') THEN 'share.publish_public' ELSE 'share.link' END;
  PERFORM public.assert_capability(cap, l.workspace_id, l.brand_id);
  UPDATE public.share_links SET revoked_at = now(), revoked_by = (SELECT auth.uid())
   WHERE id = _id AND revoked_at IS NULL;
END;
$$;

-- ── the one public read path ────────────────────────────────────────────────
-- Invalid, expired, revoked, archived, wrong password: one answer. Nothing about the
-- brand or the workspace escapes until the token is right.
CREATE OR REPLACE FUNCTION public.resolve_share_link(_token text, _password text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE l public.share_links%ROWTYPE; b public.brands%ROWTYPE; payload jsonb;
BEGIN
  SELECT * INTO l FROM public.share_links
   WHERE token_hash = public.hash_token(_token)
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;

  SELECT * INTO b FROM public.brands WHERE id = l.brand_id AND archived_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;

  IF l.password_hash IS NOT NULL THEN
    IF _password IS NULL OR extensions.crypt(_password, l.password_hash) <> l.password_hash THEN
      RETURN jsonb_build_object('valid', false, 'needsPassword', true);
    END IF;
  END IF;

  payload := CASE l.target_kind
    WHEN 'identity' THEN
      COALESCE((SELECT jsonb_build_object('snapshot', p.snapshot)
                  FROM public.brand_identity_publications p WHERE p.brand_id = l.brand_id), '{}'::jsonb)
    WHEN 'design' THEN
      COALESCE((SELECT jsonb_build_object('design', jsonb_build_object(
                          'id', d.id, 'name', d.name, 'data', d.data,
                          'width', d.width, 'height', d.height))
                  FROM public.designs d WHERE d.brand_id = l.brand_id AND d.id = l.target_id), '{}'::jsonb)
    ELSE jsonb_build_object('brand', jsonb_build_object(
           'id', b.id, 'name', b.name, 'slug', b.slug,
           'primaryColor', b.primary_color, 'secondaryColor', b.secondary_color,
           'logoUrl', b.logo_url, 'fonts', b.fonts, 'identity', b.identity,
           'logoSystem', b.logo_system, 'brandAssets', b.brand_assets))
  END;

  UPDATE public.share_links SET view_count = view_count + 1, last_viewed_at = now() WHERE id = l.id;

  RETURN jsonb_build_object(
    'valid', true, 'targetKind', l.target_kind, 'brandName', b.name,
    'allowDownload', l.allow_download, 'payload', payload);
END;
$$;

-- The showcase routes read a brand by SLUG, which is guessable, so the gate has to be
-- server-side: is_public, still live, and nothing beyond what a showcase shows.
CREATE OR REPLACE FUNCTION public.resolve_showcase(_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE b public.brands%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.brands
   WHERE slug = _slug AND is_public = true AND archived_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object('valid', true, 'brand', jsonb_build_object(
    'id', b.id, 'name', b.name, 'slug', b.slug,
    'primaryColor', b.primary_color, 'secondaryColor', b.secondary_color,
    'logoUrl', b.logo_url, 'fonts', b.fonts, 'identity', b.identity,
    'logoSystem', b.logo_system, 'brandAssets', b.brand_assets, 'guidelines', b.guidelines));
END;
$$;

-- ── going private revokes what was shared ───────────────────────────────────
-- Before this, turning a brand private left every token link alive — the setting said one
-- thing and the links did another.
CREATE OR REPLACE FUNCTION public.revoke_links_on_private()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (COALESCE(OLD.is_public, false) AND NOT COALESCE(NEW.is_public, false))
     OR (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL) THEN
    UPDATE public.share_links
       SET revoked_at = now(), revoked_by = (SELECT auth.uid())
     WHERE brand_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_brands_revoke_links ON public.brands;
CREATE TRIGGER trg_brands_revoke_links
  AFTER UPDATE OF is_public, archived_at ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.revoke_links_on_private();

-- ── existing publications become share links, keeping their URLs ────────────
INSERT INTO public.share_links (workspace_id, brand_id, target_kind, token_hash, created_by, created_at)
SELECT b.workspace_id, p.brand_id, 'identity', public.hash_token(p.token),
       COALESCE(p.published_by, b.user_id), p.published_at
  FROM public.brand_identity_publications p
  JOIN public.brands b ON b.id = p.brand_id
 WHERE NOT EXISTS (SELECT 1 FROM public.share_links s WHERE s.token_hash = public.hash_token(p.token))
ON CONFLICT (token_hash) DO NOTHING;

-- and anon loses its blanket read of the publication table
DROP POLICY IF EXISTS identity_publications_select_anon ON public.brand_identity_publications;
DROP POLICY IF EXISTS identity_publications_select_auth ON public.brand_identity_publications;
DROP POLICY IF EXISTS identity_publications_write ON public.brand_identity_publications;
CREATE POLICY identity_publications_select ON public.brand_identity_publications
  FOR SELECT TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('share.view')));
CREATE POLICY identity_publications_write ON public.brand_identity_publications
  FOR ALL TO authenticated
  USING (brand_id IN (SELECT public.brands_with_capability('share.publish_public')))
  WITH CHECK (brand_id IN (SELECT public.brands_with_capability('share.publish_public')));

-- the anon showcase read on brands goes through resolve_showcase() now
DROP POLICY IF EXISTS brands_select_public ON public.brands;

GRANT EXECUTE ON FUNCTION public.create_share_link(uuid, public.share_target, text, boolean, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_share_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_share_link(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_showcase(text) TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND 'anon' = ANY(roles)
              AND tablename IN ('brands','share_links','brand_identity_publications','designs')) THEN
    RAISE EXCEPTION '041 guard: anon can still read a tenant table directly';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
              AND tablename='share_links' AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION '041 guard: share_links is client-writable';
  END IF;
  IF NOT has_function_privilege('anon', 'public.resolve_share_link(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION '041 guard: anon cannot resolve a share link';
  END IF;
  RAISE NOTICE '041 OK — share links (% migrated from publications)',
    (SELECT count(*) FROM public.share_links WHERE target_kind = 'identity');
END $$;
