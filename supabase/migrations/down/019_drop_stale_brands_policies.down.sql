-- Down migration for 019 — deliberately a NO-OP.
--
-- 019 removes `brands_select_policy` / `brands_update_policy` /
-- `brands_delete_policy`. An earlier version of this file recreated them for
-- symmetry with the rest of the chain. That was wrong: those policies are
-- exactly the ones the forward migration identifies as failing for non-owner
-- requests, so restoring them would re-break collaborator reads, updates and
-- deletes on public.brands — a rollback that causes an outage is not a
-- rollback.
--
-- They are also redundant: migration 001's membership policies
-- (`brands_select` / `brands_insert` / `brands_update` / `brands_delete`)
-- express the same intent correctly and remain in force whether or not this
-- file runs. There is therefore nothing to restore.

DO $$ BEGIN
  RAISE NOTICE 'down/019 is intentionally a no-op: the stale brands_*_policy set is superseded by migration 001 and carried a known defect; it is not restored.';
END $$;
