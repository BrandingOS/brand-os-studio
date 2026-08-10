# Brand Kit Redesign — "Created by the user, not for the user"

**Date:** 2026-08-10 · **Status:** Approved (Approach B + 9 owner adjustments)
**Surface:** Studio Brand Kit — `/b/:slug/brand-kit` (`src/features/brand-kit/`)

## 1. Product principle

The Brand Kit must feel created and owned by the user. Core brand assets
(Logos, Colors, Fonts, Icons, Photos, About) exist from Setup and stay
always-visible. Brand **applications** (stationery, social, web, guides,
presentations, animations — 25 deliverables across 6 sections) start in a
**Not Created** state and only enter the kit when the user generates,
reviews, and approves them.

Decisions locked during brainstorming:

- **Generation = curated picks from the existing ~30 deterministic
  renderers.** No AI infra now; the generator is a swappable service so
  AI can slot in later (owner adjustment 4).
- **Ownership = small owned collection per deliverable.** Each
  deliverable holds ≥1 approved items; one is primary; card shows the
  primary with a count badge.
- **Bulk flow = select → generate → review queue.** Accept / swap /
  skip per deliverable, one click each; bulk approve also available
  (owner adjustment 7).
- **Scope = all six deliverable sections.** Brand Assets keeps current
  behavior.

## 2. Domain model

### 2.1 Item + deliverable state (`kit/types.ts`)

```ts
type KitItemStatus = 'candidate' | 'approved' | 'archived';

type KitItem = {
  id: string;                      // `ki_<n>` unique per brand
  variantId: string;               // BrandKitTemplate id
  status: KitItemStatus;
  customization: SavedCardCustomization | null;  // embedded, not shared
  createdAt: string;
  approvedAt?: string;
};

type DeliverableRecord = {
  items: KitItem[];
  primaryItemId: string | null;    // among approved items
  error: string | null;            // last generation failure, retriable
  updatedAt: string;
};

type BrandKitState = {
  version: 1;
  deliverables: Record<DeliverableKey, DeliverableRecord>; // key = `${sectionKey}::${label}`
};
```

### 2.2 Lifecycle (owner adjustment 2)

`not-created → generating → review → approved`, plus `error` and
`archived` where needed. **Persisted state stores only items + error;
status is derived** so persisted state can never be inconsistent:

- `generating` — transient, in-memory only (`generatingKeys` set in the
  store; a reload mid-generation falls back to whatever items exist).
- `review` — derived: has `candidate` items, no `approved` items.
- `approved` — derived: has ≥1 `approved` item.
- `not-created` — derived: no candidate/approved items (archived items
  may exist).
- `error` — `record.error` non-null; card shows retry.

Item transitions: candidate → approved (Approve), candidate → removed
(Dismiss/Skip clears candidates), approved → archived (Archive keeps it
recoverable), approved → removed (Remove). Removing/archiving the
primary promotes the next approved item; removing the last approved item
returns the deliverable to `not-created`.

## 3. Deliverable Registry (owner adjustment 3)

`kit/registry.ts` — one `DeliverableDef` per deliverable; defines full
behavior. Adding a future deliverable = renderer + registry entry.

```ts
type DeliverableDef = {
  key: DeliverableKey;
  sectionKey: KitSectionKey;
  label: string;
  templateType: string;        // consolidates BrandKitCardEditor.templateTypeFor's label map
  aspect: number;              // consolidates PICKER_ASPECT_BY_LABEL + aspectFor
  contentFields: EditorField[];// consolidates getEditorFields switch
  controlGroups: ControlGroupId[]; // ['content','colors','logo','typography'] subset
  CustomControls?: ComponentType<CustomControlsProps>; // escape hatch (adj. 6)
  candidateCount: number;      // default 3
  featuredIds?: string[];      // curated first candidates (from DEFAULT_FEATURED_IDS_BY_LABEL)
  rank?: (templates: BrandKitTemplate[], ctx: RankContext) => BrandKitTemplate[];
  validate?: (brand: MockBrand) => string | null; // e.g. "Add a logo in Setup first"
  exportFormats: ReadonlyArray<'png'>; // extensible later
};
```

Variant resolution stays in `legacy-mapping.ts:variantsForCard` (reuse,
owner adjustment 8). The registry consolidates the per-label maps that
today live as switch statements inside `BrandKitCardEditor` and
constants inside `BrandKitCosmosPage`; both now import from the
registry. `getEditorFields`/`aspectFor` keep working for template types
not tied to a deliverable (brand-asset-*) via shared helpers in the
registry module.

## 4. Generation service (owner adjustment 4)

`kit/generation.ts`:

```ts
interface KitGenerator {
  generate(def: DeliverableDef, ctx: GenerationContext, opts?: { exclude?: string[] })
    : Promise<GenerationResult>; // { candidates: BrandKitTemplate[] } | throws
}
```

`TemplateLibraryGenerator` (default): resolves variants via
`variantsForCard`, ranks them — curated `featuredIds` first, then a
**brand-seeded deterministic shuffle** (hash of brand id) so different
brands see different, stable candidate sets — and returns the top
`candidateCount` not in `exclude`. **Regenerate** passes previously seen
variant ids as `exclude`, walking further down the ranked list; when
exhausted it wraps around. Pure, synchronous under the hood, async
interface so an AI generator can replace/augment it without UX changes.
The store owns a short minimum "generating" duration (~600ms) so the
reveal reads as work happening; the service stays instant and pure.

## 5. Store + persistence (owner adjustment 1)

### 5.1 Repository

```ts
interface KitStateRepository {
  load(brandId: string): BrandKitState | null;
  save(brandId: string, state: BrandKitState): boolean;
}
```

`LocalKitStateRepository` — localStorage key `brandos:brand-kit:state`,
same defensive read/write pattern as `cardCustomizations.ts`. Supabase
later = new repository implementation, zero domain-logic change.

**Migration:** on first load for a brand with no kit state, scan
`brandos:brand-kit:customizations` for template-id keys; any key that
matches a variant of a deliverable seeds an `approved` item with that
customization (users who customized cards pre-redesign keep their work).

### 5.2 `kitStore.ts` (zustand, per-brand hydration)

State: `{ brandId, deliverables, generatingKeys, reviewQueue }`.
Actions: `hydrate(brandId)`, `generate(keys[], ctx)`,
`regenerate(key, ctx)`, `approve(key, itemId)`, `approveTopCandidates(keys[])`,
`dismissCandidates(key)`, `addApprovedItem(key, variantId)`,
`setPrimary(key, itemId)`, `duplicateItem(key, itemId)`,
`removeItem(key, itemId)`, `archiveItem(key, itemId)`,
`updateItemCustomization(key, itemId, c)`, `clearError(key)`.
Selectors: `statusOf(key)`, `primaryOf(key)`, `counts()` (for sidebar
progress). Every mutating action persists through the repository.

## 6. UX

### 6.1 Section cards (state-driven `DeliverableCard`)

Replaces the stock-cover `BrandKitCard` for the six deliverable
sections (Brand Assets cards unchanged):

- **Not created** — quiet empty tile (subtle dashed surface, deliverable
  label, small type icon), a `Generate` affordance on hover + a
  selection checkbox (hover / select-mode). No stock art — nothing
  pretends to exist.
- **Generating** — shimmer tile with label.
- **Review** — top candidate live-rendered (existing
  `renderTemplateDesign` tile pattern) + `Review · N` badge; click opens
  the review overlay for that deliverable.
- **Approved** — primary item live-rendered with the item's saved
  color/content customization; count badge when >1 item; hover actions:
  Edit (customize), Download; click opens the owned-collection
  drilldown.
- **Error** — tile with short message + Retry.

### 6.2 Generate flows (owner adjustment 7)

- **Generate one:** button on a not-created card.
- **Generate selected:** checking any card enters select mode; a
  floating bottom bar shows `Generate N selected` (+ `Select all` /
  `Clear`).
- **Generate kit:** top-bar button next to `Export kit` — selects every
  not-created deliverable and generates them all.
- Generation fans out per deliverable; each card independently moves
  `generating → review`. Failures land in `error` on that card only.

### 6.3 Review queue (`ReviewOverlay`)

Full-screen overlay (portal, same visual language as the card editor).
Queue = all deliverables currently in `review`, ordered by section.
Header: `Business Card — 3 of 8` + progress dots. Body: the candidates
as large live-rendered tiles; the ranked-first candidate pre-selected.
Actions: **Use this design** (approve selected → advance), **Show me
more** (regenerate → new candidates), **Browse all** (opens existing
`TemplatePickerModal` for the full library), **Skip** (dismiss
candidates → back to not-created → advance), **Customize first** (opens
the card editor on the selected candidate; saving approves it with the
customization). Footer: `Approve all remaining` (top candidate of every
queued deliverable). Closing the overlay keeps deliverables in `review`
— cards show the badge and review resumes from the kit page.

### 6.4 Owned-collection drilldown

For an approved deliverable, the existing drilldown becomes **your
items** (not the full library): primary first with a `Primary` star,
then other approved items. Per-item context actions: Customize,
Set as primary, Duplicate, Export, Archive/Remove. `+ Add design` opens
`TemplatePickerModal`; picking adds an approved item. Brand-asset
drilldowns unchanged (icons/colors/fonts flows untouched, owner
adjustment 8).

### 6.5 Customization (owner adjustments 3, 6)

`BrandKitCardEditor` becomes registry-driven and item-aware:

- `contentFields`, `aspect`, `templateType` resolve through the
  registry (switch statements move there); brand-asset editor paths
  keep their existing dedicated UIs (they are the precedent for
  `CustomControls`).
- Control groups render per the def's `controlGroups` — a business card
  shows Content(name/title/email/phone/website)+Colors+Logo+Typography;
  an animation shows no content fields; a presentation shows slide
  title/subtitle; etc. Structure stays consistent: Preview · Content ·
  Design/Brand styling · Actions.
- When opened for a kit item, `initialCustomization` comes from the
  item and Save routes to `kitStore.updateItemCustomization`; the
  legacy `cardCustomizations` path remains for non-kit edits.
- Footer gains **Reset to brand defaults** (clears the item's
  customization).

### 6.6 Brand-safe by default

All candidates and customizations render through the existing
brand-aware renderers; color picks are constrained to brand palette
swatches; logo variants come from the brand's logo set; fonts from the
brand's families. `contrastRatio`/`logoOnBackground` behavior inside
renderers is untouched.

### 6.7 Ownership signals

- Sidebar completion becomes real: `X of 25 created` from
  `kitStore.counts()`; per-section chips show `approved/total`.
- `Export kit` zip gains a `deliverables/` folder with a PNG of every
  approved item (rendered with its color + prop-driven content
  customization; DOM-walker-only text substitutions are an editor
  preview facility and are not applied to offscreen exports — known
  limitation, listed in §9).

## 7. What is reused unchanged (owner adjustments 8, 9)

- All `renderers/*` and `renderCosmosTemplate`.
- `legacy-mapping.ts` variant resolution.
- `templateSnapshot.tsx` offscreen rasterization (260px mount, scale 4).
- Brand-asset flows: icon picker/weights/tints, color add, font/logo
  bundles, all export builders.
- Drilldown enter/exit transitions + popstate handling
  (`drilldown-anchor-v1` semantics untouched).
- `cardCustomizations.ts` (still the editor-persistence path for
  non-kit edits + the migration source).

## 8. File plan

New (`src/features/brand-kit/kit/`): `types.ts`, `registry.ts`,
`generation.ts`, `repository.ts`, `kitStore.ts`.
New components: `DeliverableCard.tsx`, `GenerateBar.tsx`,
`ReviewOverlay.tsx`.
Modified: `sections.tsx` (use `DeliverableCard` for deliverable
sections), `BrandKitCosmosPage.tsx` (hydrate store, mount overlay +
bar, owned-drilldown mode, generate handlers — net shrink: constants
move to registry), `BrandKitCardEditor.tsx` (registry-driven, item
routing — net shrink), `BrandKitSidebar.tsx` (real progress),
`brand-kit.css` (new card states, badges, overlay, select bar).

## 9. Testing + known limitations

Tests (Vitest, per repo's three-layer policy):

- **Unit:** registry completeness (25 defs, valid aspects, resolvable
  variants for seed brands); generator ranking determinism + exclude/
  wrap behavior; store lifecycle derivation (approve/remove/primary
  promotion/archive edge cases); repository round-trip + migration.
- **Integration (jsdom):** store↔repository against real localStorage;
  full generate→review→approve flow through store actions.
- **Component (jsdom):** `DeliverableCard` state rendering;
  `ReviewOverlay` queue advance/approve/skip.

Known limitations, accepted:

- DOM-walker text overrides (non-business-card content fields) apply in
  the live editor preview but not offscreen exports (pre-existing
  renderer constraint; prop-driven content — business cards — exports
  correctly).
- Kit state remains local until the Supabase repository lands
  (interface ready).
- Session-only color/icon adds (open debt #1 in CLAUDE.md) are out of
  scope here.
