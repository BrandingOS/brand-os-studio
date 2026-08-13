-- Down migration for 018 — drops the Brand Kit state table.
--
-- Safe: nothing references it. `SupabaseKitStateRepository` falls back to
-- `LocalKitStateRepository` on a missing table (42P01 / PGRST205), so kit state
-- returns to being browser-local exactly as it was pre-018. Server-side kit
-- rows are lost; Official Kit adoptions (017) are untouched.

DROP TABLE IF EXISTS public.brand_kit_state;
