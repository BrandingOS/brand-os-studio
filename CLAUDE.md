# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BrandOS — Architecture Guide

## Build & Dev Commands

### Main app (project root)
```bash
npm run dev          # Dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (single run)
npm run test:watch   # Vitest in watch mode
npm run test:coverage # Vitest with V8 coverage
```

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
| 1 | Auth/permission gates, 404/403 polish, deep linking, share URLs, brand-picker URL nav, suspense boundaries on `/b/:slug/design/:designSlug` | Step 9 commit 3a forward-pulled the route from Phase 4.5 to unblock the brandkit migration | **Phase 4.5** | Open |
| 2 | `TemplatePreviewModal` half-mounted in `TemplateGallery` — only the quick-download fallback path triggers it | Step 9.3 commit 3b kept the modal mounted to keep the migration commit small | **Cleanup pass before Phase 4 templates** | Open |
| 3 | Mockup family deferred from brandkit migration — `/b/:slug/brandkit/mockups` renders a "coming soon" placeholder, no template card | Step 9.3 commit 3b — mockup studio is its own feature, not a brandkit module | **Post-Phase-5 (mockup studio phase)** | Open |
| 4 | `/_dev/editor` is still the primary manual-test surface for the unified editor; the production route exists but launchpad's "Design with AI" is the first user-visible entry | Pre-Phase-3.5; partially addressed by 3.5 commit 9's launchpad re-point | **Phase 4.5** (when Templates → editor links land) | Partial — launchpad now has 1 entry; templates browser still pending |
| 5 | Mode 1 (zero-state generate) not yet wired — needs Phase 4's template library | Phase 3.5 spec §2 (out of scope) | **Phase 5** | Open |
| 6 | AI image generation absent | Phase 3.5 spec §2 | **Phase 5+** | Open |
| 7 | AI for resize variants — Phase 6 owns the reflow pipeline; AI not yet integrated | Phase 3.5 spec §2 | **Phase 6** | Open |
| 8 | Streaming responses — request → wait → apply for now; "Thinking…" indicator only | Phase 3.5 spec Q7 | **Phase 5 if user feedback demands** | Open |
| 9 | Skill chips deferred | Phase 3.5 spec Q4 | **Post-Phase-5 (data-driven)** | Open |
| 10 | `brand-guides` family routes through legacy `/b/:slug/guidelines` instead of the unified editor | Step 9.3 commit 3b — intentional, the legacy guidelines editor is its own dedicated multi-page UI | **Phase 4** (template-first guidelines) | Open |

Closed during 3.5: ~~"4 carve-outs remain"~~ — went 4 → 2; the
remaining 2 (`logo-maker/flow`, `editor/components`) are documented
above with their explicit kept-because reasons.

The vision doc's "Phase 3 — Shipped" (§8.5) and "Phase 3.5 —
Shipped" (§8.6) sections carry the same debt items; if you update
one, update the other.

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

## Radix Portal + scoped CSS (gotcha)

Radix `Popover`, `Dialog`, `DropdownMenu`, `Select`, etc. render their content
inside a `Portal` that mounts under `document.body` — **outside** any
cosmos/workspace wrapper. CSS rules written as `[data-cosmos="workspace"] .x`
never apply to portaled content.

**Rule.** When styling the interior of a Radix popover/dialog/menu:
- Use unscoped selectors (no `[data-cosmos=...]` prefix).
- Reach theme tokens via `hsl(var(--muted))` / `hsl(var(--foreground))` /
  etc. so light + dark mode still work.
- If you need cosmos-scoped styles for the trigger (not the content), that's
  fine — the trigger isn't portaled.

This caught us on the Typescale `FontPicker` (2026-04-24) where the Aa-swatch
items rendered as unstyled run-on text until the scope prefix was removed.

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

**Security constraint**: `VITE_ANTHROPIC_API_KEY` is currently inlined into the client bundle at build time. This MUST be moved behind a server proxy (Supabase Edge Function) before deploying the main app publicly. The landing page does not use this key and is safe to deploy as-is.

> **AI proxy migration paused at Step 1 — see issue #2. MUST complete before public launch.**

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
