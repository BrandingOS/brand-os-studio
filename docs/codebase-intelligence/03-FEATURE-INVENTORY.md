# 03 — Feature Inventory (by functionality, with generation trees)

> Agent: B2-features · Date: 2026-08-08 · Branch: `new-ui` @ `46ffb41`
> Method: import-graph greps + targeted file reads, anchored on 00-REPOSITORY-TRUTH
> (recency), 01-PRODUCT-SURFACE and 02-ROUTES (reachability). Tags: **VERIFIED**
> (path:line or reproducible grep), **INFERRED**, **UNKNOWN**, **CONFLICTING EVIDENCE**.
> Classifications per generation: CURRENT / TRANSITIONAL / LEGACY-CANDIDATE /
> DEV-EXPERIMENT / UNKNOWN.

**Persistence baseline (applies everywhere).** The DI container
(`src/core/boot.ts:34-80`) registers localStorage implementations for everything at boot.
`reconfigureForAuth(true)` (`boot.ts:89-113`) swaps **only BRANDS** to Supabase and adds
Supabase workspace/assets/comments/approvals/notifications/activity services — but
**DESIGN_STORAGE, UPLOAD, TEMPLATES, MOCKUP_TEMPLATES, BRAND_CONSISTENCY stay
localStorage-backed even when authenticated** (`boot.ts:101-107`). VERIFIED. So for a
logged-in user: the brand object lives in Supabase `brands` table
(`src/shared/services/brands.supabase.ts:22`); designs, uploads, templates, consistency
data, decks all live in the browser.

---

## 1. Brand Setup / Onboarding

### Generation tree

| Gen | Implementation | Status | Evidence |
|---|---|---|---|
| A | `src/features/onboarding` (2025-08 era) | **DELETED** — folder gone | 00 §6; `ls src/features` has no `onboarding` |
| B | onboarding v3 backend pipeline (scratch bucket + finalize) | **ORPHANED BACKEND** — see below | migration `20260420000000_007_onboarding_v3.sql:8-45`; edge fns with 0 SPA callers |
| C | `shared/store/onboardingStore.ts` (pre-v4 store) | **TRANSITIONAL** — still imported by 3 live files: `features/brand/hooks/useBrandPreview.ts`, `features/auth/hooks/useAuth.ts`, `shared/hooks/useDataSync.ts` (VERIFIED grep) | not used by onboarding-v4 itself |
| D | URL shims `/onboarding`, `/onboarding/preview`, `/onboarding-brand`, `/onboarding-v3/*`, `/onboarding-v4/*` | **REDIRECT SHIMS** (all `<Navigate>` to `/onboard-brand`) | 02 §1.2 |
| **E** | **`features/onboarding-v4` at `/onboard-brand(/create)`** | **CURRENT — the only live onboarding**, hottest area of Aug 2026 | `src/pages/onboard-brand/index.tsx:1-17`; 00 §6 |
| ∥ | `features/logo-maker/flow` (6-screen public wizard, alternate brand-creation funnel) | **TRANSITIONAL carve-out (kept)** — last real work 2026-04-17 | §5 below; 01 §3 |

### Trace chain (gen E, live)

- **Routes:** `/onboard-brand` → `SetUpScreen` ("upload existing assets" path);
  `/onboard-brand/create` → `CreateScreen` (2-step from-scratch path).
  Both **unguarded** (no ProtectedRoute — 01 §12.2). VERIFIED.
- **Screens:** `src/features/onboarding-v4/screens/SetUpScreen.tsx` (720 LOC),
  `CreateScreen.tsx`; steps `DefineStep.tsx`, `FeelStep.tsx`; plus `panels/`,
  `components/`, `data/` (styleCards, seedPalettes, colorHuntPalettes).
- **Store:** `store/onboardingV4Store.ts` — plain zustand, **no persist middleware**
  (VERIFIED read) → wizard state is session-only.
- **Services:**
  - `services/brandVision.ts` — **the SPA↔brand-vision bridge.** POSTs each queued image
    to `${VITE_BRAND_VISION_URL || 'http://localhost:8300'}/classify` with
    `engine = VITE_BRAND_VISION_ENGINE || 'custom'`; 25 s timeout; 60 s circuit breaker;
    on failure returns null and the filename/alpha heuristics stand
    (`brandVision.ts:15-60`). VERIFIED. **This is a localhost dev-machine dependency —
    in production (no env var, no service) every classify silently no-ops.** INFERRED.
  - `services/parseDescription.ts` — calls Anthropic Messages API **directly from the
    browser** (`https://api.anthropic.com/v1/messages`, model `claude-opus-5`) when
    `VITE_ANTHROPIC_API_KEY` is present, heuristic fallback otherwise
    (`parseDescription.ts:6-13`). VERIFIED — the client-side API-key exposure flagged in
    CLAUDE.md is alive in the *newest* code, not just legacy.
- **Persistence:** brand created via `useBrandStore.getState().create(...)`
  (`CreateScreen.tsx:104`, `SetUpScreen.tsx:444`) → BRANDS DI service (localStorage
  `brandos:brands` for guests via `features/brand/services/brands.local`; Supabase
  `brands` table when authed). Uploaded assets are **compressed to data URLs and embedded
  in the brand JSON** to survive refresh under localStorage quota
  (`SetUpScreen.tsx:221-258`); PDFs deliberately skipped (`:341`). A quota diagnostic
  enumerates all of localStorage (`:666-671`). VERIFIED.

### Orphaned v3 backend (CONFLICTING EVIDENCE with its own migration)

`supabase/functions/finalize-onboarding-assets` and `cleanup-onboarding-scratch` have
**zero callers in `src/`** (VERIFIED grep); the `onboarding-scratch` storage bucket +
`onboarding_rate_limits` table (migration 007) were built for the v3 upload pipeline.
Gen E bypasses all of it with data-URLs-in-localStorage. The v3 backend is deployed(?)
but unreachable from the current client. Status of deployed functions in prod: UNKNOWN.

### `features/setup` — not an onboarding gen, but setup-era schema is load-bearing

- `/b/:slug/setup` (Studio home tab) → `features/setup/SetupPage` on a real brand via
  `brandToMockBrand` adapter (`src/pages/b/[slug]/setup.tsx:3-8`); `/setup` (flat) runs
  it on `mockBrand` — DEV-EXPERIMENT (02 §1.3). Touched 2026-08-02 → CURRENT.
- Its `data/mockBrand.ts` `MockBrand` type, `ColorPickerHSV`, `colorNames`, `SetupIcons`,
  `organic-icons` are imported by **10 `features/brand-kit` files** (VERIFIED grep) —
  the Studio brand-kit runs on the setup-era `MockBrand` shape, not the core `Brand`
  type. `brandToMockBrand` also imports from `features/brand-kit/` (circular-ish
  coupling between setup and brand-kit). VERIFIED.

### `features/brand-setup` — a checklist, not a wizard

`BrandSetupChecklist` + `computeBrandSetupSteps` (4 files); exactly **one importer**:
`src/pages/b/[slug]/brand-kit.tsx` (VERIFIED grep). CURRENT (small). The folder name
collides conceptually with onboarding but is unrelated to it.

---

## 2. Brand Kit

### Generation tree

| Gen | Module | Route | Status |
|---|---|---|---|
| A (domain) | `features/brandkit` | `/a/:slug/brandkit/:moduleId` (Fabric module canvas) | **CURRENT as domain layer / LEGACY-CANDIDATE as UI** |
| B (Classic UI) | `features/brand-kit-alt` | `/a/:slug/brand-kit`, `/a/:slug/settings`, **and `/b/:slug/settings`** | **CURRENT-alternate — load-bearing in Studio too** |
| C (Studio UI) | `features/brand-kit` | `/b/:slug/brand-kit`, plus supplies `/b/:slug/tools` hub | **CURRENT** (frozen since 2026-05-19) |

### Who imports the `brandkit` domain layer today (the "47 importers" claim)

**45 external importer files** (VERIFIED: `grep -rl "@/features/brandkit" src` minus
self), grouped:

| Importer group | Files |
|---|---|
| `features/brand-kit` (Studio fork) | 34 |
| `pages/dashboard/**` (Classic pages incl. module canvas) | 4 |
| `features/brand-kit-alt` (Classic fork) | 4 |
| `features/guidelines` (legacy guidelines) | 2 |
| `features/design-alt` (launchpad, via `templateSeeds`) | 1 |

So the domain layer underpins **both** kit forks, the Classic module canvas, the legacy
guidelines, and the design launchpad's template seeds. CLAUDE.md's "47 importers" is
approximately right (45 today). VERIFIED.

### Trace chains

- **Studio fork** (`features/brand-kit`): `pages/b/[slug]/brand-kit.tsx` (fetch via
  `useBrandFromSlug` → `MockBrand` conversion → `WorkspaceShell` + `BrandSetupChecklist`)
  → `BrandKitCosmosPage.tsx` → renderers/ + `BrandKitCardEditor`. External importers of
  the fork itself: `features/setup/data/brandToMockBrand.ts`, `pages/b/[slug]/tools.tsx`
  (imports `KitSection` — the Studio tools hub is literally built from brand-kit
  components), `pages/b/[slug]/brand-kit.tsx`. VERIFIED. Persistence: session-only
  overlays for color/icon adds; card-editor save toasts only (CLAUDE.md debt — not
  re-verified line-by-line here, folder untouched since 2026-05-19 so the documented gap
  stands). INFERRED.
- **Classic fork** (`features/brand-kit-alt`): mounted at `/a/:slug/brand-kit` and
  `/a/:slug/settings` — **and imported by `src/pages/b/[slug]/settings.tsx` and by two
  `features/brandkit` components** (`LogoFilesModule.tsx`, `SettingsModule.tsx`)
  (VERIFIED grep). CONFLICTING EVIDENCE vs CLAUDE.md's "alternate, bug-fix only": the
  Studio settings page depends on it, and the domain layer imports *upward* into the
  alt fork.
- **Persistence:** everything reads/writes the brand object through `brandStore` →
  BRANDS service (localStorage or Supabase `brands`). `010_brand_kit_premium.sql`
  (2026-05-12) is the last kit-related migration.

---

## 3. Guidelines — a QUADRUPLE stack (all four mounted)

| Gen | Module | Route | Editor tech | Persistence | Status |
|---|---|---|---|---|---|
| A | `features/guidelines` hub | `/a/:slug/guideline` (GuidelinesHubPage) | slide-based | `guideline_presentations` Supabase table via `shared/services/presentations.supabase.ts:42-84` + `presentationsStore` (zustand persist) | LEGACY-CANDIDATE (last touched 2026-04-16) but still the Classic surface |
| A′ | same feature, canvas mode | `/b/:slug/guidelines/canvas` → `CanvasGuidelinesEditor` + `EditorChrome`/`useAutoSave` (`pages/dashboard/brand/[slug]/guidelines/canvas.tsx:3-8`) | Fabric canvas | same Supabase table | LEGACY-CANDIDATE |
| A″ | brand-guides deck | `/b/:slug/brand-guides` → **`features/guidelines/editor` EditorWorkspace** + `buildEditorSlides` (`pages/.../brand-guides/index.tsx:3-4`) | slide deck | (same family) | LEGACY-CANDIDATE — CLAUDE.md debt #10 (52 files / ~10k LOC) |
| B | `features/blocks` | `/b/:slug/guidelines/blocks` → `BlocksGuidelinesPage` (imports `features/comments` + `shared/editor` EditorWorkspace) | block document | comments: localStorage store | UNKNOWN — folder frozen 2026-04-08, but **coordinator correction (08 + direct grep):** it IS link-reachable from the share page (`pages/dashboard/brand/[slug]/share/index.tsx`), `brand-kit-alt/sections/BrandBookSection.tsx` (live in Studio settings), and the command palette (`shared/search/searchIndex.ts`) |
| **C** | **Chronicle** — `features/guideline` (singular) + `features/editor/shell/chronicle` | `/b/:slug/guideline` | ChronicleShell wrapping multi-page `GuidelineDocument` (Cover·Strategy·Logo·Color·Typography·Voice) | via brand/editor stores | **CURRENT** — rewritten 2026-05-19, touched 2026-08-02 (`pages/b/[slug]/guideline.tsx:1-29`) |

~~Naming trap: two different components named `EditorWorkspace`~~ — **corrected by
coordinator after Batch 3 (07 §6 + direct check):** there is exactly ONE implementation,
`src/shared/editor/EditorWorkspace.tsx:177`; `src/features/guidelines/editor/index.ts:6`
is a backward-compat **re-export shim** of it (`export { EditorWorkspace } from
'@/shared/editor'`). Greps still show both paths, but they are the same component.
The two-`WorkspaceShell` trap (below) remains real. VERIFIED.

`features/guideline` (singular, Chronicle document) has exactly 1 external importer —
the guideline page. `features/guidelines` (plural, legacy) has 6: `shared/utils/
brand-to-slides.ts`, `shared/services/exportService.ts`, `pages/brand/[slug]/
showcase.tsx`, `pages/dashboard/templates/index.tsx`, brand-guides page, canvas page
(VERIFIED grep) — the legacy stack also feeds the public showcase and the G1 workspace
templates page.

---

## 4. Design Editor(s)

### Generation tree

| Gen | Module | Route(s) | Status |
|---|---|---|---|
| A | `shared/editor/EditorWorkspace` + `shared/services/export/vectorize/*` (`stable/editable-export-v1`) | not routed directly — embedded by logo-presentation, social-media, blocks, shared/presentation (VERIFIED grep) | **FROZEN/off-limits, still load-bearing** for 4 surfaces |
| B | `features/editor/components/OptimizedDesignEditor` | `/editor/design/:slug` | **LEGACY carve-out (kept)** — transitively coupled to gen A via ExportDialog → vectorize (App.tsx:566-572 comment) |
| **C** | **unified editor `features/editor`** (core/schema/adapter/store/shell-v2/ai/variants/content-types/registry) | `/b/:slug/design/:designSlug`, launchers `/editor` + `/b/:slug/editor`, dev `/_dev/editor` | **CURRENT** — repo's latest commit (46ffb41, 2026-08-08) touches it; 43 external importer files |
| ∥ | `features/design-alt` DesignCosmosPage (launchpad, not an editor) | `/b/:slug/design` | CURRENT (2026-05-18) |
| ∥ | Classic launchpad `pages/dashboard/brand/[slug]/design/index.tsx` (uses brandkit `templateSeeds`) | `/a/:slug/design` | CURRENT-alternate |

### Trace chain (gen C)

Routes → `pages/dashboard/brand/[slug]/design/[designSlug]` (file in legacy folder,
mounted only under `/b` — 02 §4.7) → `features/editor` Editor → Fabric adapter
(`features/editor/adapter`) → `useAutoSave`/`EditorChrome` (`features/editor/core`) →
**IDesignStorage = `LocalDesignStorage`**: keys `brandos:design:<brandId>:<designId>` +
`brandos:design-summary:<brandId>:<designId>` (`src/core/adapters/storage/
LocalDesignStorage.ts:13-18`). VERIFIED. **There is no Supabase designs table adapter
registered — designs are browser-local even for authenticated users** (`boot.ts:101`).
Public design route `/d/:brandSlug/:designSlug` therefore can only show what's in the
viewer's own localStorage — CONFLICTING EVIDENCE with the idea of a "public design
link" (not runtime-tested; UNKNOWN whether it has another data path).

Chronicle shell (`features/editor/shell/chronicle`) is part of gen C and powers the
guideline tab (§3).

---

## 5. Logo system

| Piece | Where | Wired to | Status |
|---|---|---|---|
| Logo Maker flow (6-screen wizard) | `features/logo-maker/flow` (routes.tsx: index·brief·generate·upload·editor/:id·variants/:id·brand-kit/:id·complete/:brandId) | public `/logo-maker/*`, unguarded | TRANSITIONAL carve-out (kept per CLAUDE.md; last real work 2026-04-17) |
| In-app Logo Maker page | `pages/dashboard/logo-maker` | `/dashboard/logo-maker` | TRANSITIONAL — "coexists until Phase 4 merges them" (App.tsx:116-117); CONFLICTING with CLAUDE.md's "don't re-add as workspace entry" |
| IdentityEngine | `features/logo-maker/identity-engine/{engine,types,index}.ts` | used only inside the flow (`flow/screens/variant-studio.tsx`) — VERIFIED grep | CURRENT within its carve-out |
| Logo presentation deck | `features/logo-presentation` (buildLogoSlides + store/dataStore/docsStore) | `/b/:slug/logo-presentation`; renders on **shared/editor EditorWorkspace** (gen-A deck engine) | LEGACY-CANDIDATE-ish (2026-04-16), routed |
| `logoOnBackground.ts` | `shared/brand/` | 5 importer files (VERIFIED count) | CURRENT shared helper |
| `recolorLogo.ts` | `features/brand-kit/data/` | 6 importer files | CURRENT shared helper (Studio kit) |
| Logo tools | `features/tools/logo-to-svg`, `/tools/logo-variant-generator`, variant-studio | public `/tools/*` + `/b/:slug/tools/*` | CURRENT (SEO funnel) |

Persistence: `useLogoMakerStore` (`flow/state/`) touches localStorage directly
(VERIFIED grep hit); the flow's "Save to Brand" goes through brand creation
(`complete/:brandId`).

---

## 6. Assets / DAM

| Piece | Trace | Persistence | Status |
|---|---|---|---|
| `features/dam` DamPage | `/a/:slug/folders` (+ `/b/:slug/folders` thin Studio wrapper) → reads **`useBrandStore`**, i.e. assets embedded in the brand object (`DamPage.tsx:11` imports; no `useService`/`SERVICE_KEYS` in file — VERIFIED) | brand JSON (localStorage / `brands` table) | CURRENT-alternate (2026-04-18) |
| `SupabaseAssetsService` (`assets` table) | registered under `SERVICE_KEYS.ASSETS` on auth (`boot.ts:96`) — **zero consumers outside core** (VERIFIED grep) | Supabase `assets` table exists | **ORPHAN SERVICE REGISTRATION** |
| `shared/upload/AssetSourcePopover` | used by `features/brand-board/panels/LogosPanel.tsx` + `features/editor/shell/v2/panels/InsertPanel.tsx` (VERIFIED) | — | CURRENT canonical picker (2 call sites) |
| `LocalUploadService` (`SERVICE_KEYS.UPLOAD`) | data-URL uploads stored inside brand (`core/adapters/upload/LocalUploadService.ts:4`) | localStorage | CURRENT — never swapped on auth |
| Onboarding-v4 brand assets | §1 — data URLs in brand JSON | localStorage / brands table | CURRENT |

---

## 7. Templates

### Generation tree

| Gen | Surface | Route | Status |
|---|---|---|---|
| A | brandkit `templateSeeds` + `TemplateGallery` | Classic launchpad `/a/:slug/design`, design-alt hero | CURRENT-alternate glue |
| B (G1) | `pages/dashboard/templates` (imports `features/guidelines`!) | `/dashboard/templates` | LEGACY-CANDIDATE (01 §2) |
| C (Phase 4) | `ITemplatesService` + TemplatesPanel | `/b/:slug/templates`; panel inside unified editor | CURRENT |
| D (v2 workspace) | `pages/workspace/Templates` | `/templates` | CURRENT |
| E (v5) | `features/templates/builder/TemplateBuilderPage` | `/templates/builder(/:templateId)` | CURRENT (linkage unverified — 01 §2) |
| E′ (v5) | `features/templates/v5/TemplatesMarketplacePage` | **never mounted** — dead lazy import (02 §3) | **ORPHAN** |
| ∥ | admin approval queue | `/admin/templates/queue` | CURRENT |

### Persistence

`SERVICE_KEYS.TEMPLATES` → `LocalTemplatesService`, keys `brandos:templates:categories`,
`brandos:templates:templates`, `brandos:templates:bootstrapped-v1`
(`core/adapters/templates/LocalTemplatesService.ts:26-28`). **Still localStorage even
authed** (`boot.ts:106`); the Supabase schema from migration 009 is defined but not
wired (the "1-line DI swap" never happened). VERIFIED. Plus `savedTemplatesStore`
(zustand persist, localStorage — `shared/store/savedTemplatesStore.ts:4-8`).
Domain logic: `convertToTemplate.ts`, `generateFromPrompt.ts`, `seeds/` in
`features/templates`. 8 external importer files.

---

## 8. Content / Social

| Piece | Trace | Persistence | Status |
|---|---|---|---|
| Content hub | `/b/:slug/content` + `/a/:slug/content` (dual-mounted, same legacy components — 02 §1.5) | — | CURRENT/TRANSITIONAL |
| Social media editor | `/b/:slug/social-media` → `pages/dashboard/brand/[slug]/social-media/index.tsx:12-16` → **`shared/editor` EditorWorkspace** + `features/social-media/buildSocialSlides` + `shared/presentation` store/styles | presentation store family | CURRENT (frozen 2026-04-16); built on the gen-A deck engine, NOT the unified editor |
| `features/social-media` | data (sizes), SocialFormatPicker, buildSocialSlides; 1 external importer (the page) | — | CURRENT-frozen |
| Bento | `features/bento` (BentoEditor, store, templates); routes `/b/:slug/bento`, `/tools/bento`, public `/brand/:slug/bento/:bentoId` | **`features/bento/store.ts` has no persist/localStorage/supabase hits (VERIFIED grep) — in-memory only.** The public bento URL reads `useBentoStore` (`pages/brand/[slug]/bento/[bentoId].tsx:15`) → a fresh visitor's store is empty. CONFLICTING EVIDENCE: public share route over session-only state. UNKNOWN whether templates.ts seeds enough to render. | CURRENT-frozen (2026-04-16), suspect share path |
| Content calendar | CLAUDE.md describes Calendar/Posts/Drafts tabs; not independently traced (content pages are dual-mount wrappers) | — | UNKNOWN detail, INFERRED present |

---

## 9. Decks / Presentations — four sibling engines

| Gen | Engine | Route | Persistence | Status |
|---|---|---|---|---|
| A | `shared/editor` EditorWorkspace + `shared/presentation` (v1 pages/store/styles) | embedded: social-media, logo-presentation, blocks; `shared/presentation/pages.tsx` | presentationsStore (persist) + `guideline_presentations` table (guidelines family) | FROZEN, load-bearing |
| B | `features/case-study-deck` | `/b/:slug/case-study(/edit/:idx)` | `brandos:case-study-deck` localStorage | CURRENT (last fix 2026-05-19); **also a library: 17 external importers = 15 pitch-deck files + 2 presentation-v2 files (VERIFIED grep)** |
| B′ | `features/pitch-deck` (built on case-study-deck primitives) | `/b/:slug/pitch-deck` | `brandos:pitch-deck`, `brandos:deck-ai-cache` | CURRENT-frozen (2026-05-05) |
| C | `shared/presentation/v2` (`DeckV2Page`, ai/, layouts/, templates/, store/) | `/b/:slug/deck-v2` | own store | UNKNOWN direction — newest deck engine, imports case-study-deck components |
| hub | `PresentationsPage` | `/b/:slug/presentations` | — | CURRENT hub |
| ∥ | logo-presentation (§5) | `/b/:slug/logo-presentation` | own stores | routed |

**Which is the go-forward engine is undecided in code** — all four are mounted and none
has been touched since 2026-05-19. UNKNOWN (same open question as 01 §12.4).

---

## 10. AI generation

### Client-side surfaces

| Surface | Module | Transport | Status |
|---|---|---|---|
| Editor AI prompt bar / apply-command | `features/editor/ai/applyCommand.ts` | POST to Supabase Edge Function `ai-apply-command` (`applyCommand.ts:14,55-58` — direct fetch to `SUPABASE_URL`, not `functions.invoke`) | CURRENT |
| Image generation | `features/editor/ai/generateImage.ts` → edge fn `ai-generate-image`; UI in `shell/v2/panels/GenerateWithAiSection,GeneratePanel`, `EditorAiPromptBar`, `design-alt/DesignHero` | edge fn | CURRENT |
| Reference upload | `shell/v2/panels/GeneratePanel.tsx` → edge fn `upload-ai-reference` (VERIFIED — only caller) | edge fn | CURRENT |
| Brand Assistant (v5) | `features/ai/v5` — `BrandAssistantProvider` mounted globally (App.tsx wrapper), `AssistantTrigger` in `dashboard/v5/WorkspaceHero` and `logo-presentation/LogoPresentationSetup` | **browser-side `@anthropic-ai/sdk`, model `claude-opus-4-6`, key-gated fallback to mockProvider** (`v5/providers/claudeProvider.ts:19,48,98`) | CURRENT but key-exposed |
| Onboarding description parse | `onboarding-v4/services/parseDescription.ts` | **direct browser call to api.anthropic.com, model `claude-opus-5`** | CURRENT, key-exposed |
| AI variants / brand memory blocks | `editor/ai/brandMemoryBlock.ts`, `brandResolutionBlock.ts`, `useAiAgent.ts`, `variants/aiReflow.ts` | composes context for apply-command | CURRENT |

### Edge functions (`supabase/functions/`)

- `ai-generate-image` — **multi-vendor real, NOT mock-only**: unset → openai (if key) →
  fal (if key) → pollinations free fallback; explicit `openai`/`fal`/`pollinations`/
  `cloudflare`/`huggingface`/`mock` (`index.ts:3-28`). VERIFIED (confirms 01 §11.1;
  CLAUDE.md stale).
- `ai-apply-command` — called by applyCommand. CURRENT.
- `upload-ai-reference` — called by GeneratePanel. CURRENT.
- **`generate-description` — zero client callers (VERIFIED grep src + landingpage). ORPHAN.**
- **`fetch-url-preview` — zero client callers (VERIFIED). ORPHAN** (only referenced by
  its own code + rate-limit migration 008).
- `finalize-onboarding-assets`, `cleanup-onboarding-scratch` — orphaned v3 pipeline (§1).
- Rate limiting: migration `008_ai_rate_limits.sql`.

### brand-vision (Python, `brand-vision/`)

FastAPI classifier on port 8300; SPA calls it **only** from
`onboarding-v4/services/brandVision.ts` via `VITE_BRAND_VISION_URL` (default
`http://localhost:8300`) — no proxy, no edge function, graceful degradation when absent.
VERIFIED. DEV-machine integration; production story UNKNOWN.

---

## 11. Auth & Workspace

- **Auth:** `features/auth` — `AuthModal`, `useAuth`, `ProtectedRoute`, `AuthProvider`.
  Dev bypass is double-gated: `DEV_AUTH_BYPASS = import.meta.env.DEV &&
  VITE_DEV_BYPASS_AUTH === 'true'` (`useAuth.ts:35-36`) and only shows a button
  (`AuthModal.tsx:228-238`); persists via `brandos:dev-bypass` key. **Cannot ship
  enabled in a prod build** (DEV flag is compile-time). VERIFIED — closes 01 §12.7.
- `sessionStore` — zustand, **no persist middleware** (VERIFIED: 0 grep hits) —
  session state is in-memory, Supabase SDK owns token persistence. INFERRED.
- `reconfigureForAuth` swaps BRANDS → Supabase + registers workspace/assets/comments/
  approvals/notifications/activity Supabase services (`boot.ts:89-113`); of those, only
  WORKSPACES has a live consumer (`shared/store/workspaceStore.ts` — VERIFIED grep);
  comments/approvals/notifications/activity Supabase adapters appear **registered but
  unconsumed by feature code** (features use their own local stores / adminService).
  CONFLICTING EVIDENCE with the migration `002_comments_approvals_activity_notifications`
  which built real tables.
- **Workspace:** `/dashboard` → `pages/workspace/Home` on `WorkspaceShellAlt` (exports a
  component *named* `WorkspaceShell` — naming trap, 01 §11.7). `workspaceStore` persists
  only current workspace id. G1 pages (`/dashboard/brands`, `/dashboard/templates`,
  `/dashboard/activity`, `/dashboard/features`, `/dashboard/admin/*`) — LEGACY-CANDIDATE
  per 01/02. `features/dashboard` has 13 external importers (hooks + v5 sections).
  Admin subtree `/admin/*` CURRENT (moderator-gated).

---

## 12. Misc small features — one-line status each

| Feature | Route-wired? | Imported by anything live? | Persistence | Class |
|---|---|---|---|---|
| `brand-board` | `/b/:slug/brand-board` (App.tsx:534) | self + uses AssetSourcePopover | localStorage (BrandBoardPage grep hit) | CURRENT-frozen (2026-05-09) |
| `mockup-studio` | public `/tools/mockup-studio` + `/b/:slug/tools/mockup-studio` | 2 external importers | `SERVICE_KEYS.MOCKUP_TEMPLATES` → Local (bundled catalogue) | CURRENT-frozen (2026-05-05) |
| `brand-memory` | no route | `editor/ai/useAiAgent`, `EditorGenerateVariantsButton`, `pages/b/[slug]/templates.tsx` (VERIFIED) | `SERVICE_KEYS.BRAND_MEMORY` → LocalBrandMemoryService (in-memory cache over designs) | CURRENT support layer |
| `brand-portal` | `/p/:slug` (App.tsx:163,728) | ~~route only~~ **coordinator correction (08):** nav-reachable — the live Studio tools hub sidebar has a Share/portal section (`features/tools-page/components/ToolsSidebar.tsx:26`) | UNKNOWN | CURRENT-frozen (2026-04-16) |
| `marketplace` | `/marketplace` (App.tsx:627) | route only; single file | — | UNKNOWN linkage (01 §2) |
| `collaboration` | no route | 1 importer: Classic BrandHomePage (`pages/dashboard/brand/[slug]/index.tsx`) | — | LEGACY-CANDIDATE (2026-04-10) |
| `approvals` | `/b/:slug/approvals` | ~~route only~~ **coordinator correction (08):** nav-reachable via Studio tools hub Approvals section (`ToolsSidebar.tsx:29`) | `approvalsStore` **localStorage** ("v1", `approvalsStore.ts:3-6`); SupabaseApprovalsService unconsumed | CURRENT-frozen; backend orphaned |
| `comments` | no route | `blocks`, `pages/.../assets`, `pages/.../guidelines` hub (VERIFIED) | `commentsStore` **localStorage** ("v1"); SupabaseCommentsService unconsumed; `shared/hooks/useRealtimeComments` has **zero consumers — ORPHAN** | TRANSITIONAL |
| `analytics` | `/b/:slug/analytics` | ~~route only~~ **coordinator correction (08):** nav-reachable via Studio tools hub Analytics section (`ToolsSidebar.tsx:28`); `computeMetrics.ts` local computation | none found | CURRENT-frozen (2026-04-16) |
| `brand-consistency` | `/a/:slug/studio` (ConsistencyStudioPage via SERVICE_KEYS.BRAND_CONSISTENCY) | 2 importers | `brandos:brand-consistency` localStorage | CURRENT-alternate |
| `tools` (`features/tools`) | public `/tools/*` + `/b/:slug/tools/*` studios (variant-studio, ui-color-system, typescale, logo-to-svg) | 13 external importers | tool-local | CURRENT |
| `tools-page` | `/b/:slug/tools` hub styling/components | 1 importer (the page, which builds the hub from **brand-kit** components — `pages/b/[slug]/tools.tsx:5`) | — | CURRENT |
| `tools-cosmos` | **does not exist** — no such folder (VERIFIED `ls src/features`) | — | — | CLAUDE.md stale reference |
| `blocks` | `/b/:slug/guidelines/blocks` | route only | comments localStorage | DEV-EXPERIMENT/UNKNOWN (frozen 2026-04-08) |
| `dev-features` | `/_dev/features`, `/dashboard/features` | features-registry | `brandos:features-seen` | DEV surface |

---

## Contradictions found (beyond those already logged in 00–02)

1. **"brand-kit-alt is bug-fix only / Classic only" is false in practice.**
   `src/pages/b/[slug]/settings.tsx` (Studio) imports `features/brand-kit-alt`, and the
   shared domain layer `features/brandkit` imports upward into the alt fork
   (`LogoFilesModule.tsx`, `SettingsModule.tsx`). The alt fork is load-bearing for
   Studio settings. VERIFIED.
2. **Two shells named `WorkspaceShell`** (`shared/layouts/WorkspaceShell.tsx` vs the
   export of `WorkspaceShellAlt.tsx`) — any doc or grep using the bare name conflates
   generations. VERIFIED. (~~Two `EditorWorkspace` components~~ — corrected: single
   implementation + re-export shim, see §Guidelines above.)
3. **Supabase backend generation lags the client by one architecture.** Tables/functions
   exist for onboarding-v3 scratch assets, comments, approvals, activity, notifications,
   templates (migration 009), assets — but the live client persists designs, templates,
   comments, approvals, decks, uploads in **localStorage**, and onboarding-v4 embeds
   assets as data URLs. Only `brands`, `guideline_presentations`, workspaces, billing,
   admin flows demonstrably use Supabase from feature code. VERIFIED per-service above.
4. **Client-side Anthropic key exposure is current, not legacy.** The newest feature
   (onboarding-v4 `parseDescription.ts`) and the v5 Brand Assistant
   (`claudeProvider.ts`) both call Anthropic from the browser with `VITE_` keys, while
   CLAUDE.md claims the proxy migration is "paused at Step 1 — MUST complete before
   public launch". The frontier is widening the exposure. VERIFIED.
5. **Four orphaned edge functions** (`generate-description`, `fetch-url-preview`,
   `finalize-onboarding-assets`, `cleanup-onboarding-scratch`) and **one orphaned
   Supabase adapter family** (assets/comments/approvals/notifications/activity —
   registered on auth, unconsumed except workspaces). VERIFIED greps.
6. **Public bento share route over an in-memory store** (`/brand/:slug/bento/:bentoId`
   reads `useBentoStore`, which has no persistence) — the share link appears to work
   only within the creator's session. CONFLICTING EVIDENCE (not runtime-tested).
7. **Public design route vs local-only design storage** — `/d/:brandSlug/:designSlug`
   is mounted, but DESIGN_STORAGE is localStorage even when authed. Same suspect
   pattern as #6. UNKNOWN (second data path not ruled out).
8. **CLAUDE.md's `features/tools-cosmos` never materialized** — no such folder; the
   Studio tools hub is `pages/b/[slug]/tools.tsx` composed from `features/brand-kit`
   components + `features/tools-page` styling. VERIFIED.

## Open questions

1. Which deck engine (case-study-deck / pitch-deck / presentation-v2 / shared v1) is
   go-forward? All four mounted, all frozen since 2026-05-19.
2. Is the Supabase persistence for designs/templates/comments/approvals still planned
   (the "1-line DI swap" comments), or has the localStorage-first posture become the
   product decision? The 2026-07/08 frontier (onboarding-v4) doubled down on
   localStorage.
3. How is brand-vision meant to reach production users — bundled service, hosted
   endpoint via `VITE_BRAND_VISION_URL`, or dev-only tooling? Currently silently
   disabled outside a dev machine.
4. Do the public share surfaces (`/d/...`, `/brand/:slug/bento/:bentoId`) actually work
   cross-browser? Needs a runtime test; static trace says no for bento.
5. Are the 4 orphaned edge functions deployed in prod (cost/attack surface), and should
   migration-007 scratch-bucket RLS be retired with them?
6. `features/blocks`, `marketplace`, `brand-portal`, `analytics`, `approvals` are
   routed but have no discovered inbound navigation — keep, link, or retire?
