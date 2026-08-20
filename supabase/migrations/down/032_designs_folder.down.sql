-- Down for 032 — designs leave the brand's folder tree.
--
-- Safe: the client treats a missing `folder_id` as "this deployment has no
-- design folders yet" and falls back to the local summary, so rolling back
-- costs the user their design filings but nothing else. Assets and Kit keep
-- their folder membership either way.

DROP INDEX IF EXISTS public.designs_folder_idx;

ALTER TABLE public.designs
  DROP CONSTRAINT IF EXISTS designs_folder_fk;

ALTER TABLE public.designs
  DROP COLUMN IF EXISTS folder_id;
