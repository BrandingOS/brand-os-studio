# BrandOS Editor — Product Vision

> **Source:** Captured from Hamza's directive on April 27, 2026, after Phase 3 Step 1 of the Brand Engine. This document is the strategic frame for everything that ships from Phase 3 onward. It overrides any earlier scope assumptions in the master prompt (`brandos-editor-prompt.md`) where the two conflict.

---

## 1. The Core Insight

BrandOS is not "a Canva clone with a brand engine bolted on."

BrandOS is **one unified editor** where:
1. **Every content type opens in the same editor** at the same URL pattern
2. **AI is a first-class creator and editor**, not a feature button
3. **The brand is the gravity** that pulls every design, AI generation, and template into a coherent identity

The category we're competing in is not "graphic design tools." It's **"AI-native brand systems."** Canva, Figma, and Adobe Express are the past. Lovart, Recraft, and emerging AI design agents are the present. BrandOS competes by being **the only one of these grounded in a real brand operating system, not just a brand kit color picker.**

---

## 2. The Unified Editor Pattern (URL + Architecture)

### URL pattern (canonical)

```
/b/:brandSlug/design/:designSlug
```

> Both `/b/:brandSlug/design/:designSlug` (canonical) and
> `/dashboard/brand/:brandSlug/design/:designSlug` (alias, kept for
> backward compatibility with internal code that pre-dates the short
> form) resolve to the same editor view. Production marketing,
> sharing, and shortlinks always use the short form.

**Every** piece of content the user can edit opens here:

| Content type | How it gets here |
|---|---|
| New blank design | "+ New design" → choose content type → editor opens with seeded canvas |
| Social post | Same as above with `contentType: 'social-post'` |
| Presentation | Same with `contentType: 'presentation'` (multi-page) |
| Business card | Same with `contentType: 'business-card'` |
| Brand guideline page | Open from `/brand/:slug/guidelines` → routes to `/design/:guidelineSlug` |
| Brand asset (Print/Social/Screen/Utility) | Open from `/brand/:slug/assets/:assetSlug` → routes to `/design/:assetSlug` |
| Template | Open from Templates browser → forks into a new design at `/design/:newSlug` |
| AI-generated design | "Generate with AI" → AI creates document → opens at `/design/:newSlug` |
| Logo Maker output | Saved into a brand → opens as a brand asset at `/design/:slug` |

**One editor component. One URL pattern. Different `ContentTypeConfig` driving panels and dimensions.**

This is exactly what Canva does (`canva.com/design/:slug`), and exactly what BrandOS must do.

### Why this matters strategically

A user opening a presentation should not feel they've left BrandOS for a different app. Their brand is loaded, their assets are one click away, the AI assistant is the same one they used 5 minutes ago for a social post. **The cognitive continuity IS the product.** Multiple editors break that continuity and signal "Frankenstein product."

---

## 3. Editor Layout — The Five Surfaces

The editor has five surfaces. All five surfaces are present for every content type; what *appears* in each is config-driven.

```
┌─────────────────────────────────────────────────────────────┐
│  TOP CHROME                                                 │
│  [← Back] [Brand picker] [Doc title] [Save indicator]       │
│  [AI prompt bar — always visible] [Share] [Export]          │
├──────┬──────────────────────────────────────────┬───────────┤
│      │                                          │           │
│ LEFT │                                          │  RIGHT    │
│ TOOL │              CANVAS                      │  PANEL    │
│ BAR  │                                          │ (context- │
│      │         (Fabric.js stage)                │ sensitive)│
│      │                                          │           │
├──────┴──────────────────────────────────────────┴───────────┤
│  BOTTOM (Page Navigator — only if multi-page contentType)   │
│  [Page 1] [Page 2] [+ Add]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Top chrome (always)

- **Brand picker** — switch brand instantly; design re-resolves through the new brand
- **AI prompt bar** — natural language input always visible; not behind a button
- **Save indicator** — auto-save state machine ("Saving…" → "Saved")
- **Export** — opens dropdown of all formats supported by the active `ContentTypeConfig`
- **Share** — copy link, invite collaborators, public showcase

### Left toolbar (always)

- Select / Move
- Text
- Shape (rectangle, ellipse, line)
- Image (upload, URL, asset library, AI generate)
- Logo (drops in the brand's primary logo with `auto` background detection)
- SVG (asset library, AI generate icon)
- Templates browser (opens drawer)
- **AI tools button** (opens drawer with: regenerate, restyle, translate, resize-with-AI, etc.)

### Right panel — context-sensitive Properties (the Canva pattern)

This is the surface that changes most. **What's shown depends on what's selected.**

| Selection | Panel shows |
|---|---|
| Nothing | Document settings: dimensions, background, applied brand, content type |
| One TextLayer | Font, Size, Weight, Color (with brand SlotRef chips), align, line height, letter spacing, content. "More" accordion for advanced. |
| One ShapeLayer | Fill, stroke, stroke width, corner radius, opacity. |
| One ImageLayer | Source (upload/URL/asset/AI), fit (cover/contain/fill), filters (later phase). |
| One LogoLayer | Variant selector (primary/secondary/wordmark/iconmark/mono — auto). |
| One SvgLayer | Source, fill overrides for individual paths (where SVG has named paths). |
| Multiple layers | Common properties only (alignment, distribution, group/ungroup, opacity, lock). |
| A page (in PageNavigator) | Page name, dimensions, master page, duplicate variants, delete. |

**Critical UX rule:** the right panel only ever shows **the 4–5 most-used controls** for the selection by default. Everything else lives behind a "More properties" accordion. Density is the enemy.

### Bottom — Page Navigator (only if multi-page)

For `pageModel: 'multi'` content types (presentation, brand-guideline-slide). For single-page (social-post, business-card, banner), this surface is hidden entirely — preserves canvas real estate.

---

## 4. AI Integration — Four Modes (this is the differentiator)

This is the heart of "BrandOS competes with Lovart, not just Canva." AI is **not** a button. AI is **a modality** that runs in four distinct modes.

### Mode 1 — Generate from prompt (zero-state, document-creating)

**Trigger:** User types in the top AI prompt bar from a blank state, or clicks "Generate with AI" from the brand dashboard.

**Example prompts:**
- "Create an Instagram post announcing our new product launch."
- "Generate a 5-slide pitch deck for investors."
- "Make a business card for our CEO."

**What happens:**
1. The prompt is parsed into a structured `DesignIntent` (content type, copy, mood, hierarchy, layout direction).
2. The system selects a `Template` family compatible with the intent + content type.
3. The brand engine (`applyBrandToDocument`) fills in the brand kit slots.
4. AI-generated copy is injected into named text slots.
5. AI-generated images (or stock images) are added where appropriate.
6. The final `BrandOSDocument` is saved and the user is redirected to `/design/:newSlug`.

**Critical rule:** the AI never returns coordinates. It returns **intent** + **copy**. Templates are the AI's vocabulary. The richer the template library, the better generation gets.

### Mode 2 — Generate inline (additive, in-document)

**Trigger:** User is in the editor with an open document. Types in the AI prompt bar in the top chrome.

**Example prompts:**
- "Add a hero image of a coffee cup on slide 3."
- "Add a CTA button below the headline."
- "Generate three variant headlines I can pick from."

**What happens:**
1. The AI receives: the prompt + the current document + the active page id + the active selection (if any).
2. The AI returns a *delta* — new layers to add, layers to modify, layers to remove.
3. The delta is applied as a single batch (one undo entry).
4. The user can accept, reject, or refine.

### Mode 3 — Edit by command (mutate the existing document)

**Trigger:** User types a command-style prompt that modifies the existing document.

**Example prompts:**
- "Change the headline color to the brand accent."
- "Make this design 1.5x bigger."
- "Convert this presentation into 5 social posts." (cross-content-type transformation)
- "Translate all text to Arabic."
- "Make it more minimalist."

**What happens:**
- The AI receives the current document + the command.
- It returns either a *delta* (small changes) or a *full document replacement* (large transformations like content-type conversion).
- All changes land as one batch with a labeled undo entry ("AI: convert to social posts").

### Mode 4 — Refine selection (scoped AI editing)

**Trigger:** User selects one or more layers, then opens the AI tools drawer or right-clicks → "AI refine."

**Example prompts:**
- "Make this text more punchy." (with a TextLayer selected)
- "Generate a logo variant in this style." (with a LogoLayer selected)
- "Replace this image with a darker mood." (with an ImageLayer selected)

**What happens:**
- The AI receives the document + the selected layer ids + the command.
- The AI's mutation scope is clamped to those layers only.
- The user accepts or rejects each suggested change individually.

---

## 5. Resize / Responsive Variants (the marketing-team killer feature)

There are **three distinct resize concepts**. The editor must handle all three; users will conflate them.

### Type A — Element resize (within canvas)

User drags a layer's handles. Trivial. Already works (Phase 1).

### Type B — Container resize (change canvas dimensions, same content)

User changes the canvas from 1080×1080 to 1920×1080. The content needs to **reflow intelligently**, not just stretch. This is hard.

**Approach:**
1. **Manual reflow** — handles snap to new edges, anchor points (top-left, center, bottom-right) determine how layers translate.
2. **AI-assisted reflow** ("Resize with AI") — the AI takes the document + new dimensions, returns a re-laid-out version that preserves visual hierarchy. This is the magic moment.

### Type C — Multi-format export (one design, N output sizes)

User clicks "Generate variants" → picks 5 sizes (Instagram square, story, reel cover, Facebook cover, LinkedIn). System generates 5 documents at 5 dimensions, each with AI-reflowed layouts. Each variant becomes its own design at `/design/:variantSlug` but they're linked by a "design family" id.

**Why it matters:** this is the single biggest workflow win for marketing teams. Canva does this manually one-by-one. BrandOS does it in one click.

---

## 6. Templates — Not Just Starting Points

Templates in BrandOS are richer than Canva's static templates because of the brand engine.

A template stores:
- A `BrandOSDocument` skeleton
- All values are SlotRefs where possible (`brand.color.primary`, `brand.font.heading`, etc.)
- "Slot anchors" for AI copy injection (`{slot: 'headline'}`, `{slot: 'cta'}`)
- Metadata: tags, content type, mood, hierarchy, recommended use cases

When a user opens a template:
1. The current brand is applied (`applyBrandToDocument`).
2. AI copy slots are filled (either with placeholder text, or with AI-generated copy if the user provided context).
3. The user lands in the editor on a fully-branded, copy-filled design they can edit.

**This makes BrandOS templates ≠ Canva templates.** Canva templates have hard-coded brands (Coca-Cola red, etc.) the user has to manually replace. BrandOS templates are brand-agnostic and resolve at open time.

---

## 7. Information Architecture — How It Connects

The 5-section brand IA from CLAUDE.md continues to govern. Here's how the unified editor plugs in:

| Brand section | What lives here | How editor is invoked |
|---|---|---|
| **Overview** | Dashboard for the brand | "+ New design" buttons jump to editor |
| **Identity** | Logo / Colors / Typography / Voice / Strategy editing | Each tab is its own UI, NOT the editor (these edit brand kit data, not designs) |
| **Assets** | Print / Social / Screen / Utility | Each asset is a `Design`. Click → editor opens. |
| **Guidelines** | Multi-page guideline document | The guideline IS a `Design` with `contentType: 'brand-guideline-slide'`. Click → editor opens. |
| **Share** | Public showcase + exports | Read-only views of designs. "Edit" jumps to editor. |

**Key principle:** the **Identity** section is the *only* place where brand-kit data is edited. Everywhere else (assets, guidelines, designs, AI generations) consumes the brand kit but doesn't edit it. This separation is non-negotiable — it's what gives the brand engine its power.

---

## 8. What This Vision Means for the Existing Phase Plan

The original `brandos-editor-prompt.md` had Phases 0–6+. The vision above doesn't invalidate those, but it reorders priorities and adds two phases.

### Existing phases — status under new vision

| Phase | Original scope | Status under vision |
|---|---|---|
| Phase 0 | Schema + EditorAdapter | ✅ Done. Schema supports the vision. |
| Phase 1 | Fabric adapter + single page | ✅ Done. |
| Phase 2 | Multi-page + master pages + content-type configs | ✅ Done. Foundation for unified editor. |
| **Phase 3** | **Brand Engine + slot resolution** | **In progress (Step 1 done). Critical for vision — Brand Engine IS the gravity.** |
| Phase 4 | Templates | Re-scoped: must support brand-agnostic templates with AI copy slots (per §6 above) |
| Phase 5 | AI Design Generation | **Re-scoped to four modes** (per §4 above), not just Mode 1 |
| Phase 6+ | Polish, performance, collaboration | Unchanged, but add: Resize variants (per §5 Type C) |

### New phases to insert

**Phase 3.5 — AI Editing Layer (after Phase 3, before Phase 4)**

After Brand Engine works, but before Templates ship, build the AI command infrastructure:
- `aiAgent.applyCommand(doc, command, context)` — the function the four AI modes call
- Command parser (natural language → structured `DesignIntent` or `DesignCommand`)
- Delta builder (turns AI output into adapter mutations)
- Batch undo grouping for AI operations
- The top chrome AI prompt bar UI

This phase is foundational for Modes 2, 3, 4. Mode 1 (zero-state generation) needs Phase 4 (templates) to work well, so it ships in Phase 5.

> **Absorption note (added 2026-04-30 after Step 9 carve-out review).**
> Phase 3.5 absorbs `runAgent` and `brandCard` from
> `src/features/ai-design/lib/` as the AI backend seeds. The
> `TldrawCanvas` and `InfiniteCanvas` implementations are NOT reused —
> they're retired in favor of the unified editor's FabricAdapter
> canvas. Both `/b/:slug/ai-design` and `/b/:slug/design-ai` routes
> are deleted in Phase 3.5; their entry points consolidate into the
> unified editor's top-chrome AI prompt bar (Mode 1: zero-state
> generate). Live testing in Step 9 confirmed `/ai-design` has
> critical gaps (mock-only AI, broken non-text/geo node rendering,
> no export, no persistence, tldraw license watermark) that argue
> against expanding adoption before absorption.

**Phase 4.5 — Editor URL Routing & Asset Bridging**

> **Forward-pull note (2026-05-01).** A minimum-viable
> `/b/:slug/design/:designSlug` route already exists at
> `src/pages/dashboard/brand/[slug]/design/[designSlug].tsx`,
> scoped forward from this phase to unblock the Step 9 brandkit
> migration. Phase 4.5 owns the remaining concerns: per-brand auth/
> permission gates, polished 404/403 states, deep linking
> refinement, share URL parameters, brand-picker → URL navigation
> wiring, loading skeletons / Suspense beyond the basic spinner.
> See the route file's header comment for the full deferred list.

After templates ship, wire the unified URL pattern:
- Route `/b/:brandSlug/design/:designSlug` (canonical) to the editor; keep `/dashboard/brand/:brandSlug/design/:designSlug` as an alias that resolves to the same view
- "Open in editor" links from Assets, Guidelines, Templates pages all route here
- The editor reads the design from the database, applies the brand, mounts the right `ContentTypeConfig`
- Deep linking works: copy a URL, send to a teammate, they land on the same view (subject to permissions)

**Phase 6 — Resize Variants** (was originally Phase 6+ polish; promoting to its own phase)

Multi-format export per §5 Type C above. Marketing-team killer feature.

### Updated phase order

```
Phase 0 ✅ Schema + EditorAdapter
Phase 1 ✅ Fabric adapter + single page
Phase 2 ✅ Multi-page + master pages + content-type configs
Phase 3 ⏳ Brand Engine + slot resolution + cross-page lock + smart duplicate
Phase 3.5 — AI Editing Layer (4 modes infrastructure)
Phase 4   — Templates (brand-agnostic + AI copy slots)
Phase 4.5 — Editor URL Routing & Asset Bridging
Phase 5   — AI Design Generation (Mode 1 zero-state)
Phase 6   — Resize Variants
Phase 7+  — Real-time collaboration, performance, plugin system
```

---

## 9. The Anti-Goals (what we're NOT building)

To stay focused, these are explicit non-goals for v1:

- **Not a video editor.** mp4-muxer + ffmpeg are in package.json for asset export, not for timeline editing.
- **Not a 3D tool.** Three.js is not in deps and won't be added.
- **Not a freeform whiteboard.** tldraw is in deps but its role is undefined; it does NOT become a competitor to Miro/FigJam.
- **Not a print prepress tool.** No CMYK proofing, no bleed marks, no PDF/X export. (Add later if customers demand.)
- **Not a database UI.** The brand's underlying data lives in PostgreSQL; the editor doesn't expose tables to users.
- **Not a code editor.** No syntax highlighting, no IDE features. (HTML/CSS export of designs is a maybe-later.)

---

## 10. Success Criteria — How We Know We Won

The vision is realized when:

1. **A user can open BrandOS, type "Create a 5-slide investor deck for our brand," and 30 seconds later be editing a fully-branded, well-designed deck.** (Mode 1 works end-to-end)
2. **The same user can then say "Make slide 3's headline bigger and change its color to the accent color" by typing it into the AI bar.** (Mode 3 works on the editor's existing document)
3. **The user can then click "Generate variants" and get the same deck reformatted as 5 social posts in 5 different sizes, each on-brand.** (Resize Type C works)
4. **The user can switch from this deck to editing a business card for the same brand without ever leaving the URL pattern `/design/:slug`** — they just open another design. (Unified editor works)
5. **A second user, looking at the brand-kit colors page (Identity section), changes the primary color. They open the deck from above. The headline color updates automatically.** (Brand engine resolves at open time)

If all five of these are real, BrandOS is ready for paid users.
