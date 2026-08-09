# 05 — Source of Truth Analysis

> Agent: B2-truth · Date: 2026-08-08 · Branch: `new-ui` @ `46ffb41`
> Method: type-file reads + write-path traces + one full `tsc -p tsconfig.app.json --noEmit` run.
> Tags: **VERIFIED** (path:line) / **INFERRED** / **UNKNOWN** / **CONFLICTING EVIDENCE**.

## 0. Meta-finding that frames everything below

**The repo's type gate is a no-op.** `npm run typecheck` = `tsc --noEmit` (package.json:15)
against the solution-style root `tsconfig.json` which has `"files": []` + `references`
(tsconfig.json:2-5). Plain `tsc --noEmit` on that file checks **zero source files and exits 0**.
Running the real project (`npx tsc -p tsconfig.app.json --noEmit`) yields **324 type errors**
(full list captured during audit; top offenders: `case-study-deck/shapes/*` ~120, seed brand
`src/data/brands/uniex.ts` 22, `EditorWorkspace.tsx` 11). — VERIFIED

Consequence: every representation drift documented below was *invisible to CI*. Several
mappers read fields that do not exist on their declared types and silently return `undefined`
at runtime (see §1, §6). Divergence is not just possible — it is already merged.

---

## 1. Brand

### 1.1 Representations

| # | Representation | Where | Shape highlights | Claims to be |
|---|---|---|---|---|
| R1 | `Brand` (v3 unified) | `src/shared/types/brand.ts:11-76` | Canonical fields `schemaVersion`, `logoSystem`, `colorSystem`, `typography`, `typescale`, `brandAssets[]` + deprecated legacy fields kept in place (`logo`, `logoAssets`, `primaryColor`, `secondaryColor`, `fonts`, `assets[]`, `neutrals`, `accentColor`) | **The canonical in-memory shape** (self-declared, brandAssets.ts:1-14) |
| R2 | Supabase `brands` row | `supabase/migrations/20250819211249:58-71` + `20260412000000:290-297` + `20250920212142:2-3` | Columns: `id,user_id,name,logo_url,primary_color,secondary_color,fonts(jsonb),tone,audience,slug,workspace_id,logo_assets(jsonb),strategy,guidelines(jsonb),is_public,public_url,custom_domain,brand_kit_designs(jsonb, dead)` — **no columns for any v3 field** (no colorSystem/typography/typescale/brandAssets/logoSystem/neutrals/accentColor/uiStyle/decks/presentationThemes/schema_version) | The persistence truth for authenticated users |
| R3 | localStorage `brandos:brands` | `LocalBrandsService`, `src/features/brand/services/brands.local.ts:29-110` | **Whole `Brand` object JSON-serialized** — legacy + v3 fields both persist | The persistence truth for guests / dev |
| R4 | `MockBrand` | `src/features/setup/data/mockBrand.ts:82-100` | Setup/Brand-Kit view shape: `logos[](svg strings)`, `colors{core,accent,grey}`, `fonts[](weights as STRING)`, `icons`, `photos`, `websites`, `voice{essay,pillars}`, `about[]` | Explicitly a "READ-ONLY view" (brandToMockBrand.ts:24-27) — but it round-trips (see mutation map) |
| R5 | `BrandKit` (zod) | `src/features/editor/brand/BrandKit.ts:74-115` | Editor Anti-Corruption Layer: strict zod — exactly-6 neutrals, `weights: number[]`, `heading/body` fonts, logo slots with URL-form validation | Explicitly "NOT a duplicate of Brand" — normalized read-model for the slot resolver |
| R6 | onboarding-v4 state | `src/features/onboarding-v4/types.ts` + `store/onboardingV4Store.ts` | `OnboardingAsset[]` (kind: image/color/font/link/pdf…, `logoSlot`, `aiLogoSlot`, `aiPlacement`, `value` hex, `locked`), `FeelPalette[]`, `StyleCardState[]`, `aboutSections[]` | Ephemeral wizard state, converted at submit |
| R7 | Seed brands | `src/data/brands/{raqm,skam,vector,uniex}.ts` + `demo` | Hand-authored `Brand` literals; **uniex.ts has 22 type errors against its own type** (missing `cmyk`, unknown `width` on `AssetFile`, missing `hierarchy`) — VERIFIED tsc run | Always-available read-through data, edits stored as diff in `seedBrandOverrides` (localStorage) |
| R8 | `CreateBrandInput` | `src/shared/types/brand.ts:350-362` | Legacy-only shape (name, logo, primaryColor, fonts, tone, audience) — no v3 fields | The only typed create contract |

### 1.2 Canonical vs persisted — verdict

- **Claimed canonical:** R1's v3 fields (`colorSystem`/`typography`/`logoSystem`/`brandAssets`), per brandAssets.ts:1-14 ("Writers should target the v3 fields only").
- **Actually persisted (Supabase):** ONLY legacy fields + `guidelines` JSONB. `SupabaseBrandsService.update()` whitelists 13 fields (`brands.supabase.ts:126-140`); **`typography`, `typescale`, `colorSystem`, `logoSystem`, `brandAssets`, `neutrals`, `accentColor`, `uiStyle`, `assets`, `decks`, `presentationThemes` are silently dropped from every patch.** `mapFromDatabase` (166-187) never reads them back and hard-codes `assets: []`. — VERIFIED
- **Actually persisted (local/guest):** everything, including v3 fields, because `LocalBrandsService.create` spreads `...input` and `update` merges the raw patch (brands.local.ts:69-76, 90). — VERIFIED
- **So the "canonical" v3 layer is, for authenticated users, a per-load DERIVATION**: `migrateBrandToCurrent` runs on every read (list/getById/getBySlug/create/update all wrap it — brands.supabase.ts:41,47,56,62,71,111,151) and rebuilds `colorSystem`/`typography`/`logoSystem`/`brandAssets` from legacy columns + `guidelines` JSONB. There is no `schema_version` column, so a DB brand is *always* `schemaVersion: undefined` at map time and *always* re-derived. — VERIFIED (migrateSchema.ts:375-390; no schema_version in any migration — grep)
- The onboarding writers know this: SetUpScreen deliberately mirrors colors into `guidelines.colorPalette` "because Supabase's brands table has NO accent_color / neutrals columns … `migrateBrandToCurrent` reads this back into `colorSystem`" (SetUpScreen.tsx:146-151 comment). — VERIFIED. **The guidelines JSONB is the de-facto persisted source of truth for the rich brand, not the v3 fields.**

### 1.3 Mutation map (who writes Brand, through what)

| Writer | Path | What it writes |
|---|---|---|
| onboarding-v4 SetUpScreen `submit()` | `useBrandStore.create/update` layered writes, SetUpScreen.tsx:486-556 | Legacy core (`name,primaryColor,secondaryColor,fonts,tone,audience`) + `logo` + `logoAssets` + `guidelines{strategy,voiceAndTone,aboutSections,colorPalette}` at create; then per-slice `update()`s: `neutrals` (extra colors), `assets` (links/photos/docs), `typography` (v3! with **string** weights), `publicUrl` |
| onboarding-v4 CreateScreen (scratch path) | `useBrandStore.create`, CreateScreen.tsx:92-105 | Legacy core + `guidelines{strategy,colorPalette(primary/secondary/accent),voiceAndTone}` from FeelPalette + style card |
| Setup page edit | `mockBrandToPatch` → `useBrandStore.update`, pages/b/[slug]/setup.tsx:39-42 | Dual-writes legacy + canonical per its doc comment (mockBrandToPatch.ts:9-27): `primaryColor` **and** `colorSystem`, `fonts` **and** `typography`, `accentColor`, `neutrals`, `logo`+`logoAssets`, `tone`, `guidelines.strategy/aboutSections`. Does NOT update `guidelines.colorPalette` |
| Brand Board | writes `uiStyle`, `accentColor`, `neutrals` (per brand.ts:51-61 comments) | UNKNOWN exact call site — not re-traced this audit |
| Typescale tool | `brandStore.setTypescale` → `update({fonts})` only (brandStore.ts:161-181) | Font families only; scale is draft-only, thrown away |
| brand-kit card editor / color+icon adds | **nothing** — session overlays `iconsOverride`/`colorAddsOverride` in component state (BrandKitCosmosPage.tsx:236-290), `onSave` toast-only | Intentional persistence gap (CLAUDE.md-documented, still true) |
| Seed brand edits | `patchSeedOverride` localStorage diff (brands.local.ts:95-98, brands.supabase.ts:118-124) | Any patch — device-local even for authenticated users |

### 1.4 Divergence points

1. **The Supabase update whitelist** (brands.supabase.ts:126-140) is the single biggest
   truth-splitter: every canonical-field write succeeds silently in guest mode and is
   silently dropped in authed mode. Onboarding's `applyPatch('font files', {typography})`,
   `('extra colors', {neutrals})`, `('links & photos', {assets})` (SetUpScreen.tsx:551-556)
   **cannot persist for a logged-in user**. The code even catches the failure and toasts
   "Couldn't save: …" — the layered-write design treats this as an expected condition
   rather than fixing the schema. — VERIFIED. (A patch containing only unmapped fields
   produces `update({})` against PostgREST — INFERRED to error, which is what feeds the
   `missing` toast.)
2. **Stale-derivation loop for colors (authed):** `buildColorSystem` prefers
   `guidelines.colorPalette.primary` over `brand.primaryColor` (migrateSchema.ts:112-127).
   Setup's edit path updates `primary_color` column + in-memory `colorSystem` but NOT
   `guidelines.colorPalette`; the in-memory `colorSystem` patch is dropped by the whitelist.
   On next load, migration re-derives `colorSystem` from the **stale onboarding-time
   `guidelines.colorPalette`** → every consumer that prefers `colorSystem` (the editor's
   `brandToBrandKit`, brandPalette, decks) shows the OLD primary color while
   `brand.primaryColor` holds the new one. — VERIFIED chain, runtime repro not performed
   (INFERRED severity: user-visible wrong color after edit + reload).
3. **`brand.assets` never round-trips on Supabase** (`mapFromDatabase` hard-codes `[]`,
   line 183) — see §3 DAM.
4. **Seed brands violate the schema they instantiate** (uniex 22 tsc errors) and their
   edits live in a localStorage diff layer even for authed users — a third persistence
   channel. — VERIFIED
5. `CreateBrandInput` (R8) has no v3 fields, so both create paths smuggle `guidelines`/
   `logoAssets` through `as any` / `Record<string, unknown>` casts (CreateScreen.tsx:105,
   SetUpScreen.tsx:486-496, brands.supabase.ts:91-101). The typed contract undersells what
   the wire actually carries. — VERIFIED

**Risk: CRITICAL.** Two persistence backends with different field coverage, a derived
"canonical" layer rebuilt on every read from a mirror that writers don't consistently
maintain, and a type gate that can't see any of it.

---

## 2. Logo system

### 2.1 Representations

| # | Representation | Where | Notes |
|---|---|---|---|
| L1 | `brand.logo` (string URL) | brand.ts:34 | @deprecated; still the create-path primary (`logo_url` column) |
| L2 | `brand.logoAssets` `BrandLogoAssets` | brand.ts:86-99 | @deprecated; slots full/icon/wordmark/alternate/**dark/light** — persisted as `logo_assets` JSONB |
| L3 | `brand.guidelines.logoSystem` `LogoSystem` | brand.ts:128-151 | Inline-URL variant objects (primary/secondary/wordmark/iconmark/blackVersion/whiteVersion) inside guidelines JSONB |
| L4 | `brand.logoSystem` `LogoSystemRefs` | brandAssets.ts:101-120 | v3 canonical: **asset-ID refs** into `brandAssets[]`, mono.black/mono.white, orientations |
| L5 | onboarding `LogoSlot` | onboarding-v4/types.ts:5-12 | `primary/light/dark/mark/horizontal/vertical/wordmark` — a 4th slot vocabulary |
| L6 | `BrandKit.logos` | BrandKit.ts:92-103 | Resolved `{url, format, aspectRatio}` per slot |

### 2.2 Canonical vs persisted

- Claimed canonical: L4 refs (brandAssets.ts header). Actually persisted: **L1+L2 (own columns) and L3 (inside guidelines JSONB)**; L4 is derived on every authed load by `buildLogoSystemAndAssets` with priority `guidelines.logoSystem → logoAssets → logo` (migrateSchema.ts:224-231). — VERIFIED
- onboarding-v4 writes L1+L2 only (SetUpScreen.tsx:272-287, 495-496), with a **deliberate polarity flip**: onboarding slot `dark` ("on dark" = light-colored artwork) → `logoAssets.light`, slot `light` → `logoAssets.dark` (SetUpScreen.tsx:276-284 comment "The naming is mirrored"). brandToMockBrand carries a matching warning (ts:55-59). Any consumer that misses this memo inverts mono variants. — VERIFIED

### 2.3 Resolvers (the derived readers)

- `brandToBrandKit.resolveLogoSlot` — v3-first (`logoSystem` ref → `brandAssets[]` → format priority), legacy fallback `logoAssets.*` (brandToBrandKit.ts:196-248). — VERIFIED
- `pickLogoOnBackground` / `bgTone` / `pickFgOnBackground` / `contrastRatio` (`src/shared/brand/logoOnBackground.ts:44-120`) — WCAG-scored variant picker, 12 importers. **Its `toneOfRole` reads `brand.primaryColor || brand.colorSystem?.primary?.hex` — legacy-FIRST, the reverse of brandToBrandKit's canonical-first chain** (logoOnBackground.ts:86-93). When the two color representations disagree (divergence §1.4.2) the two logo resolvers disagree about tone. — VERIFIED
- `logoCombosFor` / `visuallyClose` (`src/features/brand-kit/data/recolorLogo.ts:167-238`) — combinatorial derivation for kit tiles, RGB-distance dedupe.
- onboarding logo-family resolver `planPrimarySwap` / `primaryRank` (`onboarding-v4/utils/logoFamily.ts:20-74`) — mutates ONLY auto-placed slots; user-dragged placements are untouchable. Operates on L5 vocabulary before conversion to L2.
- **Setup's `mapLogos` reads a field that doesn't exist**: `brand.logoSystem?.primary?.url` — `LogoRef` has `assetId`, not `url` → 3× TS2339 (brandToMockBrand.ts:51-53, confirmed by tsc). At runtime always `undefined`, so **the Setup page and Studio brand-kit page (`pages/b/[slug]/brand-kit.tsx:37` uses the same mapper) never read the v3 logo system at all — they run entirely on legacy L1/L2.** — VERIFIED

### 2.4 Divergence points

1. Four slot vocabularies with two different light/dark polarities (L2 vs L5). Mapping
   tables exist in two places (SetUpScreen, brandToMockBrand) and must stay mirror-images
   by hand.
2. `migrateBrandToCurrent` only builds L4 when `schemaVersion < 3` — but on Supabase that
   is every load (no column), while on localStorage a brand saved WITH `schemaVersion: 3`
   and later legacy-field edits (e.g. Setup logo change writes `logo`+`logoAssets`,
   mockBrandToPatch.ts:379+) keeps its **old** `logoSystem` refs: the early return at
   migrateSchema.ts:375-377 skips re-derivation. Local `brandStore.update` uses the
   service's migrated return, but that migration is the early-return path. **Local mode can
   hold a v3 logoSystem pointing at outdated assets while logoAssets holds the new artwork**;
   readers that are v3-first (editor) vs legacy-only (Setup) then show different logos. —
   VERIFIED code path; INFERRED user impact.
3. Dedupe logic exists 3×: `dedupeLogoSystem` (legacy), `dedupeLogoSystemRefs` (v3),
   review-page dedupe in onboarding — same idea, three implementations.

**Risk: HIGH.** Nothing crashes, but "which artwork is the primary logo" has 4 answers
depending on surface, and the canonical representation is unread by the flagship Setup UI.

---

## 3. Brand assets (files/DAM)

### 3.1 Representations

| # | Representation | Where | Persisted? |
|---|---|---|---|
| A1 | Legacy `Asset[]` = `brand.assets` | brand.ts:327-348 | Local: yes (inside brand JSON). Supabase: **NO** — no column, `mapFromDatabase` returns `[]` (brands.supabase.ts:183), update whitelist drops it |
| A2 | v3 `BrandAsset[]` = `brand.brandAssets` | brandAssets.ts:55-82 | Derived at read by migrate; Local: persisted if written; Supabase: never |
| A3 | DB `public.assets` table | migration 20260412000000:317 | Table + `SupabaseAssetsService` exist, service registered at boot for authed (boot.ts:93) — **zero consumers**: grep for `SERVICE_KEYS.ASSETS`/`IAssetsService` hits only boot.ts, services.ts, the adapter itself. **Orphan service.** — VERIFIED |
| A4 | onboarding `OnboardingAsset[]` | onboarding-v4/types.ts:28-65 | Ephemeral; converted at submit into A1 entries (links → `type:'reference'`, photos → `category:'photo'`, docs ≤400KB → data URLs; SetUpScreen.tsx:289-367) |
| A5 | `Brands/` repo folder | repo root | Designer source files; not wired to the app (00-REPOSITORY-TRUTH §5) |
| A6 | Supabase Storage via Edge Fns | `finalize-onboarding-assets`, `cleanup-onboarding-scratch`, `upload-ai-reference` | UNKNOWN — whether onboarding-v4 client currently calls finalize was not traced; the submit path stores data-URLs into the brand JSON instead |

### 3.2 Verdict + divergence

- **The DAM (`/b/:slug/folders`, DamPage.tsx:161) reads `current?.assets` — A1.** For an
  authenticated user A1 is always `[]` after reload, and `AssetPicker`'s delete writes
  `update({assets})` (AssetPicker.tsx:68-69) which the Supabase whitelist drops. **The
  entire brand-scoped asset library is effectively guest-only.** The purpose-built A3
  table+service sit unused. — VERIFIED
- onboarding photos/docs become base64 data-URLs inside the brand row's… nothing, on
  Supabase (dropped), or inside localStorage brand JSON as guest — with explicit KB
  budgets and "skipped large file" toasts engineered around localStorage quota
  (SetUpScreen.tsx:342-374) while a real Storage bucket + Edge finalizer exist. —
  VERIFIED / CONFLICTING-DESIGN evidence.

**Risk: CRITICAL** for authed users (data loss presented as success paths); MEDIUM for
guests (quota-bound but functional).

---

## 4. Colors

### 4.1 Representations

| # | Representation | Where |
|---|---|---|
| C1 | `brand.primaryColor`/`secondaryColor`/`accentColor`/`neutrals[]` (flat) | brand.ts:38-61; only primary/secondary have DB columns |
| C2 | `guidelines.colorPalette` `ExtendedColorPalette` (ColorDefinition: hex+rgb+cmyk+pantone+name+usage) | brand.ts:159-179; persisted in guidelines JSONB — **the real persisted rich palette** |
| C3 | `colorSystem` `ColorToken`s (v3 canonical; "Hex is canonical. All other representations derived", brandAssets.ts:145-154) | derived on authed loads; persisted only locally |
| C4 | `BrandKit.colors` (zod; exactly-6 neutrals normalized by `normalizeNeutrals`, generated from hue when absent) | BrandKit.ts:78-85, brandToBrandKit.ts:60-74 |
| C5 | brandPalette role tokens (`buildBrandPalette`/`pickSurfaceTokens`, 424 LOC) | `src/shared/brand/brandPalette.ts` — pure derivation, 6 importers |
| C6 | onboarding `FeelPalette[]` seeds + Color Hunt library (4052 palettes, module-load expanded) + `POPULAR_PALETTES` | onboarding-v4/data/{seedPalettes,colorHuntPalettes,popularPalettes}.ts; used in FeelStep + review panel — VERIFIED imports |
| C7 | onboarding color assets (`kind:'color'`, `value` hex, `locked`, `primaryColorId` tag) | types.ts:50-54, store:126 |
| C8 | brand-kit session `colorAddsOverride` | BrandKitCosmosPage.tsx:246-290 — never persisted |
| C9 | MockBrand `{core,accent,grey}` + `hexToName` display names | mockBrand.ts:84-89; deliberately ignores `colorSystem.*.name` (brandToMockBrand.ts:160-166 comment) |

### 4.2 Flow + divergence

- Upload path: swatches → C7 → ordered (tagged primary first) → first/second → C1
  primary/secondary, rest → `neutrals` patch (dropped on Supabase) AND mirrored into C2
  (survives) (SetUpScreen.tsx:181-209). Scratch path: FeelPalette positions 1/2/3 →
  primary/secondary/accent (accent only reaches C2, no column) (CreateScreen.tsx:66-84).
- Two different "which seed palette wins" rules: SetUpScreen falls back to
  `initialPalettes()[0]` **ignoring the user's selected palette**, CreateScreen honors
  `selectedPaletteId || locked || first` (CreateScreen.tsx:51-54 vs SetUpScreen.tsx:132).
  A user who picked a palette in Feel but also uploaded zero colors gets Monolith's colors
  from the uploads path. — VERIFIED, likely-unintended asymmetry.
- Names diverge by design: C2 keeps "SKAM Red"-style names; Setup/Brand-Kit re-derive
  names from hex (C9) — same swatch, two labels on different surfaces, documented as
  intentional. — VERIFIED
- `brandToMockBrand` reads `colorSystem.background` which **does not exist** on
  `ColorSystem` (TS2339, brandToMockBrand.ts:173) — the "background swatch" feature is
  dead code that always yields undefined. — VERIFIED
- A second, unrelated `ColorSystem` interface lives in
  `src/features/logo-maker/identity-engine/types.ts:103` — name collision. — VERIFIED

**Risk: HIGH** — same root cause as §1 (C3 derived from stale C2 on authed loads; accent
and neutrals have no columns), plus session-only C8 adds.

---

## 5. Typography

### 5.1 Representations

| # | Representation | Weights type | Where |
|---|---|---|---|
| T1 | `brand.fonts {primary,secondary}` | none | brand.ts:42-45; DB `fonts` JSONB — the only persisted-on-Supabase font data |
| T2 | `guidelines.typography` `ExtendedTypography`/`FontDefinition` | `number[]` | brand.ts:181-209; guidelines JSONB |
| T3 | `typography` `TypographySystem`/`FontToken` (+`files[]` data-URLs) | `number[]` (declared) | brandAssets.ts:160-193; local-only persistence |
| T4 | `typescale` `Typescale` | — | shared/types/typescale.ts; local-only; mirrored into T3 by `mirrorTypographyFromTypescale` (brandStore.ts:50-84) |
| T5 | MockBrand `BrandFont` | **`weights: string`** ("300 · 500 · 700") | mockBrand.ts:40-53 |
| T6 | `BrandKit.typography` | zod `z.number().int().positive()` | BrandKit.ts:60-63 |

### 5.2 What the 46ffb41 fix reveals — the drift mechanism

The commit ("coerce stringified typography weights before BrandKit parse") added
`sanitizeWeights` at the schema boundary (brandToBrandKit.ts:174-180). The **actual writer
of string weights is still live**: onboarding's `familyToken` builds
`weights: fam.weights.map(w => w.weight || 'Regular')` — an array of **weight-label
strings** ("Bold", "700", "Regular") — and stores it into T3's `FontToken.weights`, whose
type says `number[]` (SetUpScreen.tsx:407-411 vs brandAssets.ts:169). The invalid write is
invisible because the value passes through `Record<string, unknown>` casts and the type
gate is a no-op (§0). So the pattern is: **the producer was not fixed; a defensive
coercion was added at one consumer.** Every other consumer of `typography.*.weights`
(guidelines renderers, font pickers, exports) still receives strings that the type says
are numbers. `sanitizeWeights` also silently discards non-numeric labels — a brand whose
uploads were "Regular"+"Bold" ends up with `weights: undefined` in the editor. — VERIFIED

Other divergences:
- On Supabase, T3 (including uploaded font bytes) is dropped by the whitelist — the
  "font downloads return the exact files the user dropped" promise (SetUpScreen.tsx:369-372,
  FontToken.files docstring) only holds for guests. — VERIFIED
- `buildTypographySystem` prefers `guidelines.typography` over `brand.fonts`
  (migrateSchema.ts:173-199) → authed edits to `fonts` can be shadowed by stale guidelines
  typography, same loop as colors. — VERIFIED code path
- brandToBrandKit heading/body chains prefer `typescale → typography → fonts`
  (brandToBrandKit.ts:81-111); `typescale` never persists on Supabase → editor typography
  differs between a guest session and the same user logged in. — VERIFIED

**Risk: HIGH.** The one crash was patched, but the producer/consumer contract is still
broken and split across four weight formats (number[], string[], "300 · 500" display
string, label strings).

---

## 6. Brand strategy / voice

Representations: typed `BrandStrategy` (brand.ts:119-126) + `VoiceAndTone` with
**`brandVoice`** field (brand.ts:225-234); persisted `guidelines` JSONB + separate
`strategy` TEXT column (migration 20260412:293) that nothing in the new flows writes
(`brand.strategy?: string` brand.ts:49); `aboutSections[]` free-form (brand.ts:107,
written by onboarding as the full-fidelity copy).

Divergence — **three field names for "voice", none agreeing**:
1. onboarding writes `guidelines.voiceAndTone.voice` — a property that does not exist on
   `VoiceAndTone` (type has `brandVoice`) (SetUpScreen.tsx:169-171, CreateScreen.tsx:86-89).
2. Setup reads `guidelines.voice?.pillars` — `voice` does not exist on `BrandGuidelines`
   at all (TS2339, brandToMockBrand.ts:394). Always `[]`.
3. The voice essay Setup shows is actually `brand.tone` (mapVoice, brandToMockBrand.ts:393-399),
   which onboarding sets to the *voice section text or 'Neutral'* (SetUpScreen.tsx:491).

So the parsed voice content is persisted (inside guidelines JSONB, wrong key), but no
reader ever finds it; the UI renders the `tone` column instead. `aboutSections` is the
one strategy channel that round-trips correctly (writer SetUpScreen.tsx:176-178 → reader
mapAbout brandToMockBrand.ts:417-431). — all VERIFIED

**Risk: MEDIUM** (silent feature loss, no crash; data recoverable since it IS in the JSONB).

---

## 7. Guidelines (the editors, distinct from `brand.guidelines` data)

Four coexisting models:

| Model | Data shape | Persistence | Route |
|---|---|---|---|
| Chronicle (Studio canonical) | `GuidelineDocument` built from Brand by `buildGuidelineDocument`; edits captured as **frozen HTML snapshot** | `IDesignStorage.saveDesign(brand.id, 'brand-guideline', payload)` → localStorage (ChronicleGuidelineEditor.tsx:48,82,138) | `/b/:slug/guideline` |
| Legacy guidelines hub | `GuidelineSlide/GuidelinePanel` extending presentation types (features/guidelines/types/guidelines.ts:17-26) | zustand `persist` store (guidelinesStore.ts:49) | `/a/:slug/guideline`, `/b/:slug/guidelines/canvas` |
| Blocks | `BaseBlock` union (features/blocks/types.ts:26+) | `blocksStore` (own store) | `/b/:slug/guidelines/blocks` |
| `brand.guidelines` JSONB | `BrandGuidelines` (§1) | brands row | — data model consumed by all of the above |

Key divergence: **Chronicle's frozen-HTML snapshot wins over the live brand on reload**
("After that, the persisted frozen HTML wins", ChronicleGuidelineEditor.tsx:66-67) —
a guideline page is a point-in-time bake; later brand color/logo changes do NOT propagate
into an already-edited guideline. The three editors share no storage and no sync. Also,
because Chronicle rides `IDesignStorage`, authed users' guidelines are **device-local**
(§8). — VERIFIED

**Risk: MEDIUM** (three parallel models is debt, but they're additive; the silent
staleness of frozen HTML is the user-facing trap).

---

## 8. Designs

| Model | Shape | Persistence |
|---|---|---|
| Unified editor doc | `BrandOSDocument` zod, `schemaVersion: z.literal(1)`, pages/masterPages/SlotRefs, familyId/sourceDesignId (editor/schema/index.ts:246-283) | `IDesignStorage` (core/types/services.ts:153-176) → **`LocalDesignStorage` localStorage ALWAYS — reconfigureForAuth registers LocalDesignStorage even when authenticated** (boot.ts:40, 98) |
| Legacy OptimizedDesignEditor | raw Fabric JSON | `localStorage['design_${brandId}']` — one design per brand, no id (OptimizedDesignEditor.tsx:72,115,124) |
| DesignSummary metadata | thumbnails/name/contentType/family fields | same localStorage, sidecar summary keys |

- SlotRef indirection makes documents brand-relative; `applyBrandToDocument` +
  `convertToTemplate` are the two-way converters between literal values and slot refs
  (features/editor/brand/). The BrandKit ACL (§1 R5) is the only brand input the resolver
  sees — good isolation, single chokepoint. — VERIFIED
- **No design ever reaches Supabase.** All "My Designs", resize-variant families, saved
  templates-from-designs, and Chronicle guidelines are single-device. `brand_kit_designs`
  JSONB column (migration 20260512230000) has **zero src consumers** — dead column. —
  VERIFIED (grep)
- Two design stores can hold different content for the same brand (unified doc at
  `/b/:slug/design/:slug` vs legacy at `/editor/design/:slug`) with no linkage. Intentional
  carve-out (CLAUDE.md), still true.

**Risk: HIGH** — not internal inconsistency (schemas are clean and zod-guarded) but a
persistence-tier mismatch users will read as data loss (login on second device → empty).

---

## 9. Templates

Representations: `templates`/`template_categories` SQL schema (migration
20260504000000_009 — deployed state UNKNOWN); `ITemplatesService` +
**`LocalTemplatesService` (localStorage, seed-bootstrapped, VERSION-gated;
LocalTemplatesService.ts:52-91)** — registered for BOTH guest and authed (boot.ts:60,102),
so the Supabase schema is dark; brandkit legacy template data
(`features/brandkit/data/templates.ts` + `templateSeeds.ts`) for the Fabric module editor;
template-builder drafts in `localStorage['template-builder-draft']`
(TemplateBuilderPage.tsx:120); marketplace page appears static/demo copy (MarketplacePage.tsx:63)
— INFERRED, not fully traced. Community-submission flow writes
`visibility:'public'/uploadStatus:'pending'` into the LOCAL store, and the admin queue at
`/admin/templates/queue` reads… the same local store on the admin's machine — INFERRED
from service registration: **cross-user community templates cannot work while TEMPLATES
is Local for authed users.**

**Risk: MEDIUM** (self-consistent but marooned locally; two unrelated "template" data
families share one word).

---

## 10. User / profile / workspace / permissions

Representations & truths:
- `sessionStore` (in-memory zustand, not persisted; sessionStore.ts:23-98): `user`, `mode`,
  `platformRole` + derived `isAdmin/isSuperAdmin/isModerator` (+ deprecated `setAdmin`
  writer that computes a DIFFERENT truth: `isModerator: isAdmin` with no moderator tier).
- **Role truth #1**: `user_roles` table → `checkPlatformRole` → `platformRole`
  (useAuth.ts:87-106) → gates `/admin` via `AdminLayout.isModerator`.
- **Role truth #2**: `profiles.is_admin` boolean → `useIsAdmin` hook
  (shared/hooks/useIsAdmin.ts:53-62) → gates the templates queue page only. Two independent
  admin flags in two tables with no synchronization found. — VERIFIED; CONFLICTING
  EVIDENCE vs CLAUDE.md which only documents `profiles.is_admin`.
- `profiles` table: last_sign_in updates (useAuth.ts:140-148), suspension checks.
- Plan truth: `subscriptions.plan` per workspace (migration 20260412200000:10-15) +
  `check-plan-limit` Edge Fn; client read path not traced — UNKNOWN.
- Onboarding-answers: `onboarding_answers` table via `onboarding.supabase.ts` +
  zustand-persisted `onboardingStore` — dual-write (local persist + fire-and-forget
  Supabase save, onboardingStore.ts:115-118); this is the OLD onboarding's store, separate
  from onboarding-v4's un-persisted `useV4Store` (a refresh mid-wizard loses v4 state —
  VERIFIED: `create()` without persist middleware, onboardingV4Store.ts:85).
- Dev bypass: `DEV_AUTH_BYPASS = import.meta.env.DEV && VITE_DEV_BYPASS_AUTH === 'true'`
  (useAuth.ts:35-36) — compile-time DEV-gated (answers 01-PRODUCT-SURFACE open question 7:
  it cannot ship enabled in a prod build), but when active it grants `super_admin`
  locally (useAuth.ts:162-163); role gates are client-side only, so this is fine ONLY if
  RLS is the real enforcement — consistent with AdminLayout being UI-gating.

**Risk: MEDIUM** — the double-admin-flag split is the concrete bug-farm; everything else
is standard client-mirror-of-DB.

---

## 11. Ranked risk summary

| Rank | Concept | Risk | One-line justification |
|---|---|---|---|
| 1 | Brand (persistence split) | **CRITICAL** | Supabase whitelist silently drops every v3 field; canonical layer is re-derived per-load from a mirror writers don't maintain → stale-color/typography loops for every authed user |
| 2 | Brand assets / DAM | **CRITICAL** | `brand.assets` never round-trips on Supabase; DAM reads it; purpose-built `assets` table + service are orphaned; uploads survive only in guest localStorage |
| 3 | Designs & guideline docs | **HIGH** | `IDesignStorage` is localStorage even when authenticated — all designs, variants, Chronicle guidelines are single-device |
| 4 | Logo system | **HIGH** | 4 slot vocabularies, polarity flip, Setup reads nonexistent `.url` so v3 refs are unread by the main UI, resolver priority chains disagree (legacy-first vs canonical-first) |
| 5 | Typography | **HIGH** | String weights still written by onboarding into a `number[]` field; 46ffb41 patched one consumer, not the producer; fonts' uploaded bytes authed-dropped |
| 6 | Colors | **HIGH** | Accent/neutrals have no columns; guidelines mirror is the real store; two palette-pick fallback rules disagree between onboarding screens |
| 7 | Permissions | **MEDIUM** | Two independent admin truths (`user_roles.role` vs `profiles.is_admin`) gating different admin surfaces |
| 8 | Strategy/voice | **MEDIUM** | Voice written under a key no type declares and read from a key no writer produces; UI silently substitutes `tone` |
| 9 | Guidelines editors | **MEDIUM** | 3 unshared editor models; frozen-HTML bake goes stale vs live brand by design |
| 10 | Templates | **MEDIUM** | Local-only even authed; community/admin-queue flow can't cross users; SQL schema dark |
| 0 | (enabler) Type gate | — | `npm run typecheck` verifies nothing; real project has 324 errors including the mapper bugs above |

## 12. Contradictions found

1. **CLAUDE.md**: "useIsAdmin() reads profiles.is_admin" — true but incomplete; the main
   admin gate is `user_roles` → `platformRole` (§10). Two systems, doc mentions one.
2. **brandAssets.ts** ("Writers should target the v3 fields only") vs **every live writer**
   (onboarding-v4, Setup logo patch, create paths) targeting legacy fields — partly forced
   by the DB schema, but the doc-comment presents v3 as the write target.
3. **mockBrandToPatch's own rationale** ("consumers prefer canonical … so patch BOTH")
   vs the Supabase whitelist that throws the canonical half away — the dual-write is
   correct locally and dead on arrival authed.
4. **CLAUDE.md test-coverage doctrine** ("all three layers green before done") vs a
   typecheck script that checks zero files and 324 live type errors.
5. **02-ROUTES / 01-SURFACE** treat `/b/:slug/setup` + brand-kit as CURRENT product
   surface; both render through `brandToMockBrand`, which contains 5 dead-field reads —
   the hottest UI is built on the most drifted mapper.

## 13. Open questions

1. Are the Phase-4 `templates`/`template_categories` and `assets` migrations actually
   applied in the production Supabase project? (Repo can't tell; the client never queries
   them either way.)
2. Is `finalize-onboarding-assets` (Edge Fn) called by any current client path, or is it
   dead alongside `SupabaseAssetsService`? (Not traced this audit.)
3. Is the Supabase `.update({})` produced by an all-dropped patch an error or a no-op?
   Determines whether "Couldn't save: font files" toasts fire reliably or silently pass.
4. Was leaving `DESIGN_STORAGE`/`TEMPLATES` local-when-authed (boot.ts:98,102) a deliberate
   Phase-deferral (comments suggest yes for templates) or an oversight for designs?
5. Which of `user_roles.role` vs `profiles.is_admin` is intended to survive the promised
   "real RBAC review"?
6. Does anything still read the `strategy` TEXT column or `brand_kit_designs` JSONB, or
   can both be dropped?
