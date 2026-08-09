# Deploy runbook — migration 014 (durable logo Asset columns)

Same shape as the 013 deploy. **Additive, non-destructive, reversible.** Adds two
JSONB columns to `public.brands`: `brand_assets` and `logo_system`. No existing
column is altered. The application code is already **tolerant of the pre-014
state** (`SupabaseBrandsService.update` retries without these columns on a
`42703 undefined_column`, falling back to the legacy URL derivation), so deploying
the code before the migration causes **no breakage** — it just doesn't persist the
durable logo data until the columns exist.

## What it enables

Durable Asset-backed logos for **authenticated** users: `logoSystem` refs +
`brandAssets` records persist, so a logo's `assetId` is minted once by
`stageLogoAssignment` and preserved across reads (instead of being re-derived from
a URL hash each load). Guest users already have this via localStorage.

## 1. Exact commands

```bash
# From repo root, with the project linked (same as the 011/012/013 deploy).
supabase db push --linked
```

The migration file is `supabase/migrations/20260811000000_014_brand_logo_assets_columns.sql`.
Only pending migrations are applied; 011/012/013 are already remote and will be skipped.

## 2. Checks BEFORE

```bash
supabase migration list --linked   # confirm 013 present, 014 pending (local only)
```
- Confirm 009/010 remain OUTSIDE the push path (in `supabase/deferred-migrations/`) — unchanged by this deploy.

## 3. Checks AFTER

```bash
supabase migration list --linked   # 014 now shows in BOTH local + remote columns
```
Schema confirmation (any SQL console):
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'brands' AND column_name IN ('brand_assets','logo_system');
-- expect 2 rows
```

## 4. SUCCESS

- `014` is remote; both `brand_assets` and `logo_system` columns exist on `public.brands`.
- An authenticated logo edit (Brand Board / Logo Maker / Setup) then reload shows the
  same logo with a stable `logoSystem.<role>.assetId` (no URL-hash churn).

## 5. STOP / FAILURE

- If `db push` errors, do NOT force. The app keeps working (pre-014 fallback path).
- Rollback (only if needed): `supabase/migrations/down/014_brand_logo_assets_columns.down.sql`
  drops both columns; legacy `logo`/`logo_assets` remain a valid fallback, so no data is lost.
