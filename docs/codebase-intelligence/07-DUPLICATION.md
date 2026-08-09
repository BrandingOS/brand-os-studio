# 07 — Semantic Duplication Inventory

> Agent: B3-dup · Date: 2026-08-08 · Branch: `new-ui` @ `46ffb41`
> Scope: repeated *solutions to the same problem* — not just identical code. Builds on
> 01-PRODUCT-SURFACE, 02-ROUTES, 03-FEATURE-INVENTORY (known families verified + deepened,
> not re-derived). Tags: **VERIFIED** (path:line or reproducible grep), **INFERRED**,
> **UNKNOWN**. Consumer counts are `grep -rl` file counts excluding `*.test.*`.
> READ-ONLY audit — no code was changed.

**Headline numbers (all VERIFIED by grep on this commit):**

| Metric | Count |
|---|---|
| Independent `slugify`/`generateSlug` implementations | 9 |
| Independent contrast/luminance implementations (incl. inline) | ~15, using **3 different luminance formulas** |
| Files privately re-defining `hexToRgb`/`hslToHex`/etc. | ~30 (beyond the 4 "engine" modules) |
| Hard-coded `` `/b/${...}` `` URL template strings | 264 (vs 1 canonical builder with 1 real consumer) |
| Browser-side Anthropic call sites | 6 (5 duplicate `ANTHROPIC_API_URL` consts + 1 SDK client), 3 different model IDs |
| Raw `<input type="file">` sites | 36 (vs 3 "canonical" upload surfaces that each claim to be canonical) |
| Font catalogs / font loaders | 4+ catalogs, ~4 loaders |
| zustand stores importing `zustand/middleware` (mostly persist) | 26 |

---

## Family 1 — Color: math, contrast, pickers

### 1a. Color-math "engines" (hex/HSL/RGB, shades, harmonies)

Four module-level engines coexist, plus ~30 private per-file redefinitions of the same
conversions (VERIFIED: grep `function hexToRgb|hslToHex|hexToHsl|rgbToHex` — 47 definition
hits across src).

| Implementation | Consumers | Behavioral differences | Historical reason | Consolidation opportunity | Risk |
|---|---|---|---|---|---|
| `src/shared/color/colorEngine.ts` (+`brandRules.ts`) — VERIFIED | 13 files import `@/shared/color`; +2 via deprecated shims `src/features/brandkit/engine/{colorEngine,brandRules}.ts` (pure `export *` re-exports, VERIFIED heads) | Object-shaped tuples (`{h,s,l}`), WCAG luminance, `suggestNeutrals`, harmony gen. This is the CLAUDE.md-canonical engine (doc says it lives in `features/brandkit/engine/` — **stale**, moved 2026-04-07 379997c) | Original brandkit engine, promoted to shared | **Target survivor** for brand-domain color math | Low — already the hub |
| `src/lib/color-engine/` (10 files: conversions, contrast incl. **APCA**, harmony, roles, semantic, validate) — VERIFIED ls | 19 files import `@/lib/color-engine` | Tuple types (`RgbTuple`/`HslTuple`), `wcagLevel()`, APCA contrast (`contrast.ts:53`) — richer than shared/color; built as the UI-Color-System tool's engine, barrel-only import contract (`index.ts` header) | Built fresh for the `/tools/ui-color-system` public tool, 2026-04-22 (7422240) | Merge with shared/color — one is a superset of the other's conversions; APCA exists only here | Medium — 19+13 importers, different tuple shapes mean mechanical but wide signature changes |
| `src/shared/utils/color-utils.ts` — VERIFIED :6-30 | 1 file | Same hexToRgb/contrastRatio again, nullable return variant | Oldest (2026-04-01 7e914d4), pre-dates both engines | Delete after repointing its 1 consumer | Trivial |
| `src/features/tools/variant-studio/engine/palette.ts:110-129` | variant-studio internal | Own hexToRgb + relativeLuminance + contrastRatio | Tool built self-contained (2026-04-09) | Repoint to lib/color-engine | Low |
| ~30 private redefinitions (examples: `BrandKitCardEditor.tsx:96-126`, `colorPaletteExport.ts:279-302`, `case-study-deck/utils.ts:141`, `brand-board/{panels/ColorsPanel.tsx:15-33, engine/shuffle.ts:27-50, store/useBrandBoardStore.ts:151}`, `EditorFloatingToolbar.tsx:1433-1440`, `guidelines/ColorSection.tsx:10`, editor tools ×3, export builders ×4, `migrateSchema.ts:104`, `variableMap.ts:84-90`) — all VERIFIED grep | each file-local | Mostly identical math; some subtly different (3-digit-hex handling, clamping, string vs tuple returns) | Copy-paste convenience per feature; no lint rule stops it | Sweep-replace with the survivor engine's exports | Low per file; volume is the cost |

### 1b. Contrast / luminance — three different formulas in production

**VERIFIED**: grep `contrastRatio|luminance` definitions. Canonical per CLAUDE.md is
`shared/brand/logoOnBackground.ts:32-44` (`relativeLuminance` + `contrastRatio`, 4 importers).
Competing implementations:

| Implementation | Formula | Consumers |
|---|---|---|
| `shared/brand/logoOnBackground.ts:32,44` (canonical) | WCAG linearized 0.2126/0.7152/0.0722 | 4 files |
| `shared/color/brandRules.ts:15,24` | WCAG | via `@/shared/color` (13) |
| `lib/color-engine/contrast.ts:15,27,53` | WCAG **and APCA** | via barrel (19) |
| `shared/utils/color-utils.ts:23,30` | WCAG | 1 |
| `features/brand-kit/data/recolorLogo.ts:113,122` | WCAG (own copy, exported!) | 5 — **used at `BrandKitCosmosPage.tsx` ~1094 per CLAUDE.md instead of the canonical** |
| `features/brand-consistency/engine/brandTokens.ts:30` | WCAG (own copy) | internal |
| `features/tools/variant-studio/engine/palette.ts:129` | WCAG (own copy) | internal |
| `features/logo-maker/flow/utils/quality-checks.ts:45` | WCAG (own copy) | internal |
| `case-study-deck/utils.ts:45` | own `luminance(hex)` | deck + pitch-deck (17-importer library per 03 §9) |
| Inline perceptual (0.299/0.587/0.114, **not** WCAG): `BrandAssetsRenderers.tsx:105`, `colorPaletteExport.ts:264` (`readableOn`), `BrandBoardCanvas.tsx:28`, `BusinessCardTool.tsx:22`, `SocialMediaTool.tsx:20` | ITU-R BT.601 | file-local |
| Inline non-linearized 0.2126-weighted: `BrandSwitcher.tsx:179`, `guidelines/{ColorSection.tsx:20, HeroSection.tsx:17}`, `pages/_dev/chronicle.tsx:170` | sRGB weights without gamma linearization — **numerically wrong for WCAG purposes** | file-local |

**Consequence (INFERRED):** the same fg/bg pair can pass a readability check on one surface
and fail on another. This is precisely the bug class CLAUDE.md documents (SKAM red-on-red,
2026-04-25) — the helper was built, but 10+ surfaces still don't route through it.

### 1c. Color pickers (UI)

| Implementation | Consumers | Differences | Reason | Opportunity | Risk |
|---|---|---|---|---|---|
| `features/setup/components/ColorPickerHSV.tsx` | 4 external: `brand-kit/BrandKitCosmosPage`, `tools/ui-color-system/EditorPanel`, `onboarding-v4/panels/UploadsReviewPanel`, `setup/SetupBoard` (VERIFIED grep) | Full HSV area picker; setup-era, but **the de-facto shared picker** — Studio kit, a public tool, and the newest onboarding all import a `features/setup` component | Setup shipped it first; nothing in `shared/ui` | Promote to `shared/ui/ColorPickerHSV` (it already behaves shared) | Low — move + repoint 4 imports |
| `features/onboarding-v4/components/ColorPicker.tsx:3-11` | 1 (`PaletteCard.tsx`) | Small swatch/hex picker with its own hexToRgb | Onboarding v4 built fast, Aug 2026 | Fold into promoted picker or keep as micro-variant | Trivial |
| `src/components/ui/color-picker.tsx` (shadcn-style) | 1 (`guidelines/ColorPickerPopover.tsx`, itself 1 consumer) — VERIFIED | Popover-style | Came with shadcn kit | Legacy-guidelines-only; dies with debt #10 | None now |
| `features/editor/shell/v2/EditorFloatingToolbar.tsx:1433` inline | editor toolbar | inline hex plumbing | unified-editor velocity | use engine helpers | Low |

---

## Family 2 — Logo resolvers / variant pickers

Six overlapping "which logo variant, on which background" solutions (all VERIFIED):

| Implementation | Consumers | Behavioral differences | Historical reason | Opportunity | Risk |
|---|---|---|---|---|---|
| `shared/brand/logoOnBackground.ts` (`pickLogoOnBackground`, `bgTone`, `pickFgOnBackground`) | 4 | CLAUDE.md-canonical: WCAG-scored variant pick with 1.8 floor + letter-mark fallback | Built 2026-04-25 after SKAM incident | The survivor for *display-time* picking | — |
| `shared/color/brandRules.ts:177` `generateLogoVariants(brand)` | via `@/shared/color` | *Generates* variant list (mono black/white/colored) + safety validation — generation-time, not display-time; overlaps role-wise with recolorLogo combos | brandkit engine era | Keep split (generate vs pick) but document; ensure it delegates contrast to one impl | Low |
| `features/brand-kit/data/recolorLogo.ts` (`logoCombosFor`, `visuallyClose`, own `contrastRatio:122`) | 5 | Enumerates logo×bg combos for kit grids; RGB-distance tile collapse (≤60²) | Studio-kit tile-wall curation (021e1b1, 2026-05-09) | Repoint its contrastRatio to logoOnBackground's; keep combo logic | Low |
| `shared/brand/uniqueLogoVariants.ts` | 3 | "Same image, different label" dedup for pickers — self-describes as "single source of truth for the logo-variant catalog" (header) | Seed brands with 1 mark, 6 tiles | Overlaps `visuallyClose` (URL-identity vs pixel-distance dedup) — merge dedup strategies behind one module | Medium — different dedup keys, both intentional |
| `shared/brand/dedupeLogoSystem.ts` | 3 | Same dedup problem solved at *data* level ("even in the database itself" — header) rather than display level | User demand to fix data, not filters | Natural pair with uniqueLogoVariants; one module, two layers | Low |
| `features/onboarding-v4/utils/logoFamily.ts` | onboarding internal (+ test) | *Relative* primary-election across an upload family (classification races — header comment, 2026-08-04) | Aug 2026 onboarding frontier | Different problem (ingest-time role assignment) — keep, but its output should feed dedupeLogoSystem | Low |
| `features/logo-maker/identity-engine/` + `flow/utils/quality-checks.ts:45` | flow-internal only (03 §5 VERIFIED) | Generative identity system + own contrast checks | Carve-out wizard | Leave per carve-out policy; repoint contrast math only | Low |

**Net:** display-pick (logoOnBackground), generate (brandRules), enumerate (recolorLogo),
dedup ×2 (uniqueLogoVariants + dedupeLogoSystem), ingest-elect (logoFamily) — six modules,
three of which carry private contrast/distance math. The *concepts* are distinct enough to
keep; the *math* underneath them is quadruplicated.

---

## Family 3 — Upload pipelines

Three surfaces each documented as "the" canonical upload, plus 36 raw `<input type="file">`
sites (VERIFIED grep):

| Implementation | Consumers | Differences | Historical reason | Opportunity | Risk |
|---|---|---|---|---|---|
| `shared/upload/useUpload.ts` — header: "single hook every feature uses to upload an image" | 2 importers of `shared/upload` | Compress (via `imageUpload.ts`) + toast + optional persist to `brand.assets` | 2026-04-07 (379997c) | Superseded per the next row's own header — mark deprecated | Low |
| `shared/assets/useAssetUpload.ts` — header: "unified upload hook for the v3 brand asset system… supersedes the older useUpload" (VERIFIED) | 5 | Validate → compress → stage patch → atomic `brandStore.update` | v3 asset system 2026-04-16 (09f9f84) | **Target survivor** for brand-attached uploads | Low |
| `shared/upload/AssetSourcePopover.tsx` — CLAUDE.md-canonical picker surface | 2 (`brand-board/LogosPanel`, `editor/shell/v2/InsertPanel`) | Popover: device upload + brand-assets grid | Canonical per CLAUDE.md | Keep as the UI face over useAssetUpload | — |
| `shared/ui/AssetPicker.tsx` — header: "the canonical 'give me an image' UI. SINGLE SOURCE OF TRUTH" (VERIFIED) | 1 | Popover, two paths — same concept as AssetSourcePopover | Third canonicity claim | Collapse into AssetSourcePopover | Low — 1 consumer |
| `shared/upload/AssetPicker.tsx` | 1 (ImageInspector per header) | Asset-library modal (no upload) | deck-editor era | Merge into the same surface | Low |
| `features/onboarding-v4/utils/assetUpload.ts` (+`SetUpScreen.tsx:221-258` compression) | onboarding internal | Own genId, logo-heuristics (filename regex + alpha probe), own compression-to-data-URL under quota, PDF skip | Aug 2026 frontier; brand doesn't exist yet during onboarding, so brand-attached hooks don't fit | Extract the compression + heuristics into `shared/utils/imageUpload.ts` siblings; keep flow-specific staging | Medium — hottest code in repo |
| `shared/utils/imageUpload.ts` (compression core) | 9 | The one genuinely shared layer | — | Survivor foundation | — |
| Raw file inputs ×36 (dam AssetUploadZone, setup UploadModal, logo-maker upload screen, mockup-studio ×3, bento MediaPicker, tools ×5, editor panels ×3, …) | file-local | Each re-implements accept-filter/validation/preview | Feature velocity | Long-tail sweep to `useAssetUpload` + `AssetSourcePopover`; not urgent per-site | Low each |
| `LocalUploadService` (`SERVICE_KEYS.UPLOAD`) | DI-registered, never swapped on auth (03 baseline) | data-URLs into brand JSON | localStorage-first posture | Part of the persistence question (03 open Q2), not a UI dedup | — |

---

## Family 4 — Slug generation

**9 implementations, 2 incompatible output styles** (VERIFIED grep + reads):

| Implementation | Style | Used for |
|---|---|---|
| `shared/utils/slug.ts:9` `generateSlug` (2025-09-20 — oldest util in this audit) | lowercase + **underscores** | exported canonical; also `isValidSlug` accepts only `[a-z0-9_]` |
| `features/brand/services/brands.local.ts:113` private `generateSlug` | **underscores** — byte-identical logic to shared/utils | brand slugs at create when `input.slug` absent |
| `core/adapters/database/SupabaseWorkspaceService.ts:200` | **hyphens** | workspace slugs |
| `features/editor/shell/v2/EditorDuplicateDesignButton.tsx:26` | hyphens | duplicated-design slugs |
| `features/setup/utils/downloads.ts:5` `slugify` (exported) | hyphens | download filenames |
| `features/brand-kit/data/iconExport.ts:352` | hyphens (fallback `'icon'`) | zip entry names |
| `features/brand-kit/data/colorPaletteExport.ts:254` (exported) | hyphens (fallback `'color'`) | palette export names |
| `features/logo-maker/flow/utils/download-all.ts:28` | hyphens | filenames |
| `features/logo-maker/flow/screens/06-complete.tsx:16` | hyphens | brand slug preview in flow |

**Behavioral consequences:** brand URL slugs are underscore-style (`/b/the_brand_name`)
while everything user-visible elsewhere (workspaces, designs, filenames) is hyphen-style;
`isValidSlug` would *reject* a workspace-style slug. `brands.supabase.ts:89` sets `slug`
only when provided (VERIFIED) — creation without a slug relies on callers or DB defaults,
a local/Supabase divergence (INFERRED, not runtime-tested).
**Opportunity:** one `shared/utils/slug.ts` with `{separator}` option + a filename-safe
variant; delete 8 copies. **Risk:** changing the *brand* slug style would break existing
URLs/bookmarks — consolidate the code, keep per-domain style flags.

---

## Family 5 — Save / autosave machinery

**Good news:** `useAutoSave` has exactly **one** implementation
(`features/editor/core/useAutoSave.ts:53`) and 11 import sites spanning the unified editor,
decks, chronicle, template builder, logo-maker, brandkit module canvas (VERIFIED grep) —
this family was successfully consolidated at the *state-machine* level.
**Bad news:** the *persistence* layer under it is per-feature:

| Persistence path | Used by | Evidence |
|---|---|---|
| `IDesignStorage` → `LocalDesignStorage` (`brandos:design:*`) | unified editor | 03 §4 |
| `features/case-study-deck/storage.ts:56` raw localStorage (`brandos:case-study-deck`) | case-study + pitch-deck (17-importer library) | VERIFIED |
| `features/pitch-deck/pages/PitchDeckPage.tsx:41` raw localStorage + `deck-ai-cache` (`generateDeckFromScript.ts:528`) | pitch-deck | VERIFIED |
| `shared/presentation/v2/store/deckStore.ts` (own store + useAutoSave) | deck-v2 | VERIFIED import |
| `presentationsStore` (zustand persist) + Supabase `guideline_presentations` | guidelines family | 03 §3 |
| 26 stores importing `zustand/middleware` (persist pattern re-instantiated per feature: comments, approvals, blocks, logo-presentation ×2, mockup, logo-maker, guidelines, …) | each feature | VERIFIED grep |

**Opportunity:** a `createPersistedStore(key, schema)` helper + routing deck saves through
`IDesignStorage`-style contracts would make the eventual Supabase swap (03 open Q2) a
bounded change instead of 10+ hand-rolled key writes. **Risk:** medium — deck stores are
frozen since 2026-05-19 and the go-forward deck engine is undecided (open Q); consolidating
persistence before that decision may be wasted on engines that get deleted.

---

## Family 6 — Editor shells / chrome

| Implementation | Consumers | Differences | Reason | Opportunity | Risk |
|---|---|---|---|---|---|
| `features/editor/core/EditorChrome.tsx:97` (canonical topbar) | 14 files — unified editor, canvas guidelines, template builder, logo-maker ×2, OptimizedDesignEditor (VERIFIED grep) | Save indicator wired to useAutoSave | Phase 3 unification | Already the survivor | — |
| `shared/editor/EditorWorkspace.tsx:177` (own topbar/chrome inside) | 4 embedding surfaces: social-media, logo-presentation, blocks, shared/presentation (03 §4) | Full deck workspace incl. chrome; **off-limits** (`stable/editable-export-v1`) | Frozen export pipeline | None until export pipeline unfreezes | Blocked by policy |
| `features/case-study-deck/editor/{LeftSidebar,ContextToolbar,BottomSlideRail,RightInspector}` | case-study + pitch-deck | Bespoke deck chrome (uses useAutoSave but not EditorChrome) | Deck built parallel to Phase 3 | Adopt EditorChrome topbar when a deck engine is chosen | Medium |
| `features/editor/shell/chronicle/{TopBar,ActionBar,WorkspaceSidebar}` | guideline tab | Chronicle document chrome | 2026-05-19 rewrite | Part of unified editor family already — fine | — |
| `shared/presentation/v2/components/*` | deck-v2 | Third deck chrome | newest deck spike | Same as case-study row | Medium |

**Naming-trap corrections (VERIFIED, contradicts 03 §3 / briefing):**
- `src/features/guidelines/editor/index.ts:6` is a **re-export** of
  `@/shared/editor`'s `EditorWorkspace` ("Re-exports from the shared editor for backward
  compatibility") — there is **one** EditorWorkspace implementation with two import paths,
  not two components. The brand-guides page (`pages/.../brand-guides/index.tsx:3`) reaches
  it via the guidelines alias. Still a grep hazard, but consolidation is an import-path
  cleanup, not a component merge.
- `shared/layouts/WorkspaceShellAlt.tsx` exporting a component *named* `WorkspaceShell`
  (01 §11.7) stands — two different shells share one export name. VERIFIED previously.

---

## Family 7 — Brand data access & converters

### 7a. "Give me the brand for this slug" — two competing hooks

| Implementation | Consumers | Behavior | Risk of coexistence |
|---|---|---|---|
| `shared/hooks/useBrandFromSlug.ts` (48 LOC, 2026-04-23) | **8** files (Studio pages) | Store-backed: `current` when slug matches → synchronous **seed-registry fallback** (fixes first-paint flash) → `loadBySlug`. Single source of truth = brandStore | — |
| `shared/hooks/useBrandBySlug.ts` (93 LOC, 2026-04-05) | **30** files | Local `useState` copy fetched via `services.brands`, then **side-effect `setCurrent`** into the store, then a hand-rolled staleness diff on 5 fields (`updatedAt/logo/primaryColor/name/assets.length` — :69-73, :81-87) | Edits to any field *outside* the 5-field diff won't propagate to the 30 consumers until updatedAt changes (INFERRED); two components on one page using different hooks can render different brand snapshots (INFERRED). The newer hook fixed a flash bug the older one still has |

**Opportunity:** fold `useBrandBySlug`'s UUID support into `useBrandFromSlug` and migrate 30
call sites. **Risk:** medium-high consumer count, but behavior converges (both end at the
store); the field-diff heuristic is the main thing to delete.

### 7b. Converters — four brand-shape translators (distinct jobs, overlapping normalization)

| Converter | Consumers | Job | Evidence |
|---|---|---|---|
| `shared/brand/migrateSchema.ts` `migrateBrandToCurrent` (2026-05-09) | 5 — called inside `brands.local.ts` on every read | v1/v2 → v3 `Brand` canonicalization; own `hexToRgb:104` | VERIFIED |
| `features/setup/data/brandToMockBrand.ts:28` (2026-08-02, hot) | 7 | `Brand` → setup-era `MockBrand` (Studio kit + setup run on this shape); imports *from* `features/brand-kit` (circular-ish, 03 §1) | VERIFIED |
| `features/editor/brand/brandToBrandKit.ts:38` (2026-08-08 — latest commit) | 4 | `Brand` → zod `BrandKit` for the unified editor; "single chokepoint" per header; weight coercion added in 46ffb41 | VERIFIED |
| `shared/brand/brandPalette.ts` `buildBrandPalette` (2026-04-25) | 5 | `Brand` → role tokens for surfaces | VERIFIED |

Also: **seed merging happens in two places** — inside `LocalBrandsService`/`brands.supabase`
(`SEED_BRANDS.find` at `brands.supabase.ts:61`) *and* directly in `useBrandFromSlug:45`
(`getSeedBrandBySlug`, bypassing the service layer). VERIFIED. Two definitions of "does this
brand exist" can disagree if seed overrides diverge (INFERRED).

**Opportunity:** the converters themselves are legitimately different targets; the
consolidation is (a) shared normalization primitives (hex parsing, weight coercion, font
fallbacks currently re-solved in each), (b) one seed-resolution path. **Risk:** low for (a);
(b) touches first-paint behavior the flash-fix depended on.

---

## Family 8 — Route / link building

| Implementation | Consumers | Notes |
|---|---|---|
| `shared/hooks/useUiPreference.ts:67` `getBrandHomeUrl` | **1** real (`AppRail.tsx:282`); inline-duplicated by `pages/dashboard/brands/index.tsx:31-36` and `pages/workspace/Home.tsx:55-58` (02 §2 VERIFIED — both also hard-code `/a/:slug/identity` though `/b/:slug/identity` exists) | CLAUDE.md claims all 3 brand-entry sites consult it — false |
| `shared/brand/brandPathRewrite.ts` `rewriteBrandPath` | 2 (AppRail, BrandSwitcher) | Canonical brand-switch rewriter — healthy |
| Hard-coded template strings | **264** `` `/b/${` `` in 60+ files, **43** `` `/a/${` ``, **4** `` `/dashboard/brand/${` `` (VERIFIED grep counts) | No `buildBrandUrl(slug, section)` helper exists at all |
| `core/modules/registry.ts` routePrefixes | metadata; advertises unmounted `/tools/colors` (:183) + legacy `/dashboard/brand/...` prefixes (02 §1.9, §4.6) | Stale metadata; consumers untraced (02 open Q7) |
| Onboarding URL shims ×5 + stale in-app links | `/onboarding` still the most-linked creation URL (5 files, 02 §1.2) | Every product link eats a redirect hop |
| 13 live refs still generating `/dashboard/brand/...` (8 files, 02 §1.7) | — | 1–2 redirect hops each |

**Opportunity:** introduce `buildBrandUrl(slug, section, {ns})` + repoint the 2 inline
`getBrandHomeUrl` copies + update 6 stale-link files — small, high-leverage, zero visual
risk. The 264-site sweep can be incremental/lint-driven. **Risk:** very low (string-for-
string); the only trap is Studio-vs-Classic namespace choice, which `getBrandHomeUrl`
already encodes.

---

## Family 9 — UI primitives outside shared/ui

| Finding | Evidence | Assessment |
|---|---|---|
| **Two primitive kits**: `src/components/ui/` (full shadcn, ~50 files; `ui/button` imported by **110** files) and `src/shared/ui/` (10 files incl. `Button`, `Badge`, `Card`, `Input`, `PageHeader`) | VERIFIED ls + grep | Mitigating fact: `shared/ui/Button.tsx:1` **wraps** the shadcn Button (composition, not fork). Consumers split: shared/ui/Button 12, Card 24, Input 4, Badge **0** (dead). Two import paths for "a button" is a convention smell, not a code fork |
| `PageHeader` compliance | 20 files import it (VERIFIED) vs CLAUDE.md's "every page" rule; the rest of ~60 pages roll their own headers (INFERRED from count vs route count in 02) | Sweep candidate, low risk |
| Three "canonical" asset pickers | Family 3 above | Real fork |
| Hand-rolled portal/modals in features (`BrandKitCardEditor`, `BrandKitVariantsModal`, `setup/ContextMenu`, `onboarding-v4/AboutGroup`, `SwappablePhoto`) | VERIFIED grep createPortal | Small count — acceptable; Radix-portal CSS gotcha (CLAUDE.md) is the reason some exist |
| `shared/ui/Badge.tsx` zero consumers | VERIFIED | Dead file |

---

## Family 10 — Type / schema duplication

| Type | Definitions | Conflict |
|---|---|---|
| `Brand` (core) | `shared/types/brand.ts:11` — single | Healthy |
| `MockBrand` | `features/setup/data/mockBrand.ts:82` — single def, but a **parallel brand shape** consumed by 10+ Studio brand-kit files (03 §1) | The Studio kit runs on the *setup-era* shape; every kit feature pays the `brandToMockBrand` toll |
| **`BrandKit` ×2** | `features/editor/brand/BrandKit.ts:74` (zod, editor-canonical) **vs** `features/logo-maker/flow/state/types.ts:39` (interface, wizard-local) — VERIFIED | Same name, different shapes, zero shared fields guaranteed. Import-completion hazard; logo-maker's is carve-out-internal so collision is latent, not active |
| `BrandKit*` config types | `features/brandkit/types/index.ts` (`BrandKitTemplate`, `BrandKitModuleConfig`, `BrandKitColor`) | Third "BrandKit" vocabulary (module/template domain) — naming overlap only |
| **`BrandContext` ×2** | `shared/services/aiService.ts:3` vs `shared/services/mockup/types.ts:5` (VERIFIED) | Two ad-hoc "brand summary for a consumer" shapes; `features/editor/ai/brandCard.ts` (`BrandHandles`/`BrandCardResult`) is the maintained third — and brand-consistency already reuses it (`promptComposer.ts` imports, VERIFIED grep) |
| Design doc | `features/editor/schema/index.ts:246` `BrandOSDocumentSchema` — single zod | Healthy (deck docs live outside it, per Family 5) |
| Onboarding asset | `features/onboarding-v4/types.ts` `OnboardingAsset` | Flow-local, converts to Brand at create — acceptable boundary |

---

## Family 11 — Fonts / typography

### Catalogs (curated Google-font lists) — 4+

| Catalog | Consumer domain | Evidence |
|---|---|---|
| `shared/typography/fontCatalog.ts` (`GOOGLE_FONT_CATALOG`, FontRef with weights/fallbacks) | typescale tool / FontPicker | VERIFIED head; 2026-04-23 |
| `shared/presentation/theme/panels/fontCatalog.ts` | deck Customize panel — **carries its own loader** ("picking the font also LOADS it" — header) | VERIFIED; 2026-04-27 |
| `features/onboarding-v4/data/suggestedFonts.ts` | onboarding fonts-as-cards (742f408) | VERIFIED ls |
| `features/brand-board/engine/fontPairings.ts` | brand-board shuffle | VERIFIED import in shuffle.ts |
| (+ `features/tools/ui-color-system/hooks/useGoogleFonts.ts` fetches the Google Fonts API list dynamically) | ui-color-system | VERIFIED |

### Loaders — ~4 ways to get a font on screen

`shared/design-system/fonts.ts` self-describes as "**Single source of truth** for loading
brand fonts at runtime" (FontFace for uploaded files + Google `<link>`; VERIFIED header,
2026-04-29) — but the deck panel catalog, `useGoogleFonts`, and ad-hoc
`fonts.googleapis` link-injection in `case-study-deck/utils.ts`/`export.ts`,
`guidelines/TypographySection`, `editor/tools/FontTool`, `setup/SetupPage`,
`FontSelector`, `pitch-deck/PitchDeckPage` all load fonts without it (VERIFIED grep, 21
files reference `fonts.googleapis|FontFace|document.fonts`). Four+ pickers:
typescale `FontPicker`, brand `FontSelector`, editor `FontTool`, onboarding font cards.

### Weight parsing — solved twice in the last week

`features/onboarding-v4/utils/fontFamily.ts` (WEIGHT_TOKENS filename→weight mapping, with
tests) and commit 46ffb41 (2026-08-08) adding stringified-weight coercion inside
`brandToBrandKit` — two normalizers for "what weight is this font" at opposite ends of the
same data flow. VERIFIED (file header + commit subject).

**Opportunity:** one `shared/typography/` package: catalog + loader + weight parsing;
pickers stay per-surface but read one catalog. **Risk:** low-medium; catalogs are curated
per surface on purpose (deck fonts ≠ onboarding suggestions), so merge the *mechanism*,
keep per-surface curation lists.

---

## Family 12 — AI client plumbing

### Browser-side Anthropic clients — 6 call sites, 5 duplicate URL consts, 3 model IDs

| Call site | Transport | Model | Evidence |
|---|---|---|---|
| `shared/services/aiService.ts:20` | fetch `api.anthropic.com` | `claude-sonnet-4-20250514` | VERIFIED |
| `features/brand-consistency/providers/anthropicProvider.ts:13` | fetch (reuses aiService's key contract per header) | sonnet-4 | VERIFIED |
| `features/logo-maker/components/AILogoSuggestions.tsx:19,64` | fetch | sonnet-4 | VERIFIED |
| `shared/presentation/v2/ai/generateDeckFromScript.ts:56` | fetch | sonnet-4 | VERIFIED |
| `features/onboarding-v4/services/parseDescription.ts:12` | fetch | **`claude-opus-5`** | VERIFIED — newest code, Aug 2026 |
| `features/ai/v5/providers/claudeProvider.ts:19,49` | `@anthropic-ai/sdk`, `dangerouslyAllowBrowser: true` | **`claude-opus-4-6`** | VERIFIED |

All six ship `VITE_ANTHROPIC_API_KEY` to the browser (03 contradiction #4). `aiService.ts`
has only 2 consumers (anthropicProvider + guidelines AIContentGenerator) — it was an
attempted chokepoint that the other 4 call sites bypassed. VERIFIED.

### Edge-function path (the pattern the proxy migration wants)

`features/editor/ai/applyCommand.ts`, `generateImage.ts`, `shell/v2/panels/GeneratePanel.tsx`
(+ billing, adminService) already call Supabase Edge Functions (VERIFIED grep
`functions.invoke|functions/v1`). So the codebase contains **both** the unsafe pattern (×6)
and the safe pattern (×3) side by side, and new features have been choosing the unsafe one.

### Prompt-building helpers

`features/editor/ai/{brandCard, brandMemoryBlock, brandResolutionBlock, systemPrompt}` is
the maintained family; brand-consistency's `promptComposer` **reuses** `brandCard`
(VERIFIED grep) — good precedent. `generateDeckFromScript` and `aiService` build prompts
inline with their own brand-summary shapes (Family 10's `BrandContext` twins).

**Opportunity (ranked #1 below):** one `callClaude()` client module (or better: route all 6
through an `ai-proxy` edge function) + one model-ID const + `buildBrandCard` as the single
brand-summary. This is simultaneously the dedup fix and the CLAUDE.md security blocker.
**Risk:** low mechanically; behavioral risk is model-ID unification (opus-5 vs sonnet-4
outputs differ — keep per-feature model choice as a parameter).

---

## Top 10 highest-leverage consolidations (opportunity ÷ risk)

1. **Anthropic client plumbing → one client/proxy** (Family 12). 6 call sites, 5 duplicate
   consts; doubles as the mandatory pre-launch security fix. Risk: low. *Do first.*
2. **Contrast/luminance → `shared/brand/logoOnBackground` + one engine** (1b). ~15 impls,
   3 formulas, 2 of them numerically wrong for WCAG; directly causes the documented
   red-on-red bug class. Risk: low (pure functions, tests exist for the canonical).
3. **`useBrandBySlug` → `useBrandFromSlug`** (7a). 30 consumers on a 5-field staleness
   heuristic vs the store-backed hook; latent stale-render bugs. Risk: medium (count),
   payoff: one brand-read path.
4. **`buildBrandUrl` helper + repoint `getBrandHomeUrl` inline dupes + 6 stale-link files**
   (Family 8). 264 hard-coded templates never shrink without a helper existing. Risk: near
   zero to introduce; sweep is incremental.
5. **Slugify → one util with separator option** (Family 4). 9 copies, 2 output dialects,
   `isValidSlug` inconsistent with half the producers. Risk: low if brand-slug style is
   frozen as-is.
6. **Upload canon: `useAssetUpload` + `AssetSourcePopover`; deprecate `useUpload`, merge
   the two extra AssetPickers** (Family 3). Three simultaneous "single source of truth"
   claims is a doc-rot generator. Risk: low (1–2 consumers each on the losers).
7. **Color-math engines: merge `lib/color-engine` + `shared/color`** (1a). 32 combined
   importers, superset relationship, APCA only on one side. Risk: medium (tuple-shape API
   diff) — do after #2 so contrast lands first.
8. **Font mechanism unification: one loader (`design-system/fonts`), one catalog format,
   one weight parser** (Family 11). Two weight-parsers written the same week is the
   freshest divergence in the repo. Risk: low-medium.
9. **Promote `ColorPickerHSV` to shared/ui** (1c). Already de-facto shared across 3
   domains including the newest code; the move just makes the layering honest. Risk: low.
10. **Deck persistence behind one storage contract** (Family 5) — *conditional*: only after
    the go-forward deck engine decision (03 open Q1). Highest raw payoff for the Supabase
    swap, but wasted if 2–3 engines get deleted instead.

**Deliberately NOT recommended:** merging the logo modules into one (the six solve six
different sub-problems — dedupe only their embedded math, #2); touching
`shared/editor/EditorWorkspace` (off-limits tag); unifying the two shadcn-vs-shared/ui kits
beyond deleting dead `shared/ui/Badge` (wrapper pattern is benign); rewriting the brand
converters (each targets a real distinct shape — extract shared primitives only).

---

## Contradictions found

1. **`features/guidelines/editor` EditorWorkspace is NOT a second implementation** — it is
   a re-export shim of `shared/editor`'s (`features/guidelines/editor/index.ts:6`,
   VERIFIED). Corrects 03 §3's "two different components named EditorWorkspace" and this
   audit's own briefing. One implementation, two import paths. (The two-`WorkspaceShell`
   naming trap, by contrast, is real — two distinct shells.)
2. **CLAUDE.md's engine locations are stale**: `colorEngine`/`brandRules` documented at
   `features/brandkit/engine/` actually live at `shared/color/` since 2026-04-07; the
   brandkit paths are `@deprecated` shims (VERIFIED headers). CLAUDE.md never mentions the
   *third* engine `src/lib/color-engine/` at all — which has the most importers (19).
3. **Three components claim "canonical / single source of truth" for image picking**
   (`AssetSourcePopover` via CLAUDE.md, `shared/ui/AssetPicker.tsx` header,
   `shared/upload/useUpload.ts` header) while `useAssetUpload.ts` declares it "supersedes"
   one of them. The headers collectively lie; consumer counts (2/1/2/5) show none won.
4. **CLAUDE.md's "don't write `bg.luminance > 0.5 ? black : white` ever again"** is
   violated by ≥8 live files including the Studio brand-kit's own renderers
   (`BrandAssetsRenderers.tsx:105`) and both editor tools (VERIFIED, 1b table).
5. **`shared/services/aiService.ts` was the intended AI chokepoint** (brand-consistency's
   header defers to "the same env contract as … aiService") but 4 of 6 browser call sites
   bypass it, including both 2026-Q3 features. The chokepoint pattern exists and is losing.
6. **Brand slugs (underscore) vs everything-else slugs (hyphen)** — and
   `shared/utils/slug.ts` `isValidSlug` rejects the hyphen dialect its sibling generators
   produce (Family 4). No doc records this split. VERIFIED.

## Open questions

1. **Which color engine survives?** `shared/color` (brand-domain, CLAUDE.md-blessed) vs
   `lib/color-engine` (more importers, APCA, barrel contract). Needs an owner decision;
   both are actively imported.
2. **Is the underscore brand-slug style load-bearing** (existing Supabase rows, shared
   URLs), or can new brands move to hyphens behind a compat lookup? Determines how far
   Family-4 consolidation can go.
3. **Deck engine decision** (carried from 01/03): blocks consolidation #10 and the deck-
   chrome unification (Family 6).
4. **Should onboarding-v4 keep its private upload/compression stack** once a real
   (non-localStorage) upload backend lands, or is the v3 `useAssetUpload` path the
   intended destination? The two encode different persistence postures (03 open Q2).
5. **Model-ID policy**: three Claude model IDs are hard-coded in six files. Per-feature
   choice or one default + override? (Any proxy consolidation forces this question.)
6. **Does anything besides guidelines' `ColorPickerPopover` need `components/ui/
   color-picker.tsx`?** If not, it dies with debt #10 and `ColorPickerHSV` promotion (#9)
   becomes the single picker story.
7. **`useBrandBySlug`'s `setCurrent` side effect**: 30 consumers may *depend* on it
   hijacking the store's `current` (e.g. AppRail highlighting). Migration to
   `useBrandFromSlug` needs a check of who reads `current` incidentally. UNKNOWN — not
   traced per-consumer.
