# BrandOS — Architecture Guide

> **Read this first if you're planning UX or IA work**: `docs/ux-redesign/`
> contains the canonical IA, page templates, user flows, and the
> append-only execution log. The five-section brand IA, the page-shell
> rules, and the editor primitives all live there. Do not start a UX task
> against the assumption of the legacy structure.

## UX & IA — current structure (post-redesign)

BrandOS has **three scopes**: Workspace · Brand · Editor. Each scope has
exactly one sidebar and one shell. See `docs/ux-redesign/ARCHITECTURE.md`.

**Workspace sidebar** (`/dashboard`): Home · Brands · Templates · Learn · Settings
(Logo Maker is brand-scoped — saved into a brand via the LogoExportPanel
"Save to Brand" flow. Don't re-add it as a workspace entry.)

**Brand sidebar** (`/dashboard/brand/:slug/...`): five sections only —
Overview · Identity · Assets · Guidelines · Share. The previous 7-item nav
plus 18-item brandkit submenu is gone. Don't re-add items to the brand
sidebar without justifying it against §3 of `ARCHITECTURE.md`.

**Identity** (`/dashboard/brand/:slug/identity`) is a tabbed page that
inline-mounts the brandkit identity modules: Logo · Colors · Typography ·
Voice · Strategy. Active tab persists to `?tab=`.

**Assets** (`/dashboard/brand/:slug/assets`) is a filterable categorized
hub: All · Print · Social · Screen · Utility. Active category persists
to `?category=`.

**Share** (`/dashboard/brand/:slug/share`) is the outbox — public
showcase link, logo presentation deck, brand guidelines export.

**Short-form URLs**: `/b/:slug/...` aliases exist alongside the legacy
`/dashboard/brand/:slug/...` paths. Both work; the long form is what most
internal code currently uses.

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
