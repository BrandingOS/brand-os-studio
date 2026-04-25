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
| **`CosmosWorkspaceShell`** | `src/shared/layouts/CosmosWorkspaceShell.tsx` | The cosmos-tokenized workspace chrome (centered segmented nav, B-mark or `BrandSwitcher` in top-left, theme toggle, optional `rightActions` slot). Used by `/setup`, `/tools/typescale`, `/tools/ui-color-system`, and both Mockup Studio modes (`/tools/mockup-studio`, `/b/:slug/tools/mockup-studio`). Auto-detects `/b/:slug/*` and swaps the B-mark for the brand switcher. Wraps content in `[data-cosmos="workspace"]`, so any tool-local CSS must scope under that selector — **except** styles for content portaled via Radix (popover/dialog/dropdown). The active-tab pill measures position via `offsetLeft / offsetWidth` (NOT `getBoundingClientRect`) so the open keyframe's `scale(0.96)` doesn't poison the measurement. |

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

**Brand pages must pass `compact`.** In brand scope the page name is
already shown in the InnerNavRail header AND in the BrandNavbar
breadcrumb. The visible PageHeader title would be a third copy. Compact
mode hides the visible title/subtitle/eyebrow (the `<h1>` is kept as
`sr-only` for screen-reader accessibility) and renders only the actions
row + belowSlot. The header collapses to nothing visible if there are
no actions and no belowSlot — exactly what some brand pages want.

Workspace pages (Home, Brands, Templates, Learn, Settings) do NOT pass
`compact` — they need the visible title because there's no inner rail
above them.

Brand pages should also NOT pass a `breadcrumb` to PageHeader —
`BrandNavbar` already shows the brand · section breadcrumb. Use the
breadcrumb only for workspace-scope pages where there's no other context.

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

## Typescale tool (`src/features/tools/typescale/`)

> **Tool is preview-only except for fonts.** `brandStore.setTypescale` writes
> only `brand.fonts.primary` / `brand.fonts.secondary` when the heading or
> body family changes. Scale, ratio, leading, tracking, semantic map, and
> activeSurface stay in local draft state and are thrown away on reload.
> Do not add back the typescale/typography dual-write — the user deliberately
> simplified this so non-experts can't break the brand's type system.

| Component | Path | Purpose |
|---|---|---|
| **`TypescaleEditor`** | `components/TypescaleEditor.tsx` | Root editor. `variant: 'full' \| 'compact'`. Full = cosmos `.shell` grid (sidebar + board). Layout: Font Pair always visible, everything else (Surface, Scale ratio, Scale knobs, Roles) under a single outer Advanced collapsible. |
| **`FontPicker`** | `components/FontPicker.tsx` | Popover + cmdk search. Each row is an Aa swatch + font name, both rendered in that font (Figma-style). Groups: Your uploads / System / Sans / Serif / Display / Mono. Lazy-loads Google Fonts via `ensureLoaded`. **CSS for the popover interior is unscoped** — Radix Popover portals to `document.body`, outside `[data-cosmos="workspace"]`. |
| **`FontPairPanel`** | `components/FontPairPanel.tsx` | Two `FontPicker` slots (heading + body) + a single full-width "Upload custom font" button. Clicking opens the dropzone; after staging, the user picks "Use as Heading" or "Use as Body". |
| **`ScaleControls`** | `components/ScaleControls.tsx` | Visual 2×4 ratio card grid + base/steps/leading/tracking/fluid knobs. No inner collapsible — the outer Advanced in `TypescaleEditor` is the only one. |
| **`SurfaceTabs`** | `components/SurfaceTabs.tsx` | Web · UI · Presentation · Social segmented control. Uses `.ts-surface-tabs` / `.ts-surface-tab` classes (don't use the `editor-cats` classes — those are scoped to color-system CSS and won't load here). |
| **`SemanticMap`** · **`ExportPanel`** · **`BrandSyncBar`** | `components/*.tsx` | Role-to-step table, 9-format export drawer, brand-sync chip with Pull + Reset actions. BrandSyncBar copy makes the preview-only contract explicit. |
| **`PreviewTabs`** | `components/preview/PreviewTabs.tsx` | `{editorial, ui, ladder}` × `{plain, creative}` = 6 renderers. `accentColor` prop threads the brand primary into creative mockups. |
| Plain previews | `components/preview/{EditorialPreview,UIPreview,LadderPreview}.tsx` | Flat text-only renderings. |
| Creative mockups | `components/preview/{EditorialCreative,UICreative,LadderCreative}.tsx` | Designed mocks: magazine spread, product dashboard, typographic poster. |
| **`EmbeddedTypescaleDialog`** | `EmbeddedTypescaleDialog.tsx` | Mounts `TypescaleEditor variant="compact"` inside a shadcn Dialog. Wired into Identity → Typography, Brand Board → TypographyPanel, Brand Setup. **Compact variant still uses native `<select>` + bare Tailwind from before the cosmos redesign — known follow-up.** |

Engine + exports are pure TS under `engine/` and `export/`. `mirrorTypographyFromTypescale` in `src/shared/store/brandStore.ts` is still exported (used by `materializer.ts` for the anon-session claim flow) but **not called by `setTypescale` anymore**.

Global typography primitives: `src/shared/typography/{fontCatalog, fontLoader}.ts`. `ensureLoaded` is idempotent for google/system but always re-injects for upload (blob URLs change).

Tool-local styles: `src/features/tools/typescale/typescale.css`. Classes prefixed `.ts-*`. Most selectors are scoped under `[data-cosmos="workspace"]` — **except** `.ts-fontpicker-*` which must be unscoped because Radix Popover portals the content to `document.body`.

---

## Case-study deck (`src/features/case-study-deck/`)

Shipped 2026-04-24. The Behance-style adaptive presentation feature. Lives at
`/b/:slug/case-study` and exports to PDF / PNG-zip via `html2canvas + jsPDF + jszip`
(reuses project deps — don't install another export lib). Every piece of brand
state (`logoSystem`, `colorSystem`, `typography`, `guidelines.strategy`,
`brandAssets`) is read through the **director**; slides don't reach into the
`Brand` type directly. If a slide needs new brand data, extend `buildProfile()`
in `director.ts` so the whole feature sees it — do not inline
`brand.colorSystem?.primary?.hex` into a slide file.

| Component | Path | Purpose |
|---|---|---|
| **`directDeck(brand) → DeckPlan`** · **`buildProfile(brand) → BrandProfile`** | `director.ts` | Pure. No React, no DOM, no storage. Reads personality + palette + assets → picks archetype variants. `BrandProfile` is the single read-only view the slides render against. |
| **`SlideFrame`** | `SlideFrame.tsx` | Canonical 1920×1080 landscape frame. Emits `data-case-study-slide` + `data-slide-index` + `data-archetype` + `data-variant` so the exporter can find slides. **Every slide must render through this** — do not roll a custom frame. |
| **`LogoMark`** · **`Display`** · **`Body`** · **`LabelRule`** · **`SilhouettePlaceholder`** · **`TMark`** | `slides/shared.tsx` | Shared presentational primitives. `LogoMark` falls back to a wordmark in the brand's heading type when no logo image exists — slide authors should never branch on "does this brand have a logo". |
| Archetype modules (10 files, 29 variants) | `slides/{Cover,Manifesto,Moodboard,Palette,Typography,Signature,Environmental,Digital,Stationery,Outdoor}Slides.tsx` | Each archetype ships its variants in one file. Variants are named `CoverA`, `CoverB`, … and registered in `slides/renderer.tsx`. To add a new variant: add `CoverE` to the file, export it, register in `REGISTRY`, and add `'E'` to `SLIDE_CATALOG['cover']`. |
| **`resolveSlide(pick)`** · **`SLIDE_CATALOG`** · **`ARCHETYPE_LABELS`** | `slides/renderer.tsx` | The only place that imports the concrete slide modules. Slide consumers (viewer, thumbnail rail, editor) call `resolveSlide` — never import a variant directly. |
| **`CaseStudyViewer`** | `viewer/CaseStudyViewer.tsx` | The UI. Scroll-snap stage + left thumbnail rail (live CSS-transform scaled, never PNG snapshots) + right inspector (variant swap, headline/credit/image URL overrides, hide) + topbar with Regenerate / Canvas edit / PNG / Export PDF. |
| **`useDeckPlan(brand)`** | `hooks/useDeckPlan.ts` | Load-or-generate hook. Returns `{ plan, profile, slides, regenerate, setVariant, setOverride, toggleHidden, reset }`. `slides` is already merged with variant overrides and hidden flags — consumers don't re-merge. |
| **`exportDeck(container, opts)`** | `export.ts` | Dynamic-imports `html2canvas` + `jspdf` + `jszip`. Captures each `[data-case-study-slide]` in `container` at natural 1920×1080 (strips `style.transform` first so scaled previews export correctly), then bundles as PDF (multi-page landscape) or PNG zip. |
| Storage | `storage.ts` | `localStorage['brandos:case-study-deck:v1']` keyed by brandId → `{ plan, overrides, variantOverrides, hidden }`. Do not write to this key from outside this feature. |
| `CaseStudyPage` | `pages/CaseStudyPage.tsx` | Route target for `/b/:slug/case-study` and `/dashboard/brand/:slug/case-study`. Flat route — bypasses `BrandRouteLayout` intentionally (the deck is its own chrome). |

**Rules when extending.**
- Need data from the brand? Add it to `BrandProfile` (types.ts + buildProfile in director.ts), not to individual slide components.
- Adding a variant? Edit the archetype's file, register in renderer.tsx, update `SLIDE_CATALOG`. Never fork a slide file.
- Adding an archetype? Extend `SlideArchetype` (types.ts), add to `ARCHETYPE_ORDER` + `pickVariant` switch (director.ts), create the slides file, register in renderer.tsx.
- The signature slide's artwork is seeded by `djb2(brandId + updatedAt + palette)` — do not re-seed with anything else or you lose determinism (same brand = same artwork every render).

---

## Mockup Studio (`src/features/mockup-studio/`)

Shipped 2026-04-24/25. PixiJS v8 mockup compositor with two product modes
(standalone + brand-aware). Both modes mount inside `<CosmosWorkspaceShell>`
and render the same 3-column `.ms-shell` grid (templates · canvas · properties).
Tool-local CSS lives in `modes/standalone/mockup-studio.css` and uses the
`.ms-*` prefix scoped under `[data-cosmos="workspace"]` — the brand-aware
page imports the same stylesheet rather than forking it.

| Component | Path | Purpose |
|---|---|---|
| **`StandaloneMockupStudioPage`** | `modes/standalone/StandaloneMockupStudioPage.tsx` | Anonymous-usable editor at `/tools/mockup-studio`. Persists last-used template via the mockup store. |
| **`BrandMockupStudioPage`** | `modes/brand-aware/BrandMockupStudioPage.tsx` | Brand-scoped editor at `/b/:slug/tools/mockup-studio` (and legacy `/dashboard/brand/:slug/tools/mockup-studio`). Auto-applies the brand kit on template pick via `applyBrandKit(template, brand)` and exposes a "Reapply brand" pill in the shell's `rightActions` slot. |
| **`TemplateGallery`** | `components/TemplateGallery.tsx` | Left panel. Cosmos `.panel-item` rows grouped by category (Apparel · Packaging · Print · Device · Signage · Other). |
| **`MockupCanvas`** | `components/MockupCanvas.tsx` | The PixiJS-backed center surface. Hosts overlays + zone tabs. |
| **`PropertiesSidebar`** | `components/PropertiesSidebar.tsx` | Right panel. Zone transform / design upload / tints / props / background / realism / layers — all built on cosmos `.panel-top` + `.panel-heading-*` chrome. |
| **`applyBrandKit(template, brand)`** | `modes/brand-aware/applyBrandKit.ts` | Pure function. Resolves the right brand asset (logo variant or color) for each zone using `brandResolvers.ts`, and returns a seeded `MockupState`. |
| **`MockupRenderer`** | `engine/MockupRenderer.ts` | The PixiJS pipeline. Includes `normalizeMaskUrl()` which auto-handles both mask conventions (white-on-black-opaque AND transparent-on-black-opaque) so user-supplied mask PNGs don't have to follow a single convention. |
| Real-asset templates | `data/templateIndex.ts` (`realAssetSeeds`) + `public/mockup-templates/<id>/{base,mask,displacement,lighting}.png` | Raster mockup templates ship as 4-layer PNG bundles. To add one: drop the four layers under `public/mockup-templates/<id>/`, append a `RealAssetSeed` entry to `realAssetSeeds`. Procedural templates remain as fallbacks. |

**Rules when extending.**
- Don't fork the cosmos shell — both pages must keep using `<CosmosWorkspaceShell>`.
- Tool-local rules live in `modes/standalone/mockup-studio.css` (single
  source). The brand-aware page imports the same file. Don't make a
  brand-aware variant.
- New brand-aware right-panel actions go in the shell's `rightActions`
  slot, NOT inside `.ms-board-toolbar`.

---

## Brand switcher + path rewriting

| Symbol | Path | Purpose |
|---|---|---|
| **`BrandSwitcher`** | `src/features/brand/components/BrandSwitcher.tsx` | Legacy floating pill on the old workspace shell (`/setup`, `/brand-kit`, `/guideline`, `/design`, `/tools`). |
| **`AppRail`** (top slot) | `src/shared/layouts/AppRail.tsx` | The global switcher on the new Brand scope rail. |
| **`rewriteBrandPath(pathname, oldSlug, newSlug, search)`** | `src/shared/brand/brandPathRewrite.ts` | Shared URL-rewrite helper. **Both switchers call this** so picking a different brand lands on the same tool/page for the new slug. Handles `/b/:slug` and legacy `/dashboard/brand/:slug` prefixes; preserves query string. If you add a third switcher anywhere, route it through this helper — don't reinvent the logic. |

---

## Logo + background contrast picker

| Symbol | Path | Purpose |
|---|---|---|
| **`pickLogoOnBackground(brand, bgHex)`** | `src/shared/brand/logoOnBackground.ts` | The canonical "which logo for this background?" decider. Scores every available logo role by WCAG contrast against the bg, using labeled tones (`mono.black` → #000, `mono.white` → #fff, colored variants → `brand.primaryColor`). Returns the highest scorer, or `undefined` if even the best is below the readability floor (1.8 ratio). **Every surface that draws a brand logo over a colored background goes through this** — card grids, brand kit, variations, presentation slides, future auto-generated guideline exports. |
| **`bgTone(bgHex)`** | same | `'light' \| 'dark'` for picking text/icon color on a tinted surface. Threshold matches the WCAG 0.179 cutoff used by Tailwind / shadcn. |
| **`pickFgOnBackground(bgHex, candidates[])`** | same | Highest-contrast foreground from a candidate hex list. For "what color should this caption be?" — pass `['#000', '#fff']` (or three brand neutrals) and trust it. |
| **`relativeLuminance(hex)` / `contrastRatio(a, b)`** | same | Primitives. Use these only if you need a raw number for a custom decision; otherwise prefer the wrappers above. |

**Rule.** Never write `lum > 0.5 ? blackLogo : whiteLogo` again. That picks
right for white-vs-black backgrounds and wrong for the case the user
actually cares about: a brand-primary-colored surface (red card / blue
card) where neither black nor white is "obviously right" but a colored
mono variant could be invisible. The picker's contrast model handles
all three cases without per-surface special-casing.

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
