# Migration Backlog — recorded, NOT fixed (phase discipline)

Issues discovered during Stage 2A–2D that belong to a LATER phase. Do **not** fix these
now — they are logged so nothing is lost. Each notes the phase that should own it.

## Later-phase (identity/domain refinements)

| # | Item | Evidence | Owner phase |
|---|---|---|---|
| B1 | `VoiceAndTone.communicationStyle` has no canonical `Voice` field — dropped by `fromLegacyBrand`. | `brand.ts:228`; `fromLegacy.ts` resolveVoice | 2A-follow-up / voice modeling |
| B2 | Voice `example.bad` dropped — canonical keeps only `{context, text: good}`. | `brand.ts:239`; `fromLegacy.ts:~199` | voice modeling |
| B3 | `guidelines.colorPalette.semantic` not populated on the scalar color path (only passes through when a v3 `colorSystem` is present). Semantic tokens are arguably derived, not identity. | `fromLegacy.ts` resolveColors | color/derivation phase |
| B4 | Canonical logo validation is loose (`z.object({}).passthrough()`) — no structural logo invariant yet. Mapping is tested; schema isn't strict. | `invariants.ts:~77` | 2C (asset/logo foundation) |
| B5 | Legacy url→Asset resolution: `resolveLogos` emits transitional `legacy-url:<url>` refs. Real Asset records (id/hash/formats) are created in 2C. | `fromLegacy.ts` legacyLogoRef | 2C |
| B6 | `canonicalToRow` does not sync the legacy `logo_url` scalar column (canonical logos are asset refs, not URLs — needs the asset store to resolve a URL). Un-migrated readers of `logo_url` go stale after a canonical save. | `brandRow.ts` canonicalToRow | 2C (asset URL resolution) |
| B7 | `rowToCanonical` does not validate the stored `identity` JSONB on read (writes validate via `assertCanonicalBrand`; reads trust the DB). Harden with read-time validation once external/SQL writers exist. | `brandRow.ts` rowToCanonical | persistence hardening |
| B8 | `SupabaseBrandRepository` is update-only (no create/upsert). New-brand creation still flows through the legacy path until a later slice migrates it. | `SupabaseBrandRepository.ts` save | later feature migration |
| B9 | Migrate the scattered existing asset/logo classification call sites onto the single `classifyAsset` boundary. Known sites: `core/adapters/upload/LocalUploadService.ts`, `features/brandkit/components/AssetManagerModule.tsx`, `features/editor/adapter/*`, `features/onboarding-v4/utils/logoFamily.ts` (+ brand-vision AI suggestions feed `suggestedKind`). New paths already use `classifyAsset`. | (multiple) | asset-feature migration |
| B10 | Resolve the `legacy-url:` logo refs into real Asset records for existing brands (a data migration using `mintAssetFromLegacyLogoRef`), and populate `LogoRef.assetId`/`FontToken.fontAssetId` accordingly. | brand data migration | asset-feature migration |
| B11 | `mintAssetFromUrl` defaults `metadata.createdAt` to `''` when not supplied; callers should pass a real ISO timestamp (kept pure/deterministic for the domain). | `assetRelations.ts` | asset-feature migration |
| B12 | `changeBrandColor` does not bump `updatedAt` (the domain use-case is pure; the DB `trg_updated_at` trigger stamps it in prod, InMemory keeps it). At the Color-slice UI cutover, set `updatedAt` explicitly if the app needs it client-side. | `application/brand/changeBrandColor.ts` | 2D UI cutover |
| B13 | **Migrate the remaining color WRITE surfaces onto `changeBrandColors`:** (a) Setup (`pages/b/[slug]/setup.tsx` → `mockBrandToPatch` color portion) — writes a consistent scalar+colorSystem representation today (not a divergent authority), but should route through the canonical primitive; (b) Brand Kit `BrandKitCardEditor` color card `onSave` — currently toast-only (no persistence), wire it to `changeBrandColors`. | setup.tsx, BrandKitCardEditor.tsx | next color-surface migration |
| B14 | ~~**Full-fidelity authed color persistence needs migration 013.**~~ **CLOSED 2026-08-09.** 013 deployed; the `identity` blob now carries accent/neutrals through the service layer (`toLegacyBrandPatch` emits it, `SupabaseBrandsService` maps the column, `fromLegacyBrand` backfills legacy-first). Reload tests prove accent/neutrals survive for authed. NOTE: the facade repository (`BrandServiceRepository`) was KEPT — it inherits seed-brand handling + rich logo mapping via the service; the direct-column `SupabaseBrandRepository` reads columns lossily (drops `logo_assets` richness) and was intentionally NOT wired. | boot.ts, brands.supabase.ts, fromLegacy/toLegacy | **CLOSED** |
| B16 | **Setup strategy → full canonical authority.** StrategyTab is migrated (`changeBrandStrategy`), but `guidelines.strategy` remains the shared read-home because Setup (`brandToMockBrand` + `mockBrandToPatch`) still reads/writes it directly. To make the identity blob the strategy authority, migrate Setup's strategy read+write to canonical, THEN flip `resolveStrategy` to prefer the blob. Until then strategy is canonically modeled + full-fidelity persisted, but guidelines is the authority (both surfaces consistent). | setup.tsx, brandToMockBrand.ts, mockBrandToPatch.ts, fromLegacy.ts | Setup migration |
| B17 | **Rich voice has no editor.** The identity blob now PERSISTS rich voice (personality/do/don't/examples) if written, and `fromLegacyBrand` backfills it, but no UI writes it (tone is the only editable voice field). Net-new editor, not a migration. | (net-new) | later |
| B15 | `useBrandBySlug` vs `useBrandFromSlug` (two brand-load hooks) and scalar-only color readers (`PresentationStyleAdapter`, Brand Board) still read `primaryColor`; they stay consistent via the one-way scalar projection but should read canonical `colorSystem` when their features migrate. | (multiple) | per-feature migration |

## Unrelated / pre-existing (leave alone)

| # | Item | Evidence |
|---|---|---|
| U1 | `recolorLogo.test.ts` — 1 pre-existing unit failure, untouched by any Stage-2 work. | `src/features/brand-kit/data/recolorLogo.test.ts` |
| U2 | Browser E2E can't run — Playwright headless-shell version mismatch (1217 vs 1228). Env fix: `npx playwright install chromium-headless-shell`. | vitest browser project |
| U3 | 324 TypeScript errors (frozen baseline debt) + 10 circular deps (frozen). Ratcheted; burn-down is a later dedicated phase. | `.typecheck-baseline.txt`, `.madge-cycles-baseline.txt` |
| U4 | `supabase/.temp/*` local CLI state is tracked in git (pre-existing). Hygiene cleanup later. | `git ls-files supabase/.temp` |

## Batch-A audit (A7) — later-phase competing authorities (recorded, not fixed)

| # | Item | Why deferred | Owner phase |
|---|---|---|---|
| A7-1 | `FontTool` (`features/editor/tools/FontTool.tsx`) writes legacy `fonts` only — a competing typography writer | **Editor tool** (registered-not-rendered; editors are explicitly out of this batch) | editor migration |
| A7-2 | Classic guidelines editors (`GuidelineWithEditor.tsx`, `InteractiveGuidelinesEditor.tsx`) write scalars + the whole `guidelines` mirror (incl. a bare `voice` key) | Un-migrated Classic surfaces | guidelines migration |
| A7-3 | `classifyAsset` boundary still unwired (zero production callers) | Logo/asset migration not done this batch | asset-feature migration |
| A7-4 | Rich voice (do/don't/examples/personality) + full Strategy (vision/values/positioning) have no editor and/or need migration 013 for authed persistence | No real editor / 013 blocked | later + after 013 |
