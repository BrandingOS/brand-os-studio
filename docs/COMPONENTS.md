# BrandOS — Component Inventory

> **READ THIS BEFORE BUILDING ANY UI.**
> If a component listed here covers what you need, USE IT. Don't fork it,
> don't reimplement it, don't make a "v2" beside it. If it's missing
> something, ADD the missing thing to the canonical component — don't
> create a sibling.
>
> The visual bugs we keep shipping (asset thumbnails overflowing cards,
> "header above header", different shells per page) all come from the
> same root cause: silently re-implementing components that already exist.
> This file is the contract that stops that.

---

## How to use this document

1. **Before adding a component, search this file.** Ctrl-F for the noun
   ("asset card", "page header", "rail").
2. **If it exists, import the canonical one.** Don't paste markup.
3. **If it doesn't quite fit**, add a prop or a variant to the canonical
   component. Don't make a sibling.
4. **If you do add something new**, add an entry here in the same commit.
5. **If you find a duplicate of something listed here**, delete the
   duplicate and route its callers through the canonical one. The user
   has explicitly asked for centralization — this is part of the deal.

---

## Layout shells (one per scope)

| Component | Path | Used when |
|---|---|---|
| **`AppShell`** | `src/shared/layouts/AppShell.tsx` | Low-level shell primitive. You almost never use this directly — pick one of the scoped shells below. |
| **`DashboardShell`** / **`DashboardLayout`** | `src/shared/layouts/DashboardShell.tsx` · `src/features/dashboard/components/DashboardLayout.tsx` | Workspace pages: Home, Brands, Templates marketplace, Learn, Settings. Mounts AppRail (workspace mode) + DashboardNavbar. |
| **`BrandRouteLayout`** | `src/shared/layouts/BrandRouteLayout.tsx` | Brand-scope pages. Mounted ONCE as the parent route element for all brand routes — pages render via `<Outlet />`. Pages publish their config (innerNav, maxWidth, brandName) via `useBrandPageConfig`. **Do not mount BrandLayout from inside a page.** |
| **`BrandLayout`** | `src/features/brand/components/BrandLayout.tsx` | The actual brand chrome (AppRail + InnerNavRail + BrandNavbar + content). `BrandRouteLayout` mounts this. Pages should NOT mount it directly. |
| **`EditorShell`** | `src/shared/layouts/EditorShell.tsx` | Fullscreen editors (design editor, brand-guides slide editor, guidelines canvas). Tagged `stable/editable-export-v1` — do not refactor. |
| **`OnboardingShell`** | `src/shared/layouts/OnboardingShell.tsx` | First-run flows. |

### Layout helpers (for pages mounted under `BrandRouteLayout`)

- **`useBrandPageConfig({ brandName, maxWidth, innerNav })`** —
  `src/shared/layouts/brandPageConfig.ts`. Pages call this to publish
  layout config to the parent shell. **Memoize `innerNav` with `useMemo`**
  or the publish effect will churn on every render.

---

## Navigation rails

| Component | Path | What it is |
|---|---|---|
| **`AppRail`** | `src/shared/layouts/AppRail.tsx` | The slim 88px global rail. Scope-aware: shows workspace items in the dashboard, brand items inside a brand. Brand switcher in the top slot, Settings + UserMenu at the bottom. **Only one rail per scope. Add new top-level destinations here.** |
| **`InnerNavRail`** | `src/shared/layouts/InnerNavRail.tsx` | The contextual secondary rail (the 240px column right of AppRail, inside brand scope). Mounted by `BrandLayout` when a page declares `innerNav` via `useBrandPageConfig`. Items can be in-page anchors (smooth-scroll) or href links (route nav). **Pages do NOT mount this directly.** They publish a config. |
| **`BrandNavbar`** | `src/features/brand/components/BrandNavbar.tsx` | The slim h-14 topbar inside a brand. Has the back-to-Dashboard link, breadcrumb (Brand · Section), search, notifications, help. |
| **`DashboardNavbar`** | `src/features/dashboard/components/DashboardNavbar.tsx` | The slim h-14 topbar in the workspace. |

### Hook utilities for the inner rail

- **`useActiveAnchor(anchors: string[])`** — `src/shared/layouts/InnerNavRail.tsx`.
  Returns the currently in-view section anchor. Pair with `InnerNavRail`'s
  `activeAnchor` prop so the matching item highlights.

---

## Page header

| Component | Path | What it is |
|---|---|---|
| **`PageHeader`** | `src/shared/ui/PageHeader.tsx` | The canonical page-level header. Title, optional subtitle, optional eyebrow, actions slot, optional below-slot for tabs/filters. **Every page uses this.** Do not roll your own `<div className="mb-8 flex items-center gap-4"><h1>...</h1></div>`. |

Brand pages should NOT pass a `breadcrumb` to PageHeader — `BrandNavbar`
already shows the brand · section breadcrumb. Use the breadcrumb only for
workspace-scope pages where there's no other context.

---

## Asset thumbnails — the canonical card

| Component | Path | What it is |
|---|---|---|
| **`<AssetCard />`** | `src/shared/ui/AssetCard.tsx` | The standard square asset card. Thumbnail well on top (object-contain so logos fit, never crop), title + subtitle row in its own padded section below. **Used everywhere brand assets are listed.** Currently: Folders grid, dashboard "Recent assets" row. Subtitle is configurable — Folders passes the category, dashboard passes the brand name. |
| **`<AssetThumb />`** | `src/shared/ui/AssetCard.tsx` | The small inline thumbnail (40×40, rounded, padded, object-contain). Used in list-view rows where you don't want the full card. Currently: Folders list view. |

**Do not** write a `<button class="aspect-square overflow-hidden ..."><img class="object-cover" /></button>` block anywhere. Three different files
were written this way and three different times the SVG thumbnails
overflowed the cards. The only correct way to render an asset is via
`<AssetCard />` or `<AssetThumb />`.

---

## Asset picker — the canonical "give me an image" UI

| Component | Path | What it is |
|---|---|---|
| **`<AssetPicker />`** | `src/shared/ui/AssetPicker.tsx` | Two-path popover for any control that needs the user to choose an image: **Upload from device** (file picker) + **Pick from brand assets** (grid of existing brand assets). Trigger is whatever clickable element you pass — a button, an empty slot, an icon — and the popover opens beside it. Pass `brand`, `accept`, `filter`, `onUpload`, `onPick`, `trigger`. Currently: LogoUploader empty slots in Setup. |

**Do not** add another `<input type="file" />` to the codebase. Use this.
The product previously had ~17 separate file inputs scattered across
brand kit, editor tools, onboarding, and brand setup, each with its own
validation rules and UI. Migrate them to AssetPicker as you touch them.
If you need a feature it doesn't have (e.g. multi-file upload, accept
non-images), add a prop here — don't fork.

Open migration tasks (not yet using AssetPicker):

- `src/features/dam/components/AssetUploadZone.tsx` — drag-drop ZONE for the Folders page. Different UX (entire surface is a drop target, no popover) — leave it as the dedicated upload zone, but reuse the same validation/compression utilities.
- `src/features/onboarding/components/steps/UploadAssetsStep.tsx` and friends — first-run flows where there are no brand assets yet. Could still use AssetPicker (the brand-assets section will just show empty state), or leave as a simple file input.
- `src/features/editor/tools/LogoTool.tsx`, `src/shared/editor/blocks/FloatingToolbar.tsx`, `src/shared/editor/BackgroundPopover.tsx`, `src/shared/editor/InsertMenu.tsx`, `src/features/editor/components/ToolPanel.tsx` — editor surfaces. **Inside the off-limits editable-export baseline** — only refactor with explicit approval.
- `src/features/brandkit-v2/BrandSettingsHub.tsx`, `src/features/brandkit/components/AssetManagerModule.tsx` — brand kit upload surfaces.
- `src/features/logo-presentation/components/*` — logo presentation flow.
- `src/features/ai/components/AIAssistantBox.tsx` — AI assistant attachment input.

---

## Primitive UI — shared/ui

These wrap or extend the shadcn primitives in `src/components/ui/`:

| Component | Path |
|---|---|
| `Badge`, `Button`, `Card`, `Input` | `src/shared/ui/{Name}.tsx` |
| `Container` | `src/shared/ui/Container.tsx` — page max-width wrapper (legacy; prefer the layout's `maxWidth` prop) |
| `PageHeader` | `src/shared/ui/PageHeader.tsx` (see above) |
| `Section` | `src/shared/ui/Section.tsx` — section title + subtitle helper |

For lower-level shadcn primitives, use `src/components/ui/*` (button,
dialog, dropdown-menu, etc.). Don't reach inside Radix directly.

---

## Stores (Zustand)

| Store | Path | Purpose |
|---|---|---|
| **`useBrandStore`** | `src/shared/store/brandStore.ts` | The brand list + currently active brand. Source of truth for brand data across the app. |
| **`useSessionStore`** | `src/shared/store/sessionStore.ts` | User session state. |
| **`useFeatureIndicatorStore`** | `src/shared/store/featureIndicatorStore.ts` | Tracks which "new feature" badges have been seen. |
| **`useBrandPageConfigStore`** | `src/shared/layouts/brandPageConfig.ts` | The bridge between brand pages and `BrandRouteLayout`. Pages publish layout config here; the parent layout reads it. **Do not call `setConfig` directly** — use `useBrandPageConfig`. |

---

## Service container (DI)

Services are registered in `src/core/boot.ts` and accessed via:

```ts
// In hooks/components:
import { useService, SERVICE_KEYS } from '@/core';
const brands = useService<IBrandsService>(SERVICE_KEYS.BRANDS);

// In stores (via the compatibility bridge):
import { services } from '@/shared/services/registry';
await services.brands.list();
```

See `src/core/contracts/` for the available service interfaces.

---

## Off-limits surfaces

These exist and work — **do not refactor through them.** Tagged
`stable/editable-export-v1` per the project memory. Touching them risks
breaking the export pipeline.

- `src/shared/services/export/vectorize/*` — the editable export pipeline.
- `EditorWorkspace` and the `/dashboard/brand/:slug/brand-guides` page —
  the deep slide editor.
- `src/features/guidelines/editor/*` — wraps the editor workspace.

If you need to pass through one of these surfaces, leave them alone and
work around them.

---

## Routing reference

- Brand-scope canonical paths live under `/dashboard/brand/:slug/...`,
  with short-form aliases at `/b/:slug/...`. Both are nested under
  `BrandRouteLayout`. Add new in-shell brand routes as nested children
  inside both parent routes in `src/App.tsx`.
- Fullscreen editor routes (brand-guides, guidelines/canvas, etc.) stay
  as flat sibling routes — they intentionally bypass the brand shell.
- Legacy paths that have been renamed (e.g. `/dam` → `/folders`) are kept
  as child redirects inside the same parent so old bookmarks land in the
  new home WITHOUT escaping the persistent shell.
