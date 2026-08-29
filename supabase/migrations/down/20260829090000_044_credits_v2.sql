-- Down for 044. Restores 025's four-argument money functions and drops the new tables.
DO $$ BEGIN
  PERFORM extensions.cron.unschedule('expire-stale-reservations');
  PERFORM extensions.cron.unschedule('reconcile-credit-accounts');
  PERFORM extensions.cron.unschedule('prune-audit-events');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP FUNCTION IF EXISTS public.cancel_generation_job(uuid);
DROP FUNCTION IF EXISTS public.reconcile_all_credit_accounts();
DROP FUNCTION IF EXISTS public.reconcile_credit_account(uuid);
DROP FUNCTION IF EXISTS public.expire_stale_reservations();
DROP FUNCTION IF EXISTS public.reserve_credits(uuid, uuid, bigint, text, interval, text, uuid, uuid, text, text);
DROP TABLE IF EXISTS public.ai_usage_events;
DROP TABLE IF EXISTS public.credit_reservations;
-- settle_credits / release_credits keep 025's signatures; re-apply 025 to restore bodies.
