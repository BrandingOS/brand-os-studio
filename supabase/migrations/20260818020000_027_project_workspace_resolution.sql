-- ════════════════════════════════════════════════════════════════════════════
-- 027 — an image project always knows which workspace it bills to
-- ════════════════════════════════════════════════════════════════════════════
--
-- Credits live on a workspace. A brand does not always name one (a directly
-- owned brand has workspace_id IS NULL — see 026), so a project created against
-- such a brand had no workspace and the Studio could not show a balance.
--
-- Resolving this in the client would mean every future writer has to remember
-- to do it. A trigger makes it true by construction: take the brand's
-- workspace, else the creating user's own.
--
-- Additive: one trigger + a backfill for rows created before it existed.

CREATE OR REPLACE FUNCTION public.resolve_image_project_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE ws UUID;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT b.workspace_id INTO ws FROM public.brands b WHERE b.id = NEW.brand_id;

  IF ws IS NULL THEN
    -- Fall back to a workspace the creator owns; the Edge Function resolves
    -- the same way, so the project and its jobs bill to one place.
    SELECT w.id INTO ws
      FROM public.workspaces w
     WHERE w.owner_id = NEW.user_id
     ORDER BY w.created_at
     LIMIT 1;
  END IF;

  NEW.workspace_id := ws;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_image_projects_workspace ON public.image_projects;
CREATE TRIGGER trg_image_projects_workspace
  BEFORE INSERT ON public.image_projects
  FOR EACH ROW EXECUTE FUNCTION public.resolve_image_project_workspace();

-- Backfill anything created between 025 and this trigger.
UPDATE public.image_projects p
   SET workspace_id = COALESCE(
         (SELECT b.workspace_id FROM public.brands b WHERE b.id = p.brand_id),
         (SELECT w.id FROM public.workspaces w WHERE w.owner_id = p.user_id
           ORDER BY w.created_at LIMIT 1))
 WHERE p.workspace_id IS NULL;

DO $$
DECLARE orphans INT;
BEGIN
  SELECT count(*) INTO orphans FROM public.image_projects WHERE workspace_id IS NULL;
  IF orphans > 0 THEN
    RAISE WARNING '027: % image project(s) still have no workspace (owner has none)', orphans;
  END IF;
END $$;
