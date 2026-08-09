# BrandingOS — Execution Control Center

_Quick status page. Updated after every stage. Detailed docs live in
`docs/codebase-intelligence/` (audit), `docs/target-architecture/` (design),
`docs/phase-2/` (execution)._

## Current Position

> **Status vocabulary (corrected 2026-08-10):**
> **FOUNDATION COMPLETE** = contracts/impl/tests exist but **no production path consumes them**.
> **MIGRATION COMPLETE** = a real product path uses the new architecture AND its legacy path is
> no longer authoritative. "Complete" is never used loosely. A prior report over-claimed Stage 2D
> as complete — corrected below.

- [x] Phase 0 — Audit
- [x] Phase 1 — Target Architecture + Owner Decisions
- [x] Stage 1 — Safety (security migrations **011/012 DEPLOYED to production 2026-08-09**)
- [x] Stage 2A — Canonical Brand identity — **FOUNDATION COMPLETE**, now consumed live
- [x] Stage 2B — Canonical Brand persistence — migration **013 (`brands.identity`) DEPLOYED 2026-08-09**; identity blob now written+read live
- [x] Stage 2C — Asset / Logo / Font — **FOUNDATION COMPLETE** (no live consumer)
- [x] Stage 2D — Color System migration — **CODE MIGRATION COMPLETE; 013 DEPLOYED.** ColorsTab +
      Setup + ui-color-system write one canonical path (`changeBrandColors`); accent/neutrals now
      durably persist for authed via the identity blob (verified by reload tests).

### Brand System Finalization (2026-08-09) — post-013-deploy

Production migrations **011, 012, 013 confirmed remote** (via `supabase migration list --linked`);
009/010 confirmed absent. With 013 live:

- **Identity blob persistence LIVE.** `Brand.identity` (+`identitySchemaVersion`) carries the full
  canonical identity through the service layer → the `brands.identity` column (authed) /
  localStorage (guest). `toLegacyBrandPatch` emits it; `SupabaseBrandsService` maps the column.
- **Authed accent/neutrals data-loss CLOSED.** Those have no scalar column and were silently dropped
  on save for authed users; `fromLegacyBrand` now backfills them from the blob on read. Backfill is
  strictly **legacy-first (`base ?? blob`)** — a present legacy value (incl. Brand Board's
  accent/neutrals scalars) always wins, so a lagging blob can never revert any writer; it only
  recovers data the transport dropped. (Also backfills numeric font weights + rich voice.)
- **Strategy migrated to canonical.** New `changeBrandStrategy` use-case; StrategyTab reads canonical
  strategy and writes through it. `guidelines.strategy` remains the shared read-home so the
  still-legacy Setup surface stays consistent (no divergence, no revert). vision/values/positioning
  now survive reload with full fidelity.

### Finalization Batch 2 — THE AUTHORITY FLIP (2026-08-09)

The migration bridge (`base ?? blob` legacy-first backfill) is replaced by a hard flip: once a
brand carries a canonical identity blob, **the blob is the authority** and legacy fields are
one-way projections.

- **Flip mechanism.** `migrateBrandToCurrent` → new `hydrateFromCanonicalIdentity(brand)` runs on
  EVERY brand read. When `brand.identity` exists at the current schema version, it **hydrates**
  (overwrites) the brand's legacy/v3 fields — colorSystem, primaryColor/secondary/accent, neutrals,
  typography, fonts, tone, and `guidelines.strategy` — FROM the blob. So every reader (canonical-first
  AND direct `brand.primaryColor`/`guidelines.strategy` readers) sees canonical, and a stale legacy
  scalar can NEVER override it. A brand with no blob still bootstraps from legacy (unchanged).
  Logos are intentionally NOT hydrated (logo subsystem not yet canonical).
- **All CURRENT writers migrated to canonical ops** (so the blob is always current):
  - **Setup** (`setup.tsx`) — color → `changeBrandColors`, fonts (incl. uploaded files) →
    `changeBrandTypography`, tone → `changeBrandVoiceTone`, strategy(+about) → `changeBrandStrategy`.
    Only name/logos/publicUrl fall through to legacy `updateBrand`.
  - **Brand Board** (`BrandBoardPage.tsx`) — color + fonts → canonical ops; only `uiStyle` legacy.
  - **Typescale tool** (`brandStore.setTypescale`) — families → `changeBrandTypographyFamilies`.
  - **Brand Board LogosPanel** — now stages logos through `stageLogoAssignment` (proper `LogoRef
    {assetId}` + `brandAssets`), replacing the divergent URL-shaped `logoSystem` write.
- **`changeBrandStrategy`** extended with `aboutSections`; **`changeBrandTypography`** added (families
  + uploaded font files, so files reach the blob and survive hydration).
- **Guidelines is no longer identity persistence.** `guidelines.strategy` is hydrated from the blob
  on read (a projection). Onboarding-v4 create still writes legacy scalars/guidelines — that is the
  BOOTSTRAP path for brands that have no blob yet (safe: no blob ⇒ no flip).

## Brand System Migration — final subsystem status

| Subsystem | Status |
|---|---|
| **Color** (primary/secondary/accent/neutrals) | **CANONICAL — authority flipped.** One write (`changeBrandColors`); all CURRENT writers (ColorsTab, ui-color-system, Setup, Brand Board) route through it; blob wins on read. |
| **Typography** (families + uploaded files) | **CANONICAL — authority flipped.** `changeBrandTypography` (families + files); writers TypographyTab/Setup/Brand Board/Typescale canonical. (Numeric weights still have no editor — net-new.) |
| **Voice** (tone) | **CANONICAL — authority flipped** for the editable field (tone). Rich voice (do/don't/examples) persists in the blob but has **no editor** (net-new). |
| **Strategy** (mission/vision/values/positioning/about) | **CANONICAL — authority flipped.** `changeBrandStrategy`; StrategyTab + Setup both canonical; `guidelines.strategy` is a hydrated projection. |
| **Logo** | **CANONICAL — durable (code-complete; authed on 014 deploy).** All current writers (Brand Board LogosPanel, Logo Maker, asset uploads, **Setup**) stage through the ONE authority `stageLogoAssignment` → proper `LogoRef{assetId}` + `brandAssets` records. Durable persistence via **migration 014** (`brand_assets`+`logo_system` columns); `migrateBrandToCurrent` prefers persisted refs/records over URL-hash re-derivation, so ids are minted once and survive reload. Guest live now; authed activates on 014 deploy (code is pre-014-tolerant). |
| **Canonical persistence** | Facade repository (`BRAND_REPOSITORY`) over the service layer, identity-column-backed (`brands.identity`, 013 DEPLOYED). Guest round-trips via localStorage. |

### Authority metrics — BEFORE → AFTER (the flip)

| Subsystem | CURRENT write authorities BEFORE | AFTER |
|---|---|---|
| Color | 5 (ColorsTab, ui-color-system, Setup, **Brand Board**, onboarding) — diverging | **1 canonical** (`changeBrandColors`) + onboarding-bootstrap |
| Typography | 5 (TypographyTab, Setup, **Brand Board**, **Typescale**, onboarding) | **1 canonical** (`changeBrandTypography`) + onboarding-bootstrap |
| Voice (tone) | 3 (VoiceTab, **Setup**, onboarding) | **1 canonical** (`changeBrandVoiceTone`) + onboarding-bootstrap |
| Strategy | 3 (StrategyTab, **Setup**, onboarding) | **1 canonical** (`changeBrandStrategy`) + onboarding-bootstrap |
| Logo | 4+ (LogosPanel divergent, LogoExportPanel, useAssetUpload, onboarding) | 1 staging authority (`stageLogoAssignment`); **records not yet durable — PARTIAL** |
| Read authority | legacy-first / v3-first mix | **identity blob wins on read** (`hydrateFromCanonicalIdentity`) |

**Legacy fields are now one-way projections** (written by `toLegacyBrandPatch`, hydrated from the blob
on read). No CURRENT surface writes a migrated identity field as an authority; onboarding-v4 create is
the only remaining legacy identity writer and it is the BOOTSTRAP path (fires only when no blob exists).

### B5 — remaining compatibility projections (kept, each with a deletion condition)

Nothing from this batch was DELETED (the writers were re-routed, not removed); the reduction is in
**authorities**, not files. These one-way projections remain and are intentional:

| Projection | Consumer | Reason kept | Deletion condition |
|---|---|---|---|
| Legacy scalars (`primaryColor`/`secondaryColor`/`fonts`/`tone`/`strategy`) | Frozen editors (`features/editor`, Classic `/a`), brand-consistency engine, render surfaces reading `brand.tone`/`primaryColor` | Many un-migrated + frozen readers | All readers read canonical `identity`/`colorSystem`/`typography` |
| `guidelines.strategy` (hydrated) | Setup `brandToMockBrand`, case-study-deck, social-media, brand-kit-cosmos, Classic guidelines (frozen) | Shared read-home + frozen consumers | Those readers read canonical `strategy` directly |
| `guidelines.colorPalette`/`voiceAndTone`/`logoSystem` | onboarding-v4 create (bootstrap), `ColorSystemModule` names, variant-studio, Classic (frozen) | Onboarding bootstrap + frozen | Onboarding create migrates to canonical + Classic retired |
| `logo`/`logoAssets`/`logoSystem` legacy mirror | All logo readers via `useBrandLogo` fallback | Logo subsystem not yet canonical | Logo durable Asset records land (Logo PARTIAL closes) |
| `BrandServiceRepository` facade (vs direct `SupabaseBrandRepository`) | `BRAND_REPOSITORY` DI | Inherits seed-brand handling + rich logo mapping the direct adapter lacks | Direct adapter gains seed handling + durable asset records |
| onboarding-v4 create legacy writes | Brand creation | Bootstrap for brands with no blob | Onboarding writes through canonical ops (net-new; safe as-is because no blob ⇒ no flip) |

## Current Architecture (as-is)

```mermaid
flowchart TD
  UI[Feature UIs] --> STORE[brandStore + 34 zustand stores]
  STORE --> SVC[services / DI]
  SVC --> LOCAL[LocalBrandsService → localStorage]
  SVC -. authed .-> SUPA[SupabaseBrandsService → brands row + guidelines JSONB]
  UI -. reads .-> MIG[migrateBrandToCurrent re-derives v3 each load]
  MIG -. stale-mirror .-> UI
  NEW[src/domain/brand — canonical model] -. not yet wired .-> UI
```

## Target Architecture (to-be)

```mermaid
flowchart TD
  UI[Feature] --> APP[application use-case]
  APP --> DOM[canonical Brand domain\nsrc/domain/brand]
  APP --> PORT[BrandRepository port]
  PORT --> ADP[Supabase adapter]
  ADP --> DB[(Postgres — one authoritative identity)]
  DOM -. fromLegacy/toLegacy .- LEG[legacy Brand shape\nboundary only]
```

## Current Source of Truth

| Concept | Today (legacy) | Canonical (new, `src/domain/brand`) |
|---|---|---|
| Brand identity | scattered: v3 fields + scalars + `guidelines` JSONB mirror (drifts) | `CanonicalBrand.identity` (one typed aggregate) |
| Color | `primaryColor` / `colorSystem` / `guidelines.colorPalette` | `identity.colors` (ColorSystem, roles) |
| Logo | `logo` / `logoAssets` / `logoSystem` / `guidelines.logoSystem` | `identity.logos` (LogoSystemRefs → asset ids) |
| Typography | `fonts` / `typography` / `guidelines.typography` (string weights!) | `identity.typography` (numeric weights) |
| Strategy/Voice | `strategy` / `tone` / `guidelines.strategy` / `voiceAndTone` | `identity.strategy` / `identity.voice` (unified) |

> Stage 2A builds the canonical column; it is **not yet wired** into read/write paths
> (that's 2B/2D). Legacy remains the live source of truth until then.

## Roadmap

- [✓] Audit
- [✓] Target Architecture
- [✓] Security (011/012/013/014 deployed; 009/010 absent)
- [✓] **Brand System — COMPLETE** (color · typography · voice · strategy · logo all canonical, server-backed)
- [~] Data / Assets / Persistence  ← **current batch (Batch B) — PARTIAL**
- [ ] Product / Legacy Cleanup
- [ ] Editors
- [ ] Final Hardening

## Batch B — Data / Assets / Persistence (2026-08-09) — PARTIAL

### Persistence truth map (B1)

| Data type | Real path | Authed → server? | Classification |
|---|---|---|---|
| Brand (core + identity blob 013 + logo cols 014) | `SupabaseBrandsService` → `brands` row | YES | SERVER-CANONICAL |
| Guidelines (`brand.guidelines`) | `brands.guidelines` JSONB | YES | SERVER-CANONICAL |
| Guideline presentations/slides | `presentations.supabase` → `guideline_presentations`/`guideline_slides` | YES | SERVER-CANONICAL |
| Workspaces + members | `SupabaseWorkspaceService` → `workspaces`/`workspace_members` | YES | SERVER-CANONICAL |
| **Designs / Documents** | `IDESIGN_STORAGE` → **now `SupabaseDesignStorage` → `designs` (015)** | **YES (was localStorage-only)** | **SERVER-CANONICAL (fixed this batch)** |
| Logo binaries | `StorageService` → Storage bucket `brand-assets` | YES | SERVER-CANONICAL (binary) |
| Brand-scoped Asset records | `brand.brandAssets` → `brands.brand_assets` (014) | YES | SERVER-CANONICAL |
| DAM library asset metadata | **now `ASSETS` service → `public.assets` (authed) / localStorage (guest)** | **YES (was DROPPED)** | **SERVER-CANONICAL (fixed this batch)** |
| Uploaded images (useAssetUpload) | compressed **dataURL in `brands.brand_assets` JSONB** | YES (but bloats row) | SERVER but dataURL-in-JSONB — debt |
| Fonts (uploaded files) | base64 dataURL in `brands.identity` JSONB | YES (bloats row) | SERVER but dataURL-in-JSONB — debt |
| Templates (user "save as template") | `LocalTemplatesService` + persist stores | **NO** | LOCAL-ONLY / DEFERRED (009 table deferred) |
| Brand-embedded decks / presentationThemes | not whitelisted → dropped | **NO** | LOCAL-ONLY / DEFERRED |
| Mockup drafts | `mockupStore` persist | NO | TEMPORARY / GUEST-DRAFT |
| Comments / approvals / notifications | localStorage stores; Supabase tables+services EXIST but **dead-wired** | NO | DEFERRED-FEATURE (v1 local) |
| Brand consistency | `LocalBrandConsistencyService` (stays local authed) | NO | LOCAL-ONLY / DEFERRED |
| UI prefs / onboarding / editor history / palettes | zustand persist / IndexedDB | NO | CACHE / device-local (intended) |

### What changed this batch
- **Designs → SERVER-CANONICAL (B4):** new `designs` table (migration 015, owner-scoped RLS) +
  `SupabaseDesignStorage` (tolerant of pre-015: delegates to `LocalDesignStorage`, merges pre-existing
  local designs). Wired in `boot.ts` (`DESIGN_STORAGE` authed → Supabase). **No editor changes** — the
  swap is behind the `IDesignStorage` DI port. This closes the single biggest authed-durable-local-only
  gap. Runbook: `docs/phase-2/DEPLOY-015-runbook.md`.
- **Deleted the orphaned UPLOAD abstraction (B8):** `LocalUploadService` + `IUploadService` +
  `UploadServiceResult` + `SERVICE_KEYS.UPLOAD` (zero consumers — `useUpload` bypasses it, using
  `imageUpload` directly). Pure reduction.
- **Simplified the auth/service lifecycle (B6):** `reconfigureForAuth` now `bootServices()` (full
  local defaults) + overrides ONLY the server-backed subset — removing the duplicated registration
  list and the redundant Local re-registrations, and guaranteeing every service (incl. FORMAT_PRESETS
  / BRAND_MEMORY) is registered in both modes. Locked by `src/core/__tests__/boot.test.ts`. (Verified
  the audit's "FORMAT_PRESETS/BRAND_MEMORY dropped after auth" was a false alarm — `container.reset()`
  clears cached instances, not registrations — but the refactor makes it robust regardless.)
- **DAM library → SERVER-CANONICAL (B2/B4), consuming the orphaned `public.assets` (B8):** the DAM
  wrote `brand.assets`, which `SupabaseBrandsService` silently dropped — an authed user's uploaded
  library was lost on reload. Now `DamPage` + the shared `AssetSourcePopover` picker read/write the
  `ASSETS` service (`SupabaseAssetsService` → `public.assets` authed; new `LocalAssetsService` →
  localStorage guest), registered in both modes. A one-time guest continuity migration seeds legacy
  `brand.assets` into the service so nothing disappears. This wires the previously-DEAD
  `SupabaseAssetsService`/`public.assets` and gives the clean boundary: **`brand_assets` = brand
  IDENTITY (logos referenced by logoSystem); `public.assets` = brand LIBRARY (DAM uploads)** — one
  authoritative store per scope. Editor-internal `AssetPicker` (frozen) still reads legacy
  `brand.assets` (degrades gracefully; migrates with the editor batch).

### Metrics — BEFORE → AFTER
| Metric | Before | After |
|---|---|---|
| Authed-durable data types persisting local-only | Designs, DAM metadata, Templates, decks, comments/approvals/notifications, brand-consistency (~7) | **5** (Designs + DAM library fixed → server) |
| Asset stores authoritative | ambiguous: `BrandAsset` live, DAM `Asset` dropped-when-authed, `public.assets` orphaned, domain `Asset` unwired | **1 per scope**: `brand_assets`=identity, `public.assets`=library (both live + consumed); domain `Asset` still an unwired stub |
| Upload pipelines (app-level) | 4 + 2 primitives, incl. orphaned `LocalUploadService` | orphaned UPLOAD deleted; DAM path now goes UI→storage→`ASSETS` record; `useAssetUpload` (logos) unchanged |
| localStorage/Supabase ambiguity | Designs + DAM ambiguous (local even when authed) | **explicit** for both (guest local, authed server) |
| Legacy services/files deleted | — | `LocalUploadService` + `IUploadService`/`UploadServiceResult`/`UPLOAD` key |
| Orphaned infra now CONSUMED | `public.assets` + `SupabaseAssetsService` (dead-wired) | **live** (DAM library) |
| DB migrations | — | **015 (`designs`)** prepared (deploy-pending, tolerant) |

### Deferred (with reason + condition) — the honest remainder
- **`useAssetUpload` dataURL-in-JSONB (logos/images) + fonts:** `useAssetUpload` still writes compressed
  dataURLs into `brands.brand_assets`, and font files land base64 in `brands.identity` — both bloat the
  row. Moving them to the storage bucket touches the logo/identity upload path used by editor-adjacent
  surfaces. **Editor batch** (with the `AssetPicker` migration off `brand.assets`).
- **Editor-internal `AssetPicker`** still reads legacy `brand.assets` (degrades gracefully — empty for
  authed as before). Migrate it to the `ASSETS` service with the editor batch.
- **Templates → server:** migration 009 (templates) is deferred; user "save as template" is local-only.
  Deploy 009 + `SupabaseTemplatesService` when the templates feature is prioritized.
- **Comments / approvals / notifications:** Supabase tables + services exist but the UI is v1
  localStorage — DEFERRED features (per scope: "comments/approvals only if current"). Wire the
  existing services when collaboration is prioritized.

## BRAND SYSTEM: COMPLETE ✅ (migration 014 deployed 2026-08-09)

All 15 criteria met. Every subsystem — color, typography, voice, strategy, logo — is canonical and
server-backed; the authority flip makes the persisted canonical identity win on read; durable logo
Asset ids persist (014 columns live). Closed unless a real regression surfaces.

Completion standard (2026-08-09, post-flip + logo vertical, 014 DEPLOYED):

| ✔ | Criterion |
|---|---|
| ✅ | Color canonical (authority flipped) |
| ✅ | Typography canonical (families + uploaded files) |
| ✅ | Strategy canonical (flipped) |
| ✅ | Voice canonical for all editable fields (tone; rich voice = net-new, no editor) |
| ✅ | **Logo canonical** — all current writers stage via `stageLogoAssignment` (proper `LogoRef{assetId}` + `brandAssets`); durable via 014 columns (DEPLOYED — authed + guest live) |
| ✅ | Setup current identity writes canonical (incl. logos now) |
| ✅ | Brand Kit current identity writes canonical (N/A — read-only/toast-only) |
| ✅ | Authenticated identity server-backed (`brands.identity`, 013 deployed) |
| ✅ | Canonical persisted identity wins after migration (the flip) |
| ✅ | Legacy fields cannot overwrite canonical data (hydration on read) |
| ✅ | Guidelines is not identity persistence (hydrated projection) |
| ✅ | **Asset refs for Logo are durable** — `logoSystem`+`brandAssets` persist (014 columns DEPLOYED / localStorage); ids minted once, preferred over URL-hash re-derivation |
| ✅ | No competing current-product Brand write authority (color/typo/voice/strategy = 1 each; logo = 1 staging authority, incl. Setup) |
| ✅ | Adversarial review clean (one StrategyTab revert risk found + fixed + re-verified) |
| ✅ | Tests / build / type gates green |

**Verdict: COMPLETE.** 15/15. Every subsystem — color, typography, voice, strategy, AND logo — is
canonical, server-backed, and durable in production (014 deployed). The authority flip guarantees the
persisted canonical identity wins on read; legacy fields are one-way projections. Closed.

## Other open items

- **Security migrations 011/012/013 — DEPLOYED to production 2026-08-09** (confirmed remote;
  009/010 absent). S1 CLOSED.
- **Real RBAC review** beyond the single `is_admin` boolean — still open (debt #1).
- **GitHub token** — removed from local config; **owner must revoke/rotate** it (still open).

## Current Technical Debt Baseline (frozen, ratcheted)

- TypeScript errors: **322** (frozen `.typecheck-baseline.txt`; CI blocks *new* errors).
- Circular deps: **10** (frozen `.madge-cycles-baseline.txt`).
- Unit/adapter tests: **1213 pass / 1 pre-existing fail** (`recolorLogo.test.ts`, backlog U1).
- Browser E2E: environmental block (Playwright headless-shell version mismatch).
- Lint: 0 errors / 228 warnings. Build: green.

## What Changed This Run

- Committed the accepted Phase-0/1 + Stage-1 baseline (docs + security migrations + CI gate).
- **Stage 2A:** `src/domain/brand/` canonical model — `CanonicalBrand`/`BrandIdentity` aggregate
  reusing the v3 value objects; zod boundary validation; `fromLegacyBrand` (fixes stale-mirror) +
  `toLegacyBrandPatch`; 16 tests. Adversarially reviewed.
- **Stage 2B:** `BrandRepository` port + pure row mappers + In-memory & Supabase adapters +
  additive migration 013 (`brands.identity` JSONB). Reads prefer stored identity (no
  re-derivation); writes are validated + server-backed; guidelines mirror untouched. Round-trip
  proven by unit tests + a real-PostgreSQL (PGlite) integration harness. Zero regressions; type
  baseline unchanged.

- **Stage 2C:** `src/domain/asset/` — canonical `Asset` (adds owner + lifecycle to the v3
  BrandAsset shape); ONE `classifyAsset` boundary; `LogoRef→Asset` / `FontToken→Asset` resolvers;
  `legacy-url:` ref minting. 13 tests. Existing classification sites → backlog B9–B11.
- **Stage 2D:** `src/application/brand/changeBrandColor.ts` — the canonical Color-System command,
  proven end-to-end (intent → use-case → canonical → repository → reload → same value; second
  consumer reads canonical; stale mirror cannot resurrect). 6 tests. Live-UI cutover + legacy
  removal deferred (deploy-gated on migration 013). Zero regressions.

## Next Stage (NOT started this run)

Autonomous window ends at 2D. Next is the **live cutover of the Color slice** once migration 013 is
deployed (register a `BrandRepository` in DI; point Brand Kit color save at `changeBrandColor`;
remove the legacy color write path), then subsequent identity subsystems (logo, typography) and the
asset-feature migration (backlog B9–B11). None of these are begun here.
