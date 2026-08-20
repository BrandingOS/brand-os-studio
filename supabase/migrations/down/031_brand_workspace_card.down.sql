-- Down for 031. Drops the dashboard card presentation.
--
-- Cards revert to the brand's own name and logo, which is what they showed
-- before 031. Project names and cover choices are lost — they exist nowhere
-- else, by design.

ALTER TABLE public.brands
  DROP COLUMN IF EXISTS workspace_card;
