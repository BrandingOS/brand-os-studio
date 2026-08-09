# Brand Compatibility Ledger

Every temporary legacy-compatibility bridge kept during the Brand migration. Each MUST have:
**why it exists · who still uses it · exact deletion condition.** Compatibility is **one-way**
(canonical → legacy projection) — legacy never becomes authoritative once canonical data exists.

_Updated as Batch A progresses._

## Active compatibility projections (canonical → legacy)

| # | Bridge | Why it exists | Who still uses it | Deletion condition |
|---|---|---|---|---|
| C1 | `toLegacyBrandPatch` writes legacy scalar `primaryColor`/`secondaryColor`/`accentColor`/`neutrals` + `colorSystem` alongside the canonical value on every canonical color save | Un-migrated readers still read the legacy scalar (`PresentationStyleAdapter` `--brand-primary`, Brand Board `--bb-primary`) | `PresentationStyleAdapter.ts`, `brand-board/*`, Classic guideline templates | When those consumers read canonical `colorSystem`/repository (their feature migrations) |
| C2 | `buildColorSystem` (in `migrateBrandToCurrent`) still derives `colorSystem` from legacy scalars for brands without a stored `colorSystem` (authed rows after the Supabase whitelist drop, pre-v3 brands) | Authed persistence drops `colorSystem` (no column until migration 013); reload must reconstruct it | Every reader of `brand.colorSystem` after an authed reload | When migration 013 ships + authed persistence uses `SupabaseBrandRepository` (identity column) — then `colorSystem` round-trips directly |
| C3 | `BrandServiceRepository` facade projects canonical ↔ legacy `Brand` via `fromLegacyBrand`/`toLegacyBrandPatch` over the existing `IBrandsService` | The canonical identity column (013) is not deployed; color/type/voice ride existing columns | `SERVICE_KEYS.BRAND_REPOSITORY` (all migrated identity surfaces) | When 013 ships → swap authed to `SupabaseBrandRepository`; guest can keep a local canonical repo |
| C4 | `toLegacyBrandPatch` writes legacy `fonts.{primary,secondary}` alongside canonical `typography.*.family` | Un-migrated readers still read `fonts.*` (some deck/guideline renderers) | deck/guideline family readers | When those consumers read `typography.*.family` |
| C5 | `toLegacyBrandPatch` writes legacy `tone` scalar from canonical `voice.tone` | AI prompt builders + guideline voice pages read `brand.tone` / `guidelines.voiceAndTone` | `brandCard.ts`, `aiService.ts`, guideline VoiceTonePage | When those consumers read canonical `voice`; rich voice needs an editor first |
| C6 | `buildTypographySystem` (migrateSchema) derives `typography` from `guidelines.typography`/`fonts` for authed reloads (typography column dropped) | Authed persistence has no typography column (013) | every `brand.typography` reader after authed reload | When 013 ships |

## Dead / retired authorities (no longer authoritative)

| Item | Status | Note |
|---|---|---|
| ColorsTab scalar-only write | **Removed** (Batch 2D) | Replaced by `changeBrandColors` |
| `buildColorSystem` guidelines-mirror preference | **Removed** (Batch 2D) | Now prefers the fresh scalar; a stale `guidelines.colorPalette` can no longer resurrect a color |
| Setup legacy color write (mockBrandToPatch color fields) | **Bypassed** (A0) | Color stripped from the legacy patch and routed to `changeBrandColors`; the color computation in `mockBrandToPatch` is now dead-via-strip → delete in A5 |
| `ColorPaletteEditor.tsx` | **Dead** (no renderer) | Writes `guidelines.colorPalette` if ever mounted; candidate for deletion (A5) |

## Deletion queue (A5)

- ✅ `ColorPaletteEditor.tsx` — **deleted** (zero references).
- ✅ `mergeColorSystem` (mockBrandToPatch legacy colorSystem builder) — **deleted** (canonical model + `toLegacyBrandPatch` now produce `colorSystem`).
- ⏳ `LogoUploader.tsx` (dead — no render site, per discovery) — delete after confirming no dynamic ref.
- ⏳ `guidelines.colorPalette` / `guidelines.typography` / `guidelines.voiceAndTone` as identity mirrors — retire once every reader (Classic guideline templates, alt-fork) reads canonical; blocked by those features being unmigrated + 013.

## DB / persistence status (A6)

- Verified live migration state earlier (`supabase migration list --linked`): remote head = 008; **013 NOT deployed** (BLOCKED ON PRODUCTION ACCESS). Additive 013 prepared + verified against real Postgres.
- Today: authed identity writes are server-backed via the existing `brands` columns (primary_color, secondary_color, fonts, tone, strategy, logo_assets). Column-less canonical fields (accent, neutrals, numeric weights, uploaded-font assets, vision/values, rich voice) do **not** durably persist for authed users until 013 ships.
- `guidelines` JSONB is **no longer written** as color/type identity by any migrated surface; it survives only as a read-fallback the canonical readers now out-prioritize.
