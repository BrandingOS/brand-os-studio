-- Down migration for 014 — drops the additive durable logo columns.
-- Safe: no other object depends on them; legacy logo/logo_assets are untouched
-- and remain a valid (URL-hash-derived) fallback on read.
ALTER TABLE public.brands DROP COLUMN IF EXISTS brand_assets;
ALTER TABLE public.brands DROP COLUMN IF EXISTS logo_system;
