-- Down for 046. Additive migration, so the reversal is one drop.
DROP FUNCTION IF EXISTS public.brand_people(uuid);
DO $$ BEGIN RAISE NOTICE 'down/046 OK — brand_people dropped'; END $$;
