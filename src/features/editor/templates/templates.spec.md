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

## 4. Dimensions — fixed, agnostic, or contextual?

**Contextual** — templates ship with default dimensions matching the
content type, but the layout MUST be reflowable for the Resize
Variants feature (Phase 6).

A template's `BrandOSDocument.pages[i]` has `width`/`height` like any
document. When a user picks a template:

1. The default dimensions are honored.
2. Phase 6 introduces `generateResizeVariants(doc, targetSizes)` which
   returns N new documents at N dimensions, each with AI-reflowed
   layouts (per `brandos-editor-vision.md` §5 Type C).

Template metadata captures dimension intent:

```ts
metadata: {
  // ... template-specific metadata ...
  _dimensions: {
    /** What the template was designed at. */
    canonicalWidth: number;
    canonicalHeight: number;
    /**
     * 'fixed'         — layout assumes these exact dimensions
     *                   (business cards, badges, etc.).
     * 'reflowable'    — layout can stretch within reason
     *                   (banners, social variants).
     * 'ai-reflowable' — layout requires AI reflow when dimensions
     *                   change (presentations, multi-content
     *                   compositions).
     */
    intent: 'fixed' | 'reflowable' | 'ai-reflowable';
  };
}
```

Phase 6 reads `_dimensions.intent` to decide between manual reflow
(anchor-point translation) and AI reflow.

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
