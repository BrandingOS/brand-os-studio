# Coverage — pages and surfaces

Every row cites shipping code. Sections are read from the type unions the
product itself uses, not from a screenshot, so this list cannot drift from what
the app renders.

## Scope

Four surfaces, per the mission. Route evidence and exclusions are in the
specification §12.

| Surface | Route | Renders | Cycle |
|---|---|---|---|
| Setup | `/b/:slug/setup` (App.tsx:498) | `features/setup/SetupPage.tsx` | 6 |
| Brand Kit browsing | `/b/:slug/brand-kit` (App.tsx:501) | `features/brand-kit/BrandKitCosmosPage.tsx` | 7 |
| Brand Kit editors | *(overlay, no route)* | `features/brand-kit/BrandKitCardEditor.tsx` | 8 |
| Design | `/b/:slug/design` (522), `/b/:slug/design/:designSlug` (574) | launchpad + canonical editor | 9 |
| Common chrome | shared by all four | `shared/layouts/WorkspaceShell` | 5 |

## Setup — 8 sections

`SectionKey` in `features/setup/components/SetupSidebar.tsx:19`:

```ts
'brand' | 'logo' | 'colors' | 'fonts' | 'icons' | 'photos' | 'website' | 'voice'
```

| Section | Empty | Populated | Edit | Upload | Validation error | Modal / picker |
|---|---|---|---|---|---|---|
| brand | ✓ | ✓ | ✓ | — | — | StrategyEditorModal |
| logo | ✓ | ✓ | ✓ | ✓ | ✓ | AddLogoVariantModal |
| colors | ✓ | ✓ | ✓ | — | — | ColorPickerHSV |
| fonts | ✓ | ✓ | ✓ | ✓ | — | EmbeddedTypescaleDialog |
| icons | ✓ | ✓ | ✓ | ✓ | — | AssetSourcePopover |
| photos | ✓ | ✓ | ✓ | ✓ | — | AssetSourcePopover |
| website | ✓ | ✓ | ✓ | — | ✓ | LinkPreviewModal |
| voice | ✓ | ✓ | ✓ | — | — | AboutEditorModal |

`UPLOAD_KINDS` (SetupPage.tsx:60) is the authority on which sections accept an
upload — the ✓ marks above are taken from it, not assumed.

Cross-cutting: the floating `BrandSetupNudge` (`features/brand-setup/`) is
`position: fixed` bottom-right and names only **empty** sections. It is a
represented state of the page, dismissible per brand id.

## Brand Kit browsing — 8 sections

`KitSectionKey` in `features/brand-kit/components/BrandKitSidebar.tsx:27`:

```ts
'brand-assets' | 'stationery' | 'social' | 'web'
| 'brand-guides' | 'presentations' | 'animations' | 'mockups'
```

Two card patterns, per `CLAUDE.md` and `data/cardPresentation.ts`:

- **Brand-asset cards** (Logos · Colors · Fonts · Icons) render the full variant
  grid inline and support inline add.
- **Every other section** uses 3 featured tiles + a "More" picker modal.

| State | Evidence | Represented |
|---|---|---|
| default browsing | page default | ✓ |
| sidebar navigation, active/inactive | `BrandKitSidebar` | ✓ |
| drilldown overlay | history-based, popstate-aware | ✓ separate frame |
| card right-click → Edit | `BrandKitCardEditor` overlay | Cycle 8 |
| More picker modal | featured-tiles pattern | ✓ |
| export entry | `ExportKitDialog.tsx` | ✓ |
| empty (no assets) | placeholder grids for Photos/About | ✓ |

**Repetition is modelled, not multiplied.** The 25 deliverables are one card
component with properties, not 25 hand-built frames — per the owner's rule
against generating hundreds of near-identical assets.

## Brand Kit editors — no route of its own

`BrandKitCardEditor` is a full-page **overlay** opened by right-click → Edit. It
has no URL, which is why §8b's `?__fx=overlay:card-editor` capture directive
exists. Confirmed independently during architecture review.

Families: content fields, colour controls, typography controls, image/cover
selection, save/cancel/reset, clean/dirty, saving/saved/error.

## Design — launchpad and canonical editor

Two routes, both evidenced. The launchpad (`522`) offers Blank Canvas · AI
Design · Recent. The canonical editor (`574`) is the unified `Editor`, mounted
lazily inside Suspense.

**Not absorbed:** `/editor/design/:slug` (652) is the legacy
`OptimizedDesignEditor`, a documented carve-out coupled to the frozen
`stable/editable-export-v1` export pipeline. Excluded deliberately, per the
owner's instruction not to silently absorb unrelated legacy editors.

## Responsive

Capture widths 1440 and 390 (see `COVERAGE-states.md` for why those two, and
which structural boundaries Cycle 10 adds). Mobile is captured as its **own
layout**, never a scaled desktop frame.

## Status

| Surface | Inventory | Built |
|---|---|---|
| Common chrome | ✓ | pending Cycle 5 |
| Setup | ✓ | pending Cycle 6 |
| Brand Kit browsing | ✓ | pending Cycle 7 |
| Brand Kit editors | ✓ | pending Cycle 8 |
| Design | ✓ | pending Cycle 9 |
