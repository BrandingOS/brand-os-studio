# Deck OS — Unified Presentation System

**Date:** 2026-04-27
**Status:** Design proposal (not yet approved)
**Inspiration:** Gamma.app · Chronicle · Canva · Pitch · Tome
**Replaces:** pitch-deck, case-study-deck, logo-presentation, shared/presentation (4 systems → 1)

---

## 1. Vision

A presentation engine that:

1. **Takes a script + a brand → outputs a polished deck.** User pastes 200 words. Claude parses, assigns layouts, fills content. Brand tokens style it. Done in 30 seconds.
2. **Has a real template library.** "Pitch Deck", "Quarterly Review", "Case Study", "Product Launch", "Brand Identity Showcase" — each is a curated sequence of layouts + content schema, ready to fill from any brand.
3. **One editor for every deck type.** Inline edit, drag, resize, replace artwork (Upload / Unsplash / 3D Illustrations), undo/redo, theme drawer. The current `EditorWorkspace` (1,400 LOC) already does most of this — we lean on it.
4. **One theme model.** Per-deck overrides on top of brand defaults. No competing style systems. The recently-shipped per-role theme model wins; the older `styles.ts` 10-presets get re-cast as starter themes.
5. **Slides are data, not code.** No more variant-per-slide React files. Slides are `Slide` objects rendered by a generic engine. Adding a new slide style = adding a new layout component, not 13 new files per deck.

What we're killing:

- `src/features/pitch-deck/variants/` (~10K LOC of hand-coded slide variants)
- `src/features/case-study-deck/slides/` (~5K LOC of brand-specific slides)
- `src/features/logo-presentation/buildLogoSlides.tsx` (~600 LOC of hardcoded layouts)
- The competing third style system in `src/features/case-study-deck/styles/master.ts`

What we're keeping:

- `src/shared/editor/EditorWorkspace.tsx` — the unified editor surface
- `src/shared/editor/InlineEditableSlide.tsx` — the in-slide editing primitive
- `src/shared/presentation/theme/` — the per-role theme system (just shipped)
- `src/features/pitch-deck/artwork/` — the artwork picker (lift to shared)
- `src/shared/presentation/pages.tsx` — the generic page layouts (refactor into the new layout library)
- `src/shared/presentation/templates.tsx` — content type registry (rebuild on the new model)

---

## 2. Core abstractions

### 2.1 Slide

A slide is a typed data object — never React JSX:

```ts
interface Slide {
  id: string;
  /** Layout chosen from the library. Determines visual structure. */
  layout: LayoutId;
  /** Content blocks keyed by slot. Slots are layout-defined. */
  blocks: Record<SlotId, Block>;
  /** Per-slide theme overrides. Inherits from deck theme by default. */
  themeOverride?: Partial<DeckTheme>;
  /** Hidden from export, kept for reference. */
  hidden?: boolean;
  /** Notes (speaker / AI prompt source). */
  notes?: string;
}

type Block =
  | { kind: 'text'; text: string; role: TypeRole }
  | { kind: 'list'; items: string[]; role: TypeRole; ordered?: boolean }
  | { kind: 'image'; url?: string; alt?: string; fit?: 'cover' | 'contain' }
  | { kind: 'logo'; variant?: 'primary' | 'mono-light' | 'mono-dark' }
  | { kind: 'shape'; shape: 'circle' | 'rect' | 'pill'; fill: string; size?: number }
  | { kind: 'stat'; value: string; label: string }
  | { kind: 'quote'; text: string; author?: string }
  | { kind: 'code'; language?: string; code: string }
  | { kind: 'chart'; type: 'bar' | 'line' | 'pie' | 'donut'; data: ChartData }
  | { kind: 'iframe'; src: string }       // for video / embeds
  | { kind: 'spacer' };                    // explicit gap
```

### 2.2 Layout

A layout is a React component + a slot manifest. ~15 reusable layouts cover 95% of presentations:

| Layout | Slots | Use |
|---|---|---|
| `cover` | brand, title, subtitle, image? | Title slide |
| `section-divider` | label, title, accent | Chapter break |
| `title-body` | title, body | Standard text slide |
| `bullets` | title, bullets, image? | Lists |
| `two-column` | left, right | 50/50 split |
| `image-text` | image, title, body | Photo with copy |
| `quote` | quote, author, image? | Testimonial |
| `stats-3` | title, stat1, stat2, stat3 | KPIs |
| `stats-grid` | title, stats[] | Many KPIs |
| `team-grid` | title, intro, members[] | Team / advisors |
| `process` | title, steps[] | Step-by-step |
| `comparison` | title, columns[] | Vs. tables |
| `gallery` | title, images[] | Moodboard |
| `metrics-hero` | metric, label, context | Big number focus |
| `cta` | title, subtitle, primary, secondary | Closing slide |

Layouts are **theme-agnostic** — they read CSS vars (`--deck-*`), never hard-code colors/sizes. They're **brand-agnostic** — they read content from the slide's `blocks`, not from any brand global.

### 2.3 Template

A template is a sequence of layouts + a content schema:

```ts
interface Template {
  id: TemplateId;
  name: string;
  description: string;
  thumbnail: string;
  /** Categories help users browse. */
  category: 'pitch' | 'showcase' | 'report' | 'narrative' | 'casual';
  /** Slide blueprint — what layouts in what order, with their slot prompts. */
  slides: Array<{
    layout: LayoutId;
    /** Default content scaffolds — placeholder text the user can replace. */
    blocks: Record<SlotId, Block>;
    /** AI-generation hints — what each block should contain. */
    aiHints: Record<SlotId, string>;
  }>;
  /** Theme defaults this template ships with (typography, colors, density). */
  defaultTheme: Partial<DeckTheme>;
}
```

Templates we ship at v1:

- **Pitch Deck** (15 slides) — Cover, Problem, Solution, Process, Differentiators, Foundations, Programs, Metrics, Impact, Team, CTA
- **Quarterly Review** (10 slides) — Cover, Objectives, KPIs, Wins, Losses, Lessons, Next Quarter, Asks, Team, Close
- **Product Launch** (12 slides) — Hero, Problem, Solution, Demo, Features, Pricing, Audience, Roadmap, Testimonial, FAQ, CTA
- **Case Study** (10 slides) — Cover, Client, Challenge, Approach, Process, Outcome, Stats, Quote, Team, CTA
- **Brand Identity Showcase** (12 slides) — Cover, Story, Logo, Palette, Typography, Voice, Imagery, Applications, Guidelines, CTA

Each template is just **data** — a JSON-like structure. Adding a template = writing one file under `src/shared/presentation/templates/<id>.ts`.

### 2.4 Theme

Already shipped in `src/shared/presentation/theme/`. Per-role typography, colors, density, style. **No changes** — this is the foundation. We just add starter "theme presets" (Bold, Editorial, Minimal, etc. — replacing the legacy `styles.ts` 10 presets with new ones tied to the per-role model).

### 2.5 Deck

```ts
interface Deck {
  id: string;
  brandId: string;
  templateId: TemplateId;
  title: string;
  slides: Slide[];
  theme: DeckTheme;        // resolved (defaults applied)
  createdAt: Date;
  updatedAt: Date;
  /** Source of truth: where the deck was generated from. */
  origin: 'template' | 'ai-script' | 'duplicated' | 'imported';
  /** If origin === 'ai-script': the script + generation params. */
  scriptSource?: { script: string; promptVersion: string };
}
```

Stored in `brand.decks[]` (new field) or in Supabase under `decks` table (Phase 2).

---

## 3. Renderer

```tsx
<DeckRenderer
  deck={deck}
  brand={brand}
  mode="present" | "edit" | "thumbnail"
  activeSlideIdx?
  onSlideChange?
/>
```

Internally:

```tsx
<DeckThemeProvider theme={deck.theme} brand={brand}>
  {deck.slides.map((slide, idx) => (
    <SlideRenderer
      key={slide.id}
      slide={slide}
      index={idx}
      total={deck.slides.length}
      mode={mode}
    />
  ))}
</DeckThemeProvider>
```

`SlideRenderer` is the magic:

```tsx
function SlideRenderer({ slide, ...props }: Props) {
  const Layout = LAYOUT_REGISTRY[slide.layout];
  if (!Layout) return <FallbackSlide />;
  return (
    <Frame {...props}>
      <PageChrome {...props} />
      <Layout blocks={slide.blocks} {...props} />
    </Frame>
  );
}
```

That's it. 60 lines. No more 1,000-LOC variant files per slide kind.

---

## 4. AI generation pipeline

The killer feature. Three modes:

### Mode A — From a script

User pastes 50–500 words of plain text. Claude parses it.

```
User script:
"We're building Uniex, a platform that helps high school students
choose university majors via personality assessments and real
student ambassadors. The problem is students currently make
decisions based on marketing, not reality. Our solution is a
two-part system: Athar (assessment + decision-building) and Uniex
(real-world university experience via ambassadors)..."
```

Pipeline:

```
script
  → Claude (extract structure)
    → outline: [{ section: "problem", text: "..." }, ...]
  → template matcher
    → bestTemplate: 'pitch-deck'
  → Claude (assign each section to a layout + fill blocks)
    → slides: Slide[]
  → theme resolver
    → applies brand-derived theme
  → save → Deck
```

The Claude prompt for the second step:

```
You are a presentation designer. Given:
- Section: {section}
- Text: {text}
- Available layouts: {layouts with descriptions}

Output a JSON Slide:
- Pick the best layout for this content (e.g., "stats-3" for KPIs,
  "bullets" for a list of pains, "image-text" for solution intro).
- Fill each slot. Keep text TIGHT — body 2-3 lines max, bullets
  ≤ 7 words each, headlines 6 words.
- For image slots, output {kind: 'image', alt: '<3-word query>'}
  — the picker will surface 3D Illustrations + Unsplash matches.
```

### Mode B — From a template (no AI)

User picks a template, gets the scaffolded slides, fills in manually. This is the safety net — works without API key.

### Mode C — Hybrid

User picks a template. AI fills in placeholders from a short brief. User edits.

### Cost / quality controls

- All Claude calls go through the existing `aiService.ts` (production-ready).
- Cache by hash of (script, brandId, templateHint) — same input → same output, no double-billing.
- Fallback: if Claude is unavailable, fall back to template-only mode with a banner.
- API key already in `.env`: `VITE_ANTHROPIC_API_KEY`. **Constraint:** must move behind a Supabase Edge Function before public deploy (already noted in CLAUDE.md).

---

## 5. Editor

The existing `EditorWorkspace` (1,400 LOC) handles 80% of what we need:

- Slide rail (thumbnails, drag-to-reorder, hide/show)
- Slide stage (zoom, scroll-snap, presenter mode)
- Right inspector (Slide tab + Theme tab — already shipped)
- Bottom dock (Save, Export, Add element, Undo/Redo)
- Inline editing (InlineEditableSlide → EditableSlide → text/image selection + drag/resize)
- Auto-save

**What we add:**

1. **Layout switcher.** With a slide selected, a "Layout" segment in the inspector lets the user swap layouts. The slide's blocks are remapped to the new layout's slot map (best-effort) or shown as "Unmapped — drag into new slots."

2. **Block toolbar.** When a block is selected, show a contextual toolbar over it: Replace / Duplicate / Delete / Convert (text → bullets, etc.).

3. **Add slide button.** "+ Slide" between thumbnails inserts a new slide. Picks a layout via popover (search + grid of 15 layouts).

4. **Templates browser.** "Change template" opens a drawer showing all templates, with thumbnails. Switching re-flows existing content into the new template's layout sequence (best effort — show a diff preview before committing).

5. **AI panel.** A "✨ Generate" button opens a side drawer with a textarea for the script. Generate, preview, accept.

---

## 6. Asset system

Lift `src/features/pitch-deck/artwork/` → `src/shared/artwork/`. Already 80% generic. Make:

- `useArtworkSlot(deckId, slotId)` instead of `(slug, slotId)` — more accurate.
- `<ArtworkPicker>` accepts an `onPick` callback (already does).
- Default tabs: 3D Illustrations (Iconify) / Unsplash / Upload (already shipped).
- Add: Brand assets tab — pulls from `brand.brandAssets` and `brand.logoSystem`.

Every `image` / `logo` block in a slide renders through `<ArtworkSlot>` which delegates to the picker on click.

---

## 7. Storage

### Per-deck data

Stored at `brand.decks[]` for now (localStorage via `LocalBrandsService`, eventual Supabase migration):

```ts
interface Brand {
  // ... existing fields ...
  decks?: Deck[];
}
```

Per-element edits (the `frozenHtml` mechanism) **GONE.** We don't need it because slides are data, not React trees. When the user edits text, we update the block's `text` field. When the user moves an element, we add a `position` override on the block. No DOM-cloning hacks.

### Versioning

Each deck has a `version` integer. Bumped on every save. Auto-save writes a snapshot every 5 seconds if the version changed. Snapshots stored in localStorage (last 50 per deck) for undo-across-session.

---

## 8. Migration plan

The current four-deck mess gets dismantled in phases. **No big-bang rewrite.** Each phase ships a working improvement.

### Phase 1 — Foundation (1 week)

- [ ] Define `Slide`, `Block`, `Layout`, `Template`, `Deck` types in `src/shared/presentation/v2/types.ts`.
- [ ] Build the 15-layout library in `src/shared/presentation/v2/layouts/` (one component per layout, all token-driven).
- [ ] Build `<DeckRenderer>` and `<SlideRenderer>`.
- [ ] Lift artwork picker to `src/shared/artwork/`.
- [ ] One template: "Pitch Deck" (rebuild Uniex content as a Template + Deck).
- [ ] Mount at `/b/:slug/deck-v2` — runs in parallel with the old pitch-deck route.

**Acceptance:** Uniex pitch deck rendered via the new system looks better than current and is fully editable in `EditorWorkspace`.

### Phase 2 — AI generation (3 days)

- [ ] Add `generateDeckFromScript(brand, script, templateHint?)` in `src/shared/presentation/v2/ai.ts`.
- [ ] Wire to `aiService.ts`.
- [ ] Add the "✨ Generate" drawer to `EditorWorkspace`.
- [ ] Cache generations by hash.

**Acceptance:** User pastes a paragraph → 30 seconds later sees a 10-slide deck.

### Phase 3 — Templates library (3 days)

- [ ] Add Quarterly Review, Product Launch, Case Study, Brand Identity Showcase templates.
- [ ] Templates browser drawer in EditorWorkspace.
- [ ] Each template has a curated thumbnail rendered server-side or via offscreen canvas.

**Acceptance:** New deck wizard lets user pick a template + (optionally) paste a script.

### Phase 4 — Migration (1 week)

- [ ] Migrate the 15 hardcoded Uniex slides → Pitch Deck template content.
- [ ] Migrate case-study-deck → Case Study template.
- [ ] Migrate logo-presentation → Brand Identity Showcase template.
- [ ] Redirect old routes (`/b/:slug/pitch-deck`, etc.) to `/b/:slug/decks/:deckId`.
- [ ] Delete `src/features/pitch-deck/variants/` (10K LOC).
- [ ] Delete `src/features/case-study-deck/slides/` (5K LOC).
- [ ] Delete `src/features/logo-presentation/buildLogoSlides.tsx`.
- [ ] Delete `src/features/case-study-deck/styles/master.ts`.

**Acceptance:** All three legacy decks render via v2. `git diff --stat` shows 18K LOC deleted.

### Phase 5 — Decks dashboard (3 days)

- [ ] `/b/:slug/decks` page — grid of all decks for the brand. Create new (template / AI / blank). Open. Duplicate. Delete.
- [ ] Each deck has a public-share URL (Phase 5b).

**Acceptance:** A brand can have 5+ decks of different templates living side by side.

---

## 9. Out of scope (v1)

- Real-time collaboration (multi-cursor editing) — Phase 6.
- Animations between slides — Phase 7.
- Embedding live data in slides (Notion/Airtable plug) — Phase 7.
- Full PDF/PPTX export with all formatting → currently html-to-image based; PPTX export needs jsPPTX integration → Phase 6.
- Brand-aware image search (e.g., "match brand color tone") — Phase 7.
- Voice-over / talk track sync — Phase 8.

---

## 10. Risks

1. **Migration scope creep.** Rewriting 33K LOC takes longer than estimated. *Mitigation:* the new system runs in parallel; we don't have to migrate all decks at once.

2. **AI generation quality.** Claude might pick weird layouts for some content. *Mitigation:* the user can always swap layouts. The template provides a safety net (no AI = template defaults).

3. **EditorWorkspace coupling.** It's currently used by the three old decks; touching it might break them. *Mitigation:* run v2 on a branch, keep v1 routes alive until Phase 4.

4. **Cost.** Claude calls at scale = real money. *Mitigation:* hash-cache; later move behind a Supabase Edge Function with rate limiting.

5. **Slide-as-data loses precision.** Some current decks have very bespoke layouts that don't map cleanly to 15 generic ones. *Mitigation:* layouts can have variants (e.g., `cover.classic`, `cover.minimal`, `cover.split`). 15 layouts × 3 variants each = 45 visual options — enough for most decks.

---

## 11. File map

```
src/shared/presentation/v2/
  types.ts                 # Slide, Block, Layout, Template, Deck
  layouts/
    index.ts               # LAYOUT_REGISTRY
    Cover.tsx
    SectionDivider.tsx
    TitleBody.tsx
    Bullets.tsx
    TwoColumn.tsx
    ImageText.tsx
    Quote.tsx
    Stats3.tsx
    StatsGrid.tsx
    TeamGrid.tsx
    Process.tsx
    Comparison.tsx
    Gallery.tsx
    MetricsHero.tsx
    Cta.tsx
  templates/
    index.ts               # TEMPLATE_REGISTRY
    pitch-deck.ts
    quarterly-review.ts
    product-launch.ts
    case-study.ts
    brand-identity.ts
  components/
    DeckRenderer.tsx
    SlideRenderer.tsx
    Frame.tsx              # rebuilt from variants/_shared.tsx
    PageChrome.tsx
    LayoutSwitcher.tsx     # for the inspector
    BlockToolbar.tsx       # contextual block actions
    AddSlideButton.tsx
    TemplatesBrowser.tsx
    GeneratePanel.tsx      # AI script input
  ai/
    generateDeckFromScript.ts
    promptTemplates.ts
    layoutMatcher.ts
  store/
    deckStore.ts           # Zustand: decks per brand
    deckPersist.ts         # save / load via brandStore
  __tests__/
    ...

src/shared/artwork/        # (lifted from pitch-deck)
  ArtworkPicker.tsx
  ReplaceableArtwork.tsx
  artworkStore.ts

src/pages/dashboard/brand/[slug]/
  decks/
    DecksPage.tsx          # /b/:slug/decks (grid)
    DeckEditPage.tsx       # /b/:slug/decks/:deckId (editor)
    NewDeckPage.tsx        # /b/:slug/decks/new (wizard)
```

---

## 12. Why this doesn't repeat the current mess

| Current problem | v2 solution |
|---|---|
| Hardcoded `NAVY = '#001563'` in 4 places | Layouts read `var(--deck-bg-page)` etc. — set once via theme. |
| 13 React variant files per deck × 3 decks = 39 hand-tuned files | 15 layouts shared by all decks. Adding a deck = writing one template (data file). |
| Three style systems (styles.ts, theme/, master.ts) | One: `theme/` is the only style system. |
| `frozenHtml` capture + replay | Slides are data. Edits update the data, not the DOM. |
| Hand-coded SVG illustrations user complained about | All artwork goes through the picker (Iconify 3D + Unsplash + Upload). No baked-in SVGs. |
| Pitch deck only works for Uniex | Templates are brand-parameterized. Pick a template + a brand → works. |
| No AI generation | Script → deck in 30 seconds. |
| 4 decks = 33K LOC | Estimated v2: 6K LOC + 5 templates × 200 LOC = 7K total. **80% LOC reduction.** |

---

## Approval gates

This is the **vision**. Before any code is written:

1. ✅ User reads this spec.
2. 🟡 User approves or asks for changes.
3. 🟡 If approved, I invoke `writing-plans` to create the per-task implementation plan for Phase 1.
4. 🟡 Phase 1 ships — runs in parallel with current decks.
5. 🟡 We assess and decide on Phase 2 (AI).

**No code lands until the user reviews this spec.**
