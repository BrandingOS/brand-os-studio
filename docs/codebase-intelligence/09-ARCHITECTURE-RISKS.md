# 09 — Architecture & Modularity Risks

> Agent: B4-risks · Date: 2026-08-08 · Branch: `new-ui` @ `46ffb41` · READ-ONLY audit.
> Evidence base: audits 00–08 (cited, not re-derived) + new greps/measurements run for this pass
> (dependency direction, shared/ sizing, LOC, madge, store census, lint/CI/test reality).
> Tags: **VERIFIED** (path:line or reproducible command) / **INFERRED** / **UNKNOWN**.
> Ranks: **P0** correctness/security/data · **P1** major architectural debt · **P2** scalability/maintainability · **P3** cleanup/DX.
> Observations only; each row carries a one-line direction note, no redesigns.

---

## 1. Findings table (P0 first)

| id | finding | evidence | rank | blast radius | direction note |
|---|---|---|---|---|---|
| R-01 | **Authed persistence is narrower than guest persistence.** `SupabaseBrandsService.update` whitelists 13 columns and silently drops `assets`, `neutrals`, `typography` (incl. uploaded font bytes), `accentColor`, `typescale`, `colorSystem`; `mapFromDatabase` hardcodes `assets: []`. The "canonical" v3 brand is re-derived on every authed read from `guidelines` JSONB — the de-facto persisted brand — producing a stale-color/typography loop after edits. | 05 §1.2–1.4 VERIFIED (`brands.supabase.ts:126-140,183`; `migrateSchema.ts:112-127,375-390`); 04 §4 | **P0** | Every authenticated user, every brand edit surface (onboarding-v4, Setup, Identity, editor tools, DAM metadata) | Either widen the schema (columns or JSONB catch-all) or make the store reject patches the active adapter can't hold — one truth, not two |
| R-02 | **Designs, templates, uploads stay localStorage even when authenticated.** `reconfigureForAuth(true)` re-registers `LocalDesignStorage`/`LocalUploadService`/`LocalTemplatesService`; 5 of 7 authed Supabase adapters (ASSETS/COMMENTS/APPROVALS/NOTIFICATIONS/ACTIVITY) have zero consumers. Public routes `/d/:brandSlug/:designSlug` and community templates are structurally broken cross-device; DAM uploads orphan storage objects (bytes land in bucket, metadata dropped by R-01). | 04 §0,5,6 VERIFIED (`boot.ts:93-102`); 05 §8,9; 08 §B,E | **P0** | All authed users' designs, variants, Chronicle guidelines, DAM, community-template flow | Decide the persistence posture per service key explicitly; the DI container already supports the swap — the registrations are the one-line change |
| R-03 | **Anonymous onboarding output is destroyed on first interactive login.** `SIGNED_IN` handler deletes `brandos:brands` (`useAuth.ts:296`) before `migrateLocalStorageToSupabase()` (`:307`) reads exactly that key (`localStorage-migration.ts:46`). No `/claim` path exists for onboarding brands. | 04 §3 VERIFIED; 06 §4 confirms | **P0** | Every guest → signup conversion through the live funnel | Reorder (migrate-then-wipe) or guard the funnel; also decide the write-only comments/approvals/notifications migration writes (08 §E) |
| R-04 | **Anthropic API keys ship in the client bundle from 6 call sites, 3 model IDs** — including the newest code (`onboarding-v4/services/parseDescription.ts:301` with `anthropic-dangerous-direct-browser-access`). The safe Edge-Function pattern coexists in-repo (×3) and new features keep choosing the unsafe one. | 07 Family 12 VERIFIED; 04 §3 | **P0** | Key theft/abuse; pre-launch blocker CLAUDE.md has flagged since ~April | One `ai-proxy` Edge Function chokepoint; it is simultaneously the top dedup win (07 consolidation #1) |
| R-05 | **RLS holes.** (a) `profiles_select_by_member USING (true)` — every authed user reads every profile (emails, suspension_reason, admin_notes); (b) `wm_insert_admin` escape hatch — any user can insert themselves as `owner` member of any workspace whose UUID they know (001:548-555); (c) `notifications` INSERT `WITH CHECK (true)`; (d) `onboarding-scratch` select/delete with no ownership predicate; (e) era-1 demo-brand SELECT+UPDATE-for-all policies never dropped (live status UNKNOWN — possibly different project). | 06 §3.1 VERIFIED (repo SQL; live DB unqueried) | **P0** | Cross-tenant read (a), privilege escalation (b), spam/DoS (c) | (b) is the standout: workspace membership is the root of the whole RLS model |
| R-06 | **Service-role Edge Function without auth:** `finalize-onboarding-assets` has no auth check and no ownership validation of `brandId`/`sessionId`, CORS-open — anyone can move scratch files into any brand's asset folder. (Function is code-side dead per 08 §A but deployment status UNKNOWN.) | 06 §3.3 VERIFIED (`finalize-onboarding-assets/index.ts:7-27`) | **P0** | Any brand's asset folder, if deployed | Undeploy check first; it's already classified dead code-side |
| R-07 | **The type gate is a no-op twice over.** `npm run typecheck` = `tsc --noEmit` against the solution-style root tsconfig (`files: []`) → checks 0 files; **CI runs the identical no-op** (`.github/workflows/ci.yml:71` `npx tsc --noEmit`); `vite build` doesn't typecheck. Real project has **324 type errors** including live mapper bugs (dead-field reads in `brandToMockBrand`). `strictNullChecks`/`noImplicitAny` off. | 05 §0 VERIFIED; ci.yml + tsconfig.json read this pass (VERIFIED) | **P0** (enabler — every silent drift in 05 was invisible because of this) | All of src; CI green means nothing about types | Point script + CI at `tsc -p tsconfig.app.json --noEmit`; burn down 324 errors before enabling |
| R-08 | **DI container theater / dual-backend semantic split.** Container exists but: 5 orphaned authed adapters (R-02); live features run on 26 zustand-persist stores + module singletons instead; `LocalBrandsService.update` spreads the whole patch while Supabase whitelists (same interface, different data contract); `activityService` privately re-implements the Local/Supabase swap the container was built for; DAM bypasses DI via the `storageService` singleton. | 04 §0,9 VERIFIED; this pass: singletons `storage.supabase.ts:115`, `brands.local.ts:124` | **P1** | Every "swap to Supabase later" assumption in the codebase | The container isn't wrong — it's unenforced; either route features through it or stop paying its ceremony cost |
| R-09 | **Dependency direction is a fiction.** CLAUDE.md: "Never import upward. Core doesn't import from Features." Reality (VERIFIED this pass): **21 shared/→features imports** (layouts→dashboard/brand, `shared/presentation`→case-study-deck/pitch-deck/editor/logo-presentation, `exportService`→guidelines, ArtworkPicker→bento); **core/→features in 16+ files including service *contracts*** (`core/services/ITemplatesService.ts:13`, `IBrandMemoryService.ts:16-17`, `IFormatPresetsService.ts:13` import feature types — the contract layer depends on the features it abstracts); 168 cross-feature import statements over 41 directed edges. | grep runs this pass (VERIFIED); CLAUDE.md layer diagram | **P1** | Any refactor/deletion plan; every "features are modules" assumption | No fix now — but add measurement (eslint boundary rule / dependency-cruiser) before any consolidation pass, or the graph regrows |
| R-10 | **The Studio flagship is built on the layers the docs call legacy.** Cross-feature fan-out champion is `brand-kit` (56 imports: →`brandkit` 36, →`setup` 20); domain layer `brandkit` imports **upward** into `brand-kit-alt` (×2: `LogoFilesModule.tsx:38`, `SettingsModule.tsx:13`); `brand-kit-alt` ("Classic, bug-fix only" per CLAUDE.md) is load-bearing in Studio (`pages/b/[slug]/settings.tsx:12`, brandGuidePdf export). | this pass edge counts (VERIFIED); 08 §D | **P1** | Studio brand-kit + settings + guides export; blocks any brandkit UI/domain split | 08 §E's "split UI from domain first" is the prerequisite for everything here |
| R-11 | **MockBrand round-trip:** the "READ-ONLY view" shape (`brandToMockBrand.ts:24-27`) round-trips through `mockBrandToPatch` from the hottest UI (`pages/b/[slug]/setup.tsx:39`), via a mapper with 5 dead-field reads (never reads the v3 logo system at all); `SetupPage` defaults to the hardcoded Nuworld `mockBrand` when no brand arrives (`SetupPage.tsx:206`). | 05 §2.3 VERIFIED; SetupPage.tsx:206 read this pass | **P1** | Setup + Studio brand-kit (the current product frontier) | The converter pair is the highest-value place to spend the first type-error fixes |
| R-12 | **Duplicated kernels:** 9 slug impls in 2 incompatible dialects (`isValidSlug` rejects the hyphen style half the producers emit); ~15 contrast impls on 3 luminance formulas (2 numerically wrong for WCAG); 3 color engines (~30 more private redefinitions); 4+ font catalogs / ~4 loaders / 2 weight parsers written the same week; `BrandKit` ×2 and `BrandContext` ×2 name collisions; 4 brand converters each re-solving normalization. | 07 headline table + Families 1,4,10,11 VERIFIED | **P1** | Cross-surface inconsistency (same pair passes contrast on one surface, fails on another — the documented SKAM bug class) | 07's ranked top-10 list stands; #1 (AI client) and #2 (contrast) are also P0-adjacent |
| R-13 | **Two disjoint admin truths:** `user_roles.role` (4-tier, RLS-integrated, gates `/admin`) vs `profiles.is_admin` (boolean, no writer in-app, gates templates queue; its RLS policies don't even exist for the queue's writes). Plus `checkPlatformRole` silently demotes to `'user'` on any error, and 001 dropped `UNIQUE(user_id,role)` so a duplicate row breaks `.maybeSingle()`. | 05 §10, 06 §4-5 VERIFIED | **P1** | All admin surfaces; any future RBAC work | One system must win before public launch (06 open-Q2) |
| R-14 | **Two brand-read hooks:** `useBrandBySlug` (30 consumers, hand-rolled 5-field staleness diff, side-effect `setCurrent`) vs `useBrandFromSlug` (8 consumers, store-backed, flash-fixed). Two components on one page can render different brand snapshots. | 07 Family 7a VERIFIED | **P1** | 30 files; stale-render bug class | 07 consolidation #3 |
| R-15 | **`shared/presentation` is a 15,592-LOC feature living in shared/** (65 files — a third of shared/'s 46.9k LOC together with frozen `shared/editor` at 6,290), importing from 4 features (inversion, R-09) and representing 1 of 4 mounted deck engines, none deletable until the go-forward engine decision (03/07/08 open question). | this pass sizing (VERIFIED); 07 F5/F6; 08 §C | **P1** | Deck/presentation surface, export pipeline; blocks shared/ cleanup | The deck-engine decision is the single unblocking call; everything else queues behind it |
| R-16 | **shared/ as dumping ground:** 46,929 LOC total; feature-specific content beyond R-15 (`shared/brand-settings`, `shared/artwork`→bento, `shared/templates` renderers); dead files inside (`shared/ui/Badge` 0 consumers, `shared/routing/FirstBrandRedirect`, `shared/hooks/{useDataSync,useRealtimeComments}` — all confirmed dead in 08 §A). | this pass sizing (VERIFIED); 07 F9; 08 §A | **P2** | Discoverability, ownership ambiguity ("shared" = "nobody's") | Adopt a rule: shared/ entries need ≥2 feature consumers; evict the single-feature residents |
| R-17 | **33 files > 800 LOC** (excl. test screenshots). God components: `SetupBoard.tsx` 2,283; `UploadsReviewPanel.tsx` 2,180; `EditorFloatingToolbar.tsx` 1,884; `BrandKitCardEditor.tsx` 1,815; `SetupPage.tsx` 1,442; `BrandKitCosmosPage.tsx` 1,407; `EditorWorkspace.tsx` 1,107 (off-limits); oddity: **`pages/NotFound.tsx` 1,017 LOC**. (Data files `flaticonNames.ts` 3,557 / `googleFonts.ts` 1,933 are benign.) | `find | xargs wc -l` this pass (VERIFIED) | **P2** | Change velocity + review quality on the hottest surfaces (setup/onboarding/brand-kit are 4 of the top 8) | The frontier features are the biggest files — worth a split budget per feature, not a bulk rewrite |
| R-18 | **Global mutable state sprawl:** 35 zustand stores (26 with persist middleware), each hand-rolling its key/versioning; module-level singletons bypassing DI (`storageService`, `brandsService`, `onboardingService`, `container` itself); per-feature in-memory caches (deck `deck-ai-cache`, logo-maker identity cache — 04 §9). Session-only overlays presented as saved state (brand-kit color/icon adds, card-editor toast-only save — 04 §4). | this pass census (VERIFIED); 07 F5 | **P2** | Any future SSR/multi-tab/collab work; the Supabase swap cost multiplies per store | 07's `createPersistedStore(key, schema)` factory note; blocked partly by deck decision |
| R-19 | **10 circular dependencies** (madge, 1,428 files) — all intra-feature/intra-folder (brand-kit sidebar↔sections, EditorWorkspace↔ExportModal/SlideNav, ai/v5 provider↔drawer, onboarding assetUpload↔brandVision, presentation templates↔slides). No cross-feature cycles found. | `npx madge --circular src` this pass (VERIFIED) | **P2** | Low — mostly type/const back-references; bundler tolerates them | Cheap to break when touching those files; not worth a dedicated pass |
| R-20 | **264 hard-coded `` `/b/${` `` URL template strings** (+43 `/a/${`), no `buildBrandUrl` helper; `getBrandHomeUrl` has 1 real consumer + 2 inline re-implementations; dead route-metadata registry (`core/modules/`) advertises unmounted routes. | 07 Family 8; 08 §A VERIFIED | **P2** | Any namespace/IA change costs a 60-file sweep | 07 consolidation #4 — introduce the helper first, sweep incrementally |
| R-21 | **Demo/seed data fused into production flows:** 5 seed brands merged into every user's list in BOTH services (`brands.supabase.ts:38-41` — even authed); seed-slug collisions win against user brands; seed edits go to a third persistence channel (`seedBrandOverrides` localStorage, device-local even authed); seed list duplicated ×3 (one stale, missing uniex); seeds violate their own type (uniex 22 tsc errors); `Brands/` binary folder committed; SetupPage's Nuworld mock as fallback UI (R-11). | 04 §2; 05 §1.1 R7; this pass grep (VERIFIED) | **P2** | Every user's brand list; onboarding QA realism; repo size | Seeds need a "demo mode" boundary, not read-time merging in the data layer |
| R-22 | **Persistence in UI components:** 22 non-store/service `.tsx` files call `localStorage.` directly (worst: `PitchDeckPage.tsx` ×11 — its own persistence layer; `SetUpScreen.tsx`, `OptimizedDesignEditor.tsx`, both WorkspaceShells); 4 components call `supabase.` directly (auth surfaces defensible; `AdminPanel.tsx`, `GeneratePanel.tsx` less so). | this pass grep (VERIFIED) | **P2** | Each is a mini-backend invisible to the service layer | Fold into stores/services opportunistically; PitchDeckPage is the outlier worth doing deliberately |
| R-23 | **The one boundary rule that exists is drifting:** eslint's fabric no-restricted-imports rule (good!) carries an ignores list with 3 already-deleted paths (`design-ai/**`, `brandkit/components/editor/**`, `FabricRenderer.ts`) marked "MUST shrink, never grow". | eslint.config.js:60-100 read this pass (VERIFIED); 08 §A deletions | **P3** | Doc/ratchet credibility | Trim the stale entries; it's the template for the missing upward-import rules (R-09) |
| R-24 | **CI shape vs reality:** triggers on `main` only while the documented convention is dev-first (currently moot — all branches equal, 00 §7); test job runs `npx vitest run` including the browser project with **no `playwright install` step** → chromium availability in CI UNKNOWN (job likely red or browser project erroring); type-check step is the R-07 no-op; lint passes on warnings (most rules downgraded, see §Tooling). | ci.yml read this pass (VERIFIED); outcome UNKNOWN (runs not inspected) | **P3** | CI green ≠ quality signal | Check the Actions history once; add `npx playwright install chromium --with-deps` or scope CI to the unit project |
| R-25 | **Dead weight inflating every analysis:** App.tsx dead lazy chains (DashboardRoute+v5, LearnPage, StandaloneEditorPage, TemplatesMarketplacePage), dead `core/modules/` registry, ungated year-old admin pages (`pages/dashboard/admin/*` — also a small security win to delete), 32 root PNGs, orphan Edge Functions. | 08 §A,B VERIFIED | **P3** | Cognitive load; small attack surface (admin pages) | 08's delete list is ready pending owner sign-off |

---

## 2. Theme detail

### 2.1 Persistence architecture (R-01, R-02, R-03, R-08)

The deepest architectural risk is not any single bug but the **three-way persistence split**
with no arbiter: (1) Supabase columns + `guidelines` JSONB for authed brands (lossy,
whitelisted), (2) localStorage whole-object JSON for guests (lossless), (3) the
`seedBrandOverrides` diff layer for seed brands (device-local always). One interface
(`IBrandsService`) hides three data contracts. Everything in 05's CRITICAL rows follows from
this: the UI accepts writes the active backend can't hold, and the "canonical" v3 layer is a
per-load derivation from a mirror (`guidelines` JSONB) that only some writers maintain.
VERIFIED throughout 04/05. Direction: the interface needs a capability contract (or one
backend needs to win) before any feature keeps building on `brandStore.update`.

### 2.2 Security boundary (R-04, R-05, R-06, R-13)

Client-side role gates are fine **only if** RLS is the real enforcement — and 06 shows RLS has
an escalation path (`wm_insert_admin`), a tenant-read hole (`profiles USING(true)`), and two
disjoint admin systems. Meanwhile the browser holds Anthropic keys (6 sites) and the repo
remote embeds a GitHub token (00 §8). None of this is new work to discover — it is the same
pre-launch blocker CLAUDE.md has carried since April, except the frontier (onboarding-v4)
added a new unsafe call site rather than consuming the safe pattern that already exists
in-repo. INFERRED: without a lint/CI guard, the proxy migration will keep losing to feature
velocity.

### 2.3 Dependency direction & modularity (R-09, R-10, R-14, R-15)

New measurements this pass (all VERIFIED by grep/script):

- **Cross-feature edges:** 168 import statements, 41 directed edges. Worst: `brand-kit → brandkit` (36),
  `pitch-deck → case-study-deck` (24 — one feature is another's library), `brand-kit → setup` (20),
  `templates → editor` (10), `onboarding-v4 → setup` (8). Fan-in kings: `brandkit` (43), `setup` (32),
  `editor` (27) — two of the three most-depended-on "features" are actually undeclared domain layers.
- **shared → features (inversion): 21 imports in 15 files**, concentrated in `shared/presentation`
  (deck engine), `shared/layouts` (imports `features/dashboard` + `features/brand` shells), and
  `shared/services/exportService` (guidelines types).
- **core → features: 16+ files**, including the service **contract** files themselves
  (`ITemplatesService`, `IBrandMemoryService`, `IFormatPresetsService`) — the DI layer's types
  are downstream of the features they're meant to abstract. Boot-time implementation imports
  are the documented exception; contract-level type imports are not.
- **pages → adapters directly:** clean (1 test file only).
- **Framework contamination:** clean — zero `react` imports in `src/core` (non-test),
  `src/shared/services`, `src/shared/color`, or the brandkit engine. The domain/service layers
  are genuinely framework-free. (Positive finding.)
- **Fabric leakage:** contained — outside `features/editor`, only the documented
  `logo-maker/flow` carve-out (8 files, in the eslint ignores ratchet). The adapter boundary
  rule works. (Positive finding.)

### 2.4 Size & state (R-16, R-17, R-18, R-19)

`src/shared` = 46,929 LOC across 22 subfolders; the top two entries (`presentation` + `editor`,
21,882 LOC combined) are frozen or decision-blocked feature code, not shared primitives. 33
source files exceed 800 LOC and the four hottest product surfaces (setup, onboarding-v4
review, editor toolbar, brand-kit editor) own the top of the list — the newest code is the
largest. 35 zustand stores (26 persisted) plus 4 module singletons form the real state layer;
the DI container governs only a minority of runtime data access. Madge finds 10 cycles, all
intra-folder — the macro-graph is acyclic; the problem is direction, not cycles.

---

## 3. Tooling / guardrail gaps

| Gate | Claimed | Actual | Tag |
|---|---|---|---|
| TypeScript | `npm run typecheck` per CLAUDE.md | No-op (root tsconfig `files: []`); real check = 324 errors; `strictNullChecks`/`noImplicitAny` off; `skipLibCheck` on | VERIFIED (05 §0 + tsconfig read) |
| CI type step | "Type check" job step | Same no-op `npx tsc --noEmit` (ci.yml:71-72); `vite build` (esbuild) does not typecheck → **no type gate exists anywhere** | VERIFIED |
| Lint | `eslint .` in CI | Recommended sets, but: `no-unused-vars` **off**, `no-explicit-any` **off**, and — notably — **`react-hooks/rules-of-hooks: "warn"`** (a correctness rule); eslint passes with warnings, so most rules can't fail CI | VERIFIED (eslint.config.js:26-39) |
| Boundary enforcement | CLAUDE.md layer diagram ("never import upward") | **One** boundary rule exists (fabric-only, R-23). No rule prevents shared→features, core→features, feature→feature, or `@/integrations/supabase/client` imports outside services. No dependency-cruiser/madge in CI | VERIFIED |
| Tests | 3-layer doctrine, "one gate" | 149 test files (23 browser) — the projects config matches the doctrine (vite.config.ts:65-96, VERIFIED). CI runs `npx vitest run` but has **no playwright browser install step**; browser-project status in CI UNKNOWN. No coverage threshold configured | VERIFIED config / UNKNOWN CI outcome |
| CI triggers | dev-first git convention | `push: [main]` + `pull_request: [main]` only — day-to-day pushes to `dev`/`new-ui`/`ui` never ran CI (currently moot since all branches point at the same commit) | VERIFIED |
| Ops | — | `supabase-keepalive.yml` exists because a **previous Supabase project was lost unrecoverably** to free-tier auto-pause (workflow header, project `iyrqpsrnjoglrxhpzjgq`) — the platform layer has a data-loss precedent and currently runs on a 3-day external ping | VERIFIED (workflow comments) |

Net: **no gate in the repo can currently fail on a type error, an upward import, an unused
variable, a hook-order bug, or (probably) a browser-test regression.** The only hard CI
failures available are lint *errors* (few rules left at error), unit-test failures, and build
breaks.

---

## 4. Contradictions found (this pass's increments)

1. **CLAUDE.md layer rule vs reality** — "Core doesn't import from Features (except service
   implementations registered at boot)": the *contract* files in `core/services/` import
   feature types (R-09). The exception clause is being read as a general license.
2. **CLAUDE.md "brand-kit-alt: bug fixes only, Classic"** vs Studio's own settings page and the
   PDF export importing it (R-10; corroborates 08 §D).
3. **CLAUDE.md test doctrine ("all three layers green before done")** vs a CI that has no
   working type gate, warn-only lint, and an un-provisioned browser test project (R-07, R-24;
   extends 05 contradiction #4).
4. **eslint's own ratchet comment ("this list MUST shrink, never grow")** vs three entries
   pointing at files deleted months ago — the ratchet isn't being tended (R-23).
5. **`vite.config.ts` browser-project comment** ("catches the bug class that costs the most")
   vs CI not installing the browser it needs — the most-valued layer is the least-verified
   in automation (UNKNOWN pending Actions-history check).

## 5. Open questions

1. Has the CI `test` job ever passed with the browser project included? (One look at the
   GitHub Actions history answers R-24; not possible repo-only.)
2. Is there any appetite for boundary tooling (eslint `no-restricted-imports` zones or
   dependency-cruiser)? Every P1 consolidation in 07 will regress without a ratchet — the
   fabric rule proves the pattern works in this repo.
3. Which comes first: the deck-engine decision (unblocks R-15/R-18 and ~22k LOC of shared/)
   or the brandkit UI/domain split (unblocks R-10)? They are independent; both are blocking
   large cleanups.
4. `pages/NotFound.tsx` at 1,017 LOC — intentional easter-egg/marketing page or accidental
   dumping ground? (Not traced.)
5. Should the 324-error burn-down be sequenced converter-first (`brandToMockBrand`,
   `uniex.ts`, `EditorWorkspace`) to de-risk R-11 before enabling the CI gate, or gated-first
   with a baseline-ignore file? (Owner call; both are viable.)
