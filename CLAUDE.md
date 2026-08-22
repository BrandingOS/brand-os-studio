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

### Demo environment

**The canonical demo URL is https://demo.brandingos.ai** — a custom domain on
the Cloudflare Pages project `demo` (SSL active, Google CA, HTTP validation).
`demo-25t.pages.dev` is that project's built-in subdomain and is kept as a
**technical fallback**; it is deliberately NOT redirected.

Production builds from the **`demo` branch**, so a release is a fast-forward of
that branch — never a merge, and `main` is not involved:

```bash
git push origin origin/<release-branch>:refs/heads/demo
```

Notes that will save you an hour:
- A second project, `demo-b` (demo-b.pages.dev), is wired to the same repo and
  the same `demo` branch, so it rebuilds too. It is NOT canonical — leave it
  alone unless asked.
- Neither project has Pages secrets or env vars, and none are needed: the
  Supabase URL is hardcoded in `src/integrations/supabase/client.ts`, and every
  `VITE_*` the app reads is optional.
- Cloudflare creates the production deployment record within *seconds* of the
  push and `wrangler pages deployment list` reports it `Active` while the build
  is still running. During that window the deployment alias 404s and the apex
  still serves the previous bundle. Wait for the status column to show a deploy
  time before concluding anything is wrong.
- Adding a custom domain through the **API** attaches it but does NOT create the
  DNS record (the dashboard does both). Wrangler's OAuth grant carries
  `pages:write` + `zone:read` and no `dns_records:write`, so the CNAME
  (`demo` → `demo-25t.pages.dev`, proxied) has to be added in the dashboard.
- Supabase Auth redirect URLs must include `https://demo.brandingos.ai/**`
  (already added). Do NOT reach for `supabase config push` to manage this: it
  has no dry-run and cannot read the remote config first, so a minimal
  `config.toml` would reset the project's other auth settings to CLI defaults.
- A host-canonicalising redirect for `demo-25t.pages.dev` was written and then
  reverted, because the fallback is wanted for now. The implementation (a
  narrowly-scoped Pages Function that redirects only the bare project
  subdomain, leaving preview aliases and `demo-b` alone) is preserved at commit
  `50cf5a5` and can be cherry-picked when the fallback is retired.

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
- **Folders** (`/b/:slug/folders`) tabs: Library · Designs · Kit over one shared brand folder tree — see its own section below
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
  Function (now a real, model-routed dispatcher — see "AI image
  generation — AI Studio" below).
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
| 6 | AI image generation absent | Phase 3.5 spec §2 | **Phase 5+** | **Closed (2026-08-17 — AI Studio).** Real multi-vendor Edge Function (Pollinations free · GPT Image · Nano Banana · fal · Cloudflare · HF), model registry + picker, brand-aware prompt compiler, brand reference images (logo + palette), 1–4 candidates, Variations / Refine / Regenerate. Owner action left: set vendor secrets + deploy. |
| 7 | AI for resize variants — Phase 6 owns the reflow pipeline; AI not yet integrated | Phase 3.5 spec §2 | **Phase 6** | Open |
| 8 | Streaming responses — request → wait → apply for now; "Thinking…" indicator only | Phase 3.5 spec Q7 | **Phase 5 if user feedback demands** | Open |
| 9 | Skill chips deferred | Phase 3.5 spec Q4 | **Post-Phase-5 (data-driven)** | Open |
| 10 | `brand-guides` family routes through legacy `/b/:slug/guidelines` instead of the unified editor | Step 9.3 commit 3b — intentional, the legacy guidelines editor is its own dedicated multi-page UI | **Post-Phase-5 dedicated phase** (re-scoped 2026-05-04) | **Mostly closed (2026-08-19).** Keep the artwork, rebuild everything around it. `/b/:slug/guideline` is now the Brand Guidelines BUILDER — build-from-brand empty state, vertical document, floating rail + sidebar, inline page editing, page CRUD, guideline-scoped brand overrides — and `/b/:slug/brand-guides` plus the old `/guideline/:templateId` deck editor were consolidated into it. One guideline surface, DS-native, no `/a` chrome. The legacy family is now purely a CONTENT library (`features/guidelines/pages/templates/*`), which is reuse rather than debt. Still open: export/present on the builder, the Classic hub `/a/:slug/guideline`, and the two frozen editors `/b/:slug/guidelines/{canvas,blocks}`. |

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
  wraps in `WorkspaceShell`.
- **There is no setup prompt on this page.** `BrandSetupChecklist` used to
  render ahead of `BrandKitCosmosPage` in the same flex column, so an
  unfinished brand pushed the whole Kit — WorkspaceShell's sticky navbar
  included — down by its own height. It now lives on Setup, floating; see
  "The setup nudge" under Setup below.
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

## AI image generation — inside the design editor (2026-08-17, single-surface 2026-08-18)

**There is ONE generation surface: the design editor's Generate panel.** Every
entry point creates a DESIGN and opens `/b/:slug/design/:designSlug` — the hub's
Image mode, its Editable mode, template cards, all of them. Do not build a
second generator page; a standalone "Image Studio" was built and retired on
2026-08-18 because it split the experience in two (owner decision). Its
capabilities live in the panel now: the credits pill, the pre-flight cost on the
Generate button, the multi-reference strip, and Save to Brand Assets.

`image_projects` still exists in the database, unread by the UI. An id that
names one of those rows redirects to `/b/:slug/design` — checked only AFTER the
document load fails, so the ordinary path costs no extra round trip.

The Design page (`features/design-alt/DesignHero.tsx`) is an ENTRANCE, not a
generator: Image mode seeds an empty doc via `panels/generate/aiCanvasSeed.ts`
(`metadata.ai.origin = 'ai-image'`, prompt staged in `pendingPrompt`) and
navigates to `/b/:slug/design/:id?prompt=…&mode=image`. The seed page must stay
EMPTY — generated images arrive as pages AFTER the active one, so anything
seeded there sits in front of every result. The editor opens on the Generate
rail (any `metadata.ai` doc does) and `panels/generate/GeneratePanel.tsx` runs
the flow ON the canvas:

```
prompt ─▶ compileImagePrompt (Claude haiku via anthropic-proxy; deterministic
          fallback — SILENT: the user sees one ProcessingCard, never a review step)
       ─▶ buildBrandReferences (logo PNG via rasterizeLogo · palette swatch ·
          previous image) ─▶ generateImage({model, count 1–4, references})
       ─▶ N pages inserted after the active page in ONE undo step
       ─▶ metadata.ai.generations[] record per page (Variations / Refine /
          Regenerate read it back — survives reload)
```

Rules that bind:
- **The model registry is `supabase/functions/_shared/imageModels.ts`** (ids
  like `google:nano-banana`, `openai:gpt-image`, `pollinations:flux`, vendor,
  caps, unlocking secret). `src/features/editor/ai/imageModels.ts` is the
  display mirror; `imageModels.test.ts` fails when they drift. Adding a model
  = one entry in each (+ a `dispatchX` in `ai-generate-image` for a new vendor).
  The browser sends registry ids (or `auto`); the server NEVER silently swaps
  vendors — a missing key is a 409 `model-unavailable` the panel shows inline
  with the exact secret name. `{action:'models'}` returns availability for the
  picker. Legacy `model:'flux'` aliases still resolve.
- **Secrets are Supabase Edge Function secrets, never `VITE_`:**
  `OPENAI_API_KEY` (GPT Image, uses `/v1/images/edits` when references are
  attached), `GEMINI_API_KEY` (Nano Banana via `generateContent` +
  `responseModalities:['IMAGE']`), `FAL_API_KEY`, `CLOUDFLARE_ACCOUNT_ID` +
  `CLOUDFLARE_API_TOKEN`, `HUGGINGFACE_API_KEY`. `AI_IMAGE_VENDOR=mock` forces
  the deterministic mock. Vendor model ids are env-overridable
  (`OPENAI_IMAGE_MODEL`, `GEMINI_IMAGE_MODEL`, …). Deploy with
  `supabase functions deploy ai-generate-image`.
- **The compiler enriches, never replaces** (`ai/imagePrompt/compileImagePrompt.ts`
  — the owner's rules are in its system prompt and tests): keep the user's
  intent; only relevant brand info; NO logo unless the user asks or the subject
  is clearly branded (packaging, signage, ads, merch…); don't force every color;
  a user color direction ("black and white") empties the brand palette. The
  compile is invisible (owner decision 2026-08-17: "do it in the back end, just
  show processing") — the compiled prompt is only recorded in `metadata.ai`.
  Raw mode (`brandos:ai-image:prefs`) sends the exact words.
- **Brand context reaches the model as IMAGES, not just words**
  (`ai/imagePrompt/brandReferences.ts`): logo → `@/shared/brand/rasterizeLogo`
  (1024² PNG, transparent), palette → canvas swatch card, previous → the page's
  image. Built only for models whose caps allow refs; the server warns
  `refs-unsupported` for prompt-only vendors and the panel says so.
- Pages are the history (`EditorGenerationsStrip`); never add a second history
  store. All vendor bytes come back as data URIs so Fabric export stays untainted.
- **Money is shown before it is spent.** `estimateGeneration` prices the exact
  request server-side and the number sits on the Generate button; the button
  disables when the balance cannot cover it. The balance comes from
  `useCreditsForBrand`, which resolves the billing workspace the same way
  migration 027's trigger does (brand's workspace, else the user's oldest).
  Never compute a price in the browser.
- **A short delivery is never silent.** When fewer images come back than were
  asked for, the panel says how many arrived and what was charged.
- **References are a LIST, in send order** (`ReferenceStrip`). The server
  truncates to the model's `maxReferenceImages` and warns; the strip greys the
  ones that will be dropped BEFORE the credits are spent.
- Tests: `ai/imagePrompt/*.test.ts`, `ai/imageModels.test.ts`,
  `shared/brand/rasterizeLogo.test.ts`, `panels/generate/aiMetadata.test.ts`,
  `panels/generate/aiCanvasSeed.test.ts`,
  `__tests__/e2e/aiImageStudio.flows.browser.test.tsx`,
  `features/design-alt/__tests__/generationEntryPoints.browser.test.tsx`.
  Any suite that mounts the panel MUST spread `src/test/imageGenerationStubs.ts`
  over `@/features/image-generation` and `…/credits` — otherwise it calls the
  REAL deployed Edge Function and the REAL ledger.

## Folders — one brand filesystem (`/b/:slug/folders`, 2026-08-20)

**One folder tree, three views.** The tree belongs to the BRAND. `Campaigns /
Summer Launch` is one place; **Library · Designs · Kit** are what you can see
while standing in it. Open a folder, switch tabs, and you are still in the same
folder looking at a different kind of thing.

| view | holds |
|---|---|
| **Library** | source assets and files (was "Assets" — renamed 2026-08-20) |
| **Designs** | creative work in progress |
| **Kit** | approved final brand deliverables |

**There is deliberately no per-tab folder tree.** That is three file managers
and three "Social" folders. `brand_folders` (migration 017) carries no
type column and nothing in `shared/folders` takes one.

**Two surfaces, one data layer.** `features/folders/` is Studio;
`features/dam/DamPage` is Classic at `/a/:slug/folders`, bug-fix only. Every
asset write — upload, delete, rename, tags, category, folder, and the legacy
`brand.assets` migration — lives in **`features/dam/useAssetLibrary.ts`**,
which both mount.

### Where folder membership lives

| type | storage | since |
|---|---|---|
| assets | `assets.folder_id` | migration 017 |
| designs | `designs.folder_id` + `DesignSummary.folderId` | **migration 032** |
| kit | `DeliverableRecord.folderId` in the 018 JSONB blob | additive, no migration |

Membership is **nullable everywhere**. An item that has never been filed is
unfiled and shows at the root; a new content type joins by carrying a nullable
folder id, not by extending the tree.

### Rules that bind

- **`shared/folders/` is the tree**: `buildFolderTree`, `folderPath`,
  `childrenOf`, `descendantIds`, `countByFolder`, `validateFolderName`, and
  `useBrandFolders`. The transport is the folder half of `IAssetsService` —
  a historical name, not a meaning. Folders are brand-level.
- **Deleting a folder never deletes what is in it.** Items fall back to
  unfiled. A folder is an arrangement; losing an arrangement must not lose
  the work. The composite `ON DELETE SET NULL (folder_id)` FKs in 017 and 032
  enforce this in the database — a plain composite SET NULL would null
  `brand_id` too, which is NOT NULL, so the delete would raise and a folder
  could never be removed while it held anything.
- **The folder is a URL param of its own** (`?folder=`), separate from
  `?tab=`, which is what makes the context survive a tab switch. An id that no
  longer resolves yields the root, never a page pointing at nothing.
- **Subfolders render in EVERY tab.** A folder holding no designs must not
  vanish under Designs — losing the path under your feet is the disorientation
  a shared tree exists to prevent. Only ITEMS are filtered by tab; a folder
  tile's count follows the tab.
- **Search reaches into the whole subtree**, not one level. At the root that
  makes it a search of the brand.
- **Kit is the curated final set, not storage.** There is no "upload files
  into Kit". Upload is contextual to a SLOT (Business Card, Letterhead…) and
  the file becomes the version the brand owns for it, sitting beside what was
  generated. `itemOrigin(item)` is the only reader of provenance —
  `'generated' | 'uploaded'`, absent meaning generated — because "is this ours
  or theirs?" decides whether regenerating is safe. Brand Core is never
  touched, and a kit export is NEVER copied into the Library: two sources of
  truth is the thing to avoid. ("Save a copy to Library" can exist later as an
  explicit action.)
- **Kit tiles render at 260px and scale.** The renderers are authored for a
  ~260px card and starve when laid out wider, so `ScaledStage` lays out at 260
  and transforms — it never re-lays-out at the tile's width.

### The library grid

- **A preview never breaks.** `AssetPreview` mounts an `<img>` only for artwork
  a browser can draw; a PDF, font or video gets its glyph and an extension
  badge, and a failed load swaps to the same glyph.
- **A cached image fires `load` before React attaches `onLoad`**, so the effect
  checks `img.complete`. Without it every thumbnail already in cache — i.e.
  every asset on a second visit — stays at opacity 0 forever.
- **The well is chosen so the artwork can be seen.** `artworkTone.ts` samples a
  loaded image once per URL (24×24 canvas) and answers `opaque | light | dark |
  mixed`; light artwork gets a dark well in the light theme, dark artwork a
  light well in the dark theme. Everything else keeps the ordinary surface, so
  only the assets that would have vanished look different. This is the mirror
  of `shared/brand/logoOnBackground.ts`: there the background is known and the
  VARIANT is chosen; here the artwork is fixed and the background is ours.
- **Extension comes from the name, then the URL, then the mime type.** Names
  here are often written rather than uploaded ("Vector Logo — Primary (PNG
  @2x)"), and reading the name alone classified every seed asset as opaque.
- Actions appear on hover/focus only; a tile is a `div[role=button]` (it
  contains buttons) and keeps `overflow: visible` so its menu can escape.
- Deletes always confirm. Selection prunes ids that no longer exist.
- Uploads and new kit deliverables land in the folder you are standing in.
- Tests: `shared/folders/folderTree.test.ts` (17),
  `features/folders/__tests__/model.test.ts` (19),
  `foldersPage.browser.test.tsx` (30). Note: Chromium puts `DataTransfer` in
  protected mode outside a real user drag, so `types` reads empty through
  `fireEvent` — the drag tests define `dataTransfer` on the event, and the
  file/text rule itself is unit-tested via `dragCarriesFiles`.

**Not built, and known:** list view renders folders and Library items but not
Designs/Kit tiles (it shows a count and points at grid view); kit deliverables
are filed by menu rather than drag; there is no move-many.

## Guideline — the Brand Guidelines builder (rebuilt 2026-08-19)

**One route, one surface: `/b/:slug/guideline`.** A BUILDER, not a landing and
not a deck viewer. Before there is a guideline the page is nearly empty with one
action — **Build Brand Guidelines** — which writes a complete 30-page brand book
from the brand's own logo, palette, typography, imagery, motion and voice. After
that it is a vertical document with a rail and a panel beside it.

`/b/:slug/guideline/:templateId` and `/b/:slug/brand-guides` both redirect here.
There is deliberately no separate fullscreen editor, no template gallery and no
blank-document path.

**The chrome is the Studio's, not this feature's.** This is the rule the first
version of the builder broke, and the reason it was reworked:

| Need | Use | Not |
|---|---|---|
| app rail | **`DsRail`** — separate 43px cards, icon over label, charcoal active border, `value: null` closes the panel | a `gl-rail` container card with items inside it |
| page grid | **`.shell`** (+ `.gl-shell`, which only adds the rail column) | a bespoke grid |
| the panel | **`.panel` / `.panel-top` / `.panel-heading` / `.panel-list`** | a `gl-sidebar` card |
| a panel row | **`.panel-item > .panel-item-body > .panel-item-thumb + .panel-item-meta`** | a bespoke row |
| a group heading | **`.panel-group-label`** | a bespoke heading |
| top-bar actions | `WorkspaceShell`'s `rightActions` | anything else |

The feature-local CSS that remains is the guideline DOCUMENT — page cards, the
insert affordance, the empty state — plus a small form vocabulary
(`.gl-field`, `.gl-tool`) the house style has no equivalent for. Before adding
anything to `guideline.css`, check `workspace.css` and `@/shared/ds` first.

**The panel is compact by rule.** It shows values, controls and actions. It does
not restate which page you selected, print the page's position, describe what
the page is for, or hint under every field. If you selected a page you already
know which page it is.

**The Brand panel is a real entry point into the brand system**, not four text
fields: the brand's own sections (Logo · Colours · Typography · Iconography ·
Voice & Tone · Strategy · Website) with the brand's real values, and editing
goes through the editors Setup already owns — `ColorPickerHSV`,
`StrategyEditorModal`, `EmbeddedTypescaleDialog`. Nothing here reimplements a
brand control that exists.

**State lives in four places, and the split is load-bearing:**

| what | where | why |
|---|---|---|
| page list + guideline-scoped brand values | `model/guidelineDocStore.ts` (localStorage, per brand) | kilobytes, and it must be readable SYNCHRONOUSLY — it decides empty-state vs builder on first paint |
| a page's edited HTML | IndexedDB via `builder/useGuidelineSnapshots.ts` | megabytes; keyed so pre-builder edits still load |
| undo/redo over the document | `builder/useGuidelineHistory.ts` on `@/shared/history` | session-scoped; see the history section below |
| selection, scroll, open panel | component state | persisting a selection is noise |

**Rules that bind:**

- **`guidelineEditorKey(brandId)` is `brand-guides-${brandId}` and must not
  change.** Every edit anyone has made — including at the retired
  `/b/:slug/brand-guides` — is filed under it. A rename is not an error anyone
  sees; it is everyone's work quietly disappearing. Pinned by a test.
- **A page type id IS a persistence key.** The first instance of a type takes
  the type id verbatim as its instance id, and those ids are exactly the slide
  ids the old deck used (`cover`, `logo-grid`, `color-ratio`, …). A test lists
  them. Later instances are suffixed (`motion-2`).
- **Snapshots round-trip through `[data-slide-content]`** — the inner div of
  `shared/editor/blocks/EditableSlide`. Capturing the outer canvas (which
  `EditorWorkspace` does) nests one wrapper per save; harmless there because it
  saves on a click, fatal here because the builder autosaves. Legacy
  outer-canvas snapshots still render, and a browser test pins that.
- **Editing a brand value in the guideline does NOT touch the brand.**
  `GuidelineOverrides` holds the guideline's own primary/secondary colour and
  heading/body typeface; `applyGuidelineOverrides` merges them for rendering
  only. Override keys must stay exactly the brand fields the renderers read.
- **Every brand write goes through `model/brandWrites.ts`**, which is the Setup
  chain: `brandToMockBrand` → mutate → `mockBrandToPatch(next, brand)` →
  `useBrandStore.update`. `mockBrandToPatch` diffs a WHOLE MockBrand, so a
  hand-built partial emits destructive diffs — an empty `colors.core` wipes
  `primaryColor` and the neutrals. `editBrand()` removes that hazard by
  construction: the draft always starts from `brandToMockBrand`.
- **No brand write happens without a confirmation** that names what it affects.
  The panel raises a `BrandChange`; `GuidelineBuilder` confirms and applies it.
- **Modals and confirmations render in `GuidelineBuilder`, never in a panel.**
  `.panel` is `position: sticky`, which creates a stacking context, so a scrim
  mounted inside it paints under the document.
- **It is an APP SHELL above 1100px, not a scrolling page** (owner request
  2026-08-20 — "same style as the Design page"). `[data-workspace]` becomes a
  100vh column, `.gl-shell` claims what the top bar leaves, and
  `.gl-doc-scroll` is the only thing that scrolls; the rail and the panel are
  pinned by `align-self: start` in a `grid-template-rows: minmax(0, 1fr)` row.
  **Do not pin them with a sticky offset instead** — a sticky GRID ITEM
  stretches to its whole row by default, so its box already fills its
  containing block and has nowhere to travel. That is exactly how the rail
  scrolled away with a thirty-page document while `.panel`, which also sets
  `align-self: start`, looked fine. Below 1100px the shell goes back to one
  column and the page scrolls; the media query has to undo the height, the
  row template and both overflows. Two consequences: `.gl-page`'s
  `scroll-margin-top` is small, because the column already starts below the
  top bar, and every IntersectionObserver on this page takes the scroll
  container as its `root` — `rootMargin` expands the root rect only, never a
  clipping ancestor's, so observing the viewport silently loses the lead time
  that defers page rendering. Pinned by
  `guidelineBuilder.browser.test.tsx` → "the tools stay where they are",
  which has to widen Vitest's 414px default viewport first.
- **Adding a page type = one entry in `model/pageLibrary.tsx`.** The renderers
  are NOT ours — they live in the legacy `features/guidelines/` family
  (`pages/templates/*`), which is the strongest guideline artwork in the repo.
  Multiple layouts per type lands as a `variant` field on the instance plus a
  `variants` map here; deliberately not built.
- **Chapter numbers are derived from order**, never stored. The outline numbers
  every row by document position, dividers included.
- Only the SELECTED page is wrapped in the inline editor; pages far from the
  viewport are deferred until first approach.
- Tests: `__tests__/{document,guidelineDocStore,effectiveBrand}.test.ts` and
  `__tests__/guidelineBuilder.browser.test.tsx`.

**Not built, and known:** export and present (the retired deck editor had both
through `EditorWorkspace`, whose export is coupled to its own DOM refs); a
guideline published as a public web page; motion sections. None of these is
blocked by the current architecture — pages are data plus a renderer, so a
second renderer target is additive.

The legacy canvas editor at `/b/:slug/guidelines/canvas` is still **frozen** and
unlinked. It keeps its local-brand fallback (see the uuid gotcha below).

## The dashboard shows PROJECTS, not brands (2026-08-20)

`/dashboard` (the card grid, `pages/workspace/Home.tsx`) and `/dashboard/brands`
(the list) are two views of the same thing, and the thing is a **project**. A
project is not the brand inside it: someone can hold one identity twice — a
rebrand beside what it replaces — and needs to tell the two apart without
renaming the brand for the editor, the guidelines, every export and the public
page.

**`Brand.workspaceCard` is the whole of it** — `{ label, coverAssetId,
coverUrl }`, migration 031 `brands.workspace_card`, interpreted ONLY by
`shared/brand/workspaceCard.ts`. Rules that bind:

- **`brandCardLabel(brand)` is what both surfaces render.** `Brand.name` is
  untouched by anything on the dashboard and is edited only in Setup/Identity.
  The menu says **Rename project** and **Delete project** for the same reason.
- **A cover is identified by `coverAssetId`, never by a url.** It resolves
  against `brand.brandAssets` (the Library projection) at render time, so a
  replaced asset updates the card and a DELETED one *removes* the cover —
  falling back to a remembered url would keep material on screen that the brand
  no longer has. `coverUrl` answers only when there is no id at all.
- **Clearing writes `null`, not `undefined`.** `undefined` is dropped as "no
  change" by `splitCorePatch` and by the adapter alike, so an emptied card would
  silently keep its old value. `mergeWorkspaceCard` is the only place that
  decides this.
- **Pre-031 tolerance mirrors the onboarding marker**: the adapter drops the
  column when PostgREST refuses it and keeps the value in
  `services/workspaceCardFallback.ts` (localStorage, per browser), merged back
  in `mapFromDatabase`. A successful write naming the column FORGETS the local
  copy — left behind it would resurrect a card the user has since cleared.

**The card's face is the brand's, on the brand's own colour.** `brandCardFace` /
`useBrandCardFace` decide it once for BOTH surfaces — the grid paints a 240px
band, the list a 48px tile, one decision. Two rules, and their ORDER is the
design:

1. **The ground is the brand's colour.** It moves only when nothing the brand
   owns reads on it, and then only to `surfacePalette(brand,'inverted')` asked
   in both modes — the palette's brand-TINTED near-black and near-white. Never a
   neutral cream tile: a grid of those is a grid of beige squares with the brand
   taken out. (`BrandAvatar` keeps its neutral tiles for chrome elsewhere; the
   dashboard deliberately does not use it.)
2. **On that ground, Primary logo → Brand Icon → any other variant.** Priority
   chooses among variants that can be SEEN; it never promotes one that cannot.

**"Can be seen" is MEASURED, and measured as CLUSTERS** (`shared/brand/logoInk.ts`).
Two guesses failed here in turn, and the second is the instructive one:

- Assuming a coloured variant is inked in the brand's primary colour — the only
  colour the record carries — scored a yellow-mark-plus-dark-wordmark lockup as
  YELLOW.
- Measuring the artwork and AVERAGING it scored the same lockup as DARK: true of
  most of its pixels and useless, because on the brand's yellow card the
  wordmark read perfectly and the yellow mark vanished. **An average cannot
  answer "does this logo read", because a logo reads only if every part of it
  does.**

So `readLogoInk` returns the ink as quantised, merged clusters with their
shares, and `inkReadsOn` requires every cluster carrying ≥8% of the ink to clear
the floor — one failing cluster is a failing logo. `inkCoverage` is the
tie-breaker for artwork that reads nowhere in full (a light accent beside a dark
body wants two grounds at once): the card takes the (variant, ground) pairing
that loses least rather than falling back to an initial. Cached per url per tab,
mono roles skip it, and every failure falls back to the brand's primary colour.
`variantsInPriorityOrder` + `pickGroundForInk` in `logoOnBackground.ts` are the
reusable halves. `workspaceCard.logoRole` is the manual override — a forced
variant is not a suggestion, so the GROUND moves around it.

**The logo and the ground are ONE choice, so they are chosen together**
(`components/CardCoverModal.tsx`, "Change cover", owner request 2026-08-22).
`logoRole` alone could never fix an invisible mark: forcing a variant let the
ground move to suit it, so the pair the user set was not the pair they got.
`workspaceCard.coverBackground` is the other half, and it ENDS the search —
everything in `brandCardFace` below that check exists to guess a readable
pairing, and guessing again under a choice someone made while looking at it is
the bug, not the safeguard. The dialog shows the brand's logos over its colours,
and its preview is rendered by `brandCardFace` over a DRAFT card: a preview that
computed its own appearance would be a second opinion about the thing it claims
to preview. `brandCardGrounds` is the offered list — the brand's own colours
plus the two `surfacePalette(…, 'inverted')` extremes the automatic rule already
reaches for, so the manual list can express every answer the measurement could
have reached and the ones it could not. The full-bleed photo cover is a separate
menu item ("Use a photo") and is unchanged.

**Nothing in the band may overflow it.** Three separate guards, because this
failed twice: `resolveBrandCover` returns `{ url, fit }` and asks for `contain`
on a `kind: 'logo'` asset; `useBrandCover` then asks the IMAGE via
`useImageFit` — anything with a transparent field is artwork and is shown whole,
and only a demonstrably opaque photograph may crop (`contain` also wins while
the measurement is in flight). And the band image carries hard `max-height` /
`max-width` ceilings, because `width: auto` on an SVG with no intrinsic size
resolves to the CSS default rather than to the drawing, so a logo could be laid
out far wider than its band and merely clipped by it.

**Selecting projects** (`useProjectSelection` + `ProjectSelectionBar` +
`MoveToFolderModal`): a checkbox on the card, ⌘-click and Shift-click, and a
rubber band dragged across the grid, all sharing one piece of state so they
compose. The band starts only on empty space — it bows out when the press lands
on `a, button, input, [data-project-id]` — and measures in the SURFACE's
coordinates, so it stays put while the page scrolls. Escape clears.

**A folder is a NAME, not a record.** `workspaceCard.folder` is a string on the
card; the set of folders is whatever names the projects currently carry, so the
tab bar is derived and a folder disappears when the last project leaves it. No
table, no id, no migration, nothing to orphan. If folders later need to be
empty, renamed or nested they become a record then — and the stored names are
the migration. Bulk writes go one at a time and awaited: the store re-reads the
brand between writes, so firing them together would build each patch from a
stale copy.

**One menu, both surfaces.** `features/dashboard/components/BrandCardMenu.tsx`
owns the items, the dialogs and every write, and uses `DsModal` /
`DsConfirmDialog` / `DsInput` / `DsButton` — never shadcn. It opens on
right-click AND from a `⋯` button revealed on hover; a menu nobody knows about
is a menu nobody uses. `placement="end"` moves the button out of a list row's
action cluster; the menu itself is identical. Its CSS is deliberately UNSCOPED
(`brandCardMenu.css`) — the grid is inside `[data-workspace]` and the list is
not, so a scoped selector would style one and skip the other. `useAssetUpload`
lives in the cover picker child, which mounts only while the picker is open, so
twenty cards do not instantiate twenty uploaders.

Two rules that are easy to undo by accident:

- **Hover belongs to the SLOT, not the card.** The button has to be a SIBLING of
  the card — the card is a link, and a button inside a link is not a button — so
  a `:hover` on the card meant hovering the button did not raise the card, and
  the two read as unrelated widgets. `.bcm-slot:hover .ws-brand-card` (and
  `group-hover/slot:` on the Tailwind row) drives it, and both move by
  `--bcm-lift` so they travel together. Do NOT put a `transform` on `.bcm-slot`
  itself: `DsModal` renders in place with `position: fixed`, and a transformed
  ancestor would re-anchor it to the card.
- **"Edit brand" goes to `/b/:slug/setup` and "Share" to `/b/:slug/identity`.**
  Edit used to hard-code `/a/:slug/identity`, so the one action whose purpose is
  editing the brand was also the one that dropped the user into the alternate
  UI. (The Open and Brand Kit buttons still honour the user's own Interface
  preference — that is the setting working, not a stray `/a`.)
- **The name on the card IS the rename control.** `ProjectName` turns it into a
  field in place; the menu item opens the same write through `useProjectRename`,
  so there is one behaviour with two ways in. Inside a link, the click must
  `preventDefault` AND `stopPropagation`, the field must stop its own keydowns,
  and Escape must mark itself cancelled — otherwise the blur it causes commits
  the edit it was meant to abandon.

**A card edit is not a brand edit.** Renaming a project bumped `updatedAt`, so
the card the user had just touched jumped to the front of a recency-ordered grid
— whatever moved was by definition the thing they were looking at. Two things
fix it and both are needed: `brandStore.update` carries the old `updatedAt`
forward when the patch is card-only (`LocalBrandsService` honours a supplied
`updatedAt`; Supabase's `trg_brands_updated_at` still stamps now(), which is why
the second half exists), and Home's grid claims each brand's position ONCE —
only a brand it has never placed is sorted in, at the front.

## Undo / redo — `src/shared/history/` (2026-08-19)

**Do not add a tenth undo stack.** There were nine — a Fabric ring buffer, three
Fabric-JSON stacks, an IndexedDB HTML snapshot store, two contentEditable
`innerHTML` stacks and two hand-rolled `past`/`future` pairs in zustand stores —
with eight `window` keydown listeners between them and four different policies
on whether ⌘Z fires while the user is typing.

`shared/history` does not replace them. Those systems store genuinely different
things with genuinely different flush semantics, and three live inside the
`stable/editable-export-v1` freeze. What is now shared is the part that should
never have been duplicated: **which stack the user is in, what the keyboard
does, and what the UI shows.**

- **`HistoryRing<T>`** — moved here from `features/editor/adapter/` because
  `shared/*` may not import `features/*`. The old path re-exports it, so
  `FabricAdapter` is untouched. Ring buffer with two tiers (`commit` immediate,
  `snapshot` debounced), labels, and redo invalidation.
- **`createStoreHistory({read, write})`** — undo for a plain piece of state.
  `transaction(label, fn)` records ONE entry for a compound edit and absorbs
  nesting. **The baseline is captured at construction**, so the state must exist
  when you create it — a lazy baseline records the state as it was after the
  first mutation and silently costs the user their first undo.
- **`UndoScope` + `useUndoScope(scope)`** — a surface registers while mounted.
  The most recently registered scope wins, which matches how these surfaces
  nest. `useUndoState()` drives toolbar buttons.
- **`startHistoryKeyboard()`** — mounted once in `App.tsx`. ⌘Z / ⌘⇧Z / Ctrl+Z /
  Ctrl+⇧Z / Ctrl+Y. **It is a no-op when no scope is registered**, which is what
  lets it live beside the eight pre-existing ⌘Z listeners without changing any
  of their behaviour. It skips text-entry targets unless the scope sets
  `ownsTextInput` — inside an `<input>` the browser's own undo is what the user
  expects, and stealing it is the fastest way to make undo infuriating.
- **Not persisted.** History has broken this app once already:
  `shared/editor/historyStore.ts` grew to 1.5 MB of a 5 MB localStorage budget
  and brands silently stopped saving.

Two things are deliberately OUTSIDE any undo stack, and the reasons generalise:
a **confirmed global brand change** (an awaited remote write that can fail, can
fall back to a second code path in production, and repaints every other surface
— the confirmation is the safeguard), and **inline contentEditable text edits**
(the browser's own undo is correct there).

Adopting it for an existing surface is one `useUndoScope` call — `FabricAdapter`
already satisfies the shape (`undo`/`redo`/`canUndo`/`canRedo` plus
`batch(label, fn)`). Tests: `shared/history/*.test.ts` (41).

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
- `brandos:brand-kit:state` — per-brand deliverable lifecycle (kit items + customizations, incl. uploaded-deliverable provenance and folder membership)
- `brandos:library-folders:<brandId>` — LocalAssetsService's copy of the brand's folder tree (the shared Library/Designs/Kit tree; `public.brand_folders` when authed)
- `brandos:brand-kit:customizations` — per brand+variant card-editor saves (non-kit edits; migration source)
- `design_<brandId>` — legacy design editor autosave (Fabric JSON)
- `brandos:guideline-theme:<brandId>` — Guideline theme preset pick (legacy canvas editor)
- `brandos:guideline:docs` — the Brand Guidelines builder's documents, keyed by brand id (page list + guideline-scoped brand overrides). The page BODIES are not here — edited pages live in IndexedDB `brandos-snapshots/slides` under `brand-guides-<brandId>::<pageId>`
- `brandos:editor-shortcuts-dismissed` — editor shortcuts hint dismissal
- `brandos:setup-nudge-dismissed` — brand ids whose floating "finish setup" nudge has been dismissed (see the Brand Kit section)
- `brandos-theme` — light/dark, and the ONLY theme key. It is `next-themes`'
  `storageKey` as well as what `[data-workspace] data-theme` reads, via
  `shared/theme/useWorkspaceTheme.ts`. (Before 2026-08-18 these were two
  independent systems with two keys that could disagree, and the legacy editor
  mirrored one into the other on mount — restoring light on unmount.)
- `brandos:design:<brandId>:<designId>` — LocalDesignStorage body; when it overflows the ~5 MB quota (AI images as data URIs) the value is the marker `{"__idb":1}` and the body lives in IndexedDB `brandos-editor/kv` under the same key
- `brandos:ai-image:prefs` — Generate panel prefs (model, count, on-brand/raw)
- `brandos.ai.anon-session` — anon session id for the Anthropic proxy's rate limiting
- `brandos:workspace-cards` — dashboard card presentation (project name + cover)
  for brands whose database has no `workspace_card` column yet (pre-031). Per
  browser; the row always wins once the column exists
- `brandos:dev-bypass` — dev auth bypass flag
- `editor-tutorial-<slug>` — editor welcome tutorial seen

**User PREFERENCES are a different thing from the keys above, and they now sync.**
`brandos:preferences` is the write-through mirror of `public.user_preferences`
(migration 030), owned by `IUserPreferencesService`. Reads stay synchronous from
the mirror — zustand `persist` and `useState` initialisers cannot await — while
the server row is the source of truth reconciled on sign-in. The six pre-030
keys (`brandos:ui-preference`, `brandos-theme`, `brandos:inner-nav-open`,
`brandos:ai-image:prefs`, `brandos:features-seen`, `brandos-workspace`) are
still written by their own stores and are read ONCE to seed a user's first
server row; they are never deleted, so rolling 030 back loses nothing. The
two-way sync lives in `shared/preferences/preferenceBridge.ts` — add a
preference there, not by reaching into localStorage from a component.

Other genuine preference keys not listed above: `brandos:ui-preference`,
`brandos:inner-nav-open`, `brandos:features-seen`, `brandos-workspace`,
`brandos-onboarding-v4-theme`, `chronicle:mode`, `presentations-store`,
`cmdk:recent`, `brandos-learn-progress`.

## Onboarding — `/onboard-brand` (old UI, V3 pipeline — 2026-08-14)

**The interface is `features/onboarding-v4/` and it is FROZEN.** It was restored
verbatim from the `pre-brand-system-evolution` tag. Do not redesign, restyle or
rearrange it. Change it only when a requirement genuinely adds or removes a
field, section or action — and then change these files, never rebuild them from
a description.

**The step is in the URL.** One URL for a whole flow costs refresh-safety,
sharing and analytics, so each panel has an address:

| URL | Panel |
|---|---|
| `/onboard-brand` | 1 · Brand name only. Enter submits. |
| `/onboard-brand?step=details` | 2 · Describe + `BrandDropzone` (files, and the website/social pill) |
| *(transition)* | the 9-dot processing moment |
| `/onboard-brand/:slug?step=review` | 3 · "Review your uploads" → "Open my brand" |
| `/onboard-brand/create` | the from-scratch path (`screens/CreateScreen.tsx`) |

The router owns the panel — there is no `popstate` listener and no
`history.pushState`, so Back and Forward are ordinary route changes. **Never
guard re-entrancy on `history.state`**: a reload keeps the entry's state, so the
app remounts at panel 1 while history still says 2 and Continue goes dead.

Only the review URL is genuinely restorable, because the brand exists by then
and `project()` reads it back. `?step=details` on a cold load has no name to
show, so it redirects to `/onboard-brand` rather than rendering an empty form.

### What runs underneath — `features/onboarding/`

The V3 pipeline. `bridge/v4Bridge.ts` is the ONLY seam between the two, and it
moves data across it without deciding anything:

| Step | What happens |
|---|---|
| Continue | `createBrand` — brand-first, so every later edit is a write against a real id |
| | material → Library via `toLibrary`; **never inline on the brand record** |
| processing | `UnderstandingStage` + `understanding/stages.ts` |
| | `understand()` — interpret → `applyProposals` (system actor ⇒ `suggested`) → `applyBusinessFacts` |
| review | `project()` reads the canonical brand into the shape the old panel renders |
| edit | `editAsUser` / `accept` / `acceptSection` — a human write, which confirms that value |
| Open my brand | `finishOnboarding` → `/b/:slug/setup` or `?then=` |

**The review's store is a PROJECTION, not a source of truth.** An effect in
`UploadsReviewPanel` pushes the projection into `useV4Store` so the existing
controls render Core values; every edit writes straight back through the bridge.

### Rules that bind

- **Marker writes are read-modify-write.** `brand.onboarding` is written by
  create, by understanding and by finish. ALWAYS read it live at write time —
  from the store, or via `finishOnboarding`'s `live` callback. A stale snapshot
  resurrects state a previous write cleared; this bit us three times, most
  visibly when finishing re-added the sentinels and Setup then showed a real
  colour and typeface as undecided. Pinned in `sentinels.test.ts` and
  `onboardingState.test.ts`.
- **Adaptive understanding.** A recognisable brief (`brief/parseBrief.ts`,
  ≥3 labels at line starts) parses deterministically with NO assisted call;
  free prose goes to the assisted parse. `brief/prompt.ts` and `parseBrief.ts`
  are a two-way contract — a test pins their labels together. `data/typedPrompts.ts`
  re-exports the canonical builder, so the old badge hands over the new prompt.
- **Colours/fonts are two-mode.** Concrete values rank `brief`; offered
  `Directions:` rank `ai` and stay suggestions. An AI palette is never written
  as the brand's own.
- **Source priority** — user > uploaded > brief > AI — lives in
  `understanding/sources.ts`, and `mergeCandidates` is the ONLY place a
  `Proposal` is constructed (boundary test enforces it).
- **Controlled vocabularies** (`vocabulary/`): industry · style · personality ·
  tone · values. `Other` keeps the user's wording verbatim.
  `StyleDescriptor` is 17 members; `vocabularies.ts` must stay in sync with the
  union in `identity.ts` and the `z.enum` in `invariants.ts` — a test asserts it.
- **Industry and slogan are Business Info**, never mirrored into
  `positioning.category`. They save on edit; there is nothing to confirm.
- **Per-value acceptance only.** `understanding/acceptance.ts` is the sole
  promoter, hard-coded to `confirmed`. "Looks right" is a LOOP over it.
- **Never expose the model** — no "authority", "provenance", "suggested" as a
  status. A browser test scans the state-bearing elements.
- **Limits**: 10 files, 5 MB each, refused per item so a folder loses only its
  overflow (`material/limits.ts`, applied in `BrandDropzone`). `countUploads`
  counts FILES the user brought — not generated variants, links, colours, or a
  font we suggested, and one uploaded typeface counts once however many weights.

### The logo detector — `understanding/artwork.ts`

**It looks at the picture. The filename is a last resort.** `readArtwork(url)`
renders to a canvas and answers two questions, and those answers name the role:

| what it is made of | | how the pieces sit | |
|---|---|---|---|
| a symbol alone | `mark` | beside each other | `primary` |
| the name as type | `wordmark` | one above the other | `vertical` |

plus `tone`, which names the VARIANT rather than the role: light artwork was
drawn for dark grounds, so a light twin of a placed logo takes `dark`.

Rules that bind here:

- **Words are a wide run of several small pieces sharing a line; a symbol is a
  compact one.** No letters are read and none need to be.
- **The seam between symbol and name is the artwork's OWN widest gap**, and it
  must be conspicuous among the other gaps. Every fixed threshold tried either
  merged a tight lockup into one run or tore a wordmark in half.
- **Trim before hashing.** Untrimmed, a logo is mostly padding and every logo
  hashes alike. Also: Chrome draws NOTHING when an SVG with no intrinsic size is
  cropped by `drawImage`'s source-rect form — crop from the scan canvas instead.
- **Coverage, not colour**, so an SVG and its flattened export match — and
  `sameArtwork` compares tone as well, so a mark and its white twin stay two
  entries and both get a slot.
- Filename tokens are matched as WORDS. `"mark"` is inside `"logomark"`, which
  is how a wide logotype came out labelled Icon.

### The logo board — `onboarding-v4/panels/LogoSlots.tsx`

- Opens with **Primary only**. Other slots appear when an upload turns out to be
  one, or when the user asks by name. An empty slot is never conjured.
- **No "on light"** — that is the ordinary case. `light` survives in the
  `LogoSlot` union so old brands still render; nothing offers or places it.
- **`custom:<name>`** is a variant the user named. The name IS the key. Custom
  slots must appear in the role picker too, or they are a dead end.
- **A role we chose is a QUESTION.** `slotConfirmed` marks the user's answer,
  and nothing may overwrite a confirmed role — not the classifier re-running,
  not the board's own async router (which must re-check the live slot before it
  writes; it is asynchronous and its stale plan used to land last).

### Colour extraction — `onboarding-v4/utils/assetUpload.ts`

`extractDominantColors` answers "the colours this brand chose", not "the most
common colours" — that answer is nearly always the background. **Read the LOGO
first when there is one.** Three rules: the ground (what fills all four corners)
is removed; a colour sitting on the line between two picked colours is an
antialiased blend, not a decision; near-white is demoted only when no ground
could be identified, or a white-on-black logo loses its only colour.

### Brand Strategy (the section formerly called About)

**The eleven fields exist whether or not the prompt was used** — summary,
industry, products/services, audience, positioning, mission, personality, tone,
visual style, core values, slogan. Choices where a closed vocabulary exists,
prose where the meaning is in the wording, and "write your own" anywhere the
schema can hold it — everywhere except `visualStyle.descriptors`, a closed union
where a free word would fail validation and cost the whole save.

`strategy.summary` is its own Core path: the brief asks for a summary AND a
mission, and filing the summary as the mission kept only one of the two.

### Persistence — where each thing lands, and when

**Every onboarding action writes to the canonical brand as it happens. Finish
marks the brand done and navigates; it writes nothing else.** Four rules make
that true, each of them a bug that shipped once:

- **Finish must never patch `businessInfo`.** It is a single stored value, so a
  patch REPLACES it — writing `{ contact: { website } }` at the end deleted the
  industry, slogan, products and audience summary the understanding pass had
  already saved. The website is written by `applyBusinessFacts` when it is
  supplied, like every other fact. `FinishInput` no longer accepts business
  info at all.
- **A canonical write must survive its own read.** `toLegacyBrandPatch`
  deliberately does not write the `guidelines.*` mirror, and `resolveStrategy`
  reads only that mirror plus two legacy scalars — so summary, values,
  positioning, personality, target audience and the free-form About sections
  were durable in the `identity` blob and invisible on the next read. Only
  `mission` survived, on `brand.strategy`. `overlayStoredIdentity` now backfills
  strategy from the blob, legacy-first, so Setup and Classic keep precedence and
  the blob can only recover what the transport dropped.
- **The review is written back, not only read from.**
  `bridge/reviewWriteThrough.ts` is the inverse of `project()`. The frozen panel
  keeps mutating its transient store; `SetUpScreen` subscribes to that store and
  reconciles (debounced 400ms, and once on arrival — the panel's own projection
  effect runs BEFORE the parent's subscription, so change-only meant a user who
  touched nothing finished with an empty logo system). Finish awaits one last
  flush before `reset()`. A value that differs from what the brand holds is
  written as the user and confirmed; the typeface pairing the panel offers when
  a brand brought none is written as the interpreter so it stays `suggested` —
  but it IS written, because the review showed it.
- **Material is stored as BYTES.** `understanding/material.ts` reads `_file`
  (or fetches the object URL while the page is alive) into a data url and puts
  that in the Library, reusing `stageAsset`'s content-hash identity and the
  "use the id the Library returned" rule from `useAssetUpload`. Storing
  `previewUrl` made every upload a `blob:` row that resolved to nothing after a
  reload. Logos then get `logoSystem` REFS via `stageLogoRef` — never a url on
  the brand record. `SLOT_TO_ROLE` maps onboarding's owner-facing slot names to
  the model's artwork-facing roles (`dark` → `mono.white`, `mark` → `iconmark`,
  `vertical` → `stacked`); `custom:<name>` has no role and claims no slot.

Two readers were wrong in the same way and are fixed: `brandToMockBrand.mapLogos`
read `logoSystem.primary.url`, but a `LogoRef` is `{ assetId }` and never had a
url — so Setup showed a lettermark for every brand with a complete logo system.
It resolves through `resolveBrandLogo` now. And the dropzone's URL pill records
no `socialPlatform`, so `=== 'website'` matched nothing and the address the user
typed never became `publicUrl`; `linkKindOf` reads the host instead.

### Brand assets — the rules that bind everywhere

- **The brand's face is `@/shared/brand/BrandAvatar`.** Brand Icon
  (`iconmark`) → Primary logo → letter, in that order, contained (never
  cropped or stretched) on a neutral tile. Every chrome surface uses it —
  Studio switcher, Classic rail, brand chooser, editor picker, dashboard.
  Do not draw `name.charAt(0)` for a brand again.
- **A logo is a file holding a logo ROLE. Nothing else.** `category: 'logo'`
  is written only when the item has one. Format is never evidence: `.svg`
  used to qualify on its own, so every vector left Brand Assets for the logo
  board. Transparency alone is not evidence either — it counts only alongside
  artwork that reads as a mark (`logoClassify.looksLikeLogo`).
- **`placement: 'assets'` outranks every classifier.** Set by an upload made
  from inside Brand Assets; nothing may move that item out.
- **One variant vocabulary: `@/shared/brand/logoRoles`.** The review board and
  Setup both read it, so a variant has one name everywhere (Primary ·
  Secondary · Brand Icon · Wordmark · On dark · Horizontal · Vertical).
  "On light" is described but never offered.
- **Setup's logo board rules live in `setup/data/logoBoard.ts`** — add into a
  named role, promote to Primary (the two tiles TRADE, never drop one),
  change role, and remove with the primary protected (promote an heir, or
  refuse when there is none). Adding asks the role FIRST
  (`AddLogoVariantModal`); a tile with no role has no slot and cannot persist.
- **Links are cards, not browsers.** `@/shared/brand/LinkCard` reads Open
  Graph via `sitePreview.ts` (cached); `LinkPreviewModal` renders the site in
  a `sandbox="allow-scripts"` iframe. Embedding refusal is NOT detectable — a
  refused frame fires `load` like any other and `contentDocument` is null for
  refused and healthy cross-origin frames alike. The modal uses load TIMING as
  a heuristic to choose which view to offer, and every branch is overridable.

### Setup shows the same brand the review does

`/b/:slug/setup` is the surface onboarding hands off to, and the two must agree
field for field. They had drifted badly — Setup carried five free-form About
cards and nothing else — so the rules that keep them together:

- **`brandToMockBrand` reads the CANONICAL brand** (`fromLegacyBrand`), not
  `guidelines.strategy` / `guidelines.aboutSections`. Nothing has written that
  mirror since the canonical ops took over.
- **`MockBrand.strategy` holds the same eleven answers as the review**, defined
  once in `setup/data/strategyCards.ts` and rendered as cards in the section now
  called **Brand Strategy**. Seven are Core and write back under
  `guidelines.strategy` + `tone` + `visualStyle` (all routed by
  `splitCorePatch`); industry, products/services and slogan are Business Info.
  `about[]` keeps only the free-form headings the eleven cannot hold.
- **Two new write carriers** exist for canonical-only values with no legacy
  column: `guidelines.strategy.summary` and `Brand.visualStyle`. Both are ROUTED
  keys — they reach `changeBrandStrategy` / `changeBrandVisualStyle` and never
  the service as stored fields.
- **`businessInfo` is merged, never assigned.** One stored value; a patch
  replaces it.
- **A logo tile carries its `role`** (`BrandLogo.role`). The write-back is
  role-driven, and a board whose tiles all have roles is AUTHORITATIVE: the
  dict is built from roles alone and vacated slots are cleared. Label/position
  heuristics remain only for legacy tiles. Setup's `LOGO_ROLES` mirror
  onboarding's variants (Primary · Wordmark · Icon · On dark · Horizontal ·
  Vertical); "On light" renders for old brands but is never offered.
- **A logo uploaded in Setup is classified** by the same detector onboarding
  uses (`classifySetupLogo` → `readArtwork` + `roleFromArtwork`).
- **The setup nudge FLOATS; it is never in the flow**
  (`features/brand-setup/`, owner request 2026-08-22). `BrandSetupNudge` is a
  272px `position: fixed` card in the bottom-right corner of `/b/:slug/setup`,
  naming the sections that are still EMPTY. Two rules it exists to keep:
  nothing that merely SUGGESTS work may move the page the user came to look
  at, and the prompt belongs on the page where the work is done — it used to
  sit on Brand Kit, which is neither. z-90 keeps it under modals and overlays;
  dismissal is per brand id in `brandos:setup-nudge-dismissed`.
- **It is not a second progress meter.** `SetupSidebar` already reports all
  seven sections; the nudge names only the four that change how the product
  LOOKS, and each row is a shortcut — it hands `handleSidebarAdd` Setup's own
  `SectionKey`, which jumps to the board AND opens that section's add flow.
- **It must not hold a second opinion about what is missing.**
  `computeBrandSetupSteps` takes the `MockBrand`, the same projection Setup
  renders. Reading the raw `Brand` is what broke it before: it demanded `tone`
  or `audience` specifically while Setup counts Brand Strategy done on ANY of
  its eleven answers, so a brand Setup showed as complete was still being told
  to finish it. Pinned by `computeBrandSetupSteps.test.ts`.

### Brand Strategy — built with the user's own AI (2026-08-22)

The section has **two ways in, side by side in its header**: `+` is manual
(unchanged — every card still opens `StrategyEditorModal`), and **Build with AI**
opens `StrategyImportModal`. Get the prompt, run it in ChatGPT/Claude/anything,
paste the reply, tick what to keep.

- **The handoff menu is `@/shared/ai-handoff/AiPromptMenu`** (Copy prompt ·
  Open in ChatGPT · Open in Claude), promoted out of onboarding when it gained
  its second consumer. It owns its stylesheet (`aiPromptMenu.css`, the old
  `onb-ai*` rules renamed `aih*`) and takes the PROMPT AS A PROP — it knows how
  to hand one over and nothing about what is in it. `features/onboarding/brief/
  BuildWithAI.tsx` is now a wrapper that supplies the brief prompt.
- **The strategy prompt is a DIFFERENT prompt, deliberately**
  (`setup/strategy/strategyPrompt.ts`). It asks for the eleven strategy answers
  and forbids colours, typefaces and logos — a prompt that ranges wider than
  the section it fills is a prompt that quietly edits the rest of the brand.
  Answers the brand already holds are stated back as FACT, so the AI fills gaps
  instead of proposing a second brand alongside the first.
- **Prompt and parser are a two-way contract.** `STRATEGY_LABELS` +
  `LABEL_BY_KEY` are the single map the prompt, the parser and the board all
  read; a test asserts the prompt emits every label the parser knows, and that
  the eleven labels are exactly the eleven cards. Because we authored the
  labels this is a RECOGNITION — no assisted call, no key, no cost.
- **THE PARSER MUST REFUSE THE PROMPT. This shipped broken once.** The prompt
  is three inches from the paste box and every line of it is shaped like an
  answer: `Industry: pick ONE from: Real Estate · Hospitality · …`. That
  parsed — `Real Estate` is a real member so detection passed, then the first
  comma-separated item, `pick ONE from: Real Estate`, matched no member and the
  `Other` escape hatch stored the INSTRUCTION as the brand's industry. The
  escape hatch is right; letting instructions through it was not. Three layers,
  each catching what the one before cannot:
  1. **The whole text is the prompt** — two of `PROMPT_SENTINELS` is proof.
     Refused outright, with a message naming the mistake.
  2. **A value IS its own field's instruction** — compared against `ASKS`,
     which the prompt is BUILT from, so the check cannot fall behind the
     wording. Catches a hand-edited or part-filled prompt.
  3. **A value is instruction-shaped or is the option list** — an `Other` that
     opens like an instruction, carries a colon, or runs past 48 chars is not
     someone's own word; a vocabulary answer naming more than `max + 2` members
     is the menu, not a choice.
  `ASKS` and `PROMPT_SENTINELS` are exported from `strategyPrompt.ts` for
  exactly this, and tests assert every sentinel and every ask is really in the
  built prompt — a guard that silently stops firing is worse than none. The
  bias is deliberate: a refused paste costs one retry, an accepted one costs
  the user their brand strategy.
- **The user chooses which fields the prompt asks about** (`StrategyContext.ask`,
  the chip row in the modal, all ticked by default). A field left OUT that has
  a value is still handed over as settled context — "do not restate, stay
  consistent with" — so narrowing the ask never costs coherence. The chips say
  plainly which answers exist and which are empty, and "Only what is empty" is
  one click. Without this, every paste was an overwrite of everything.
- **The `+` (manual) flow gets AI help too**, because someone who pressed + has
  already decided they want to write something. `AboutEditorModal` takes an
  optional `buildPrompt(title)`; SetupPage passes `buildSectionPrompt`, which
  asks for ONE section as a plain paragraph with no label. Nothing to parse —
  the reply IS the content and goes straight in the box.
- **The parser reuses onboarding's machinery, it does not copy it.**
  `labelledBlocks` / `looksLabelled` / `afterColon` / `splitItems` are exported
  from `features/onboarding/brief/parseBrief.ts` and generic over a label list.
  The casing tolerance, the LLM's spacing around a slash, the three-label
  detection threshold and the rule that a blank line CLOSES a block each cost a
  bug to learn; a second implementation would relearn them.
- **A vocabulary answer is normalised, never coerced** (`normalize` →
  member or an honest `Other` with the wording intact), and capped by the
  card's own `max`. **Nothing is written until the user says so**: the paste is
  parsed live into a tick-list, and an answer that would REPLACE one the brand
  already holds says so — filling a blank and overwriting a decision are
  different acts. Applying is ONE `setBrand`, so an interrupted autosave cannot
  leave a half-applied strategy.
- **Seven of the eleven answers are now a choice, not a sentence.** `audience`
  and `positioning` joined industry · personality · tone · style · values as
  closed vocabularies (`onboarding/vocabulary/vocabularies.ts`), both `max: 1`
  with `allowsOther`. They stay SCALAR strings holding a vocabulary id, exactly
  like industry and tone — widening either to a list is a storage change
  (`targetAudience` and `positioning` are scalars all the way to the canonical
  brand), not a UI one. Older brands that stored a sentence there keep showing
  it: `labelFor` returns an unknown id verbatim.
- Prose stays prose where the meaning is in the wording: brand summary,
  products/services, mission, slogan.
- Tests: `setup/strategy/__tests__/*` (39) and
  `setup/components/__tests__/StrategyImportModal.browser.test.tsx` (14).
- **The On-dark tile is a dark GROUND, never a filter.** The `invert(1)` that
  used to sit on `.logo-tile.is-dark .logo-svg` is gone: the variant already IS
  the light artwork, so inverting showed a colour the brand does not own.
- **The Neutral ladder is generated and must never be written back.** It is 32
  pure greys drawn for every brand (`setup/data/neutralRamp.ts`); sending it
  back as `brand.neutrals` replaced the brand's own colours on the first save.
  `neutrals` = Core past primary/secondary + any grey that is not a ramp step.

### Migration 022 (`brands.onboarding`)

Its absence is tolerated on create and update. Two things make that real, and
both were broken:

- **PostgREST reports a missing column two ways** — `42703` from Postgres, and
  `PGRST204` ("Could not find the 'x' column … in the schema cache") from
  PostgREST's own payload check, which is what an INSERT/UPDATE actually hits.
  `missingColumnName` in `brands.supabase.ts` knows both.
- **Dropping the only field in a patch leaves an empty PATCH**, which matches no
  rows and answers `PGRST116` — a failed save for a write already honoured.

While the column is absent the marker lives in `onboardingMarkerFallback.ts`
(localStorage, per browser) and is merged back in `mapFromDatabase`, so an
unfinished brand still reads as unfinished. The row always wins when it has one.

## Auth — one controller, one login, one guard (rebuilt 2026-08-17)

The auth session layer was rebuilt after twenty stacked `fix(auth)` patches
(each racing the previous one). The rules that now bind:

- **`src/features/auth/session/authController.ts` is the ONLY owner of the
  Supabase auth lifecycle.** `AuthProvider` calls `startAuthController()` once
  (idempotent, StrictMode/HMR-safe). It subscribes ONLY to
  `supabase.auth.onAuthStateChange` — supabase-js v2 always emits
  `INITIAL_SESSION` (session or null) — with one bounded fallback: no
  `INITIAL_SESSION` within 6s (a hung navigator.locks lock) marks the visitor
  a guest, and a later event still upgrades. Do NOT add `getSession()` races,
  extra timers, or a second store writer anywhere.
- **`becomeAuthenticated(user)` is idempotent BY USER ID.** The DI swap
  (`reconfigureForAuth(true)`), `sessionStore.signIn`, and the store reloads
  (`workspaceStore.loadAll`, `useBrandStore.loadAll`, onboarding sync→load,
  `migrateLocalStorageToSupabase`) run once per signed-in user; a
  `TOKEN_REFRESHED` for the same user only refreshes the user object. When you
  add a new auth-aware store, wire it into `runSignedInSideEffects` /
  `becomeGuest` — nowhere else.
- **Never clear `brandos:brands` on sign-in** — `migrateLocalStorageToSupabase`
  reads that key (the old P0 wipe, R-03, is closed).
- **Every action resolves AFTER the store is updated** (`signInWithPassword`,
  `signUp`, `signOut`, …), so a caller may `navigate()` the moment the promise
  settles. `AuthModal` uses only these actions — never `supabase.auth.*`
  directly, and never seeds the store itself.
- **`useAuth()` is a thin selector** (same public API: user/isAuthenticated/
  isLoading/roles + login/register/loginWithGoogle/logout/resetPassword). It
  owns no effects and no `useNavigate`. `logout` does not navigate — the
  caller does (`UserMenu` → `/`).
- **`ProtectedRoute` is the only guard.** It redirects at RENDER time with
  `<Navigate state={{from}}>`; `/login` returns the user to `from` (via
  `safeNext` — same-origin paths only). `role="moderator|admin|super_admin"`
  waits for `sessionStore.roleResolved` before admitting or bouncing, so a real
  admin is not bounced on first paint. Don't add a second guard inside pages.
- **OAuth + email links use PKCE and land on `/auth/callback?next=…`**
  (`flowType: 'pkce'` in `integrations/supabase/client.ts`). The page waits for
  the controller to flip the store, then forwards to `next`; `?error=` /
  `error_description` are shown. **Supabase → Authentication → URL
  Configuration → Redirect URLs must list** `<origin>/auth/callback` and
  `<origin>/auth/reset-password` for every origin (localhost:8080 + prod).
- **Sign-up is confirmed with an e-mailed CODE, not a link** (owner request
  2026-08-18). Supabase auth config: `mailer_autoconfirm=false`,
  `mailer_otp_length=6` (Supabase's minimum — 4 was refused by the API),
  `mailer_otp_exp=900`, confirmation template renders `{{ .Token }}`. Flow:
  `signUp` → no session → `AuthModal` code panel (`InputOTP`, auto-submits at
  `SIGNUP_CODE_LENGTH`) → `verifySignupCode` (`verifyOtp type:'signup'`) →
  session → `becomeAuthenticated`. Logging in with an unconfirmed address
  re-sends the code and opens the same panel. There is no confirm-password
  field. **Until custom SMTP is configured, Supabase's built-in mailer only
  delivers to project team-member addresses and rejects others with
  `email_address_invalid`** — real sign-ups need an SMTP provider set in the
  Supabase dashboard (Authentication → SMTP).
- **Password reset:** `sessionStore.recovery` is set by `PASSWORD_RECOVERY`;
  the reset page is valid when that flag is set or the link carried a recovery
  hash / PKCE code and a session now exists.
- **Dev bypass** (`VITE_DEV_BYPASS_AUTH=true`, DEV builds only) lives in the
  controller; it seeds `DEV_BYPASS_USER` + `super_admin` and never subscribes
  to Supabase.
- Tests: `session/authController.test.ts` (event → store contract),
  `components/ProtectedRoute.test.tsx`, `components/AuthModal.test.tsx`.
- Backend gotcha found the same day: `wm_select_fellow` /
  `workspaces_select_member` recursed (`42P17`) for every user — migration 024
  routes both through the SECURITY DEFINER `is_workspace_member`.

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
