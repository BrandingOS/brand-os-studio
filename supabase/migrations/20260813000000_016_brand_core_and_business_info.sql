-- 016 — Brand Core DNA metadata + Business Info columns
--
-- ADDITIVE and non-destructive. Two nullable JSONB columns on public.brands.
-- No existing column is altered, no data is rewritten, nothing is backfilled
-- here (backfill runs in the application layer so local-mode and server-mode
-- brands get IDENTICAL defaulting rules — see specs/001-brand-system-foundation).
--
-- WHY `identity_meta`:
-- Migration 013 gave brands an `identity` JSONB blob holding the canonical
-- Brand Core (colors / logos / typography / strategy / voice). What it cannot
-- express is HOW SETTLED each of those values is, or WHERE it came from. The
-- Brand System Foundation needs both, as two INDEPENDENT dimensions:
--
--   authority  — suggested → provisional → confirmed → official
--   provenance — user-entered | ai-suggested | inferred | imported
--
-- Authority is how far the brand has adopted a value; provenance is where the
-- value came from and never changes when a value is promoted. Keeping them
-- separate is what lets the product say "this palette was AI-suggested AND the
-- user confirmed it" — the single most important guarantee in the constitution
-- (AI may propose at any authority below Confirmed; only an explicit action by
-- an authorized human promotes).
--
-- The column is a SIDECAR map keyed by a closed registry of Core field paths
-- (`colors.primary`, `typography.primary`, `voice.tone`, …) rather than a
-- per-value wrapper, precisely so every existing reader of
-- `identity.colors.primary.hex` keeps working untouched. Adding status to Core
-- must not become a rewrite of every consumer.
--
-- WHY `business_info`:
-- Reusable company facts (legal name, description, industry, contacts, links)
-- that deliverable renderers — business card, letterhead, email signature,
-- invoice — currently free-type per template, so the same company address can
-- disagree across four documents. One row per brand, no relations, no queries
-- across it: a column is the smallest correct home. Future People / Products /
-- Services / Locations become their own brand_id-scoped tables and do NOT
-- change this column.
--
-- RLS: unchanged. The existing public.brands policies (owner-OR-membership,
-- migration 001) already govern these columns — a new column on an
-- RLS-protected table inherits that table's policies.
--
-- Reversible: supabase/migrations/down/016_brand_core_and_business_info.down.sql

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS identity_meta JSONB;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS business_info JSONB;

COMMENT ON COLUMN public.brands.identity_meta IS
  'Brand Core DNA sidecar: Record<CoreFieldPath, {authority, provenance, setBy, setAt}>. '
  'Authority and provenance are independent dimensions; only an explicit action by an '
  'authorized human may set authority to confirmed/official.';

COMMENT ON COLUMN public.brands.business_info IS
  'Reusable company facts consumed by deliverable renderers (names, description, '
  'industry, contact, links, audience summary). All fields optional — an incomplete '
  'Business Info never blocks creation.';
