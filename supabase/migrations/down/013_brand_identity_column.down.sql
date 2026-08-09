-- Down migration for 013 — drops the additive canonical identity columns.
-- Safe: no other object depends on them; legacy columns are untouched.
ALTER TABLE public.brands DROP COLUMN IF EXISTS identity;
ALTER TABLE public.brands DROP COLUMN IF EXISTS identity_schema_version;
