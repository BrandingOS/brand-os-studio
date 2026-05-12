---
title: Brand Kit Premium
status: spec / awaiting implementation plan
date: 2026-05-12
authors: hamza ezzat, claude opus 4.7
tech-debt-tags:
  - brand-kit-overlay-v1
filename-note: |
  Filename uses topic form `brand-kit-premium.md` (no date prefix) per
  user instruction. Other specs in this directory use the
  `YYYY-MM-DD-<topic>-design.md` convention; the deviation is
  intentional and load-bearing — search references will use
  `brand-kit-premium` verbatim.
---

# Brand Kit Premium

## Vision

Brand Kit is **the export deliverable** handed to the client when a brand is
finished. It must be premium, comprehensive, and trustworthy as the
canonical brand reference — strong enough that the client opens the
exported PDF + ZIP and never needs to come back to ask "where's the …".

The current canonical Brand Kit (`features/brand-kit/`,
`/b/:slug/brand-kit`) is a polished read-only showcase. This spec
turns it into the export-ready deliverable by:

1. Wiring real persistence to the Customize overlay,
2. Adding an Editor handoff that round-trips designs through `/b/:slug/design/:slug`,
3. Replacing the variant-grid mental model with a single-design-per-card model that links out to Templates for alternates,
4. Building the missing premium content (Photos, About, Web) + the PDF brand guide and ZIP bulk export.

## Dependency graph

```
┌────────────────────────┐
│ A. Customize           │  Foundation. Wires onSave → store.
│    persistence         │  Adds schema. No upstream blockers.
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│ B. Editor handoff +    │  Builds on A's schema.
│    save-back           │  /b/:slug/design/:slug already exists.
└─────────┬──────────────┘
          │
          ├──────────────┐
          ▼              ▼
┌──────────────┐   ┌──────────────────────────┐
│ C. Templates │   │ D. Premium polish +       │
│    integration│   │    Export (PDF + ZIP)     │
└──────────────┘   └──────────────────────────┘
   needs A + B          needs A + B (independent of C)
   (Browse Other         (helpers porting from
    binds via same       brand-kit-alt)
    write path)


              ┌──────────────────────────────────────────┐
Future scope: │ E. Auto-fill Brand Kit                    │
              │    Batch-fires AI Mode 1 for empty cards. │
              │    Must be designed-around in A/B (origin │
              │    + userEdited bind states).             │
              └──────────────────────────────────────────┘
```

### Phase dependency status

| Sub | Depends on | Status |
|-----|------------|--------|
| **A** | `useBrandStore`, `BrandsService`, `BrandKitCardEditor` overlay | ✅ READY |
| **B** | `/b/:slug/design/:slug` (Phase 3.5), `IDesignStorage`, `BrandOSDocument.metadata` (free-form), Phase 4.5 brand-picker URL nav | ✅ READY |
| **C** | Phase 4.1 TemplatesPanel + 11 seed categories (`business-card`, `letterhead`, `social-post`, etc. already map) | ⚠️ BLOCKED on 3 small wirings inside C's scope: (1) `?category=X` URL filter (state exists at `TemplatesPanel.tsx:115` but not synced from URL), (2) `returnTo` param handling (not implemented), (3) "Use as my [card type]" template action (new UI) |
| **D** | Live `brandGuidePdf.ts` + `bulkExport.ts` in `brand-kit-alt/`; `AssetSourcePopover` for Photos | ✅ READY (port + promote per Q5 below) |
| **E** (future) | A + B (specifically: `origin` + `userEdited` fields on bindings); `generateFromPrompt` from Phase 4.3 | Out of scope for this spec — designed-around only |

## Mental model

Brand Kit cards split into **two families**:

### Family 1 — Brand Asset cards (multi-item galleries)

`Logos · Colors · Fonts · Icons · Photos · About`

Each item in the gallery is a brand deliverable. Multi-item is the natural
shape — every logo variant, every color, every photo is part of the brand.

### Family 2 — Template-based deliverable cards (one design per card)

```
Stationery:     Business Card · Letterhead · Envelope · Invoice
Social Media:   Profile · Cover · Post · Story
Web:            Favicon · Website · Email Signature · Landing Page
Brand Guides:   Logo · Color · Typography · Voice · Imagery
Presentations:  Pitch Deck · Business Plan · Proposal · Case Studies
Animations:     Logo Reveal · Slide In · Fade · Rotate
```

Each card shows **exactly one design** — the brand's canonical business card,
the brand's canonical pitch deck, etc. Multi-side designs (front + back of a
business card) are presented as sides of the same design, not as multiple
variants. **Alternates do not live inside Brand Kit** — they live in the
Templates library or My Designs. A "Browse other [card type]" button on each
card sends the user to the Templates page filtered by category.

## Card actions

| Family | Actions |
|--------|---------|
| Brand Asset (Logos/Colors/Fonts/Icons) | Existing inline editing + `+` add (already shipped; needs A's persistence) |
| Brand Asset (Photos/About) | Built fresh in D — upload (Photos) / fields (About) |
| Template-based | **Customize** · **Open in Editor** · **Browse Other** · **Download** |

## Schema additions

### Brand type extension

```ts
// src/shared/types/brand.ts
export interface Brand {
  // ... existing fields
  brandKitDesigns?: Partial<Record<CardType, BrandKitBinding>>;
}

export type CardType =
  // Stationery
  | 'business-card' | 'letterhead' | 'envelope' | 'invoice'
  // Social
  | 'social-profile' | 'social-cover' | 'social-post' | 'social-story'
  // Web
  | 'favicon' | 'website' | 'email-signature' | 'landing-page'
  // Brand Guides (each its own bindable surface even though they aggregate into the PDF guide)
  | 'guide-logo' | 'guide-color' | 'guide-typography' | 'guide-voice' | 'guide-imagery'
  // Presentations
  | 'pitch-deck' | 'business-plan' | 'proposal' | 'case-studies'
  // Animations
  | 'logo-reveal' | 'slide-in' | 'fade' | 'rotate';

export interface BrandKitBinding {
  cardType: CardType;
  version: number;        // monotonically increasing per binding lifetime
  boundAt: string;        // ISO timestamp of latest save
  origin: BindOrigin;     // how the binding was created
  userEdited: boolean;    // has the user opened in Editor and saved at least once?

  // Discriminated by which is present:
  designId?: string;      // present when origin ∈ {editor, template, ai}
  templateId?: string;    // present when origin = customize (lightweight overrides on template)
  overrides?: Record<string, unknown>; // only with templateId — logo/name/color picks
}

export type BindOrigin =
  | 'customize'    // user used the BrandKitCardEditor overlay only
  | 'editor'       // user opened in /b/:slug/design and saved
  | 'template'     // user picked a template from Templates page → "Use as my X"
  | 'ai';          // future Sub-project E auto-generation
```

**Why `userEdited` is mandatory:** future Sub-project E (Auto-fill) MUST be
able to ask "is this card safe to overwrite?". A card whose origin is `ai`
and `userEdited === false` is a candidate for re-generation; once
`userEdited === true`, Auto-fill skips it. Without this field designed in
from day one, E would have no way to avoid clobbering real user work.

### Design metadata extension (backreference)

```ts
// src/features/editor/schema/index.ts — BrandOSDocument.metadata
// (already a free-form Record<string, unknown>, no schema migration)
{
  cardOriginType?: CardType;     // hint for editor titlebar + return nav
  cardBindingBrandId?: string;   // brand whose binding points here
}
```

### Single source of truth

`brand.brandKitDesigns[cardType]` is **canonical**.
`design.metadata.cardOriginType` is a non-authoritative **hint** used by the
editor titlebar and the save-back flow to know "which card should this
design's save target?". If the two disagree (e.g., a design has
`cardOriginType: 'business-card'` but `brand.brandKitDesigns['business-card']`
points to a different `designId`), the brand wins. This prevents the
ambiguity of two designs both claiming to be "the binding".

### Export snapshot table

```ts
// New Supabase table for frozen exports (Q2: Premium safe)
brand_kit_exports {
  id: uuid PK
  brand_id: uuid FK → brands.id
  created_at: timestamptz
  created_by: uuid FK → auth.users.id
  pdf_url: text NULL          // Supabase Storage signed URL
  zip_url: text NULL
  bindings_snapshot: jsonb    // full {cardType → BrandKitBinding} at export time
  brand_snapshot: jsonb       // full Brand object at export time (frozen)
  doc_snapshots: jsonb        // {designId → BrandOSDocument} for all bound designs
}
```

### Migration

| Layer | Change |
|-------|--------|
| Supabase `brands` table | `ALTER TABLE brands ADD COLUMN brand_kit_designs JSONB NULL` |
| Supabase new table | `CREATE TABLE brand_kit_exports (...)` (see above) |
| `LocalBrandsService` | Read with default `{}` for absent `brandKitDesigns` |
| Existing brands | Lazy populate on first bind. No backfill. |
| TypeScript types | Extend `Brand`, add `BrandKitBinding`, `CardType`, `BindOrigin` |

## Sub-project A — Customize persistence

### Scope

The current `BrandKitCardEditor.tsx` (~1815 LOC, in
`src/features/brand-kit/`) is a per-card overlay that lets the user pick a
logo variant, override the displayed name, swap in different colors, and
preview the card live. Its `onSave` callback at ~line 824 currently
toasts only. Sub-project A wires real persistence.

### What persists

For Brand Asset cards (Logos/Colors/Fonts/Icons), Customize edits the brand
itself. Persistence path:

- `colorAddsOverride` / `iconsOverride` (session-only overlays at
  `BrandKitCosmosPage.tsx` lines 232–249) → flush to `Brand.colors` /
  `Brand.icons` via `useBrandStore.getState().updateBrand(brand.id, partial)`.

For template-based cards, Customize writes a **`customize`-origin binding**:

```ts
brand.brandKitDesigns[cardType] = {
  cardType,
  version: prev?.version ? prev.version + 1 : 1,
  boundAt: new Date().toISOString(),
  origin: 'customize',
  userEdited: false,           // overlay overrides only — no design yet
  templateId: editorState.templateId,
  overrides: editorState.overrides, // logo picked, name, color swaps
};
```

### Read path

`BrandKitCosmosPage` reads `brand.brandKitDesigns[cardType]` when rendering
each template-based card. If `binding.origin === 'customize'`, render the
template at `templateId` with `overrides` applied. If `origin === 'editor' |
'template' | 'ai'`, render the bound design's thumbnail via
`IDesignStorage.loadDesign(brand.id, designId)`.

### Acceptance

- [ ] `BrandKitCardEditor.onSave` writes to `useBrandStore` and persists via
      `BrandsService` (Supabase + LocalBrandsService).
- [ ] `colorAddsOverride` + `iconsOverride` are removed from
      `BrandKitCosmosPage` state — flushed to brand on Customize save.
- [ ] Refreshing the page preserves the customization.
- [ ] Schema migration applied to Supabase.
- [ ] Unit tests cover binding shape + version increment.
- [ ] Adapter integration test: save flow writes to store.
- [ ] Browser E2E: open Customize → change color → save → reload → still there.

### Tech-debt tag

`BrandKitCardEditor.tsx` ships **as-is** for visual UI per product decision
(see "Tech debt tags" section). Persistence is the only change. Future
refactor of the overlay UI must be a separate, explicitly-requested
project.

## Sub-project B — Editor handoff + save-back

### Scope

Each template-based card in the drilldown gets an **Open in Editor** button.

### Empty card flow (Q4: Choice modal)

When the user clicks Open in Editor on a card with **no current binding**,
show a modal with three options:

```
┌─────────────────────────────────────────────────────────┐
│  Open Business Card editor                              │
│                                                          │
│  How would you like to start?                           │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │   Blank    │  │  Generate  │  │   Browse   │         │
│  │   canvas   │  │  with AI   │  │  templates │         │
│  └────────────┘  └────────────┘  └────────────┘         │
└─────────────────────────────────────────────────────────┘
```

- **Blank canvas** → create design with brand-applied empty doc at the
  card's preset dimensions → navigate to `/b/:slug/design/:newDesignId` with
  `metadata.cardOriginType = cardType` and `metadata.cardBindingBrandId =
  brand.id`. Binding is NOT created yet — created on first save.
- **Generate with AI** → call `generateFromPrompt({ agent, brand, brandKit,
  prompt: `Generate a ${cardType.replace('-', ' ')} for {{brand.name}}`,
  contentTypeId: cardType })` from
  `src/features/templates/generateFromPrompt.ts:29` → persist the resulting
  doc → set `brand.brandKitDesigns[cardType] = { origin: 'ai', userEdited:
  false, ... }` → navigate to editor.
- **Browse templates** → forwards to Sub-project C flow.

### Existing binding flow

When the user clicks Open in Editor on a card with an existing binding,
load the bound design directly into the editor — no choice modal.

### Save-back (auto-bind, with overwrite warning per Q2)

On editor save:

1. Check `brand.brandKitDesigns[cardType]`.
2. If a binding **exists and points to a different designId** (e.g., user
   used "Save As" or is in an unbound design that wants to claim this slot):
   show warning dialog: **"This will replace your current [Card Type] design
   in Brand Kit. The current version stays available in My Designs.
   Continue / Save as new (don't bind)."**
3. If the user confirms or no conflict exists:
   - Persist the design via `IDesignStorage.saveDesign(brand.id, designId, doc, meta)`.
   - Update `brand.brandKitDesigns[cardType]`:
     - Increment `version` (linear history — previous designId stays in My Designs).
     - Set `boundAt` to now.
     - Set `userEdited = true` (any save from the editor counts as user edit).
     - Origin stays as whatever created the binding (`editor` / `ai` /
       `template` / `customize` upgraded to `editor`).
     - The new designId replaces the prior one in the binding pointer.

Linear history means each save creates a **new design** (new designId), and
the binding just updates its pointer. Old versions remain queryable in My
Designs but are not bound. This gives the user a paper trail without auto-
expiring anything.

### Acceptance

- [ ] Open in Editor button visible on every template-based card.
- [ ] Choice modal on empty cards with all three options functional.
- [ ] Editor titlebar shows the card type when `metadata.cardOriginType`
      is set (uses existing `EditorChrome`).
- [ ] Save in editor auto-binds to the originating card (warning when
      replacing a different designId binding).
- [ ] Reloading Brand Kit shows the saved design under the card.
- [ ] Linear history: previous designIds remain in My Designs.
- [ ] Browser E2E: empty card → AI generate → save → see on card; existing
      bind → edit → save → updated on card with `version` bumped.

## Sub-project C — Templates integration (Browse Other)

### Scope

Each template-based card gets a **"Browse other [card type]"** button (in
the drilldown, next to Customize / Open in Editor / Download).

### Flow

1. Click "Browse other Business Card" on the Business Card card.
2. Navigate to `/b/:slug/templates?category=business-card&returnTo=brand-kit/business-card`.
3. Templates page filters to `cat-business-cards` category (Phase 4 seeds
   at `src/features/templates/seeds/categories.ts:7-107` already map the
   `contentTypeId` to card types one-to-one).
4. Each template card shows two actions: **Open in editor** (existing
   flow) and **Use as my Business Card** (new).
5. "Use as my Business Card" → apply brand to template → `saveDesign(brand.id, newDesignId, doc, meta)` → write `brand.brandKitDesigns['business-card'] = { origin: 'template', userEdited: false, designId: newDesignId, ... }` → navigate to `/b/:slug/brand-kit` and re-open the drilldown on the now-bound card.

### Required wiring (the C blockers from the dependency table)

| Wiring | File | Change |
|--------|------|--------|
| URL `?category=X` filter | `src/features/editor/shell/v2/panels/TemplatesPanel.tsx:115` | Add `useEffect` to read `searchParams.get('category')` and sync to `activeCategoryId`. Also write back to URL on chip click so the filter is shareable. |
| `?returnTo=X` param handling | Same file | Read `returnTo` param. When a template is picked via "Use as my X", navigate to `/b/:slug/${returnTo}` after binding. |
| "Use as my [card type]" template action | Template card component (sibling of TemplatesPanel) | New button rendered only when `returnTo` matches `brand-kit/<cardType>`. Triggers apply-brand → save-design → write binding → navigate. |

### Acceptance

- [ ] Each template-based card has "Browse other" button.
- [ ] Templates page respects `?category=X` filter on mount and updates URL on chip click.
- [ ] "Use as my X" action visible only in brand-kit return context.
- [ ] Picking a template binds it as `origin: 'template'` and returns to Brand Kit.
- [ ] Reloading shows the picked template as the bound design for the card.

## Sub-project D — Premium polish + Export

### D1. Placeholder card content

| Card | Current | Build |
|------|---------|-------|
| **Photos** | Placeholder grid | Gallery of brand photos (slot A–F). Upload via `AssetSourcePopover` (canonical primitive per CLAUDE.md). Drag-reorder. Stored on `Brand.photos[]`. |
| **About** | Placeholder grid | Form fields: name, tagline, description, mission, vision, values. Stored on `Brand.about[]` (existing field, extend shape if needed). Renders as a typographic card in Brand Kit. |
| **Favicon** | Cosmos-only stub | Auto-derive 16×16 / 32×32 / 180×180 (apple-touch-icon) / maskable from `Brand.logoSystem`. Inline preview + Download button outputs `.ico` + PNG set. |
| **Website** | Cosmos-only stub | Static hero+nav mockup using brand palette via `surfacePalette()` (canonical helper per CLAUDE.md). Read-only preview; no live page. |
| **Email Signature** | Cosmos-only stub | HTML email signature template using brand. Preview as rendered email. Download button outputs `.htm` file. |
| **Landing Page** | Cosmos-only stub | Single-section landing-page mockup using brand. Read-only preview. |

### D2. PDF Brand Guide

Port + promote `src/features/brand-kit-alt/brandGuidePdf.ts` (and any
helpers it imports — verified live and shipping per Q5) from the alternate
fork to a shared location, then call from canonical:

- New location: `src/features/brandkit/export/brandGuidePdf.ts` (the
  domain layer, importable from both forks).
- Refactor to consume the new `brandKitDesigns` bindings for the
  Stationery / Social / Web / Decks showcase pages — render the bound
  design's thumbnail for each.
- Pages:
  1. Cover (brand logo + name + date)
  2. Logo Guide (variants + clear space + don'ts)
  3. Color Guide (palette swatches + hex + usage rules)
  4. Typography Guide (typescale)
  5. Voice Guide (pillars + essay)
  6. Imagery Guide (photo + icon style)
  7. Stationery Showcase (renders bound designs)
  8. Social Showcase (renders bound designs)
  9. Web Showcase (renders mockups)

### D3. ZIP bulk export

Port + promote `src/features/brand-kit-alt/bulkExport.ts` to
`src/features/brandkit/export/bulkExport.ts`.

Folder structure:

```
brand-kit-<slug>-v<exportNumber>.zip
├── README.txt                       (folder index + version + date)
├── brand-guide.pdf                  (from D2)
├── logos/
│   ├── primary.svg
│   ├── primary.png (1x, 2x, 4x)
│   └── variants/ (mono-black, mono-white, on-dark, on-light each as SVG + PNG)
├── colors/
│   ├── palette.ase                  (Adobe Swatch Exchange)
│   ├── palette.json
│   └── swatches.png                 (visual reference)
├── fonts/
│   └── *.woff2, *.otf               (uploaded font files; system fonts noted in README.txt)
├── stationery/
│   ├── business-card.pdf
│   ├── business-card.png
│   ├── letterhead.pdf
│   └── ... (each bound stationery card)
├── social/
│   ├── instagram-post.png (1080×1080)
│   ├── instagram-story.png (1080×1920)
│   └── ... (correct dimensions per card)
├── web/
│   ├── favicon.ico
│   ├── favicon-16.png, favicon-32.png, apple-touch-icon.png
│   ├── email-signature.htm
│   └── website-mockup.png
└── presentations/
    └── ... (bound deck designs as PDF)
```

### D4. Export action UX (Q2: Premium safe + frozen snapshots)

Top of Brand Kit page: **Export Brand Kit** primary button.

On click:
1. Generate PDF + ZIP server-side (or via Web Worker for the ZIP — TBD in plan).
2. Upload both to Supabase Storage under `brand-kit-exports/<brandId>/<exportId>/`.
3. Insert row into `brand_kit_exports` with `bindings_snapshot`,
   `brand_snapshot`, and `doc_snapshots` (full freeze of every bound design's
   document JSON at export time).
4. Show success modal with download links.
5. Past exports listed under a "Previous exports" surface (location TBD —
   probably a small section above the Export button showing the last 3 with
   "Download" + "Show all" link).

Each export is **immutable**. If the user re-exports later, a new row is
created. Past exports never auto-update.

### D5. Helpers promotion (port out of brand-kit-alt)

Per Q5, the `brand-kit-alt/` fork is LIVE (mounted at `/a/:slug/brand-kit`,
shipping to Classic users, bug-fix only). Helpers are not dead code, so a
port is safe — but the right move is to **promote** the shared helpers
into the domain layer so both forks consume the same pipeline:

```
src/features/brand-kit-alt/brandGuidePdf.ts → src/features/brandkit/export/brandGuidePdf.ts
src/features/brand-kit-alt/bulkExport.ts    → src/features/brandkit/export/bulkExport.ts
```

After the move, `brand-kit-alt`'s callers re-import from the new shared
location. This eliminates the risk of the two forks drifting in their
export logic.

### Acceptance

- [ ] Photos / About / Favicon / Website / Email Sig / Landing Page each render real content (not placeholders).
- [ ] PDF Brand Guide generation works against all three seed brands (Raqm, SKAM, Vector) plus one freshly-onboarded test brand.
- [ ] ZIP bulk export contains every promised folder + file.
- [ ] Export action persists a `brand_kit_exports` row with full snapshots.
- [ ] Previous exports surface lists past exports with re-download.
- [ ] Helpers promoted to shared location; `brand-kit-alt/` imports updated.

## Future scope — Sub-project E (Auto-fill)

**Not in this spec's implementation scope.** Designed-around only.

E is a single top-level action on Brand Kit ("Auto-fill empty cards") that
batch-fires `generateFromPrompt` for every template-based card that has no
binding or has `origin === 'ai' && userEdited === false`. The result: a
freshly-onboarded brand can have all 25 template-based cards filled with AI-
generated drafts in one click — the true premium export-readiness primitive.

### Design constraints imposed on A + B by E

- `BrandKitBinding.origin` must include `'ai'` from day one. ✅ Included.
- `BrandKitBinding.userEdited: boolean` must be present from day one, and
  every editor save must flip it to `true`. ✅ Included.
- Auto-fill must be able to query "all cards eligible for re-generation" —
  the canonical query is:
  ```
  (cardType has no binding) OR
  (binding.origin === 'ai' && binding.userEdited === false)
  ```
- Auto-fill must NEVER overwrite a `userEdited === true` binding without a
  separate, explicit "force re-generate this card" action.

### Out of scope here, on roadmap for later

- The Auto-fill action UI itself.
- Concurrency / rate-limit handling for batch generation.
- AI image generation vendor wiring (Phase 4.3 debt #6 still open per CLAUDE.md).
- Streaming progress UI for batch operations.

## Card type catalog

The 11 Phase 4.1 template categories already map to Brand Kit card types
one-to-one for most cases:

| Brand Kit card | Category `contentTypeId` | Notes |
|----------------|--------------------------|-------|
| Business Card | `business-card` | ✅ direct |
| Letterhead | `letterhead` | ✅ direct |
| Envelope | — | ❌ not yet a category (add in C if needed) |
| Invoice | `invoice` | ✅ direct |
| Social Profile | — | ❌ no category yet (square avatar size) |
| Social Cover | — | ❌ no category yet (banner ratios) |
| Social Post | `social-post` | ✅ direct |
| Social Story | — | ❌ no category yet (9:16) |
| Favicon | — | ❌ derived from logos, no template needed |
| Website | — | ❌ deferred (only mockup, no editable template in scope) |
| Email Signature | `email-signature` | ✅ direct |
| Landing Page | — | ❌ deferred |
| Brand Guides (×5) | `brand-guideline-slide` | ✅ shared category — drilldown filters by slide kind |
| Pitch Deck | `presentation` | ✅ direct |
| Business Plan | `presentation` | ⚠️ shares category — distinguish by sub-tag |
| Proposal | `presentation` | ⚠️ shares category — distinguish by sub-tag |
| Case Studies | `presentation` | ⚠️ shares category — distinguish by sub-tag |
| Animations (×4) | — | ❌ deferred — animations don't fit the static template seed model; the four animation `CardType`s are defined in schema (so future bindings remain forward-compatible) but Animations cards render placeholders in this spec's D1 scope. No Open in Editor handoff for animations in B; no Browse Other in C. Implementation belongs to a later animation-engine spec. |

**Plan task:** in C's scope, add missing categories (`envelope`,
`social-profile`, `social-cover`, `social-story`) to the Phase 4.1 seed.
For shared categories (`presentation` covers Pitch/Plan/Proposal/Case
Studies), filter additionally on a `subType` tag in template metadata.

## Save & versioning policy (Q2 — Premium safe)

| Concern | Policy |
|---------|--------|
| Overwrite warning | Yes — warn when save replaces a binding pointing to a different `designId`. Offer "Save as new" to abort the bind. |
| Versioning | Linear history. Each save = new `designId` (stays in My Designs). Binding pointer updates. `version` increments. No design ever destructively edited in place. |
| Export snapshot | Frozen. Each export creates an immutable row with full `bindings_snapshot` + `brand_snapshot` + `doc_snapshots`. Past exports never change. |
| Export storage | Supabase Storage signed URLs in `brand_kit_exports.pdf_url` / `.zip_url`. |
| User-initiated revert | Out of scope here. With linear history in place, a future "restore version N" feature can land trivially by repointing the binding. |

## AI Mode 1 wiring (Q4 — Choice modal)

`generateFromPrompt` lives at `src/features/templates/generateFromPrompt.ts:29`
with signature `{ agent, brand, brandKit, prompt, contentTypeId } →
{ ok, doc?, message }`. Currently invoked only by
`GenerateWithAiSection.tsx:79` inside the TemplatesPanel.

### Reuse strategy

Extract a thin reusable hook in Sub-project B:

```ts
// src/features/brandkit/ai/useGenerateForCard.ts
export function useGenerateForCard() {
  return useCallback(async (args: {
    brand: Brand;
    cardType: CardType;
    prompt?: string; // defaults to "Generate a ${cardType} for {{brand.name}}"
  }) => {
    // 1. Call generateFromPrompt
    // 2. Persist via IDesignStorage.saveDesign
    // 3. Write brand.brandKitDesigns[cardType] with origin: 'ai', userEdited: false
    // 4. Return { designId, doc }
  }, []);
}
```

Both the Choice modal's "Generate with AI" option (B) and the future Auto-
fill (E) consume this hook. No new generation logic added — just a thin
binding wrapper.

## Tech debt tags

This spec introduces or interacts with the following tagged surfaces. Any
future agent touching them must read the tag's instructions before acting.

### `brand-kit-overlay-v1`

Files: `src/features/brand-kit/BrandKitCardEditor.tsx`

This 1815-LOC overlay is the per-card Customize UI. It ships **as-is**
visually per product decision (Q1: "Keep current overlay + add
persistence"). Sub-project A wires `onSave` to persist; the UI is not
touched. **Do not refactor the overlay UI without explicit user
direction.** Future UI redesign is a separate, explicitly-requested
project, not a "while we're here" cleanup.

When working in this file:
- ✅ Wire data persistence
- ✅ Fix bugs that break persistence or correctness
- ❌ Restructure the component tree
- ❌ Migrate to a different state pattern
- ❌ Replace the live preview engine
- ❌ Extract sub-components "for cleanliness"

## Testing strategy

Per CLAUDE.md's three-layer requirement:

### Unit (jsdom)

- `BrandKitBinding` schema validation.
- Binding version increment on save.
- `cardOriginType` ↔ `brand.brandKitDesigns` source-of-truth conflict resolution.
- `useGenerateForCard` hook (with `generateFromPrompt` mocked).

### Adapter integration (jsdom)

- `BrandKitCardEditor.onSave` → store write → `BrandsService.update` call (Supabase mocked).
- Open-in-Editor save → `IDesignStorage.saveDesign` + binding write.
- Templates "Use as my X" → apply-brand + save + bind.
- `brand_kit_exports` row creation on export.

### Browser E2E (Chromium via Playwright)

- Customize flow: open overlay → change color → save → reload → preserved.
- Editor flow (empty card → Choice modal): all three branches end-to-end.
- Editor flow (existing binding): edit → save → version bumped.
- Browse Other flow: card → templates filtered → pick → bound back.
- Export flow: PDF + ZIP generation + snapshot persistence.

## Implementation order

1. **A. Customize persistence** — foundation; nothing usable until schema lands and overlay writes.
2. **B. Editor handoff + save-back** — unlocks the creative loop. Choice modal lives here.
3. **C. Templates integration** — completes the design loop (alternates accessible without leaving the flow).
4. **D. Premium polish + Export** — finishes the deliverable. Photos/About/Web content + PDF + ZIP + snapshot table.

C and D are independent of each other once A and B are in place — they can
be implemented in parallel by separate agents/sessions if needed.

## Open questions / TODO before plan

- [ ] **Export trigger location**: confirm the "Export Brand Kit" button
      lives at the top of the Brand Kit page (sections list view), not
      inside the drilldown. Default: top of sections list. Confirm in plan.
- [ ] **Sub-typed categories**: Pitch Deck / Business Plan / Proposal /
      Case Studies all share `presentation` category. Plan must specify
      whether to (a) add `subType` to template metadata + filter or
      (b) split into four categories. Default: option (a) — less migration.
- [ ] **Missing categories**: Envelope, Social Profile/Cover/Story need
      categories added to Phase 4.1 seed in C. Plan to enumerate the
      template seeds for each.
- [ ] **Web cards mockup source**: Website + Landing Page render as static
      mockups using `surfacePalette()`. Plan must specify the mockup
      component (probably a new `BrandMockupRenderer` in `features/brandkit/`).
- [ ] **Email signature template format**: HTML inline-styled `.htm` is the
      target. Plan must specify the template structure (table-based for
      Gmail/Outlook compatibility).
- [ ] **Export concurrency**: PDF generation is heavy. Plan must specify
      whether server-side via Supabase Edge Function or client-side via
      Web Worker. Default recommendation: Edge Function (per CLAUDE.md's
      note about moving heavy work behind server proxies for security
      anyway).

These are blocker items for the implementation plan, not the design. They
get resolved during plan-writing (`superpowers:writing-plans`).
