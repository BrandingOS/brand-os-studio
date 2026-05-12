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

## Prerequisites (hard blockers)

The following must be in place before the AI-touching paths in this spec
can ship. They are out of this spec's implementation scope but the plan
must verify and gate on them.

### P1. AI proxy migration must reach production

Per CLAUDE.md: `VITE_ANTHROPIC_API_KEY` is currently inlined into the
client bundle at build time and MUST be moved behind a Supabase Edge
Function (`ai-proxy`) before any public-facing AI feature can ship. The
migration is paused at Step 1 (Issue #2 in the repo).

**Mandate for this spec:** `useGenerateForCard` and every call site
that ultimately invokes `generateFromPrompt` MUST go through the
`ai-proxy` Edge Function from day one — never the inline-key path.
If `generateFromPrompt`'s current implementation still uses the inline
key, completing the AI proxy migration is a hard prerequisite for
shipping:

- Sub-project B's Choice modal **"Generate with AI"** branch
- Future Sub-project E's Auto-fill action

Sub-projects A, C, and D have no AI dependency and are unblocked by P1.
The plan must verify the current state of `generateFromPrompt` (does it
read `VITE_ANTHROPIC_API_KEY` or call `ai-proxy`?) and either confirm
the prerequisite is satisfied or escalate to complete it before B's AI
branch ships.

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
  | 'customize'        // user used the BrandKitCardEditor overlay only
  | 'editor'           // user opened in /b/:slug/design and saved
  | 'template'         // user picked a template from Templates page → "Use as my X"
  | 'ai-individual'    // Choice modal "Generate with AI" → single card (Sub-project B)
  | 'ai-bulk';         // future Sub-project E: Auto-fill batch generation
```

**Why split `ai` into two from day one.** Sub-project B ships the
individual AI flow (Choice modal). Sub-project E ships the batch flow
(Auto-fill). They need to be telemetry-distinguishable and policy-
distinguishable from the very first binding write. Future "regenerate
this card" actions might be allowed on `ai-individual` (the user opted
in once) but disallowed on `ai-bulk` until the user confirms they want
to lose the entire batch. Without the split designed in from day one,
this distinction is unrecoverable.

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

### Migration 009 (idempotent)

Filename: `supabase/migrations/009_brand_kit_premium.sql`. All statements
use `IF NOT EXISTS` / `IF EXISTS` guards per the idempotency lessons from
migrations 001–008 — every migration must be safe to re-run on a partial-
applied database.

**`up.sql`:**

```sql
-- 1. Add brand_kit_designs to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_kit_designs JSONB NULL;

-- 2. Frozen export snapshots table
CREATE TABLE IF NOT EXISTS brand_kit_exports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_url       TEXT NULL,
  zip_url       TEXT NULL,
  bindings_snapshot JSONB NOT NULL,
  brand_snapshot    JSONB NOT NULL,
  doc_snapshots     JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS brand_kit_exports_brand_id_idx
  ON brand_kit_exports(brand_id, created_at DESC);

-- 3. RLS: brand owner can read/insert their own exports
ALTER TABLE brand_kit_exports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kit_exports'
      AND policyname = 'brand_owner_select_exports'
  ) THEN
    CREATE POLICY brand_owner_select_exports ON brand_kit_exports
      FOR SELECT USING (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_kit_exports'
      AND policyname = 'brand_owner_insert_exports'
  ) THEN
    CREATE POLICY brand_owner_insert_exports ON brand_kit_exports
      FOR INSERT WITH CHECK (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;
END $$;
```

**`down.sql`:**

```sql
DROP POLICY IF EXISTS brand_owner_insert_exports ON brand_kit_exports;
DROP POLICY IF EXISTS brand_owner_select_exports ON brand_kit_exports;
DROP INDEX IF EXISTS brand_kit_exports_brand_id_idx;
DROP TABLE IF EXISTS brand_kit_exports;
ALTER TABLE brands DROP COLUMN IF EXISTS brand_kit_designs;
```

### Other migration concerns

| Layer | Change |
|-------|--------|
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
  contentTypeId: cardType })` (routed through the `ai-proxy` Edge Function
  per Prerequisite P1, never the inline-key path) → persist the resulting
  doc → set `brand.brandKitDesigns[cardType] = { origin: 'ai-individual',
  userEdited: false, ... }` → navigate to editor.
- **Browse templates** → forwards to Sub-project C flow.

### Generate with AI — loading + cancel states in the Choice modal

The "Generate with AI" branch does NOT close the Choice modal on click.
Instead, the modal transitions to an in-place loading state. State
machine:

1. **Initial** — three-option Choice modal as drawn above.
2. **Generating** (on AI click) — modal swaps body to:
   - Title: "Generating your [card type name]…"
   - Subtitle: "This usually takes 10–30 seconds."
   - Indeterminate progress bar (if Edge Function doesn't stream tokens)
     OR percentage if it does.
   - **Cancel** button (always visible, wired to an `AbortController`
     passed into `generateFromPrompt`).
3. **Slow** (after 60s without completion) — body adds a third line:
   "Taking longer than usual — you can keep waiting or cancel and try
   again." Cancel button gains emphasis (filled button vs ghost).
4. **Failed** (on error or non-OK response) — body swaps to:
   - Title: "Couldn't generate your [card type name]"
   - Error message (mapped from Edge Function error code where possible)
   - **Retry** button + **Cancel** button. No binding written.
5. **Success** — modal closes. Navigation to `/b/:slug/design/:newDesignId`
   begins. Binding is written before navigation.

**Cancel semantics.** User-initiated cancel calls `AbortController.abort()`,
which Edge Function honors and returns early. No binding written.
`generateFromPrompt` returns a sentinel `{ ok: false, message: 'cancelled' }`
that the modal interprets as returning to **Initial** state (not Failed).

**Failure isolation.** A failed AI generation MUST NOT corrupt
`brand.brandKitDesigns` — the write only happens on success, after the
designId is generated and the doc is persisted to `IDesignStorage`. If
persistence fails after generation, surface the persistence error
specifically (different copy from generation failure).

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

### D1. Placeholder card content (scope-aware)

D1 implementation is scoped by the MVP / Polish / Future bucketing.

| Card | Family | Scope | D1 build |
|------|--------|-------|----------|
| **Photos** | Brand Asset | MVP | Gallery of brand photos (slot A–F). Upload via `AssetSourcePopover` (canonical primitive per CLAUDE.md). Drag-reorder. Stored on `Brand.photos[]`. **Built in D1.** |
| **About** | Brand Asset | MVP | Form fields: name, tagline, description, mission, vision, values. Stored on `Brand.about[]` (existing field, extend shape if needed). Renders as a typographic card in Brand Kit. **Built in D1.** |
| **Favicon** | Template-based | Polish | Auto-derive 16×16 / 32×32 / 180×180 (apple-touch-icon) / maskable from `Brand.logoSystem`. Pure generator (no template). Inline preview + Download outputs `.ico` + PNG set. **Built in D1 — trivial.** |
| **Email Signature** | Template-based | MVP | See "Email signature template (TODO #5 resolution)" below for full spec. **Built in D1.** |
| **Website** | Template-based | Future | "Coming soon" placeholder card with brand-colored skeleton illustration. No template, no Customize, no Open in Editor handoff in this spec. Future spec ships the `BrandMockupRenderer` (see TODO #4 resolution below for the component scaffold). |
| **Landing Page** | Template-based | Future | Same as Website — "Coming soon" placeholder. |
| **Animations** (×4) | Template-based | Future | "Coming soon" placeholders. CardTypes defined in schema for forward-compat. No Customize/Editor/Browse handoffs in B or C; render-only as placeholder in this spec. |

### TODO #4 resolution (technical) — Web mockup component (deferred to future spec)

When Website + Landing Page are built in a future spec, the resolution
is a single shared component `src/features/brandkit/preview/BrandMockupRenderer.tsx`:

```ts
type BrandMockupKind = 'website' | 'landing-page' | 'email-signature-frame';
interface Props {
  brand: Brand;
  kind: BrandMockupKind;
  width?: number;     // defaults: website=1440, landing=1440, email=600
  height?: number;    // defaults: website=900, landing=1200, email=auto
}
```

Renders a static SVG/HTML mockup with brand-applied via `surfacePalette()`
(canonical helper). Website kind: navbar + hero + 3-feature grid + CTA +
footer. Landing kind: hero + form + 3-benefit grid + footer.

This spec does NOT implement `BrandMockupRenderer`. The Future-scope
cards (Website, Landing Page) render generic "Coming soon" placeholders
in D1 until the mockup component lands in its own spec.

### TODO #5 resolution (technical) — Email signature template format

Email signature template format is **table-based HTML with inline styles
only**. This is the only format that renders consistently across Gmail,
Outlook 365, Outlook desktop, and Apple Mail.

**Template source:** `src/features/brandkit/templates/emailSignature.html.ts`
as a template-literal function:

```ts
export function emailSignatureHtml(brand: Brand, opts?: {
  variant?: 'standard' | 'minimal' | 'photo-led';
}): string;
```

**Rules:**
- 2-column `<table role="presentation">` layout (avatar/logo column,
  text column). NO `<div>` for layout — only tables.
- All styles inline via `style="..."` attribute. NO `<style>` blocks,
  NO external CSS.
- Web-safe font stack only: `font-family: Arial, Helvetica, sans-serif`
  (brand font is RENDERED, not embedded — embedded fonts don't survive
  email clients).
- No JavaScript. No `<script>` tags.
- Brand color rendered as inline `color:` and `background-color:`.
- Logo embedded as data-URI (≤40KB) or absolute URL to brand asset
  storage.
- Max width 600px (Outlook clipping safety).
- Variants for the MVP build: `standard` only. Other variants are
  Polish-scope.

**Compatibility test matrix (acceptance):**
- Gmail web (light + dark theme)
- Gmail iOS app
- Outlook 365 web
- Outlook desktop (Windows)
- Apple Mail

Plan must include rendering test artifacts for each.

### TODO #6 resolution (technical) — Export concurrency

Resolved: **client-side via Web Worker.** Justification:

- `jsPDF` + `jsZip` already in the stack per CLAUDE.md.
- Estimated Brand Kit export size: PDF 5–15 MB, ZIP 10–50 MB — well
  within browser memory.
- Web Worker keeps main thread responsive during generation (the
  3-state Export button + progress reporting depend on this).
- Zero infrastructure cost.
- No security surface (no API keys involved, unlike the AI proxy
  paths in B which DO need the Edge Function per P1).
- `bulkExport.ts` from `brand-kit-alt/` is already client-side, so
  porting fits naturally.

Worker file: `src/features/brandkit/export/exportWorker.ts`. Receives
`{ brand: Brand, bindings: BrandKitBinding[], docs: Record<string,
BrandOSDocument> }` from the main thread, posts back `{ kind: 'progress',
percent }` and finally `{ kind: 'done', pdfBlob, zipBlob }` (or `{ kind:
'error', stage, code }`).

If we hit memory or perf limits in the future for very large brands
(>100MB output), the worker boundary stays — we just swap the worker
implementation for an Edge Function call without changing the export
button state machine or the consumer code. The seam is intentional.

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

**Single entry point.** The Export Brand Kit button lives in the `actions`
slot of the shared `PageHeader` (`@/shared/ui/PageHeader`) at the top of
the Brand Kit sections-list view. No duplicate entry points — no topbar
button, no FAB, no drilldown button. The single entry point is by design;
discoverability is handled by the PageHeader placement, not redundant
controls.

**Button state machine (3 states):**

1. **Idle (default)** — label: "Export Brand Kit", icon: download.
   Disabled when brand is incomplete (see "Brand-completeness gate" below);
   tooltip explains what's missing.
2. **Generating** — label changes to "Generating… (NN%)" with progress
   indicator. Worker reports progress via `postMessage` for both PDF and
   ZIP stages. Button click during this state shows a "Generation in
   progress" toast.
3. **Ready-to-download** — label: "Download" (with chevron showing
   PDF / ZIP / both). Click reveals a popover with two buttons:
   "Download PDF" and "Download ZIP". This state persists for the session
   after a successful export; navigating away resets back to Idle.

### Brand-completeness gate

The Export button is **disabled** when the brand is missing required
fields. MVP-tier requirements (minimum bar to ship a Brand Kit):

| Required | Source field |
|----------|--------------|
| Brand name | `brand.name` (non-empty string) |
| At least one logo | `brand.logoSystem` OR `brand.logo` (any logo variant) |
| Primary color | `brand.colorSystem?.primary?.hex` OR `brand.primaryColor` |

When any of these are missing, the button is disabled and shows a tooltip:
`"Missing: <list of missing items>"`. Clicking does nothing; the user must
go to Setup to fix.

Brand-completeness check lives in a single helper:
`src/features/brandkit/export/isBrandReadyForExport.ts` — returns
`{ ready: boolean, missing: string[] }`. Reused by telemetry and any future
UI that needs the same gate (e.g., Auto-fill in E).

### Generation flow

On click (when button is Idle and brand is ready):

1. Spawn a dedicated Web Worker (`src/features/brandkit/export/exportWorker.ts`).
2. Worker generates PDF (D2) and ZIP (D3) in sequence; reports progress.
3. Main thread uploads both blobs to Supabase Storage under
   `brand-kit-exports/<brandId>/<exportId>/`.
4. Insert row into `brand_kit_exports` with `bindings_snapshot`,
   `brand_snapshot`, and `doc_snapshots` (full freeze of every bound
   design's document JSON at export time).
5. Transition to **Ready-to-download** state. Show success toast: "Brand
   Kit exported — your client deliverable is ready."

**Past exports listing.** A "Previous exports" inline section sits below
the PageHeader and above the sections list — shows the last 3 exports
(date + size + Download buttons) with a "Show all" link to a modal.
Order: newest first.

Each export is **immutable**. If the user re-exports later, a new row is
created. Past exports never auto-update.

### D5. Helpers promotion (Hybrid — Option c)

Per Q5 the `brand-kit-alt/` fork is LIVE (mounted at `/a/:slug/brand-kit`,
shipping to Classic users, bug-fix only). Naive copy-only creates a drift
fault line; full-move (delete from alt + rewire) would re-touch frozen
code. **Resolution: Hybrid (Option c)** — canonical files move to the
domain layer; `brand-kit-alt/`'s imports are updated to point at the new
canonical location; no `brand-kit-alt/` logic, UI, or tests are touched.

**Canonical new location:**

```
src/features/brandkit/export/brandGuidePdf.ts
src/features/brandkit/export/bulkExport.ts
src/features/brandkit/export/exportWorker.ts        (new — D4)
src/features/brandkit/export/isBrandReadyForExport.ts (new — D4)
```

**Implementation constraints (per user mandate):**

1. **`brand-kit-alt/` files: imports updated ONLY.** No logic edits,
   no UI edits, no deletions. Diff per affected file must be ≤3 lines
   (the import statement swaps).
2. **Optional re-export shims.** If `brand-kit-alt/brandGuidePdf.ts`
   and `bulkExport.ts` paths have stray external importers (anything
   outside `brand-kit-alt/` that imports those files), leave thin re-
   export shims in the original locations:
   ```ts
   // src/features/brand-kit-alt/brandGuidePdf.ts (shim)
   export { generateBrandGuidePdf } from '@/features/brandkit/export/brandGuidePdf';
   ```
   The shim's presence vs. absence is a per-file judgment based on
   importer count. Plan must audit importers and decide for each file.
3. **Tests move, not duplicate.** Test files that previously sat next to
   `brand-kit-alt/brandGuidePdf.ts` move to live next to the canonical
   file at `src/features/brandkit/export/brandGuidePdf.test.ts`. CI runs
   them exactly once against the canonical source. No duplicate test
   files anywhere.
4. **Atomic commit boundary.** The promotion is a SINGLE git commit:
   - Add canonical files to `src/features/brandkit/export/`
   - Update all `brand-kit-alt/` imports to point at canonical
   - Move test files
   - (Optionally) add re-export shims
   No "phase 1: copy, phase 2: rewire" — that's a window where drift
   can occur.
5. **Commit tag.** The promotion commit message includes the marker
   `refactor/brand-kit-export-promoted` (in the body, not subject) so
   future agents searching `git log --grep=brand-kit-export-promoted`
   can find the migration boundary.

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
batch-fires `useGenerateForCard({ origin: 'ai-bulk', ... })` for every
template-based card that has no binding or has an AI-origin binding the
user hasn't touched. The result: a freshly-onboarded brand can have all
25 template-based cards filled with AI-generated drafts in one click —
the true premium export-readiness primitive.

### Design constraints imposed on A + B by E

- `BrandKitBinding.origin` must include both `'ai-individual'` and
  `'ai-bulk'` from day one (not just a single `'ai'`). ✅ Included — the
  enum is split in the schema definition above.
- `BrandKitBinding.userEdited: boolean` must be present from day one, and
  every editor save must flip it to `true`. ✅ Included.
- Auto-fill must be able to query "all cards eligible for re-generation".
  The canonical eligibility check:
  ```ts
  function isEligibleForAutofill(binding?: BrandKitBinding): boolean {
    if (!binding) return true;
    if (binding.userEdited) return false;
    return binding.origin === 'ai-individual' || binding.origin === 'ai-bulk';
  }
  ```
- Auto-fill must NEVER overwrite a `userEdited === true` binding without a
  separate, explicit "force re-generate this card" action.
- Distinguishing `ai-individual` from `ai-bulk` in the binding allows
  future "regenerate this card" UX to know whether the user explicitly
  chose AI for THIS card (`ai-individual` — safer to retry without
  warning) versus accepted it as part of a batch (`ai-bulk` — may warrant
  a confirmation to lose the batch).

### Out of scope here, on roadmap for later

- The Auto-fill action UI itself.
- Concurrency / rate-limit handling for batch generation.
- AI image generation vendor wiring (Phase 4.3 debt #6 still open per CLAUDE.md).
- Streaming progress UI for batch operations.

## Card scope — MVP / Polish / Future

The 25 cards are bucketed by **user value** for the export deliverable:

- **MVP (8 cards)** — universal must-haves. Every brand needs these in
  the deliverable. Without them, the PDF + ZIP isn't a deliverable.
  Sub-projects A/B/C/D ship the full flow for these 8.
- **Polish (11 cards)** — extends MVP categories. Polish completes the
  showcase but is not blocking ship. A/B/C work for these too; D's
  PDF/ZIP includes them when bound but doesn't require them to bind.
- **Future (6 cards)** — needs subsystems outside this spec.
  Website + Landing Page need a separate visual mockup design system;
  Animations need an animation engine outside the static template
  seed model. `CardType`s defined in schema for forward-compat;
  cards render placeholders with "Coming soon" badge in this spec's
  D1 scope.

### Card type catalog (with scope + category mapping)

The 11 Phase 4.1 template categories already map to MVP/Polish Brand
Kit card types one-to-one for most cases:

| Brand Kit card | Category `contentTypeId` | Scope | Notes |
|----------------|--------------------------|-------|-------|
| Business Card | `business-card` | **MVP** | Universal stationery |
| Letterhead | `letterhead` | **MVP** | Formal correspondence — every brand has these |
| Envelope | `envelope` *(new — add in C)* | Polish | Same family as Letterhead |
| Invoice | `invoice` | Polish | Useful but not every brand sends them |
| Social Profile | `social-profile` *(new — add in C)* | Polish | 1080×1080 avatar |
| Social Cover | `social-cover` *(new — add in C)* | Polish | Banner — pick LinkedIn 1584×396 as canonical, document in C |
| Social Post | `social-post` | **MVP** | Highest social-media frequency, universal |
| Social Story | `social-story` *(new — add in C)* | Polish | 1080×1920 |
| Favicon | — | Polish | Auto-derived from logos; trivial generator, no template |
| Website | — | Future | Mockup needs separate visual design system |
| Email Signature | `email-signature` | **MVP** | Universal use, low complexity, high value |
| Landing Page | — | Future | Mockup needs separate visual design system |
| Logo Guide | `brand-guideline-slide` + `subType: 'logo'` | **MVP** | Critical PDF brand-guide section |
| Color Guide | `brand-guideline-slide` + `subType: 'color'` | **MVP** | Critical PDF brand-guide section |
| Typography Guide | `brand-guideline-slide` + `subType: 'typography'` | **MVP** | Critical PDF brand-guide section |
| Voice Guide | `brand-guideline-slide` + `subType: 'voice'` | Polish | Useful but lower frequency |
| Imagery Guide | `brand-guideline-slide` + `subType: 'imagery'` | Polish | Useful but lower frequency |
| Pitch Deck | `presentation` + `subType: 'pitch-deck'` | **MVP** | Every brand needs one |
| Business Plan | `presentation` + `subType: 'business-plan'` | Polish | Some brands |
| Proposal | `presentation` + `subType: 'proposal'` | Polish | Sales-facing brands |
| Case Studies | `presentation` + `subType: 'case-studies'` | Polish | Marketing-mature brands |
| Animations (×4) | — | **Future** | Animations don't fit static template seed model; the four animation `CardType`s are defined in schema (so future bindings remain forward-compatible) but Animations cards render "Coming soon" placeholders in D1. No Open in Editor handoff for animations in B; no Browse Other in C. Implementation belongs to a later animation-engine spec. |

**Tally:** 8 MVP + 11 Polish + 6 Future = 25 cards. ✓

### Resolution of catalog gaps (TODOs #2 + #3 — technical, resolved)

**Sub-typed categories (TODO #2).** Pitch Deck / Business Plan / Proposal
/ Case Studies share the `presentation` category. Same for Brand Guides
(×5) sharing `brand-guideline-slide`. Resolution: **add a `subType: string`
field to template metadata** (templates author tags) and filter on
`category=X AND subType=Y` in the Templates panel. Justification: less
migration than splitting categories (single metadata field add vs 4
category splits); keeps the Phase 4.1 seed schema stable; filtering on
subType is a small predicate addition. Brand Kit Pitch Deck card queries
`category=presentation AND subType=pitch-deck` for its "Browse Other"
target.

**Missing categories (TODO #3).** Resolution: in Sub-project C's scope,
append these 4 new categories to `src/features/templates/seeds/categories.ts`:

```ts
{ id: 'cat-envelopes',       contentTypeId: 'envelope',       name: 'Envelopes',       ... },
{ id: 'cat-social-profiles', contentTypeId: 'social-profile', name: 'Profile pictures',... },
{ id: 'cat-social-covers',   contentTypeId: 'social-cover',   name: 'Cover banners',   ... },
{ id: 'cat-social-stories',  contentTypeId: 'social-story',   name: 'Stories',         ... },
```

Each new category needs at least 2 seed templates to ship Polish-tier
"Browse other" experience. Plan must enumerate the seed templates.

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

### Security mandate (P1 reinforcement)

`generateFromPrompt` and every code path consumed by `useGenerateForCard`
MUST route through the `ai-proxy` Supabase Edge Function. The inline
`VITE_ANTHROPIC_API_KEY` path is forbidden for all new code. If
`generateFromPrompt`'s current implementation still uses the inline key,
the plan must either (a) confirm `ai-proxy` has shipped and `generateFromPrompt`
is already routed through it, or (b) gate Sub-project B's AI branch on
completing the AI proxy migration first. Sub-project A, C, and D-without-
AI can ship in parallel; the AI branch waits.

### Reuse strategy

Extract a thin reusable hook in Sub-project B, in a shared location so
future Sub-project E (Auto-fill) imports the same hook:

```ts
// src/features/brandkit/ai/useGenerateForCard.ts
export function useGenerateForCard() {
  return useCallback(async (args: {
    brand: Brand;
    cardType: CardType;
    prompt?: string;          // defaults to `Generate a ${cardType} for ${brand.name}`
    origin: 'ai-individual' | 'ai-bulk';  // mandatory — set by caller
    abortSignal?: AbortSignal;            // cancellation support
  }): Promise<{
    ok: true; designId: string; doc: BrandOSDocument
  } | { ok: false; reason: 'cancelled' | 'failed'; message?: string }> => {
    // 1. Call generateFromPrompt (routed through ai-proxy per P1)
    // 2. On success: persist via IDesignStorage.saveDesign
    // 3. Write brand.brandKitDesigns[cardType] with the provided origin,
    //    userEdited: false
    // 4. Return { ok: true, designId, doc } | { ok: false, reason }
  }, []);
}
```

**Both consumers use the same hook with different `origin`:**
- Sub-project B's Choice modal → `origin: 'ai-individual'`
- Future Sub-project E's Auto-fill → `origin: 'ai-bulk'` (one call per
  empty card; batch is N parallel hook invocations with concurrency cap).

No new generation logic added — just a thin binding + origin-tagging
wrapper.

## Telemetry events

This spec ships the following telemetry events. Event names are snake_case
and event versions are tracked as a `v` property (start at `1`). All
events include `brandId` + `userId` + `sessionId` + `ts` by default
(provided by the telemetry transport — out of this spec's scope to define
the transport).

### Mandatory events

| Event | Fires when | Properties (in addition to defaults) |
|-------|------------|--------------------------------------|
| `brand_kit_export_started` | User clicks Export Brand Kit (idle → generating) | `cardBindingsCount: number`, `mvpCardsBoundCount: number`, `polishCardsBoundCount: number` |
| `brand_kit_exported` | PDF + ZIP successfully uploaded + row inserted | `exportId: uuid`, `pdfBytes: number`, `zipBytes: number`, `durationMs: number`, `cardBindingsCount: number`, `mvpCardsBoundCount: number` |
| `brand_kit_export_failed` | PDF gen, ZIP gen, or upload fails | `stage: 'pdf' \| 'zip' \| 'upload' \| 'db_insert'`, `errorCode: string`, `errorMessage: string`, `durationMs: number` |
| `card_bound` | A binding is created or updated | `cardType: CardType`, `origin: BindOrigin`, `isInitialBind: boolean`, `version: number` |
| `card_customized` | Customize overlay saves overrides | `cardType: CardType`, `fieldsChanged: string[]` |
| `ai_generated_for_card` | `useGenerateForCard` returns success | `cardType: CardType`, `origin: 'ai-individual' \| 'ai-bulk'`, `promptVariant: 'default' \| 'custom'`, `tokensUsed?: number`, `durationMs: number` |
| `ai_generation_failed` | `useGenerateForCard` returns failure | `cardType: CardType`, `origin: 'ai-individual' \| 'ai-bulk'`, `reason: 'cancelled' \| 'failed' \| 'timeout'`, `errorCode?: string` |
| `card_template_applied` | Sub-project C: "Use as my X" applies a template | `cardType: CardType`, `templateId: string`, `templateCategory: string` |
| `brand_kit_export_downloaded` | User downloads PDF or ZIP from ready-state | `exportId: uuid`, `kind: 'pdf' \| 'zip'` |

### Why telemetry is mandatory in this spec

The Brand Kit is the product's central deliverable promise. Without
telemetry on bind rates, AI success rates, and export rates, we cannot
answer the post-ship questions that matter:

- What fraction of brands actually reach export?
- Where does the funnel break (which cards never get bound)?
- Is AI generation reliable enough for E (Auto-fill) to be safe?
- Which MVP cards see the most Customize vs Editor vs Template usage?

Each event is small and stable; plan must wire them with care but the
events themselves are non-negotiable.

## Error + offline states

### Sub-project D — Export failure handling

**PDF generation failure (in Worker).** Worker posts `{ kind: 'error',
stage: 'pdf', code }` back to main thread. Main thread:
- Aborts the export transaction. NO row written to `brand_kit_exports`.
- Discards any partial PDF blob.
- Returns Export button to **Idle** state.
- Shows error toast: "PDF generation failed — please try again. If this
  keeps happening, contact support." with a Retry action.
- Fires `brand_kit_export_failed` with `stage: 'pdf'`.

**ZIP partial failure (in Worker).** A ZIP entry fetch can fail (e.g., a
logo SVG URL no longer resolves, a font file is missing). Policy:
**abort-and-toast** — do NOT deliver a partial ZIP. Premium feel demands
that the user receives either a complete deliverable or none. Worker
posts `{ kind: 'error', stage: 'zip', code, missingAssets: string[] }`.
Main thread:
- Aborts the transaction. No row written.
- Shows error modal (not toast — needs more space): "Some brand assets
  couldn't be included in your export" with a list of missing items and
  links to fix them in Brand Kit. Retry button.
- Fires `brand_kit_export_failed` with `stage: 'zip'` and the
  `missingAssets` list.

**Storage upload failure.** Retry once silently (network blip). If
second attempt fails:
- Aborts the transaction. No row written.
- Toast: "Couldn't upload your Brand Kit — check your connection and try
  again."
- Fires `brand_kit_export_failed` with `stage: 'upload'`.

**DB insert failure (last step).** PDF and ZIP are already in Storage at
this point. Retry once. If still fails:
- Leaves uploaded files in Storage (will be garbage-collected by a
  future job — out of scope here).
- Shows error toast with a Retry action that re-inserts the row using
  the already-uploaded URLs (skip re-generation).
- Fires `brand_kit_export_failed` with `stage: 'db_insert'`.

### Offline state

The Export button respects `navigator.onLine`:
- **Offline at click time:** button is disabled. Tooltip overrides the
  brand-completeness tooltip: `"You need an internet connection to
  export."`
- **Goes offline mid-export:** Worker continues (offline-safe for PDF +
  ZIP generation — both purely client-side). When generation completes
  and the main thread tries to upload, fetch fails → handled as Storage
  upload failure (see above). Toast tells the user to come back when
  online and retry.
- **Comes back online:** no automatic retry. User must click Export
  again. Past partial generations are discarded.

A small `useOnlineStatus()` hook (new or existing — plan to check)
provides reactive state for the Export button.

### Sub-project B — AI Choice modal failure handling

See "Generate with AI — loading + cancel states in the Choice modal"
in Sub-project B above. Failure does not corrupt `brandKitDesigns`;
binding is only written after success.

### Other failure modes

| Mode | Handling |
|------|----------|
| `BrandKitCardEditor.onSave` fails (A) | Keep overlay open, toast error, do not clear edits. User can retry. |
| Open in Editor binding write fails (B) | Editor still opens; show banner "Couldn't link this design to Brand Kit. Save again to retry binding." |
| Templates "Use as my X" fails (C) | Stay on Templates page, toast error. No partial bind. |
| Migration 009 not applied yet | Brand Kit page falls back to read-only (no binding writes attempted); shows a banner "Brand Kit is in maintenance — your work is safe." |

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

## Resolution log — original open questions

All 6 original TODOs are resolved. Cross-reference table for plan
continuity:

| TODO | Type | Resolution | Where in spec |
|------|------|------------|---------------|
| #1 — Export trigger location | UX | Top of sections list, as `actions` slot of shared `PageHeader`. 3-state button (Idle / Generating / Ready-to-download). Brand-completeness gate (name + logo + primary color). No duplicate entry points. | Sub-project D § D4 |
| #2 — Sub-typed categories | Technical | `subType` metadata field on templates + filter; no category splitting. | Card scope § "Resolution of catalog gaps" |
| #3 — Missing categories | Technical | Add 4 new categories (`cat-envelopes`, `cat-social-profiles`, `cat-social-covers`, `cat-social-stories`) to Phase 4.1 seed in C's scope. | Card scope § "Resolution of catalog gaps" |
| #4 — Web mockup component | Technical | `BrandMockupRenderer` deferred to future spec. Website + Landing Page render "Coming soon" placeholders in this spec's D1. | Sub-project D § "TODO #4 resolution" |
| #5 — Email signature format | Technical | Table-based HTML inline-styled `.htm` via `emailSignatureHtml(brand, opts)`. 5-client compatibility matrix in acceptance criteria. | Sub-project D § "TODO #5 resolution" |
| #6 — Export concurrency | Technical | Client-side via Web Worker (`exportWorker.ts`). Edge Function swap remains a future seam if perf demands it. | Sub-project D § "TODO #6 resolution" |

## Open questions for the plan author

These are NOT design gaps — they're concrete implementation decisions
the plan writer must resolve during `superpowers:writing-plans`:

- [ ] **`generateFromPrompt` current routing.** Plan must verify
      whether the current implementation already calls the `ai-proxy`
      Edge Function or still uses the inline `VITE_ANTHROPIC_API_KEY`.
      Resolution determines whether Sub-project B's AI branch is
      unblocked or blocks on Issue #2 (AI proxy migration).
- [ ] **Telemetry transport.** Spec defines event names + properties
      but not the transport (PostHog / Supabase Analytics / custom
      table). Plan picks the transport based on what's already wired in
      the codebase; if nothing is wired, defer the transport
      implementation to a separate spec and have the events `console.info`
      as a placeholder (still satisfies the schema contract).
- [ ] **Re-export shim audit for D5.** Plan must `grep` for every
      external importer of `src/features/brand-kit-alt/brandGuidePdf.ts`
      and `bulkExport.ts` (anything outside `brand-kit-alt/`) and decide
      per file whether to leave a re-export shim. Per user constraint,
      shims are optional but useful when importer count >0.
- [ ] **Templates "subType" backfill.** When Sub-project C lands the
      `subType` filter, existing seeded templates in the `presentation`
      and `brand-guideline-slide` categories need `subType` values
      added. Plan must enumerate the existing templates and assign each
      a subType. Templates without an assignable subType remain
      unfiltered (visible in all subType queries within their category).
- [ ] **`useOnlineStatus` existence.** Spec assumes a small reactive
      online-status hook exists or will be added. Plan must verify
      `navigator.onLine` reactive support — add the hook if absent
      (5-line implementation; not a spec concern).
- [ ] **Brand completeness for non-MVP exports.** This spec mandates
      name + logo + primary color as the export gate. If product later
      wants stricter gating (e.g., typography also required), the
      `isBrandReadyForExport()` helper is the single place to update.
      Plan should note this seam.
