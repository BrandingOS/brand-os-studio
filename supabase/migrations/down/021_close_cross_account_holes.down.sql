-- Down migration for 021 — deliberately a NO-OP.
--
-- 021 closes two confirmed cross-account holes: unrestricted notification
-- creation (spam/phishing into a trusted surface) and onboarding-scratch
-- objects readable and deletable by any authenticated user. Restoring either
-- would reopen a security vulnerability, so this file does not.
--
-- Nothing depends on the previous behaviour: no product code creates
-- notifications at all, and onboarding only ever needs its own scratch objects.

DO $$ BEGIN
  RAISE NOTICE 'down/021 is intentionally a no-op: reversing it would reopen confirmed cross-account vulnerabilities.';
END $$;
