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

- `EditorChrome` (`@/features/editor/core`) — canonical editor topbar.
  Use this in every editor.
- `useAutoSave` (same import) — debounced auto-save with normalized
  save-state machine. Pair with `EditorChrome`'s save indicator.
- **`EditorWorkspace` and `src/shared/services/export/vectorize/*` are
  off-limits** — tagged `stable/editable-export-v1`. Don't refactor
  through them. The editor unification works around them.

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
