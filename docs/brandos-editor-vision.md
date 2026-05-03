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
| **Phase 3** | **Brand Engine + slot resolution** | ✅ **Shipped May 1, 2026.** See "Phase 3 — Shipped" section below. |
| **Phase 3.5** | **AI Editing Layer (4 modes infrastructure)** | ✅ **Shipped May 1, 2026.** See "Phase 3.5 — Shipped" section below. |
| **Phase 4** | **Content Universe (Templates + AI generation + Community)** | ✅ **Shipped May 4, 2026.** Templates panel with 119 brand-bound seeds across 11 categories, save-as-template, My Designs, Mode 1 wiring, AI image (mock), 25 prompt presets, admin approval queue. |
| Phase 4 | Templates | Re-scoped: must support brand-agnostic templates with AI copy slots (per §6 above) |
| Phase 5 | AI Design Generation | **Re-scoped to four modes** (per §4 above), not just Mode 1 |
| Phase 6+ | Polish, performance, collaboration | Unchanged, but add: Resize variants (per §5 Type C) |

### New phases to insert

**Phase 3.5 — AI Editing Layer (next, after Phase 3 shipped 2026-05-01)**

After Brand Engine works, but before Templates ship, build the AI command infrastructure:
- `aiAgent.applyCommand(doc, command, context)` — the function the four AI modes call
- Command parser (natural language → structured `DesignIntent` or `DesignCommand`)
- Delta builder (turns AI output into adapter mutations, leveraging Phase 3's `EditorAdapter.batch()` for one-undo-entry semantics)
- The top chrome AI prompt bar UI (sibling of the Brand picker; always visible per §3)
- Mode-2/3/4 wiring (Mode 1 ships in Phase 5 once templates exist)
- Absorbs `runAgent` + `brandCard` from `src/features/ai-design/lib/` (the agent backend seeds — see absorption note below)
- Deletes `/b/:slug/ai-design` and `/b/:slug/design-ai` routes (and their `src/features/ai-design/components/` + `src/features/design-ai/` source folders) once the in-editor prompt bar reaches feature parity

This phase is foundational for Modes 2, 3, 4. Mode 1 (zero-state generation) needs Phase 4 (templates) to work well, so it ships in Phase 5.

**Inputs Phase 3.5 inherits from Phase 3:**
- `EditorAdapter` + `FabricAdapter` (canvas mutation contract)
- `BrandOSDocument` schema (Zod-validated, every AI emit must conform)
- `applyBrandToDocument({ mode: 'apply' | 'preview' })` (resolves SlotRefs against current brand kit)
- `useBrandKit(brand)` (memoized kit derivation)
- `EditorAdapter.batch(label, fn)` (atomic multi-mutation grouping → single undo entry — exactly what AI deltas need)
- `findSimilarLayers` + `applyLayerPatchAcrossPages` (predicate-based propagation — AI can target "all headlines on this brand" without manually walking pages)
- `_lockedBindings` recovery (programmatic / AI overrides on brand-locked layers don't permanently break the binding)
- Production route `/b/:slug/design/:designSlug` (minimum viable; AI-generated docs land here once persisted)
- Three-layer test rule (every Phase 3.5 feature ships with unit + adapter integration + browser E2E)

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
Phase 0   ✅ Schema + EditorAdapter
Phase 1   ✅ Fabric adapter + single page
Phase 2   ✅ Multi-page + master pages + content-type configs
Phase 3   ✅ Brand Engine + slot resolution + cross-page lock + smart duplicate (shipped 2026-05-01)
Phase 3.5 ✅ AI Editing Layer (Modes 2/3/4 + Mode 5 validation gate) (shipped 2026-05-01)
Phase 4   ✅ Content Universe (Templates + AI generation + Community) (shipped 2026-05-04)
Phase 4.5 ⏳ Editor URL Routing & Asset Bridging — next (route stub already exists; this phase finishes auth/share/deep-link polish)
Phase 5   — AI Design Generation polish (vendor for image gen + Mode 1 quality pass + skill chips if data justifies)
Phase 6   — Resize Variants
Phase 7+  — Real-time collaboration, performance, plugin system
```

---

## 8.5. Phase 3 — Shipped (April 27 – May 1, 2026)

Phase 3 delivered the Brand Engine — the gravity layer that pulls every editor mutation, every cross-page propagation, every duplicate, and every (future) AI emit into a coherent brand identity. Documents stop being collections of literal hex / font strings and become brand-aware compositions that re-resolve through `applyBrandToDocument` on every brand switch, Re-apply, and recovery from drift.

### Major capabilities shipped

- **Unified Editor v2 shell** (`src/features/editor/shell/Editor.tsx`) — 4-icon App Rail, header-bar Secondary Panel, full-bleed canvas with smooth multiplicative zoom, floating contextual toolbar with brand-bound color picker, page navigator with smart-duplicate submenu.
- **Brand Engine + slot resolution** — `applyBrandToDocument` (apply/preview modes), `useBrandKit` memoized derivation, SlotRefs for `brand.color.{primary,secondary,accent,neutral}` and `brand.font.{heading,body}`.
- **Cross-page propagation** with two-step undo (page 1 edit + propagate to peers undo independently) and Sonner-based "All N pages / Just this layer" prompt.
- **Smart duplicate** with three modes (as-is, as-variant, empty) and brand-locked layer carry-over (`_lockedBindings` survives the variant).
- **Brand-managed layer toggle** — UI lock + recovery hook records SlotRefs into `_lockedBindings` on programmatic override, restored by Re-apply.
- **Production editor route** at `/b/:slug/design/:designSlug` (minimum viable; full Phase 4.5 polish deferred).
- **Brandkit gallery → unified editor migration** — 8 template families seeded as brand-bound BrandOSDocuments via `templateSeeds.ts`; legacy `brandkit/components/editor/` deleted.
- **Carve-out reduction** — Phase 0's 6-path list reduced to 4. `FabricRenderer.ts` deleted (dead code), `brandkit/components/editor/` migrated.
- **Three-layer test discipline** — 86 test files / 788 tests at end of phase, with browser E2E as the gate that catches data-flow regressions across Brand Engine + cross-page + smart duplicate.

### Architectural decisions Phase 3 locked in

These patterns are inherited by every later phase. Don't reinvent; use these.

1. **`EditorAdapter` pattern.** All canvas/Fabric.js code lives behind the adapter interface. Features call `adapter.updateLayer / addLayer / batch / undo / redo / setSelection`. They never `import { Canvas } from 'fabric'` themselves. `FabricAdapter` is the single implementation; the contract makes Fabric replaceable.
2. **`BrandOSDocument` as canonical schema.** Zod-validated. Persisted via `IDesignStorage`. Loaded into the adapter via `replaceDocument`. Every AI emit, template seed, smart-duplicate output must round-trip through `BrandOSDocumentSchema.parse()`.
3. **`useBrandKit` memoization pattern.** Required at every BrandKit consumer site. Deps: `[brand, brand?.updatedAt]` — both reference identity AND `updatedAt` because in-place mutations are a real failure mode in this codebase.
4. **`applyBrandToDocument({ mode, respectLocks })`.** `mode: 'apply'` writes literals into the document (commits to a brand). `mode: 'preview'` keeps SlotRefs intact and stores resolved values in `brandResolution` annotation (AI-readable, brand-agnostic doc preserved). `respectLocks: true` (default) restores `_lockedBindings` before resolution — drift recovery.
5. **`HistoryRing` with `EditorAdapter.batch(label, fn)`.** Multi-mutation operations land as a single undo entry with a labeled history step ("Re-apply brand kit", "AI: convert to social posts"). Phase 3.5's AI deltas use this pattern verbatim — never emit multiple separate `updateLayer` calls without `batch()` wrapping.
6. **`findSimilarLayers` + `applyLayerPatchAcrossPages`** — predicate-based propagation. The cross-page prompt UI is a thin wrapper; AI can target the same predicate ("all headlines on pages with this master") without manually walking the page tree.
7. **`_lockedBindings` recovery for brand-managed layers.** When a programmatic mutation (legacy code, AI emit, migration import) writes a literal value to a brand-bound property on a `brandLocked: true` layer, the adapter records the original SlotRef in `_lockedBindings`. Next `applyBrandToDocument({ respectLocks: true })` restores it. The brand-managed contract wins over drift.
8. **Smart duplicate semantics.** Text content clears (`text: ''`) but typography preserves (font family, size, weight, color SlotRef). Shapes, logos, SVGs preserve entirely. Images drop (page-specific). Brand-locked layers carry `brandLocked: true` AND `_lockedBindings` to the variant — a future Re-apply on the variant page still recovers the SlotRef.
9. **Production route at minimum-viable scope.** `/b/:slug/design/:designSlug` exists. It resolves brand by slug, loads doc by id from `IDesignStorage`, mounts `<Editor>`. Phase 4.5 owns the polish (auth gates, 404/403 polish, deep linking, share URLs, brand-picker URL nav, suspense). The header comment in `src/pages/dashboard/brand/[slug]/design/[designSlug].tsx` enumerates the deferred items — read it before adding to that route.
10. **Three-layer test rule.** Every Phase 3.5+ feature ships with: unit tests for pure logic, adapter integration tests for adapter API surface, browser E2E for user-facing flows. Skipping a layer because "covered elsewhere" is the rationalization that lets production bugs through.
11. **Date-stamped absorption / decision notes.** Notes added to long-lived docs (vision, CLAUDE.md, route headers) carry an explicit date so future readers can audit "what was true when." Pattern: `> **<noun> (added YYYY-MM-DD after <event>).**`

### Phase 3 debt carried into 3.5+

Acknowledged tech debt from Phase 3, listed here so the next phase doesn't accidentally re-create it or work around it:

| Debt | Source | Owner phase |
|---|---|---|
| Auth/permission gates, 404/403 polish, deep linking, share URLs, brand-picker URL nav, suspense boundaries on `/b/:slug/design/:designSlug` | Step 9 forward-pull from Phase 4.5 | Phase 4.5 |
| `TemplatePreviewModal` half-mounted in TemplateGallery (only the quick-download fallback path triggers it) | Step 9.3 commit 3b — left the modal mounted to keep the commit small | Cleanup pass before Phase 4 templates |
| Mockup family deferred from brandkit migration (renders "coming soon" placeholder) | Step 9.3 commit 3b — mockup studio is its own deferred feature | Post-Phase-5 (mockup studio phase) |
| `/_dev/editor` is still the primary manual-test surface for the unified editor (production route exists but isn't surfaced via any nav) | Pre-Phase-3.5 — no IA entry yet | Phase 4.5 (Templates → editor links land here) |
| 4 carve-outs remain: `design-ai`, `logo-maker/flow`, `editor/components`, `dashboard/.../design-ai.tsx` | Phase 0 catalogued 6; Step 9 reduced to 4 | Phase 3.5 (#1 + #4 absorption) and Phase 4+ (#2). #3 stays — off-limits export coupling. |
| `brand-guides` family routes through legacy `/b/:slug/guidelines` instead of the unified editor | Step 9.3 commit 3b — intentional, the legacy guidelines editor is its own dedicated multi-page UI | Phase 4 (template-first guidelines) |

---

## 8.6. Phase 3.5 — Shipped (May 1, 2026)

Phase 3.5 delivered the AI Editing Layer — the plumbing that turns the unified editor from manual-design surface into AI-native one. After Phase 3.5, every editor session has an always-visible AI prompt bar in the top chrome that drives Modes 2, 3, and 4 from §4. Mode 1 (zero-state generation) remains scheduled for Phase 5 because it depends on Phase 4's template library.

The single load-bearing function this phase shipped is `aiAgent.applyCommand(doc, command, context)`. Everything else is scaffolding around it.

### Major capabilities shipped

- **Static system prompt** (`src/features/editor/ai/systemPrompt.ts`, ~840 lines) with the 5 hard rules (JSON-only output, delta-over-replace with required justification, SlotRefs preserved for brand-bound properties, Mode 4 stays in scope, no silent failures). Six fully-realized worked examples Claude pattern-matches on, including a complete 5-slide social-post deck (Example E) and a Mode 3 RTL translation flow (Example F).
- **Compact `<brand_resolution>` block** (`brandResolutionBlock.ts`) — ~80–120 token resolved-value mapping with light/dark tone hints so the AI makes contrast-aware color decisions.
- **`AICommandResult` discriminated union** (`types.ts`) with three variants (delta / replace / rejected) and 7 explicit rejection reason codes. Zod-enforced at runtime.
- **Mode 5 — validation gate** (`modeFive.ts`) every real mode routes through. Five guards: top-level schema parse, per-op layer/page validation with UUID assignment, Mode 4 scope clamp, brand-rebinding detection on replace, hallucinated-id detection.
- **Edge Function** (`supabase/functions/ai-apply-command/index.ts`) with Anthropic prompt-caching (`cache_control: ephemeral` on the static spine) and mock mode (returns deterministic AICommandResult when `ANTHROPIC_API_KEY` is unset, so dev experience works without a key — single code path, no browser-side branching).
- **`createEdgeFunctionAgent`** (`applyCommand.ts`) — the production AIAgent implementation. Builds the system prompt locally, posts to the Edge Function, runs the response through Mode 5, returns the canonical AICommandResult.
- **`EditorAiPromptBar`** (`shell/v2/EditorAiPromptBar.tsx`) — top-chrome UI with two display modes (expanded inline ≥1024px viewport, collapsed sparkle-icon + popover <1024px). In-flight indicator, error tinting, suggestion chips, disambiguation alternative chips, Enter-submits / Shift+Enter-newline.
- **`applyAICommandResult`** (`applyResult.ts`) — the dispatcher. Wraps every delta in `adapter.batch(label, fn)` so a complete AI mutation lands as a single labeled undo entry. Replace branches through `adapter.batch(label, () => replaceDocument(next))` per the EditorAdapter contract. Rejected → no-op (the prompt bar surfaces the message inline).
- **Carve-out absorption** — pre-3.5 fullscreen pages `/b/:slug/ai-design` and `/b/:slug/design-ai` deleted, along with `src/features/ai-design/` and `src/features/design-ai/` source folders. The launchpad now has ONE "Design with AI" card that seeds a brand-bound social-post + navigates to the unified editor. **Carve-out list reduced from 4 → 2.**
- **Edge Function security migration** — moves Anthropic call off the browser (no more `dangerouslyAllowBrowser: true`); `ANTHROPIC_API_KEY` no longer ships in the client bundle. Closes the security constraint tracked at issue #2.

### Architectural decisions Phase 3.5 locked in

These patterns inherit forward; later phases follow them.

1. **Single load-bearing AI entry point.** Every AI command goes through `AIAgent.applyCommand(doc, command, context)`. Modes 2/3/4 are inferred at the contract layer from `(selection, prompt intent)`; the implementation layer doesn't branch per mode. Phase 5's Mode 1 will follow the same shape.
2. **Mode 5 is non-bypassable.** Every AI emit transits `validateAICommandResult` before any adapter mutation. No code path in the editor mutates from a raw AI response.
3. **Adapter batch wrapping is mandatory** for every applied AI operation. One AI submission → one undo entry. Same `adapter.batch(label, fn)` primitive Phase 3 used for Re-apply / cross-page propagation / smart duplicate.
4. **SlotRefs survive AI emits.** The system prompt enforces it at instruction level, the schema enforces it at validation level. AI-emitted documents stay brand-bound; brand switches re-resolve correctly.
5. **Replace requires justification.** AI returning `replace` without a 10-char-minimum justification is rejected at the contract layer. Default behavior is delta; replace is the disruptive exception.
6. **Disambiguation is explicit, not implicit.** When both Mode 3 and Mode 4 plausibly apply, the AI picks the better-matching one AND surfaces the alternative as a one-click follow-up via the `disambiguation` field. Silent wrong-mode actions are rejected at Mode 5.
7. **Send-spine-per-call + Anthropic prompt caching.** The static system prompt (~3,500 tokens) is sent on every Edge Function call, cached at Anthropic with `cache_control: ephemeral`. First call in a 5-min window pays cache write; subsequent reads are 0.1× cost. Browser–to–Edge bandwidth is the trade-off; cache amortization wins decisively at any session volume.
8. **Mock mode lives on the Edge Function side.** When `ANTHROPIC_API_KEY` is unset, the Edge Function returns a deterministic AICommandResult. Browser code has a single path; no `if (mockMode)` branches in the editor.
9. **Three-layer test discipline holds.** Every commit shipped unit + adapter integration + browser E2E. Negative-path coverage explicit per mode (rejected pass-through, agent throw, schema-invalid AI response, network error).

### Phase 3.5 debt carried into Phase 4+

Tracked here so future phases don't accidentally re-create it.

| Debt | Source | Owner phase |
|---|---|---|
| Mode 1 (zero-state generate) not yet wired — needs Phase 4's template library to work well | Spec §2 (out of scope, deferred) | Phase 5 |
| AI image generation absent (the agent can reference existing brand assets but cannot generate new ones) | Spec §2 | Phase 5+ |
| AI for resize variants — Phase 6 (`generateResizeVariants`) owns the reflow pipeline; AI not yet integrated there | Spec §2 | Phase 6 |
| Cross-document AI workflows (e.g. emit a "design family" of N linked docs) | Spec §2 | Phase 6 |
| Streaming responses — request → wait → apply for now; "Thinking…" indicator only | Spec Q7 | Phase 5 if user feedback demands it |
| Skill chips deferred — Phase 3.5 prompt bar has no skill chips; revisit when usage data shows users wandering | Spec Q4 | Post-Phase-5 (data-driven) |
| Real Anthropic call in CI — every test uses a stub or mock; Edge Function is deploy-time-only verified | Spec §2 | Indefinite (prefer the discipline) |
| Multi-turn conversation memory — prompt bar is stateless across submits | Spec §6 | Future phase if needed |
| Auto-apply / streaming-ready hooks in the prompt bar UI | Spec Q7 | Phase 5+ if streaming ships |

### Phase 3.5 carve-out outcome

Carve-out list went from 4 (post-Phase 3) → 2 (post-Phase 3.5):
1. ~~`src/features/design-ai/`~~ — **deleted in commit 9.**
2. `src/features/logo-maker/flow/` — kept (wrong shape: wizard, not canvas). Phase 4+ may absorb pieces.
3. `src/features/editor/components/` — kept (transitively coupled to off-limits `stable/editable-export-v1` export pipeline). No path to migration without updating the export baseline (off-limits).
4. ~~`src/pages/dashboard/brand/[slug]/design-ai.tsx`~~ — **deleted in commit 9 (paired with #1).**

Two remain. Both are documented kept-because in CLAUDE.md.

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
