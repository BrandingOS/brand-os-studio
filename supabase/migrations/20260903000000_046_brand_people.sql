-- ============================================================================
-- 046 · "Who can reach this brand?"
--
-- The People screen answers per PERSON. An agency asks per CLIENT — who is on Client B —
-- and that answer is in two tables: `brand_access` holds the people granted the brand
-- DIRECTLY, while everyone reaching it through an `all`-mode membership, and every owner
-- and admin, is only in `workspace_members`.
--
-- A workspace Member can read both, so most of this could be assembled in the browser.
-- Two things say it should not be:
--
--  • A GUEST cannot. `members.view` belongs to owner/admin/member and not to guest, while
--    `brand.access.view` belongs to a brand editor or manager — so a guest running one
--    client brand holds the capability to see that brand's access list and would have been
--    served a list with the owner, the admins and every all-mode teammate missing. An
--    outside collaborator seeing a partial list of who else is on their client is worse
--    than seeing none: it reads as complete.
--  • The EFFECTIVE brand role is a rule, not a column — owner and admin are managers of
--    every brand, an `all`-mode member falls back to their default role, and a direct
--    grant wins. Deriving that a second time in the browser is how the two come to
--    disagree, which is the failure this whole initiative exists to end.
--
-- So one SECURITY DEFINER reader, gated on the BRAND capability, returning both halves
-- with the reason each person is there. It reads; it changes nothing. Writing still goes
-- through grant_brand_access / revoke_brand_access, which check `brand.access.manage`.
--
-- Additive: one function and one grant. `down/` drops it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.brand_people(_brand_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws uuid; out_json jsonb;
BEGIN
  SELECT workspace_id INTO ws FROM public.brands WHERE id = _brand_id;
  IF ws IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'not_found', DETAIL = 'no such brand';
  END IF;
  PERFORM public.assert_capability('brand.access.view', ws, _brand_id);

  SELECT jsonb_build_object(
    'brandId', _brand_id,
    'workspaceId', ws,
    'people', COALESCE(jsonb_agg(p ORDER BY p->>'rank', p->>'name'), '[]'::jsonb)
  ) INTO out_json
  FROM (
    SELECT jsonb_build_object(
      'userId',   m.user_id,
      'name',     COALESCE(NULLIF(pr.full_name, ''), split_part(COALESCE(pr.email, ''), '@', 1), 'Someone'),
      'email',    COALESCE(pr.email, ''),
      'avatarUrl', pr.avatar_url,
      'workspaceRole', m.role,
      'status',   m.status,
      -- The brand role actually in force. Owners and admins are managers of every brand
      -- by definition, so this must not report the grant they happen to also hold.
      'brandRole', CASE
        WHEN m.role IN ('owner','admin') THEN 'manager'
        ELSE COALESCE(ba.role::text, m.default_brand_role::text)
      END,
      -- WHY they are here, which is what decides whether this screen may edit them.
      'via', CASE
        WHEN m.role IN ('owner','admin') THEN 'role'
        WHEN ba.user_id IS NOT NULL      THEN 'direct'
        ELSE 'workspace'
      END,
      'overrides', COALESCE(ba.capability_overrides, '{}'::jsonb),
      'workspaceOverrides', COALESCE(m.capability_overrides, '{}'::jsonb),
      -- owners and admins first, then the workspace-wide members, then direct grants
      'rank', CASE
        WHEN m.role IN ('owner','admin') THEN '1'
        WHEN ba.user_id IS NOT NULL      THEN '3'
        ELSE '2'
      END
    ) AS p
    FROM public.workspace_member_state m
    LEFT JOIN public.brand_access ba
           ON ba.brand_id = _brand_id AND ba.user_id = m.user_id
    LEFT JOIN public.profiles pr ON pr.id = m.user_id
    WHERE m.workspace_id = ws
      AND m.status = 'active'
      AND (
        m.role IN ('owner','admin')                              -- every brand, by role
        OR ba.user_id IS NOT NULL                                -- granted this brand
        OR (m.brand_access_mode = 'all' AND m.role <> 'guest')   -- every brand, by scope
      )
  ) rows;

  RETURN out_json;
END; $$;

REVOKE ALL ON FUNCTION public.brand_people(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.brand_people(uuid) TO authenticated;

COMMENT ON FUNCTION public.brand_people(uuid) IS
  'Everyone who can reach one brand, with the reason (role / workspace / direct). Gated on brand.access.view.';

DO $$
BEGIN
  IF to_regprocedure('public.brand_people(uuid)') IS NULL THEN
    RAISE EXCEPTION '046 FAILED — brand_people is not present';
  END IF;
  RAISE NOTICE '046 OK — brand_people';
END $$;
