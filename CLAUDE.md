# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BrandOS — Architecture Guide

## Build & Dev Commands

### Main app (project root)
```bash
npm run dev          # Dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint (0 errors expected; ~226 pre-existing warnings)
npm run typecheck    # tsc --noEmit
npm run typecheck:ci # Ratchet — fails only on NEW type errors (baseline: 321 pre-existing)
npm run test         # Vitest (single run)
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Vitest with V8 coverage
```

Type-error policy: `strictNullChecks`/`noImplicitAny` are off and the repo
carries 321 baselined type errors. The gate is `typecheck:ci` — never add a
NEW error; don't try to fix the baseline as a side quest.

Known test-environment facts (verified 2026-08-10):
- The browser (Playwright) Vitest project needs `npx playwright install`
  once per machine — otherwise the whole `npm run test` run reports an
  unhandled "Executable doesn't exist" error. Use
  `npx vitest run --project unit` to run just the jsdom projects.
- One unit test fails on a clean checkout:
  `src/features/brand-kit/data/recolorLogo.test.ts` ("keeps a curated brand
  palette intact") — pre-existing, not caused by your change unless you
  touched `logoCombosFor`.

### Landing page (`landingpage/`)
```bash
cd landingpage
npm run dev          # Dev server (separate Vite instance)
npm run build        # Production build → dist/
npm run type-check   # tsc --noEmit
```

The landing page is a **completely separate Vite project** with its own `package.json`, `node_modules`, and Tailwind config. It shares no dependencies with the main app. Run `npm install` separately in each directory.

### Test configuration
Tests use Vitest with jsdom. Setup file: `src/test/setup.ts`. Test files: `src/**/*.{test,spec}.{ts,tsx}`. Run a single test file: `npx vitest run src/path/to/file.test.ts`.

## Two Projects in One Repo

| | Main App (root) | Landing Page (`landingpage/`) |
|---|---|---|
| Purpose | Full BrandOS SPA | Public marketing site with early-access form |
| Stack | Vite + React + React Router + Zustand + Supabase + Fabric.js | Vite + React (no router) + framer-motion + Supabase |
| Port | 8080 | auto-assigned (typically 5173/5174) |
| Deploy target | Cloudflare Pages (root dir: `.`) | Cloudflare Pages (root dir: `landingpage`) |
| Path alias | `@/` → `./src/` | `@/` → `./src/` |

There are also legacy landing page versions at `src/domains/landing` (v1) and `src/features/landing-v2` (v2) — these are dead code kept for reference. The live landing page is `landingpage/`.

> **Read this first if you're planning UX or IA work**: `docs/ux-redesign/`
> contains the canonical IA, page templates, user flows, and the
> append-only execution log. The five-section brand IA, the page-shell
> rules, and the editor primitives all live there. Do not start a UX task
> against the assumption of the legacy structure.

## UI Architecture (Phase A — 2026-05-05)

BrandOS has **two brand-scoped UI experiences**:

- **Studio** (canonical): `/b/:slug/...`. The active development surface.
  All new features land here. Cosmos top-segmented chrome via
  `WorkspaceShell` (formerly `CosmosWorkspaceShell`). Five sections at
  Day 1: Setup · Brand Kit · Guideline · Design · Tools.
- **Classic** (alternate): `/a/:slug/...`. Maintained for users who
  prefer the legacy 7-section IA (Overview · Identity · Templates ·
  Design · Content · Folders · Share). Bug fixes only — no new feature
  work. Uses `BrandRouteLayout` with `AppRail` + `InnerNavRail`.

**Path harmonization (Commit 6):** `<ns>/:slug/<X>` means the same
feature in either namespace. Studio canonical names win — Classic
renamed `kit` → `brand-kit`, `guidelines` → `guideline`, and bare
`/a/:slug` → `/a/:slug/setup`. Old paths 302-redirect.

**Per-user preference toggle:** Settings → Account → Interface. Stored
in `useUiPreferenceStore` (zustand + persist, key
`brandos:ui-preference`). Default for new + existing users: `studio`.
Brand-entry sites (`/dashboard/brands`, `pages/workspace/Home.tsx`,
`AppRail` brand switcher) consult `getBrandHomeUrl(slug)` from
`shared/hooks/useUiPreference.ts` so the user lands directly in their
preferred namespace's canonical home with no redirect hop.

**Studio fallback for unmigrated sections:** `/b/:slug/<X>` where X is
not in the Studio migrated set redirects to `/a/:slug/<X>` via
`StudioToClassicFallback`. Day 1 migrated set:
`['setup','brand-kit','guideline','design','tools']`. Phase B removes
`/a` entries one-by-one as features port to a Studio shell.

**Folder convention:**
- Canonical UI components live without a suffix: `features/brand-kit/`,
  `features/design-alt/` (named alt because the launchpad is the
  working canonical at `/b/:slug/design`, the cosmos design page is the
  alternate), `features/guideline/`.
- Alternate UI components live with `-alt` suffix:
  `features/brand-kit-alt/`, `shared/layouts/WorkspaceShellAlt.tsx`.
- Shared business logic / services / schemas / DI live without UI
  affiliation: `features/brandkit/` (47 importers, the foundational
  domain layer for both UI shells), `features/tools/` (foundational
  tools backend; the brand-tools cosmos hub stays at
  `features/tools-cosmos/` until that namespace conflict is resolved
  in Phase B).
- `BrandSettingsV2Page` and `BrandKitV2Page` (legacy hub) live in
  `features/brand-kit-alt/` and are mounted at `/a/:slug/settings`
  and `/a/:slug/brand-kit` respectively.

**Defaulting agent behavior:** when asked to build a feature, default
to Studio (`/b/:slug/`) unless explicitly told otherwise. When asked
to fix a bug, identify which UI the bug is in (Studio or Classic) and
fix only that one — don't fix in both. The exception is `features/brandkit/`
(domain layer): bugs there affect both UIs and need fixing.

**Legacy `/dashboard/brand/:slug/*` URLs:** single catch-all 302 to
`/b/:slug/<same>`. Studio's fallback chain handles unmigrated sections
in a second hop.

## UX & IA — current structure (post-redesign)

BrandOS has **three scopes**: Workspace · Brand · Editor. Each scope has
exactly one sidebar and one shell. See `docs/ux-redesign/ARCHITECTURE.md`.

**Workspace sidebar** (`/dashboard`): Home · Brands · Templates · Learn · Settings.
Clicking a template on the workspace `/templates` page forces a brand chooser
(`src/features/brand/components/BrandChooserDialog.tsx`) — templates live inside
a brand. (Logo Maker is brand-scoped — saved into a brand via the LogoExportPanel
"Save to Brand" flow. Don't re-add it as a workspace entry.)

**Brand sidebar** (7 sections, per `ARCHITECTURE.md` §3 revised 2026-04):
Overview · Identity · Templates · Design · Content · Folders · Share.
The original five-section rule was loosened after Brand Board, Bento, Social
Media, AI Design, Content Calendar all shipped. Sub-navigation stays as
in-page `?tab=` tabs, NOT expanded sidebar groups. The live rail is
**`src/shared/layouts/AppRail.tsx`** — `BrandSidebar.tsx` in
`src/features/brand/components/` is dead code kept for reference, never rendered.

- **Identity** (`/b/:slug/identity`) tabs: Logo · Colors · Typography · Voice · Strategy
- **Templates** (`/b/:slug/templates`) tabs: All · Brand Board · Guidelines · Bento · Social · Print · Screen · Utility
- **Design** (`/b/:slug/design`) launchpad: Blank Canvas · AI Design · Recent
- **Content** (`/b/:slug/content`) tabs: Calendar · Posts · Drafts. Clicking a social format goes to `/b/:slug/social-media?platform=X&format=Y` which skips the old dark modal picker and opens the editor directly.
- **Folders** (`/b/:slug/folders`) tabs: Assets · Designs (DAM + saved canvas designs)
- **Share** (`/b/:slug/share`) tabs: Guidelines · Showcase · Exports (public link, logo deck, guidelines export)

**URL aliases**: both `/dashboard/brand/:slug/...` (legacy) and `/b/:slug/...` (short form)
work. The short form is preferred for new code; existing call sites may still use
either. Redirects: `/b/:slug/assets` → `/templates`, legacy `/kit` → `/templates`.

**Brand Board** (`/b/:slug/brand-board`) is the interactive brand-identity poster
editor. Before touching it, read `docs/brand-board/README.md` — it has the
scenario, control spec (every button mapped to store field + required preview
effect), and a manual test matrix. The right-side canvas is
`src/features/brand-board/preview/BrandBoardCanvas.tsx` and reads ONLY from CSS
custom properties (`--bb-primary`, `--bb-weight-heading`, `--bb-pad`, etc.) —
never hard-code a color/weight/spacing value there.

## Page-shell rules (from `src/shared/layouts/README.md`)

1. **There is one shell per scope.** Don't add a new layout file unless
   none of the existing shells can express your page.
2. **Layouts own page padding.** Pages must NOT redeclare
   `px-4 sm:px-6 lg:px-8` or `py-6/py-8` inside their content. They came
   from the layout.
3. **Pages override max-width via the layout's `maxWidth` prop**, never
   via inner `max-w-* mx-auto` wrappers.
4. **Topbar height is `h-14`** (workspace + brand) or `h-12` (editor).
   Don't introduce other heights.
5. **Use `<PageHeader>`** (`@/shared/ui/PageHeader`) for every page header.
   Don't roll your own `<div className="mb-8 flex items-center gap-4"><h1>...`.

## Editor primitives (from `src/features/editor/core/README.md`)

> **Read this for product strategy:** `docs/brandos-editor-vision.md`
> contains the canonical product vision for the unified editor + AI
> integration model. All editor work from Phase 3 onward must align
> with this vision. Refer to it before scoping any new editor feature.

- `EditorChrome` (`@/features/editor/core`) — canonical editor topbar.
  Use this in every editor.
- `useAutoSave` (same import) — debounced auto-save with normalized
  save-state machine. Pair with `EditorChrome`'s save indicator.
- **`EditorWorkspace` and `src/shared/services/export/vectorize/*` are
  off-limits** — tagged `stable/editable-export-v1`. Don't refactor
  through them. The editor unification works around them.

### Phase 4 — Content Universe (shipped 2026-05-04)

Phase 4 ships the BrandOS content universe in 4 sub-phases. Read
`docs/editor/PHASE_4_SPEC.md` for the source spec.

- **4.1 Templates Foundation** — `template_categories` + `templates`
  SQL schema (idempotent), `ITemplatesService` + `LocalTemplatesService`
  (Supabase swap is a 1-line DI change once migrations deploy), 94
  brand-bound seed templates across 11 categories, Templates panel
  with category chips + source/mood filters + search + grid + load-
  more, click-template → applyBrandToDocument → IDesignStorage →
  navigate to `/b/:slug/design/:newSlug`.
- **4.2 My Designs + Save as template** — top-chrome
  `EditorSaveAsTemplateButton` with inline popover (name +
  category + mood + visibility), `convertToTemplate(doc, kit)`
  that walks the doc and replaces literal hex/font matching the
  kit back into SlotRefs (so saved templates stay brand-agnostic),
  My Designs tab in TemplatesPanel reading `IDesignStorage.list
  Designs(brandId)` (now returns `DesignSummary[]` with thumbnails).
- **4.3 AI Generation Layer** — Mode 1 (zero-state generate)
  forward-pulled from Phase 3.5: `generateFromPrompt(agent, brand,
  prompt, contentType)` builds a blank scaffold + calls
  `applyCommand`, GenerateWithAi section in TemplatesPanel with
  prompt + content-type + Editable design / Image only radio,
  25 AI prompt presets distributed across categories (clicking a
  preset card prefills the generator), `ai-generate-image` Edge
  Function (MOCK ONLY per Q-decision — vendor swap is a
  1-function-body change once `AI_IMAGE_VENDOR` is configured).
- **4.4 Community Templates** — admin approval queue at
  `/admin/templates/queue` with Approve / Reject (with reason);
  `useIsAdmin()` hook reads `profiles.is_admin` (added in 4.1
  migration); save-as-template flow (4.2) already supports
  `visibility: 'public'` → `uploadStatus: 'pending'` for the
  community submission path; community filter in the Templates
  panel uses the existing source filter ("Community" maps to
  `user_uploaded`); premium foundations (`is_premium`,
  `required_plan`) ship as schema fields with no UI yet.

### Phase 3 + 3.5 carve-outs (post-3.5 reduction — 2 remain)

Phase 0 catalogued 6 legacy paths flagged "must shrink, never grow."
Successive reductions:
- **Step 9 (2026-05-01):** 6 → 4. Deleted `FabricRenderer.ts` (dead,
  zero callers) and migrated `brandkit/components/editor/` onto the
  unified `Editor` (route at `/b/:slug/design/:designSlug` +
  `templateSeeds.ts`).
- **Phase 3.5 commit 9 (2026-05-01):** 4 → 2. Deleted
  `src/features/design-ai/` and `src/features/ai-design/` source
  folders + the `dashboard/brand/[slug]/design-ai.tsx` and
  `dashboard/brand/[slug]/ai-design.tsx` page wrappers. Both
  pre-3.5 fullscreen AI surfaces folded into the unified editor's
  top-chrome AI prompt bar. The launchpad's AI tab now offers ONE
  "Design with AI" card that seeds + navigates to the production
  editor route. Salvaged `brandCard.ts` moved to
  `src/features/editor/ai/brandCard.ts`.

The two remaining carve-outs and the explicit reason each is kept:

1. **`src/features/logo-maker/flow/`** — 6-screen brand creation
   wizard at `/logo-maker/*`. **Keep — wrong shape for the unified
   editor.** Wizard, not a canvas. Logo-domain coupling (variant
   generation, contrast checks, IdentityEngine) has no analogue in
   the unified system. Phase 4+ may absorb pieces.
2. **`src/features/editor/components/`** — Legacy `OptimizedDesignEditor`
   at `/editor/design/:slug`. **Keep — transitively coupled to
   `stable/editable-export-v1`** through ExportDialog → vectorize/*.
   Migration would require updating the export pipeline (off-limits)
   alongside the editor swap.

When you finish a piece of carve-out work, update this list AND the
matching "Shipped" section in `docs/brandos-editor-vision.md`. The
two should always match.

### Phase 3 + 3.5 debt — what was deferred and where it gets paid

Phase 3 shipped 2026-05-01 + Phase 3.5 same day, both with
explicit, documented debt. Don't work around items without first
checking if your change is the designated payoff.

| # | Debt | Source | Owner phase | Status |
|---|---|---|---|---|
| 1 | Auth/permission gates, 404/403 polish, deep linking, share URLs, brand-picker URL nav, suspense boundaries on `/b/:slug/design/:designSlug` | Step 9 commit 3a forward-pulled the route from Phase 4.5 to unblock the brandkit migration | **Phase 4.5 + Phase 5** | **Mostly closed (2026-05-04 in Phase 4.5 + Phase 5).** Inline 404/403 NotFoundPanel; brand-picker URL nav; Share button; lazy Editor mount inside Suspense (Phase 5 — keeps the heavy Editor bundle off the 404/spinner branches). Still open: real RBAC review beyond the single is_admin boolean. |
| 2 | `TemplatePreviewModal` half-mounted in `TemplateGallery` — only the quick-download fallback path triggers it | Step 9.3 commit 3b kept the modal mounted to keep the migration commit small | **Cleanup pass before Phase 4 templates** | **Closed (2026-05-04 in Phase 5).** Modal deleted; quick-download fallback now toasts + bails. |
| 3 | Mockup family deferred from brandkit migration — `/b/:slug/brandkit/mockups` renders a "coming soon" placeholder, no template card | Step 9.3 commit 3b — mockup studio is its own feature, not a brandkit module | **Post-Phase-5 (mockup studio phase)** | Open |
| 4 | `/_dev/editor` is still the primary manual-test surface for the unified editor; the production route exists but launchpad's "Design with AI" is the first user-visible entry | Pre-Phase-3.5; partially addressed by 3.5 commit 9's launchpad re-point | **Phase 4.5** (when Templates → editor links land) | Partial — launchpad now has 1 entry; templates browser still pending |
| 5 | Mode 1 (zero-state generate) not yet wired — needs Phase 4's template library | Phase 3.5 spec §2 (out of scope) | **Phase 5** | Open |
| 6 | AI image generation absent | Phase 3.5 spec §2 | **Phase 5+** | **Mostly closed (2026-05-04 in Phase 4.3 + Phase 5).** Mock-only Edge Function + browser wrapper + place-on-canvas flow + GenerateWithAi UI + 25 prompt presets all ship. Still open: pick a real vendor for `AI_IMAGE_VENDOR` (1-function-body Edge Function swap). |
| 7 | AI for resize variants — Phase 6 owns the reflow pipeline; AI not yet integrated | Phase 3.5 spec §2 | **Phase 6** | Open |
| 8 | Streaming responses — request → wait → apply for now; "Thinking…" indicator only | Phase 3.5 spec Q7 | **Phase 5 if user feedback demands** | Open |
| 9 | Skill chips deferred | Phase 3.5 spec Q4 | **Post-Phase-5 (data-driven)** | Open |
| 10 | `brand-guides` family routes through legacy `/b/:slug/guidelines` instead of the unified editor | Step 9.3 commit 3b — intentional, the legacy guidelines editor is its own dedicated multi-page UI | **Post-Phase-5 dedicated phase** (re-scoped 2026-05-04) | **Open — audited at 52 files / 10,469 LOC.** Has its own editor, slide navigator, customizer, AI content generator, multiple templates. Multi-week migration. Needs explicit user direction on full migration vs. content-type alias vs. defer further before scheduling. |

Closed during 3.5: ~~"4 carve-outs remain"~~ — went 4 → 2; the
remaining 2 (`logo-maker/flow`, `editor/components`) are documented
above with their explicit kept-because reasons.

The vision doc's "Phase 3 — Shipped" (§8.5) and "Phase 3.5 —
Shipped" (§8.6) sections carry the same debt items; if you update
one, update the other.

## Design System v1 — `src/shared/ds/` (2026-08-11)

The owner's canonical visual spec ("BrandingOS Design System.dc.html",
claude.ai/design project) is implemented as a self-contained module:

- **Tokens — codegen pipeline**: `ds/tokens.json` is the ONLY hand-editable
  token source. `npm run gen:tokens` (scripts/gen-ds-tokens.mjs) generates
  `ds/tokens.css` + `ds/tokens.ts` from it — both are GENERATED, DO NOT
  EDIT them directly; `ds/tokensSync.test.ts` fails CI when they're stale
  (`npm run gen:tokens:check` is the CLI equivalent). Token semantics: all
  `--ds-*` custom properties (warm cream light / warm charcoal dark, radii,
  4px spacing, warm-neutral shadows, one easing
  `cubic-bezier(0.22,1,0.36,1)` at 150/220/360ms). One token set, two value
  maps: light on `:root`, dark under `.dark` AND `[data-theme="dark"]` so
  both theming systems (next-themes class + WorkspaceShell data-theme)
  resolve. Dev server only: `POST /__ds-tokens/apply` (vite.config.ts
  plugin, `apply: 'serve'` so it never exists in builds) validates a
  Controller draft (existing tokens only, per-kind value shapes, CSS-
  injection charset guard), merges into tokens.json atomically, and reruns
  the codegen — the Controller's Save button uses it.
- **Components** (import from `@/shared/ds`): `DsButton` (tone=
  primary/secondary/tertiary/danger — danger solid is the ONLY non-charcoal
  filled button), `DsInput/DsTextArea/DsDropZone`, `DsSelect`, `DsSwitch/
  DsCheckbox/DsRadio/DsSegmented`, `DsToast/DsBanner/DsBadge/DsStatusDot`,
  `DsMenu`, `DsModal/DsConfirmDialog`, `DsSkeleton/DsProgress`, `DsTabBar`
  (sliding indicator, measured via offsetLeft — transform-safe), `DsRail`
  (separate 43px cards; tab bars are one container — never mix the models),
  `DsAssetRow`, `DsSwatchRow` (label flip via `pickFgOnBackground`),
  `DsLogoTile`, `BrandMark/LoadingPill` (the 9-dot mark loader — never a
  generic ring spinner), `DsEyebrow/DsKbd/DsChip/DsEmptyState`.
- Overlay components (Select/Menu/Modal) render **in place, no portal**, so
  `--ds-*` tokens resolve in the local theme scope (avoids the Radix Portal
  gotcha below).
- **DS Controller**: `/_dev/design-system` (DEV or `?dev=1`) is a live
  token control center (`src/pages/_dev/design-system/`): edit any `--ds-*`
  token per mode and the component showcase restyles instantly. Defaults
  are READ from tokens.css at runtime via theme-scoped probe elements
  (`registry.ts` holds metadata only — never values); drafts persist in
  localStorage `brandos:ds-controller:draft` and apply as inline custom
  props on the preview wrapper ONLY (editor chrome stays canonical);
  Undo / Reset token / Reset section / Discard all / Copy CSS (paste-ready
  patch, debug fallback); Save (dev server only) shows an applied-vs-draft
  diff modal, POSTs to `/__ds-tokens/apply`, and clears drafts only after
  the write succeeded AND the regenerated CSS arrived via HMR. A unit test
  asserts every registry var exists in tokens.css — add new tokens to
  tokens.json first (then gen:tokens), then the registry. Tests:
  `src/shared/ds/ds.test.tsx` + `src/pages/_dev/design-system/
  controller.test.tsx`.
- Rules that bind: chrome never wears the customer's brand; grey is never an
  enabled button state (disabled = primary at 40%); eyebrows are the only
  uppercase; icons are 1.8px-stroke lines, never filled/emoji; focus is a
  3px charcoal ring, never blue. New chrome work should consume `--ds-*`
  tokens/components rather than inventing values.
- **Before building ANY UI, run the mandatory pre-flight** in "UI reuse
  policy + MANDATORY pre-flight" below — inspect this DS first, search for
  an existing component, and make the reuse/local/shared/DS decision
  deliberately. That section is binding for every session.

## Code Navigator — `/__architecture` (dev only, 2026-08-11)

**Lost in the codebase? Start here.** `/__architecture` answers "what file
renders this URL?" and its inverse, through three peer views over one generated
data source:

- **Diagram** (`/__architecture/diagram`, the default) — a node-and-edge
  architecture map, auto-laid-out by ELK. Starts at product level (app → 11
  areas) and drills down: area → pages → route/component/source → optional
  technical detail. Typed, filterable edges: route hierarchy, navigation,
  redirect, imports. Focus mode reduces the graph to one node's neighbourhood.
- **Tree** (`/__architecture/tree`) — browse top-down. Real route nesting is
  preserved, so the 35 Studio pages sit under one `/b/:slug` branch.
- **Search** (`/__architecture/search`) — type a page name, URL, component name,
  file path, or even a component a page *imports*, and get all four back.

```
Brand Workspace (Studio) → /b/:slug → Setup
  → /b/:slug/setup → BrandSetupPageV2 → src/pages/b/[slug]/setup.tsx
                                        (route: src/App.tsx:420)
```

Tree and Diagram are **pure functions over the same `RouteNode[]` Search
renders** (`tree.ts`, `graph.ts`) — not second scanners, not registries. The
graph takes its hierarchy from the tree, so nesting can't disagree. Areas come
from `groups.ts` (the only explicit layer, top-level areas only); labels, badges,
counts, nesting and edges are all derived. `graph.ts` contains no route path at
all, and tests enforce that plus "no module names an individual page". Tests also
assert all three views reach an identical route set.

Navigation edges are statically proven only: `<Link>`/`<NavLink>`/`<Navigate>`/
`navigate()` targets resolved against the real route set, requiring exactly one
match. A computed target yields no edge — route availability and user navigation
are different things. Every edge carries `evidence: 'static-source'`, the seam for
adding runtime-observed flows later. React Flow + elkjs are **devDependencies**,
the route and chunk are DEV-gated, and elkjs loads dynamically; verified against a
real build that none of it reaches `dist/`.

Tree interaction follows VS Code: a branch row toggles, a leaf row selects, a
leaf's chevron opens its drill-down — so "expand all" only ever opens structure,
never metadata.

- **100% generated** from the router's TypeScript AST on every request — there is
  no list to maintain. Add/rename/move/delete a route and the explorer updates on
  reload. `src/features/dev-architecture/generator/*.node.ts` does the parsing;
  the `architecture-map` Vite plugin serves it at `/__architecture-map.json`.
- Handles every routing pattern in `App.tsx`: nested routes, index routes,
  `ProtectedRoute`/provider wrappers, `<Navigate>` and `*Redirect` components
  (including reconstructing template targets → `/a/:slug/setup`), splats,
  `import.meta.env.DEV` guards, and **imported route fragments**
  (`{logoMakerFlowRoutes}`) which it follows through barrel re-exports.
- **Dev only, structurally.** The route AND its `lazy()` import are behind
  `import.meta.env.DEV` (the ternary is load-bearing — guarding only the `<Route>`
  still emits the chunk), and the endpoint plugin is `apply: 'serve'`. Verified
  against a real build: no chunk, no explorer code in `dist/`.
- **Anti-staleness:** `__tests__/realRouter.test.ts` cross-checks the AST
  generator against `dev-product-map/discovery.ts` — an independent text scanner
  — and asserts both find the same route set, every `sourceFile` exists on disk,
  and there are zero generator warnings. `__tests__/tree.test.ts` adds the
  Tree↔Search divergence guard and simulates adding a new route to prove it
  appears with no manual step.
- Extending it (hooks/stores/services/Supabase tables/reverse deps/impact
  analysis): add a scanner beside `scanImports.node.ts` and one optional field on
  `NodeAnalysis`. **Read `docs/dev-architecture/README.md` first** — it also
  records why `dependency-cruiser` was evaluated and not adopted.

**Not the same tool as `/_dev/product-map`.** Product-map is the product-owner's
curated surface inventory (descriptions, keep/remove/merge decisions, duplicate
groups, and non-routed surfaces like tabs and modals). Code Navigator is
engineering orientation, fully derived. They share no code — only a test that
cross-checks their parsers. Don't merge them, and don't use product-map's registry
as a source of truth for route data.

> Known pre-existing issue (not from this tool): product-map reads router source
> via `import.meta.glob(…, '?raw')`, which is compile-time, so the full text of
> `App.tsx` ships in the production bundle. Worth fixing separately.

## UI reuse policy + MANDATORY pre-flight
(component audit 2026-08-11 · pre-flight policy 2026-08-12)

**This section is binding for every session, including brand-new ones.**
It governs any work that creates or modifies a page, section, component,
card, modal, form, navigation, editor UI, toolbar, empty state, feedback
state, or visual interaction.

### 0. Pre-flight — do this BEFORE writing any JSX or CSS

Do not start a UI task by writing markup. First:

1. **Design System check.** Read `src/shared/ds/index.ts` (the full export
   surface), the primitives relevant to the task, and
   `src/shared/ds/tokens.json` for the available tokens. When the task
   involves a real visual decision (buttons, inputs, states, colors,
   surfaces, spacing, radius, shadows, forms, modal treatment, feedback),
   also open `/_dev/design-system` to see the canonical behavior live —
   the Controller's preview sections show every token and state in
   context. NEVER edit the generated `tokens.css` / `tokens.ts`.
2. **Existing-component search.** Search the repo for something that
   already serves this purpose before creating anything:
   `src/shared/ds`, `src/shared/ui`, `src/shared/components`,
   `src/shared/layouts`, `src/shared/upload`, `src/shared/brand`, the
   relevant `src/features/*`, and feature-family systems such as
   `features/editor/core`.
3. **Classify every candidate you find** — existing is not the same as
   reusable:
   - **CANONICAL** — reuse it.
   - **FEATURE-SPECIFIC** — reuse only inside its own feature.
   - **LEGACY / FROZEN** — do not import for new Studio work (list below).
   - **DEAD / UNUSED** — do not revive without a reason; say you found it.
   - **DUPLICATE** — pick the canonical twin; don't add a third.

### 1. The decision ladder — classify BEFORE implementing

Resolve in order; stop at the first rung that fits.

- **A. Existing DS primitive** → REUSE. (`DsButton`, `DsInput`,
  `DsTextArea`, `DsSelect`, `DsSwitch/Checkbox/Radio/Segmented`,
  `DsModal/ConfirmDialog`, `DsMenu`, `DsProgress/Skeleton`, `DsBadge/
  Banner/Toast/StatusDot`, `DsTabBar`, `DsRail`, `DsEyebrow/Chip/Kbd/
  EmptyState`, `BrandMark`, …)
- **B. Existing canonical product component** → REUSE.
  `@/shared/ui/PageHeader`, `@/shared/ui/{AssetCard,SegmentedNav}`,
  `@/shared/upload/AssetSourcePopover`, `BrandChooserDialog`,
  `@/shared/components/ExportDialog`, `@/shared/brand/*`
  (logoOnBackground, brandPalette, brandPathRewrite),
  `@/shared/layouts/*` shells. Feature-family primitives belong on this
  rung too: `@/features/editor/core` (EditorChrome, useAutoSave) for
  editor work, `features/brandkit/` for brand domain logic.
- **C. Something almost fits** → COMPOSE it first. If composition can't
  express it, EXTEND the existing component — but only when the missing
  capability genuinely belongs to that abstraction and helps its real
  consumers. **Never** create `Component2`, `NewComponent`,
  `BetterComponent`, or `ComponentV2` because the original is slightly
  incomplete or its API is inconvenient.
- **D. A generic visual primitive is genuinely missing** → it MAY be added
  to `src/shared/ds`, but only if it is generic, product-agnostic,
  reusable across unrelated surfaces, visually stable, and DS-appropriate.
  One page needing it is NOT sufficient reason. Adding a real missing
  primitive is allowed and expected — announce the decision, don't slip
  it in.
- **E. A reusable PRODUCT component is missing** → add it to the canonical
  shared product layer (`shared/ui`, `shared/components`, `shared/upload`,
  …), NOT the DS. Only when the semantics are product-level, reuse or
  shared behavior is real, the API can be stable, and multiple consumers
  want the same thing for the same reason. (Brand chooser, asset card,
  export workflow, product page header…)
- **F. One-time / feature-specific pattern** → build it LOCAL to the
  feature. This is the RIGHT answer when the behavior is product-specific,
  belongs to one feature, or reuse is speculative. Feature-local is good
  architecture, not a fallback — it's fine even at a single call site when
  it encapsulates something meaningful. When torn between D/E and F,
  choose F and promote later.

### 2. Promotion lifecycle

`CANONICAL → COMPOSE → EXTEND → LOCAL → PROMOTE`

Build local → observe REAL reuse → stabilize the API → promote
deliberately. Never promote because "we might use it later". Consumer
count (≥2) is EVIDENCE of reuse, not proof of a shared abstraction:
promotion requires stable shared SEMANTICS — the consumers must want the
same thing for the same reason, not merely render similar markup. Two
visually similar components with different meaning stay separate.

### 3. The three layers — keep the boundary strict

```
DESIGN SYSTEM      generic visual primitives + tokens + states + foundations
       ↓           (DsButton)
PRODUCT SYSTEM     reusable BrandingOS patterns built ON TOP of the DS
       ↓           (ExportDialog)
FEATURE COMPONENTS feature-specific behavior built from DS + shared
                   (Brand Kit export workflow)
```

Never collapse these layers. Product concepts never live in
`src/shared/ds`.

### 4. Frozen / legacy layers — no NEW imports

(Existing call sites stay until their surface is touched for other reasons.)

- `src/components/ui/` (shadcn, 155 importers) — canonical for Classic
  (`/a/:slug`) + legacy surfaces ONLY. Zero usage in Studio pages today;
  keep it that way.
- `src/shared/ui/{Button,Card,Input,Badge,Section,Container}` — thin
  shadcn wrappers; frozen. (PageHeader/AssetCard/AssetPicker/SegmentedNav
  in the same folder stay canonical.)
- `src/shared/components/{Button,Card,Input,Badge,Section}` — duplicate
  wrapper set; frozen. (ExportDialog, BrandNotFoundPanel, NotificationBell
  in the same folder stay canonical-in-place.)
- `src/shared/design-system/` UI kit (Typography/Layout/Card/FormField/
  Feedback) — frozen. NOT the design system despite the name; the real DS
  is `src/shared/ds/`. The folder's NON-UI machinery stays canonical:
  `fonts.ts`, `googleFonts.ts`, `PresentationStyleAdapter` + its runtime
  `--brand-*`/`--pres-*` tokens (customer-brand content tokens — a
  different job than chrome tokens; do not merge into `--ds-*`).

### 5. Token + styling rules

Feature-specific CSS is allowed and often correct — but its visual
foundations must consume the canonical DS wherever one applies:
`--ds-*` colors, surfaces, borders, text, shadows,
radii, motion, and spacing. Do NOT re-create the DS with page-local
hardcoded values. (A custom Brand Kit card is valid; a custom generic
button duplicating `DsButton` is not.) New Studio chrome reads `--ds-*`
only. `workspace.css` `[data-workspace]` tokens style the CURRENT live
Studio shell — don't add new workspace tokens for anything `--ds-*`
already defines. Convergence is an approved, staged plan:
`docs/ds-token-convergence.md` (mapping table, temporary alias bridge,
migration order, exact deletion criterion) — follow it, don't improvise a
parallel mapping. Shadcn HSL tokens in index.css belong to Classic/legacy.
The tailwind `cosmos.*` color mapping has zero usages (dead config — safe
to delete when touched).

### 6. Dependency direction

`shared/ds` imports nothing app-level except
`@/shared/brand` contrast helpers — never shadcn, stores, or features.
`shared/*` never imports `features/*`. Features import downward only
(ds, shared, own feature, other features' public domain layers).

### 7. Hard rules — never

- Recreate an existing canonical component, or bespoke-replace one.
- Build a generic control locally when the DS already provides it.
- Add feature-named components to the DS (no `DsBrandKitCard`); the DS
  stays curated — generic visual primitives + foundations only.
- Promote speculative components to shared.
- Import frozen/legacy generic UI for new Studio work.
- Invent new visual values when a `--ds-*` token already expresses it.
- Edit `tokens.css` / `tokens.ts` directly (they are generated —
  `tokens.json` + `npm run gen:tokens`, or the Controller's Apply).
- Duplicate a component because its API is slightly inconvenient.
- Add new component layers/folders before proving the existing structure
  can't express the need.

### 8. Mandatory decision report

Whenever UI work creates or significantly changes components, end with:

```
COMPONENT / DS PRE-FLIGHT
- Existing components searched:
- DS primitives inspected:
- Canonical components reused:
- Components composed:
- Components extended:
- New feature-local components:
- Why each new local component stays local:
- New shared product components:
- Why they deserve shared status:
- New DS primitives:
- Why they genuinely belong in the Design System:
- Legacy/duplicate components encountered:
- Hardcoded visual values introduced:
- Legacy generic UI imports introduced:
```

If nothing new was needed at the shared or DS layer, say so explicitly.
A proposed new DS primitive or new canonical shared component is an
architectural decision — state it, don't add it silently.

### 9. Completion rule

A UI task is not done until: the pre-flight ran → existing canonical
options were checked → the reuse / local / shared / DS decision was made
deliberately → the implementation follows that decision → the report
explains any new component architecture.

## Canonical pickers & primitives

- **Image uploads inside a brand**: use `@/shared/upload/AssetSourcePopover`.
  Pops a unified "Upload from device + Brand Assets grid" surface. Don't roll
  a one-off file picker for brand image slots.
- **Brand chooser** (when picking which brand to act on): `@/features/brand/components/BrandChooserDialog`.
  Supports "Start without a brand" (→ standalone editor) and "Create new brand"
  (→ AI onboarding with a `?then=` return param).
- **Page header**: `@/shared/ui/PageHeader` — always. See page-shell rules above.
- **Brand switch URL rewrite**: `@/shared/brand/brandPathRewrite.ts`. All brand
  switchers (AppRail top slot, legacy BrandSwitcher pill, any future
  editor-topbar switcher) route through `rewriteBrandPath(...)` so picking
  a new brand keeps the user on the same tool/page. Handles `/b/:slug` and
  legacy `/dashboard/brand/:slug` prefixes; preserves query string.
- **Logo + background contrast picker**: `@/shared/brand/logoOnBackground.ts`.
  ANY surface that places a brand logo (or text/icon) over a colored
  background MUST go through this module. It's the one place that decides
  which logo variant reads on a given bg and avoids same-tone collisions
  (a primary-color logo on a primary-color background, a black mono on
  black, a white mono on white). Three exports cover everything:
    - `pickLogoOnBackground(brand, bgHex)` — best `ResolvedLogo` for a bg.
      Scores every logo variant by WCAG contrast against the bg using
      labeled tones (`mono.black` → #000, `mono.white` → #fff, colored
      variants → `brand.primaryColor`). Returns undefined if even the
      best candidate is below the readability floor (1.8 ratio) — caller
      should fall back to a letter mark.
    - `bgTone(bgHex)` — `'light' | 'dark'` for picking text/icon color.
    - `pickFgOnBackground(bgHex, candidates[])` — highest-contrast
      foreground from a candidate list.
  **Don't write `bg.luminance > 0.5 ? blackLogo : whiteLogo` ever again** —
  that loses to brand-color-on-brand-color cases. Every brand kit preview,
  card grid, variation, presentation slide, and future auto-generated
  guideline export goes through this helper. Caught us 2026-04-25 where
  SKAM's red logo on a red card was invisible.
- **Brand palette / surface tokens**: `@/shared/brand/brandPalette.ts`.
  This is the bigger sibling of the logo picker — the project-wide,
  Elementor-style global color system. Any surface (card, hero band,
  subtle section, modal, presentation slide, brand-guideline page,
  AI-generated layout) MUST request its colors by SURFACE KIND, not by
  reaching into `brand.colorSystem.primary.hex`:
    - `buildBrandPalette(brand, mode='light' | 'dark')` → derived role
      tokens: `brand.primary/secondary/accent`, `bg.page/surface/elevated/
      subtle/inverted`, `text.heading/body/muted/onBrand/onInverted`,
      `border.subtle/strong`, `state.success/warning/error/info`, `mode`.
      Neutrals are TINTED with the brand hue (via `suggestNeutrals`) so
      pages look on-brand without being pure gray.
    - `pickSurfaceTokens(palette, kind)` → `{ bg, text, textMuted,
      border, accent }` bundle that's guaranteed-readable. Kinds:
      `'page' | 'card' | 'elevated' | 'subtle' | 'brand' |
      'brand-secondary' | 'inverted'`.
    - `surfacePalette(brand, kind, mode)` — one-shot shortcut.
    - `applyPaletteToRoot(palette, root?)` — sets `--bp-*` CSS custom
      props (`--bp-bg-page`, `--bp-text-heading`, …) so plain CSS can
      reach the palette without importing the module.
    - `isPaletteReadable(palette)` — true if every surface kind clears
      WCAG 4.5:1. Used as a CI guard in `brandPalette.test.ts`.
  **Why it's mandatory.** The user's words: "علشان منلاقيش الوان
  الجايد لاين كلها لازقه في بعض" — without role-based tokens every
  surface gets hand-painted and guidelines / variations / auto-generated
  presentations end up monotone or clashing. With the picker, a hero +
  subtle band + white card + inverted footer come out reading correctly
  for ANY brand input, no human in the loop. Tested against all three
  seed brands (Raqm, SKAM, Vector) in both modes — 13/13 contrast
  assertions pass.

## Brand Kit (Studio canonical) — `/b/:slug/brand-kit`

The heart of every brand in Studio. Major feature under active iteration —
default any "brand kit" task to the canonical fork (`features/brand-kit/`),
NOT the alternate (`features/brand-kit-alt/`).

**Entry & shell:**
- Route page: `src/pages/b/[slug]/brand-kit.tsx` — fetches via
  `useBrandFromSlug`, converts to `MockBrand` shape (setup-era schema),
  wraps in `WorkspaceShell`, mounts `BrandSetupChecklist` above for
  incomplete-starter steps.
- Main component: `src/features/brand-kit/BrandKitCosmosPage.tsx`
  (~1.4k LOC). Single page, two views: **sections list** (default) +
  **drilldown overlay** (history-based back, popstate-aware).

**Seven sections + their cards:**
- **Brand Assets** — Logos · Colors · Fonts · Icons · Photos · About
- **Stationery** — Business Card · Letterhead · Envelope · Invoice
- **Social Media** — Profile · Cover · Post · Story
- **Web** — Favicon · Website · Email Signature · Landing Page
- **Brand Guides** — Logo · Color · Typography · Voice · Imagery
- **Presentations** — Pitch Deck · Business Plan · Proposal · Case Studies
- **Animations** — Logo Reveal · Slide In · Fade · Rotate

**Two card patterns (canonical page — original showcase):**
- Brand-asset cards (Logos/Colors/Fonts/Icons) render the full variant
  grid inline AND support an inline `+` add for colors/icons (session-
  only, see below). Photos + About are placeholder grids.
- Every other section uses **3 featured tiles + "More" picker modal**.
- Right-click any card → "Edit" opens `BrandKitCardEditor.tsx` as a
  full-page overlay with live preview + template overrides. The
  editor's per-type helpers (content fields / aspect / defaults) now
  live in `kit/registry.ts` — behavior on this page is unchanged.

**Redesigned kit — SEPARATE page `/b/:slug/brand-kit-next`
(`BrandKitNextPage.tsx`, owner decision 2026-08-10):** a full
generate/review/approve lifecycle experience was built, the owner
disliked it on the canonical page but wants to keep iterating on it,
so it lives on its own route (not in the top nav; direct URL only).
The canonical `/b/:slug/brand-kit` was restored to the original
showcase above. Do NOT re-merge the lifecycle UX into the canonical
page without explicit owner direction. On brand-kit-next, the 25
deliverables are lifecycle-driven (`not-created → generating → review
→ approved` + error/archived): domain layer `features/brand-kit/kit/`
— `registry.ts` (one `DeliverableDef` per deliverable; **adding a
deliverable = renderer + registry entry**), `generation.ts` (swappable
`KitGenerator`; deterministic featured-first + brand-seeded ranking,
AI can replace it without UX change), `kitStore.ts` (zustand; status
DERIVED from items), `repository.ts` (`KitStateRepository` —
localStorage now, backend later). UI: `DeliverableCard`,
`ReviewOverlay`, `GenerateBar`, `OwnedCollection`. Shared files
(sections/sidebar/editor) are backward-compatible: kit behavior only
activates via the optional `kit` prop / `target.kit` context, so the
canonical page renders exactly as pre-redesign.

**Data flow + persistence:**
`effectiveBrand` = base brand + session overlays (`iconsOverride`,
`colorAddsOverride`, `suggestedIcons`). Color/icon adds are still
**session-only** — they don't write back to the store; when that
persistence lands it must mirror the `iconsOverride` overlay pattern.
Deliverable lifecycle state persists in localStorage key
`brandos:brand-kit:state` through `kit/repository.ts` (kit items embed
their own customization; the store migrates pre-redesign
`cardCustomizations` saves into approved items on first hydrate).
Non-kit card edits still persist per brand + variant in
`brandos:brand-kit:customizations` via
`features/brand-kit/data/cardCustomizations.ts` (key = `template.id`,
falling back to `label:<label>` for direct card edits).

**Brand-kit-specific helpers:**
- `features/brand-kit/data/recolorLogo.ts` — `logoCombosFor(logos, bgs)`
  generates every logo-on-background combination; `visuallyClose(a, b)`
  collapses tiles with RGB distance ≤ 60² (the helper that shrunk the
  93-tile logo wall to a curated set on 2026-05-09 in commit 021e1b1).
- Neutrals are excluded from drilldown grids for Logos + Colors (commit
  90d8eb6, 2026-05-10). Don't reintroduce them without explicit ask.
- `shared/brand/logoOnBackground.ts:contrastRatio()` is used at line
  ~1094 to flip icon-tile surfaces to inverse when WCAG contrast < 2.
  Don't roll your own contrast check — go through the helper.

**Export status (2026-08-10 — all real now):**
- Colors / Fonts / Icons: dedicated bundles via
  `features/brand-kit/data/{colorPaletteExport,fontExport,iconExport}.ts`.
- Logos: `kitExport.ts` → zip of every variant as SVG + PNG.
- Template cards (stationery/social/web/guides/decks/animations):
  `templateSnapshot.tsx` renders the variant OFFSCREEN and rasterizes it
  with html2canvas. Renderers are designed for a ~260px canonical width
  (see `ScalingStage`), so snapshots mount at 260px and use html2canvas
  `scale: 4` — mounting wide produces starved text.
- Card editor Download: snapshots the LIVE `.bk-preview-host` DOM so the
  export includes the user's unsaved overrides.
- Top-right "Export kit": one zip (colors/ fonts/ logos/ about.md
  brand.json) via `kitExport.downloadKitZip`. Kit colors are deliberately
  slim (core+accent, svg+png only) — the full-fidelity palette (all
  neutrals, jpg + ai) is the dedicated Colors download; the per-color
  `.ai` files are ~10MB each and once ballooned the kit zip to 590MB.
- Do NOT add a tint/veil overlay over the stock card cover art — tried
  2026-08-10, explicitly rejected by the user, reverted.

**Canonical vs alternate (recap):** `features/brand-kit/` is the
read-only visual showcase (Studio). `features/brand-kit-alt/` is the
edit-first hub with bulk export + PDF guides (Classic, legacy). New
brand-kit feature work lands in the canonical fork; the alternate is
bug-fix only.

**Open active debt (revised 2026-08-10; items 5–7 apply to
brand-kit-next only):**
1. Session-only color/icon adds → store persistence (still open)
2. ~~Card-editor `onSave`~~ — closed (cardCustomizations.ts)
3. ~~Export placeholders~~ — closed (offscreen rasterization, see above)
4. Photos + About cards are placeholder grids (still open)
5. ~~Web section cards are stubs~~ — Web deliverables use the synthetic
   extended renderers (favicon/website/email-sig/landing) via the
   generate flow.
6. ~~Drilldown tiles render brand defaults~~ — closed for kit items:
   cards/drilldown/exports all render the item's saved customization
   (`kit/preview.tsx`). Limitation: DOM-walker-only content fields
   (everything except business-card content + primary/secondary color)
   apply in the live editor preview but not offscreen exports.
7. Kit state is local-only until a backend `KitStateRepository`
   implementation lands (interface ready in `kit/repository.ts`).

## Guideline page — scheduled for from-scratch rebuild

The Studio Guideline tab (`/b/:slug/guideline`, Chronicle shell +
`ChronicleGuidelineEditor`) was reviewed 2026-08-10 and the owner's
decision is: **it will be rebuilt from scratch**. Do not invest new
feature work, UX polish, or refactors in the current Chronicle guideline
surface — bug fixes only if something blocks another flow. The legacy
slide editor at `/b/:slug/guidelines/canvas` ("Present") is equally
frozen; it has a local-brand fallback (see the uuid gotcha below) so it
at least loads everywhere.

## Canonical brand model — storage round-trip gotcha

`assertCanonicalBrand` (zod, `z.date()`) requires real `Date` objects,
but any brand hydrated from JSON (localStorage `brandos:brands`,
Supabase rows) carries ISO STRINGS in `createdAt`/`updatedAt`. The
coercion lives in ONE place — `fromLegacyBrand`'s `toDate()`
(`src/domain/brand/fromLegacy.ts`). Don't bypass that boundary: before
the coercion existed, every canonical write op (colors, typography,
voice, strategy — i.e. ALL Setup edits) failed validation for every
user-created brand and Setup silently lost all edits (QA bug SET-01,
fixed 2026-08-09).

## Dev auth bypass + local brand ids vs Supabase uuid columns

The login screen's "Dev bypass (skip Supabase)" button sets
`brandos:dev-bypass=1`, seeds a local session (`super_admin`), and —
critically — keeps ALL services LOCAL (`reconfigureForAuth` is never
called with `true`). Local brands get ids like `brand_1786308941230`,
which can NEVER satisfy a Supabase `uuid` column: any code path that
sends a local brand id to a Supabase table fails with Postgres `22P02`
("invalid input syntax for type uuid"). Guard such paths with a uuid
check and degrade to a local fallback (see
`CanvasGuidelinesEditor.tsx`), and never leave the failure as a spinner
— surface an error state.

## Centering overflow content (gotcha)

Never center a potentially-overflowing child with
`items-center justify-center` on an `overflow: auto` flex parent —
flexbox pushes the top/left overflow OUTSIDE the scrollable region, so
it becomes unreachable (this hid the design editor's artboard left edge
whenever a tool panel was open, QA bug DSN-04). The correct pattern:
plain flex parent + `m-auto` (+ `shrink-0`) on the child — centers when
smaller, pins to the scroll origin when larger. Same family of bug:
percentage `max-height` on a child of an auto-height flex item silently
resolves to nothing (dashboard card logos rendered unconstrained until
switched to fixed px, QA bug DSH-02/03).

## Fabric canvas listeners — stale closure gotcha

Canvas event listeners registered once (e.g. in a `handleCanvasReady`)
must reach their React callbacks through a REF, not directly —
`canvas.on('object:added', someCallback)` freezes the closure from the
registration render. This silently disabled the design editor's
auto-save for months (`markDirty` was captured while `enabled` was still
false — QA bug DSN-01). Pattern: keep `const cbRef = useRef(cb)` updated
in an effect and register `() => cbRef.current()`.

## Radix Portal + scoped CSS (gotcha)

Radix `Popover`, `Dialog`, `DropdownMenu`, `Select`, etc. render their content
inside a `Portal` that mounts under `document.body` — **outside** any
workspace wrapper. CSS rules written as `[data-workspace] .x`
never apply to portaled content.

**Rule.** When styling the interior of a Radix popover/dialog/menu:
- Use unscoped selectors (no `[data-workspace]` prefix).
- Reach theme tokens via `hsl(var(--muted))` / `hsl(var(--foreground))` /
  etc. so light + dark mode still work.
- If you need workspace-scoped styles for the trigger (not the content), that's
  fine — the trigger isn't portaled.
- If a portaled surface NEEDS workspace tokens (e.g. a brand-picker dropdown),
  set `data-workspace` on the Radix Content element itself + use `var(--name, fallback)`
  so the fallback paints if the var doesn't resolve. See `BrandPicker.tsx`.
- `var(--x, fallback)` does NOT save you when `--x` resolves to a raw
  HSL triple (the shadcn `:root` tokens like `--surface`/`--border` are
  `H S% L%` fragments): the var RESOLVES, the property value is invalid,
  and the declaration is dropped — fallback never paints. In portaled
  content use a concrete color. This made the onboarding Google-fonts
  popover render with a transparent panel (ONB-09, fixed 2026-08-10).

This caught us on the Typescale `FontPicker` (2026-04-24) where the Aa-swatch
items rendered as unstyled run-on text until the scope prefix was removed.

(Phase B Group 2 renamed `cosmos-workspace.css` → `workspace.css` and
`[data-cosmos="workspace"]` → `[data-workspace]`. The semantics are unchanged.)

## localStorage key inventory (debugging aid)

- `brandos:brands` — LocalBrandsService store (user brands; seeds merge at read)
- `brandos:brand-kit:state` — per-brand deliverable lifecycle (kit items + customizations)
- `brandos:brand-kit:customizations` — per brand+variant card-editor saves (non-kit edits; migration source)
- `design_<brandId>` — legacy design editor autosave (Fabric JSON)
- `brandos:guideline-theme:<brandId>` — Guideline theme preset pick
- `brandos:editor-shortcuts-dismissed` — editor shortcuts hint dismissal
- `brandos-theme` — workspace light/dark (scoped to `[data-workspace]`;
  the app-level next-themes provider is separate and defaults light —
  the legacy editor mirrors `brandos-theme` into it on mount)
- `brandos:dev-bypass` — dev auth bypass flag
- `editor-tutorial-<slug>` — editor welcome tutorial seen

## Onboarding V3 — `/onboard-brand` (spec 002, shipped 2026-08-14)

The ONE onboarding flow. `features/onboarding-v4/` and the two-path
`/onboard-brand` + `/onboard-brand/create` split are deleted, not disabled.

**Brand-first.** Naming the brand at step 1 CREATES it; every step after
writes to that real record. This is what makes resume work across sessions
and devices, and it is why there is no draft, no staging store and no
commit pass at the end.

Three screens: **Tell us about your brand** (name required; description and
website optional — the user is never asked to classify themselves as
having-a-brand or starting-new) → **Bring anything you have** (one intake
surface, or "Nothing yet? Help me start" for three generated directions) →
**Review what BrandingOS found**. Understanding is a TRANSITION between
material and review, never a fourth step.

**A proposal is a Core value below `confirmed`.** There is no proposal
store. That is why proposals survive a closed tab and why the review is a
filter over Core rather than a join across two stores. `hydrateReview()`
rebuilds the screen from the brand on resume.

**Per-value acceptance is the rule.** `understanding/acceptance.ts` is the
ONLY module that promotes, the target is hard-coded to `confirmed`, and
"Looks right" is a LOOP over the per-value act — never a section-level
authority. Reading, opening or scrolling past a proposal confirms nothing.
An edit writes as the user AND promotes, because a human write alone lands
at `provisional`. Nothing reaches `official`; that is Kit adoption.

**No undo.** `demoteCoreValue` floors at `confirmed` (001's rule that
un-adopting is not un-deciding), so a confirmation cannot be walked back
through the canonical ops. Rather than ship a button that silently does
nothing, changing your mind is an edit, or a change in Setup.

**Persistence sentinels.** `brands.primary_color` is NOT NULL and the
canonical schema requires a valid hex and a non-empty font family, so a
name-only brand cannot persist those as absent. It gets a documented
neutral (`CORE_PLACEHOLDERS`) and the path is recorded in
`brand.onboarding.placeholders` — BELOW the canonical projection. Those
paths carry no Core metadata, never render as chosen values, are excluded
from `buildCreationContext` via `sentinelPaths` so they never reach an AI
prompt, and are retired permanently by the first real write. Never treat a
sentinel as brand truth; ask `isPlaceholderPath`.

**The count is contextual.** "X of Y decided" is per SECTION. There is no
global counter, no progress bar, no percentage and no completion language
anywhere — finishing with nothing confirmed is a legitimate outcome.

**Origin text is secondary.** "From your description" explains where a
belief came from; it is smaller, muted and below the value, and must never
compete with the brand content.

Migration 022 adds `brands.onboarding`. Its absence is tolerated on both
create and update — the flow degrades to non-resumable, never to a failed
save.

Kept invariants from the retired flow (each fixed a QA mismapping):
- Values split on `,;·•|` into real array entries, not one string.
- One picked font family stays one family — `secondary` is undefined
  unless a second family exists.
- Local slugs are hyphenated; the Supabase slug trigger is a separate path.
- The image classifier only runs when `VITE_CLASSIFIER_URL` is set;
  default is the filename/alpha heuristic (no network).

## Auth flow gotchas

`src/features/auth/components/AuthModal.tsx` + `src/features/auth/hooks/useAuth.ts` + `src/shared/store/sessionStore.ts`:

- `sessionStore.signIn()` sets `isAuthenticated: true` AND `isLoading: false`
  atomically. Don't split these — `DashboardRoute` / `ProtectedRoute` guards
  redirect on the `(!isLoading && !isAuthenticated)` combo and will bounce
  real users back to `/login` if a split shows up.
- `AuthModal` seeds the session store synchronously on a successful
  `signInWithPassword` BEFORE navigating. Otherwise `onAuthStateChange` races
  the navigate and the guard redirects.
- `useAuth` calls `signIn()` BEFORE `checkAccountStatus` in both the
  initial-session and OAuth paths. Keep that order.
- The safety timeout in `useAuth` (15s) only releases loading when the user
  is NOT authenticated — never over-write a live session.
- **DI service swaps must fan out to data stores.** `reconfigureForAuth(true)`
  swaps `BRANDS` from `LocalBrandsService` → `SupabaseBrandsService`. Any
  store that already populated against the local service holds stale data
  until the next manual `loadAll()`. `useAuth` calls
  `useBrandStore.getState().loadAll()` immediately after each
  `reconfigureForAuth` (initial-session, SIGNED_IN, SIGNED_OUT) — when you
  add a new auth-aware store, wire it into the same three call sites.
  Caught us on 2026-04-25 where `/dashboard` showed "No brands yet" until
  manual refresh after sign-in.

## Measuring layout inside an animated ancestor

If an ancestor has an active CSS `transform` (e.g. the cosmos shell's
segmented-nav has a 440ms `scale(0.96) → 1` open keyframe),
`getBoundingClientRect()` on a descendant returns the **transformed**
rect — useless for positioning siblings off it. Use `offsetLeft` /
`offsetWidth` instead; those are layout-based and immune to ancestor
transforms.

This caught us on `CosmosWorkspaceShell.measurePill` (2026-04-25): the
active-tab pill landed at exactly 96% of the right values on first paint
and only un-stuck on the next route change.

## Stack
- **Build**: Vite 5 + React 18 + TypeScript 5.8
- **Routing**: React Router v6 (client-side SPA)
- **UI**: Shadcn/Radix UI primitives + Tailwind CSS 3
- **State**: Zustand 5 (devtools + persist middleware)
- **Data**: Supabase (PostgreSQL) + localStorage fallback
- **Canvas**: Fabric.js 6 for design editor
- **Export**: html2canvas + jsPDF + jsZip

## Architecture

### Layer Diagram
```
┌──────────────────────────────────────────────┐
│  Pages (/src/pages/)                         │
│  Route-level components, compose features    │
├──────────────────────────────────────────────┤
│  Features (/src/features/)                   │
│  Domain modules: brand, brandkit, guidelines │
│  Each has: components/, hooks/, types/       │
├──────────────────────────────────────────────┤
│  Core (/src/core/)                           │
│  DI container, service contracts, boot       │
├──────────────────────────────────────────────┤
│  Shared (/src/shared/)                       │
│  Stores, hooks, types, UI primitives         │
├──────────────────────────────────────────────┤
│  Adapters (/src/core/adapters/)              │
│  Database, storage, external service wrappers│
└──────────────────────────────────────────────┘
```

### Dependency Flow
```
Pages → Features → Core/Shared → Adapters
         ↓             ↓
       Stores ← Service Contracts
```

**Rule**: Never import upward. Features don't import from Pages. Core doesn't import from Features (except service implementations registered at boot time).

### Service Container (DI)
Services are registered in `src/core/boot.ts` and accessed via:
```typescript
// In hooks/components:
import { useService, SERVICE_KEYS } from '@/core';
const brands = useService<IBrandsService>(SERVICE_KEYS.BRANDS);

// In stores (via compatibility bridge):
import { services } from '@/shared/services/registry';
await services.brands.list();
```

### Key Directories
- `src/core/` — DI container, service contracts, boot configuration
- `src/features/brand/` — Brand CRUD, editor, sidebar, layout
- `src/features/brandkit/` — Brand Kit modules, templates, renderers, canvas editor, color engine
- `src/features/guidelines/` — Slide-based brand guidelines editor
- `src/shared/store/` — Zustand stores (brandStore, sessionStore)
- `src/shared/types/brand.ts` — Core Brand type definitions
- `src/data/brands/` — Seed brand data (Raqm, Meridian)

### Seed Brands
Seed brands in `src/data/brands/` are always available regardless of localStorage state. They are merged at read time by `LocalBrandsService`.

### Brand Kit Modules
Defined in `src/features/brandkit/data/modules.ts`. Each module has:
- A config entry (id, name, icon, gradient, categories)
- A renderer component (switched in `BrandKitModuleView.tsx`)
- Template data in `src/features/brandkit/data/templates.ts`

### Canvas Editor
Uses Fabric.js. Each template type has a content definition in `CanvasEditor.tsx` that creates the correct Fabric objects (text, shapes, logo) for that template type.

### Brand Validation Engine
`src/features/brandkit/engine/brandRules.ts` provides:
- Contrast ratio checking (WCAG)
- Logo variant generation with safety validation
- Profile icon config with logo-aware rendering
- Brand validation scoring

### Color Engine
`src/features/brandkit/engine/colorEngine.ts` provides:
- HSL/RGB/Hex conversions
- Harmony generation (complementary, analogous, triadic, etc.)
- Shade generation
- Palette validation
- Suggested neutrals/accents

## Supabase

Project ID: `ciojgoozobzbeglwdxcz`. Client configured in `src/integrations/supabase/client.ts` (main app) and `landingpage/src/lib/supabase.ts` (landing page).

The landing page's `early_access` table uses RLS: anon INSERT-only, no SELECT — submissions go in but can't be read from the client.

**Security (resolved code-side 2026-08):** the browser AI key is gone. All AI calls route through the `anthropic-proxy` Supabase Edge Function using the SERVER-side `ANTHROPIC_API_KEY` secret; `VITE_ANTHROPIC_API_KEY` is no longer referenced in `src/` (verified) so it is not inlined into the bundle. Do NOT reintroduce it. The remaining steps are owner deploy actions only (deploy `anthropic-proxy` + set the server secret + unset the build-env var in the Cloudflare Pages dashboard) — see `docs/phase-2/SECURITY-E6-runbook.md`.

## Test coverage requirements

Every phase / feature / non-trivial change must land with **all three layers** of test coverage green before it's "done." The human only opens a browser for genuinely visual concerns (color palette feel, animation polish, layout density) — functional verification is automated, end to end.

The three layers, configured as Vitest projects in `vite.config.ts`:

1. **Unit (jsdom)** — pure logic, schemas, math, hooks, state machines. Lives anywhere as `*.test.ts(x)`. Runs in jsdom.
2. **Adapter integration (jsdom)** — tests that drive an adapter's API and assert on its document mirror + Fabric (mocked) object state. Lives next to the adapter being tested. Same `*.test.ts(x)` suffix; `vi.mock('fabric', …)` provides a faithful stand-in because jsdom has no working Canvas 2D context.
3. **Browser E2E (Chromium via Playwright)** — real DOM, real canvas, real Fabric.js. Lives in `*.browser.test.tsx`. Renders the actual React component(s), interacts via `@testing-library/react` `fireEvent` + DOM clicks, asserts on canvas state through whatever ref/callback the component exposes for testing (e.g. `<Editor onAdapterReady={…}>`). This layer catches data-flow regressions where a panel input must reach the canvas — the bug class that costs the most when manual review misses it. Phase 1's broken `applyPatchToFabric` would have failed this layer's first run.

`npm run test` runs all three projects in parallel via the workspace config. Don't add a separate `test:browser` script — there's one gate. To run a single project: `npx vitest run --project unit` or `--project browser`.

When adding a feature: write tests at every layer that applies. New schema → unit. New adapter method → adapter integration. New user-facing flow (panel input, button, drag, etc.) → browser E2E. Skipping a layer because "it's covered at a different level" is the rationalization that lets production bugs through.

## TypeScript Config

`strictNullChecks` is OFF. `noImplicitAny` is OFF. Be aware when writing new code — nullable values won't cause compile errors but can still crash at runtime.

## Git conventions

- Default branch is `dev` (NOT `main`). Work lands on `dev`; merge to `main`
  is a release step the user handles manually.
- A peer branch `x` is used for a separate deploy target. Many commits should
  land on both — the convenient pattern is:
  `git push origin dev && git push origin dev:x` (no force, `x` is an ancestor of `dev`).
- Commit messages follow a `feat(scope): …` / `fix(scope): …` / `refine(scope): …`
  convention — see `git log --oneline` for recent examples.
