# Templates — design notes (Phase 4 pre-work)

> **Status.** Captured during Phase 3 step 2 while designing
> `applyBrandToDocument` and `convertToTemplate`. Phase 4 will
> implement; this document captures the format decisions that emerged
> while the design space is fresh.

## 1. What is a template?

A template is a `BrandOSDocument` with three properties:

1. Brand-bound values are stored as **`SlotRef`s** wherever possible.
2. AI copy slots (text intended for AI generation) are stored as
   **`CopySlotRef`s** — a separate concept from brand SlotRefs.
3. Metadata: `templateName`, `tags`, `mood`, `hierarchy`, `scope`
   (`'global' | 'brand' | 'workspace'`), `thumbnailUrl`,
   `recommendedUse`.

Templates are stored in Supabase as `BrandOSDocument` JSON in a `jsonb`
column on a `templates` table; the schema enforces validity at write
time via `BrandOSDocumentSchema.parse` plus the metadata extension.

## 2. Storage format — SlotRefs only, or mixed?

**Mixed.** Templates store SlotRefs for brand-bound values AND
literals for one-off design choices.

The `convertToTemplate(doc, brandKit)` function only swaps a literal
for a SlotRef when the literal MATCHES a brand value. A non-brand
color (`#abcdef` when no brand color is `#abcdef`) stays a literal —
those are intentional one-off design choices the designer made, and
forcing them into the brand kit on save would distort the template.

This is also how Canva templates are *not* structured. Canva templates
have hard-coded brand values; opening one and applying your brand
requires manual replacement of every color/font. BrandOS templates
resolve at open time via `applyBrandToDocument`, and round-trip
losslessly for properly-templated docs.

**Caveat — slot-identity ambiguity:** when two SlotRefs resolve to the
same literal (e.g. one-font brand where `heading.family ===
body.family`), the round-trip is lossy in one direction. The
`convertToTemplate` function picks the first matching slot in source
order (heading wins for fonts; primary wins for colors). Documented in
`convertToTemplate.ts` and tested in `convertToTemplate.test.ts`.

## 3. AI copy slots — same SlotRef enum, or separate?

**Separate.** Define a `CopySlotRef` type, distinct from the brand
`SlotRef`. Mixing them in one enum couples the brand engine to the
AI layer and makes the resolver (which is pure) depend on AI prompts.

Proposed shape (Phase 4 implements):

```ts
export const CopySlotRefSchema = z.object({
  copySlot: z.enum([
    'headline',
    'subheadline',
    'body',
    'cta',
    'caption',
    'footnote',
    'list-item',
  ]),
  /** Optional placeholder text shown when no AI copy has been
   *  injected yet. The user can also type over this directly. */
  defaultText: z.string().optional(),
});
export type CopySlotRef = z.infer<typeof CopySlotRefSchema>;
```

The text layer's `text` field becomes:

```ts
text: z.union([z.string(), CopySlotRefSchema]);
```

When the AI design pipeline (Phase 5) opens a template, it walks every
text layer with a `CopySlotRef` and either:

1. Fills with AI-generated copy (if a prompt was provided to the
   "Generate from prompt" mode), or
2. Falls back to `defaultText`, or
3. Leaves the layer empty for the user to type into.

The brand engine (Phase 3) does NOT touch `CopySlotRef`s. Resolution
of copy slots is an AI-layer concern and lives in
`packages/ai-design/` (per the master prompt) or
`src/features/ai-design/` (per the Vite layout).

## 4. Dimensions — canonical only on templates; strategy on ContentTypeConfig

**Templates store canonical dimensions only**; the resize strategy
(how a document reflows when its canvas changes) lives on
`ContentTypeConfig` because it's stable across all templates of a
given type. A business card is fixed regardless of who designed it; a
presentation needs AI reflow regardless of which template you started
from. Putting strategy on the template would force template authors
to make a technical decision they aren't qualified to make.

### Template metadata — canonical dimensions only

```ts
metadata: {
  // ... template-specific metadata (name, tags, mood, etc.) ...
  _dimensions: {
    /** What the template was designed at. */
    canonicalWidth: number;
    canonicalHeight: number;
  };
  // ... other fields ...
}
```

That's all templates need to declare about size. No `intent` field.
Phase 6's reflow pipeline picks the strategy from elsewhere.

### Strategy lives on ContentTypeConfig

`src/features/editor/content-types/types.ts` adds:

```ts
export const ResizeStrategySchema = z.enum(['fixed', 'reflowable', 'ai-reflowable']);

ContentTypeConfig {
  // ... existing fields ...
  resizeStrategy: 'fixed' | 'reflowable' | 'ai-reflowable';
}
```

Mapping for the five seed configs (Phase 3 step 3):

| Content type | Strategy | Reasoning |
|---|---|---|
| `business-card` | `fixed` | Print stationery — physical spec breaks if resized |
| `banner` | `reflowable` | Linear stretch with anchor points works fine |
| `social-post` | `ai-reflowable` | Square → portrait → story is non-linear |
| `presentation` | `ai-reflowable` | Slides redistribute, not stretch |
| `brand-guideline-slide` | `ai-reflowable` | Multi-content compositions, same family |

### Per-template override (the rare case)

A template author might genuinely need a different strategy for one
specific template (e.g. a "fixed printable handout" version of what
is normally a presentation). Templates can opt into an override via
metadata:

```ts
metadata: {
  _dimensions: {
    canonicalWidth: number;
    canonicalHeight: number;
    /**
     * Optional override. When present, takes precedence over
     * `getContentTypeConfig(doc.contentType).resizeStrategy` for
     * Phase 6's reflow pipeline. Should appear in <1% of templates;
     * if it shows up often, register a new content type instead.
     */
    strategyOverride?: 'fixed' | 'reflowable' | 'ai-reflowable';
  };
}
```

Why the per-template override and not a new content type? Because new
content types proliferate the IA. A "presentation handout" template
appearing once doesn't justify a `presentation-handout` content type
with its own panel config, default dimensions, and entry point.
The override is opt-in, lives in template metadata where authors
already operate, and stays uncommon by construction.

### Phase 6 resolution order

When `generateResizeVariants(doc, targetSizes)` runs:

```ts
const override = doc.metadata?._dimensions?.strategyOverride;
const strategy = override ?? getContentTypeConfig(doc.contentType).resizeStrategy;
```

Single source of truth at the content-type level; per-template escape
hatch when reality demands it.

## 5. Open questions for Phase 4 to settle

These didn't come up in Phase 3 step 2 but will land at Phase 4:

- **Brand-id metadata on templates.** `BrandOSDocument.brandId` is
  nullable (the standalone-editor flow uses null). Templates created
  in a brand context likely keep the `brandId` for "this template was
  authored against brand X" provenance, but the brand is not committed
  — the template's SlotRefs resolve through whichever brand opens it.
- **Versioning.** When a template is updated, do existing designs
  forked from it adopt the changes? Initial answer: no, forks are
  independent. Add `templateOriginId` to the document for provenance
  but no auto-update.
- **Permissioning.** Three scopes (`global`, `brand`, `workspace`)
  surface in the Templates page. RLS on the Supabase `templates` table
  enforces visibility per scope.

Not Phase 3's job to answer; just flagged here so Phase 4 picks them
up cleanly.

## 6. Phase 3.5 prerequisites — must be fixed before AI Mode 3 ships

Phase 3.5 (AI Editing Layer per `docs/brandos-editor-vision.md` §4)
will emit deltas referencing arbitrary layer ids. The current
adapter has one known bug that becomes a user-trust issue once an AI
agent is in the loop:

- **[#3 — `updateLayer` silently no-ops on layers nested in groups](https://github.com/hamzaxezzat/brand-os-studio/issues/3)**.
  Surfaced during Phase 3 step 4b. Workaround in
  `applyLayerPatchAcrossPages` (deep walk + in-place mutation
  inside `batch()`) covers the cross-page-bulk path. Direct
  `updateLayer(...)` calls — including the future AI-emitted
  deltas — still silently drop nested-layer patches with no error.
  Must be fixed before AI Mode 3 ships, otherwise the AI will
  confirm "Done" while the canvas shows no change.

This list grows as future phases discover prerequisites. The rule:
anything that becomes a worse-than-error failure mode under AI
control gets logged here (and an issue) BEFORE the AI starts
calling it.
