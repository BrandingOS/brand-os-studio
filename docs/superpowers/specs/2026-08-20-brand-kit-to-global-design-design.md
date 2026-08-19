# Brand Kit → global Design

**Date:** 2026-08-20
**Status:** design, approved to spec
**Supersedes:** the Quick Editor plan drafted earlier the same day (never built)

## 1. The decision

Brand Kit stops being an editing surface **for creative deliverables and
templates**. It becomes what its name says: the canonical brand system — assets,
strategy, systems, master templates, layout variants, previews.

The rule is scoped, and the scope is load-bearing. **Core brand-definition data —
Logos, Colours, Typography, Strategy — continues to be managed in its proper
Brand Kit / Setup context**, with the editors it already has. Defining what the
brand *is* was never canvas work and is not being moved into a canvas editor.
What moves is the authoring of deliverables made *from* that brand.

All creative editing of deliverables moves to the **global Design environment**,
already reachable at `/b/:slug/design/:designId`. Two actions bridge the two:

```
Brand Kit          preview · organise · variants · systems · brand assets
  ├─ Edit Template  → /b/:slug/design/:masterId   authoring the canonical master
  └─ Use Template   → /b/:slug/design/:newId      an independent Design instance
```

Both land in the **same editor on the same route**. What differs is which Design
object is open, not which editor exists. That is the property that keeps this one
architecture rather than two.

A master template never contains real client or project data. An instance may.

### Why this rather than a Quick Editor

A Quick Editor inside Brand Kit would have been a second editing surface with its
own selection model, properties panel, save semantics and export path — growing
toward the editor that already exists, one deliverable at a time, and reaching 26
of them. The abstractions that work were kept; the destination changed.

## 2. What already exists

Most of the global Design model is built. This was verified against the code, not
assumed.

| Requirement | Where it already lives |
|---|---|
| Type-agnostic route `/b/:brand/design/:designId` | `src/App.tsx:562` |
| "The Design object knows what it is" | `BrandOSDocument` = `{ schemaVersion, id, contentType, brandId, masterPages, pages, metadata, … }` — `src/features/editor/schema/index.ts:246` |
| Type determines renderer, panels, export, canvas behaviour | `ContentTypeConfig` — `src/features/editor/content-types/types.ts` |
| Configs for the deliverable families | `invoice`, `business-card`, `letterhead`, `email-signature`, `presentation`, `social-post`, `brand-guideline-slide`, `poster`, `banner`, `brochure`, `profile-icon` |
| "Use Template → Design instance" | `shell/v2/panels/TemplatesPanel.tsx:220-230` — `saveDesign` then `navigate('/b/:slug/design/:id')` |
| Instance ↔ template linkage | `DesignSummary.sourceTemplateId`, `.isTemplate`, `.familyId` — `src/core/types/services.ts` |
| Not coupled to a fixed type list | Configs are pure data in a registry; `contentType` is a `string` |

The gap is not routes, storage, or object shape.

## 3. The Fabric coupling question

The shell was inspected before committing to a shared-shell design, because
forcing that abstraction over a deeply Fabric-bound shell would have produced a
worse result than two shells.

**Finding: the coupling is shallow and the seam already exists.**

| Probe | Result |
|---|---|
| `from 'fabric'` under `src/features/editor/` | 2 modern files, both in `adapter/` (`FabricAdapter.ts`, `layerMapping.ts`). The other 4 hits are the frozen legacy `components/` carve-out |
| `FabricAdapter` in `shell/` + `core/` | **one line** — `Editor.tsx:294`, `new FabricAdapter()` |
| `EditorAdapter` interface | Names no rendering technology: `mount`, `loadDocument`/`getDocument`, pages, layers, selection, `undo`/`redo`/`batch`, `setBrand`, `exportAs` |
| Canvas region | One contained JSX block (`Editor.tsx:792`); the selection overlay is already `selectedLayer && page ? … : null` |
| Per-type gating | `ContentTypeConfig.panels {layers, properties, pageNavigator, assets, masterPages}` and `pageModel` already exist; `pageModel: 'single'` already hides the page navigator for `invoice` |

The shell is not coupled to Fabric. It is coupled to a different assumption, and
naming it correctly is what makes the refactor small:

> **The shell assumes a document is pages of layers.**

Two consequences fall out for free rather than needing work:

- `EditorFloatingToolbar` (1884 lines of per-layer properties) never mounts,
  because `selectedLayer` is never set for a layerless renderer.
- The page navigator is already hidden for single-page content types.

## 4. Architecture

Four additive changes. None alters existing behaviour; every existing content
type keeps working untouched.

### 4.1 `renderer` capability on `ContentTypeConfig`

```ts
renderer: z.enum(['fabric', 'template-instance']).default('fabric')
```

Defaulting to `'fabric'` means all eleven existing configs are unchanged. The
enum is the only place the set of renderers is written down.

### 4.2 Split `EditorAdapter` into two interfaces

```
DocumentAdapter        mount · unmount · loadDocument · getDocument
                       replaceDocument · getSelection · setSelection
                       undo · redo · canUndo · canRedo · batch
                       setBrand · exportAs

LayerEditingAdapter    extends DocumentAdapter
  (Fabric only)        pages · layers · masters · reorder · dimensions
```

The shell consumes `DocumentAdapter` wherever it can. The alternative — one wide
interface with ~25 no-op layer methods on the template-instance side — is the
smell that says the abstraction was forced, and it would make every future
renderer pay the same tax.

`FabricAdapter` satisfies `LayerEditingAdapter` unchanged. No behavioural edit.

### 4.3 A typed document body for layerless renderers

`BrandOSDocument` gains one optional top-level field. The schema has precedent
for this shape: `brandResolution`, `familyId` and `sourceDesignId` are all
optional top-level fields, and `brandResolution` was explicitly "lifted to a
top-level optional field (out of `metadata`)" for type-safe access.

```ts
body: z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('template-instance'),
    /** Which Brand Kit master design paints this document. */
    templateId: z.string().min(1),
    /** The content model — person | letter | invoice | … */
    content: DeliverableContentSchema,
    /** Design picks that are not content: colours, logo, typeface. */
    design: TemplateDesignPicksSchema,
  }),
]).optional()
```

`pages` stays as-is and is **not** relaxed. A template-instance document carries
exactly one page, zero layers, with width/height from the content type's
`defaultDimensions`. That page is not a formality — the shell reads it for
zoom/fit sizing, thumbnails and export dimensions. Keeping `pages.min(1)` valid
means the schema change is purely additive.

Envelope stays universal (`id`, `contentType`, `brandId`, `metadata`); the
payload varies by type. Autosave, `listDesigns`, thumbnails, rename and duplicate
keep working with no adapter-specific branches.

### 4.4 Renderer registry

`Editor.tsx:294` stops constructing a `FabricAdapter` and resolves a trio from
the document's content type:

```ts
type DesignRenderer = {
  createAdapter(): DocumentAdapter;
  Canvas: ComponentType<CanvasProps>;
  Properties: ComponentType<PropertiesProps>;
};
```

Shared across every renderer, unchanged: `EditorTopBar`, `useAutoSave`,
save · rename · export · duplicate · save-as-template, brand
context and brand switching, the app rail frame, the secondary panel frame,
zoom controls, presence.

Renderer-specific: the canvas component, the properties panel body, and whether
the layer-editing affordances exist at all (gated through the existing `panels`
config — only "Insert" needs a new gate).

## 5. The `template-instance` renderer

The renderer that lets Design open a Brand Kit deliverable **without converting
the artwork**. Converting the React designs into Fabric layers was rejected: it
is lossy, it is per-design work across hundreds of variants, and it destroys the
artwork quality that makes those renderers worth keeping.

It is assembled almost entirely from parts that already exist:

| Part | Source | Status |
|---|---|---|
| Artwork | `features/brand-kit/renderers/*` (~6,400 LOC) | reused as-is |
| Content model | `features/brand-kit/content/kinds.ts` | reused, re-homed |
| Addressing + derived values | `content/paths.ts`, `content/compute.ts` | reused, re-homed |
| Properties panel | `content/fields.ts` + `quick-edit/ContentPanel.tsx` | reused as the Design properties panel |
| Direct manipulation | `content/Bind.tsx` + 50 call sites in renderers | reused |

`<Bind>` with no provider renders a plain span **by design**. That single property
is what lets the same renderer serve a Brand Kit preview and an editable Design
surface with no fork and no duplicated artwork.

### Re-homing

`features/brand-kit/content/` and the renderers must not stay Brand Kit internals
once Design consumes them — `shared/*` may not import `features/*`, and Design
importing a Brand Kit internal would invert the intended ownership. They move to
a neutral domain home under the editor's template-instance renderer. The move is
mechanical (no logic change) and is part of this slice.

## 6. Brand Kit changes

Brand Kit loses content editing for deliverables and gains two actions.

- **Deliverable modal** becomes preview + variant switcher. No typing.
- **Use Template** → `saveDesign(brandId, newId, doc, { contentType, sourceTemplateId })`
  → navigate to `/b/:slug/design/:newId`.
- **Edit Template** → opens the canonical master's Design id.

Unchanged and explicitly retained: the brand-asset cards (Logos, Colors,
Typography, Icons, Photos, Strategy) keep their own editing. Icon weight, colour
shade ladders and the type scale are brand-definition work, not deliverable
authoring, and they belong here. The "all editing happens in Design" rule is
about creative deliverables and working files.

## 7. Master templates and instances

### 7.1 Storage

A master is **a Design object with `isTemplate: true`**, stored through
`IDesignStorage` like any other. One storage model, and `DesignSummary` already
carries `isTemplate`, `familyId` and `sourceTemplateId`.

Template-authoring mode is therefore a property of the opened object, not a
second editor: `isTemplate` drives a guard that a master saves back as the
canonical template and is not a place for client content.

Brand Kit's job is to know which Design id is the master for a given
deliverable + variant, and to seed one lazily on first use.

### 7.2 Instantiation is a snapshot, not a link

**`Use Template` copies. It does not subscribe.**

```
master Design (isTemplate: true)
    │  Use Template  ── deep copy of body → new Design
    ▼
instance Design (isTemplate: false, sourceTemplateId: <masterId>)
```

`sourceTemplateId` records **provenance only**: which master this came from, for
attribution, filtering and analytics. It is not a live reference and nothing
resolves through it at load time.

The invariant that follows, stated so no future change quietly breaks it:

> **Editing a master must never alter an existing working Design.**

A user's filled-in client invoice cannot be reshaped under them because someone
tuned the brand's master a month later. The copy is taken at instantiation and
the instance owns it from that moment.

This has a cost worth naming: an improved master does not reach designs already
created from it. That is the correct trade — a working file's stability outranks
propagating template changes into it. If "refresh from template" is ever wanted,
it must be an explicit, user-invoked, previewable action on the instance, never
an implicit resolve. It is not in scope here.

Brand *values* are a separate axis and keep their existing behaviour: a design
holds `SlotRef`s that resolve against the brand, so re-applying a brand kit is an
explicit action (`applyBrandToDocument`) and is unaffected by this rule.

### 7.3 Template Designs are not working files

Masters live in the same store as instances, which means they must be kept out of
the surfaces built for working files, and protected from actions meant for them.

- **Excluded from Recent Designs and the My Designs library by default.**
  Listing filters on `isTemplate`. A master surfaces in Brand Kit, where it
  belongs, not amongst a user's work.
- **Protected from destructive actions.** Deleting a master is not offered
  alongside ordinary design deletion; where it is possible at all it requires an
  explicit confirmation naming what it affects, consistent with the brand-write
  confirmation rule the Guideline builder already follows.
- **Duplicate on a master produces an instance**, not a second master —
  duplicating a master is what `Use Template` already means.

## 8. Explicitly not built

Recorded so a later session does not read the gap as an oversight.

- **The four extra content kinds** (`mailing`, `social`, `deck`, `web`) and
  binding ~14 more renderers. That was coverage for a Brand Kit editor. Each
  family now arrives as one config entry plus `<Bind>` calls, when it is promoted
  to a real Design type.
- **A Brand-Kit-local `QuickEditPanel` or selection model.** Design already has
  both; a second set would be the duplication this design exists to prevent.
- **Duplicate / Rename / Recent inside Brand Kit.** They belong to the Design
  object. Recent Designs may later be *surfaced* from Brand Kit for convenience,
  but they remain Design objects, never Brand Kit state.
- **Deleting Web, Animation, Social, Presentation or Mockup renderers.** They
  stay, hidden or experimental, as future Design types. Hidden is not dead.
- **Routes per type** (`/design/invoice/:id`). The design id identifies the
  object; its content type says what it is.

## 9. Testing

Per the repo's three-layer requirement:

- **Unit** — the renderer registry resolves by content type; the `body`
  discriminated union round-trips through the schema; the adapter split keeps
  `FabricAdapter` satisfying `LayerEditingAdapter`.
- **Adapter integration** — the template-instance adapter's document
  load/get/replace and `exportAs`, with the existing `vi.mock('fabric')` pattern
  untouched for the Fabric side.
- **Browser E2E** — Brand Kit → Use Template → editor opens on the new id with
  the artwork painted; edit a bound region on the artifact and see the content
  panel and the artwork agree; Edit Template opens the master and saves back.
  The existing `quickEdit.browser.test.tsx` assertions are re-pointed at the
  Design host rather than deleted.

## 10. Success criterion

After this slice, adding **Business Card** — the agreed second validation case —
must require **family-specific work only**: its content type registration and
capability configuration, its renderer, and its template bindings.

The criterion is architectural, not tied to any particular binding mechanism.
Adding a family must NOT require:

- changing the shared Design shell,
- changing the adapter architecture or the `DocumentAdapter` /
  `LayerEditingAdapter` split,
- changing routing or the Design object model,
- inventing another editor model, a second editing surface, or a parallel
  storage path.

If any of those is needed, this design failed and the abstraction must be
revisited before a third family is added — not worked around.

## 11. Risks

- **`Editor.tsx` is 928 lines and mixes shared chrome with layer-editing
  behaviour** (keyboard shortcuts, zoom/fit, cursors, selection overlay). The
  split is the largest single piece of work here and the most likely place to
  discover a hidden layer assumption. Mitigation: land the refactor with Fabric
  as the only renderer first, so it is reviewable as a no-behaviour-change
  commit, then add the second renderer.
- **`EditorWorkspace` and `shared/services/export/vectorize/*` are frozen**
  (`stable/editable-export-v1`). This design does not route through them. The
  template-instance export path uses the Brand Kit rasterisation already in
  `data/templateSnapshot.tsx`, not the frozen pipeline.
- **A master template seeded per brand + variant** could multiply Design objects.
  Mitigation: seed lazily on first Edit Template, not for all 26 deliverables up
  front.
