-- Migration 010: Brand Kit Premium
-- Adds brand_kit_designs JSONB column to brands + brand_kit_exports table
-- Idempotent per migrations 001–009 lessons; safe to re-run

-- 1. Add brand_kit_designs to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_kit_designs JSONB NULL;

-- 2. Frozen export snapshots table
CREATE TABLE IF NOT EXISTS brand_kit_exports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_url           TEXT NULL,
  zip_url           TEXT NULL,
  bindings_snapshot JSONB NOT NULL,
  brand_snapshot    JSONB NOT NULL,
  doc_snapshots     JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS brand_kit_exports_brand_id_idx
  ON brand_kit_exports(brand_id, created_at DESC);

-- 3. RLS
ALTER TABLE brand_kit_exports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kit_exports'
      AND policyname = 'brand_owner_select_exports'
  ) THEN
    CREATE POLICY brand_owner_select_exports ON brand_kit_exports
      FOR SELECT USING (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kit_exports'
      AND policyname = 'brand_owner_insert_exports'
  ) THEN
    CREATE POLICY brand_owner_insert_exports ON brand_kit_exports
      FOR INSERT WITH CHECK (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;
END $$;
