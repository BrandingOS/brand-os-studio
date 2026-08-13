-- Down migration for 020 — deliberately a NO-OP.
--
-- 020 removes policies that let ANY authenticated user rewrite every column of
-- the demo brand row, including `user_id`. Recreating them would restore a
-- known privilege-escalation path, so this file does not.
--
-- Nothing depends on those policies: demo/seed brands are served from bundled
-- seed data in the client, not from these grants. If shared demo data is ever
-- needed again, scope it to a non-production environment or a controlled role
-- rather than to every authenticated user.

DO $$ BEGIN
  RAISE NOTICE 'down/020 is intentionally a no-op: the demo-brand blanket grants are a privilege-escalation path and are not restored.';
END $$;
