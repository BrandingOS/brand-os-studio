-- Down migration for 010 — drops everything 010 created
DROP POLICY IF EXISTS brand_owner_insert_exports ON brand_kit_exports;
DROP POLICY IF EXISTS brand_owner_select_exports ON brand_kit_exports;
DROP INDEX IF EXISTS brand_kit_exports_brand_id_idx;
DROP TABLE IF EXISTS brand_kit_exports;
ALTER TABLE brands DROP COLUMN IF EXISTS brand_kit_designs;
