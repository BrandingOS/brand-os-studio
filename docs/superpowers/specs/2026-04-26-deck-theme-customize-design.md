# Deck Theme + Customize Panel — Design Spec

**Date:** 2026-04-26
**Status:** Approved (brainstorming)
**Scope:** Pitch Deck, Case Study Deck, Logo Presentation — and any future presentation deck

## Problem

Slides in the pitch deck (`/b/:slug/pitch-deck`) currently bake all
typography and color values inline:

```tsx
// src/features/pitch-deck/slides/UniexPitchSlides.tsx
const FONT_DISPLAY = "'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif";
const NAVY  = '#001563';
const WHITE = '#FFFFFF';
…
<div style={{ fontFamily: FONT_BODY, fontSize: 14, color: NAVY }}>…</div>
<div style={{ fontFamily: FONT_BODY, fontSize: 13, color: NAVY }}>…</div>
```

Consequences:

- Captions are too small and there is no single place to fix that — every
  slide hard-codes its own size.
- Brand-level typescale (`brand.typescale`) and brand palette
  (`brandPalette.ts`) already exist with full role/scale tokens, but the
  decks don't consume them.
- The Customize tab on the deck right-rail is a stub: variant chip,
  hide/show, reset live-edits. No theme controls.

The user wants a **per-deck Customize panel** that exposes typography,
colors, density, and style. A change in the panel must update **all
slides** in the deck instantly, with no per-slide editing.

## Decisions (locked from brainstorming)

| | Decision |
|---|---|
| Storage scope | Per (brand, deck-kind). Each brand has one pitch-deck theme, one case-study theme, one logo-presentation theme. |
| Source of defaults | `brand.typescale` (presentation surface) + `brandPalette(brand, 'light')`. The deck theme is purely *override* on top — empty by default. |
| Reset path | "Reset to brand defaults" button clears all overrides → deck inherits brand again. |
| Scope of controls | Full theme — typography, colors, density, style (bg/radius/shadow/logo). |
| UX placement | Tabs in existing right-rail inspector: `Slide` (existing per-slide controls) and `Theme` (new global). |
| Reusability | Lives in `src/shared/presentation/theme/`. Each deck composes `<DeckThemeProvider>` + `<DeckThemePanel>`. |
| Save behavior | Auto-save (debounced) into `brand.presentationThemes[deckKind]`. No "Save" button. Mirror the `useAutoSave` pattern from `EditorChrome`. |

## Data model

### `PresentationTheme`

`src/shared/presentation/theme/types.ts`:

```ts
export type DeckKind = 'pitch-deck' | 'case-study' | 'logo-presentation';

export type PresentationTheme = {
  typography: {
    headingFont?: string;          // undefined → fall back to brand.typescale.fonts.heading
    bodyFont?:    string;
    scaleMultiplier:   number;     // 1.0 default; range [0.85 .. 1.25] in 0.05 steps
    leadingMultiplier: number;     // 1.0 default; range [0.90 .. 1.20] in 0.05 steps
    headingWeight?: number;        // 400 | 500 | 600 | 700 | 800
    bodyWeight?:    number;
  };
  colors: {
    bg?:       string;             // page bg; undefined → brandPalette.bg.page
    heading?:  string;
    body?:     string;
    accent?:   string;
    cardBg?:   string;
  };
  density: 'compact' | 'comfortable' | 'spacious';   // default 'comfortable'
  style: {
    bgKind:        'solid' | 'gradient' | 'pattern';
    borderRadius:  'sharp' | 'soft' | 'pill';
    shadow:        'none'  | 'soft' | 'lifted';
    logoPlacement: 'tl' | 'tr' | 'bl' | 'br' | 'hidden';
  };
};

export const EMPTY_THEME: PresentationTheme = {
  typography: { scaleMultiplier: 1, leadingMultiplier: 1 },
  colors: {},
  density: 'comfortable',
  style: {
    bgKind: 'solid',
    borderRadius: 'soft',
    shadow: 'soft',
    logoPlacement: 'tl',
  },
};
```

### Persistence on the brand

Extend `Brand` in `src/shared/types/brand.ts`:

```ts
presentationThemes?: Partial<Record<DeckKind, PresentationTheme>>;
```

Saved through `brandStore.updateBrand(brandId, { presentationThemes: ... })`.
The Local + Supabase brand services round-trip the field as JSONB.

## Token layer

`src/shared/presentation/theme/buildDeckTokens.ts`:

```ts
export function buildDeckCssVars(
  brand: Brand,
  theme: PresentationTheme,
): React.CSSProperties;
```

Computes CSS custom properties from `brand.typescale` (presentation
surface) + `brandPalette(brand, 'light')` and overlays `theme`.

Variables emitted on the deck container (subset shown — full list in the
implementation):

```
--deck-font-heading       --deck-font-body
--deck-weight-heading     --deck-weight-body

--deck-text-display       --deck-leading-display
--deck-text-h1            --deck-leading-h1
--deck-text-h2            --deck-leading-h2
--deck-text-h3
--deck-text-body          --deck-leading-body
--deck-text-caption       --deck-leading-caption
--deck-text-label

--deck-bg-page            --deck-bg-card           --deck-bg-inverted
--deck-text-heading       --deck-text-body         --deck-text-muted
--deck-accent             --deck-border-subtle

--deck-pad-x   --deck-pad-y   --deck-gap
--deck-radius  --deck-shadow
```

Density mapping:

| density       | --deck-pad-x | --deck-pad-y | --deck-gap |
|---------------|-------------:|-------------:|-----------:|
| compact       | 32           | 24           | 16         |
| comfortable   | 56           | 40           | 24         |
| spacious      | 88           | 64           | 32         |

`scaleMultiplier` multiplies each computed `--deck-text-*` value
(taken from `brand.typescale.surfaces.presentation.semantic[role]`).
`leadingMultiplier` multiplies each `--deck-leading-*` value the same way.

## Provider

`src/shared/presentation/theme/DeckThemeProvider.tsx`:

```tsx
<DeckThemeProvider brand={brand} deckKind="pitch-deck">
  {slides}
</DeckThemeProvider>
```

Resolves theme = `brand.presentationThemes?.[deckKind] ?? EMPTY_THEME`,
calls `buildDeckCssVars`, and applies the result as inline `style` on a
wrapping `<div data-deck={deckKind}>`. Children read everything from
`var(--deck-*)`.

## Shared CSS classes

`src/shared/presentation/theme/deck.css` defines reusable role classes
that read tokens. Slides use these instead of inline styles:

```css
.deck-display { font: var(--deck-weight-heading) var(--deck-text-display)/var(--deck-leading-display) var(--deck-font-heading); color: var(--deck-text-heading); letter-spacing: -0.02em; }
.deck-h1      { font: var(--deck-weight-heading) var(--deck-text-h1)/var(--deck-leading-h1) var(--deck-font-heading); color: var(--deck-text-heading); }
.deck-h2      { font: var(--deck-weight-heading) var(--deck-text-h2)/var(--deck-leading-h2) var(--deck-font-heading); color: var(--deck-text-heading); }
.deck-h3      { font: var(--deck-weight-heading) var(--deck-text-h3)/1.25         var(--deck-font-heading); color: var(--deck-text-heading); }
.deck-body    { font: var(--deck-weight-body) var(--deck-text-body)/var(--deck-leading-body) var(--deck-font-body); color: var(--deck-text-body); }
.deck-caption { font: var(--deck-weight-body) var(--deck-text-caption)/var(--deck-leading-caption) var(--deck-font-body); color: var(--deck-text-muted); }
.deck-label   { font: 600 var(--deck-text-label)/1.2 var(--deck-font-body); color: var(--deck-text-muted); text-transform: uppercase; letter-spacing: 0.08em; }

.deck-card    { background: var(--deck-bg-card); border-radius: var(--deck-radius); box-shadow: var(--deck-shadow); border: 1px solid var(--deck-border-subtle); }
.deck-pad     { padding: var(--deck-pad-y) var(--deck-pad-x); }
.deck-gap     { gap: var(--deck-gap); }
.deck-accent  { color: var(--deck-accent); }
.deck-page-bg { background: var(--deck-bg-page); }
```

## Slide refactor

Touch points in `src/features/pitch-deck/slides/UniexPitchSlides.tsx`:

1. Delete the `FONT_DISPLAY`, `FONT_BODY`, `NAVY`, `WHITE`, `MINT`,
   `RED`, `INK` constants.
2. Rewrite `PageChrome` so the brand label, page number, and footer
   meta read from `.deck-caption` / `.deck-label` and use
   `pickLogoOnBackground(brand, currentBg)` for the logo variant.
3. Replace every `style={{ fontSize, fontFamily, color }}` with the
   matching `.deck-*` class.
4. Cards/panels switch to `.deck-card .deck-pad`.
5. Logo placement reads `--deck-logo-placement` (computed from
   `theme.style.logoPlacement` as a CSS data-attribute, not a var, so
   slides can use `[data-logo-pos="tl"]` selectors).

`PitchDeckPage.tsx` wraps the slide stage in `<DeckThemeProvider
brand={brand} deckKind="pitch-deck">`.

The same pattern applies to:

- `src/features/case-study-deck/slides/`
- `src/features/logo-presentation/`
- `src/shared/presentation/pages.tsx` (generic CoverPage etc.)

The case-study + logo-presentation refactor is in scope of this design
but landing in a follow-up plan if the diff gets too large.

## Customize panel UI

`src/shared/presentation/theme/DeckThemePanel.tsx`:

```tsx
<DeckThemePanel brand={brand} deckKind="pitch-deck" />
```

Layout — single scrollable column inside the right-rail inspector tab:

1. **Sticky header** — "Reset to brand defaults" button + auto-save state pill.
2. **Typography** (accordion, open by default)
   - Heading font picker — reuses `FontPicker` from typescale tool
   - Body font picker
   - Scale slider — 0.85 ↔ 1.25, step 0.05, default 1.00
   - Line-height slider — 0.90 ↔ 1.20, step 0.05, default 1.00
   - Heading weight — segmented (Light 300 / Regular 400 / Medium 500 / Semibold 600 / Bold 700)
   - Body weight — segmented (Regular / Medium / Semibold)
3. **Colors**
   - Five swatches (Page bg, Heading, Body, Accent, Card bg).
   - Each swatch: HSL picker on click; "Use brand" link clears the override.
   - Pre-fill from `brandPalette` for Page bg / Heading / Body /
     Accent. Card bg defaults to `brandPalette.bg.surface`.
4. **Density** — segmented (Compact / Comfortable / Spacious).
5. **Style**
   - BG kind — radio chip group (Solid / Gradient / Pattern). When
     Gradient, exposes a second swatch for the gradient end color
     (default = primary darker shade). Pattern uses a fixed dot pattern
     for v1.
   - Border radius — segmented (Sharp / Soft / Pill).
   - Shadow — segmented (None / Soft / Lifted).
   - Logo placement — 5-state segmented (TL / TR / BL / BR / Hidden).

Live preview is the deck itself — no separate preview pane. Every
control change writes to the Zustand store, which re-renders the
provider, which re-emits CSS vars, which re-styles the slides.

## Inspector integration

`PitchDeckPage.tsx` right rail today:

```tsx
<aside className="w-[360px] …">
  {/* Slide {00} title + variant chips + hide/show + reset */}
</aside>
```

Becomes:

```tsx
<aside className="w-[360px] …">
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList><TabsTrigger value="slide">Slide</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger></TabsList>
    <TabsContent value="slide">{existingSlideInspector}</TabsContent>
    <TabsContent value="theme">
      <DeckThemePanel brand={brand} deckKind="pitch-deck" />
    </TabsContent>
  </Tabs>
</aside>
```

The `Slide` tab only enables when a slide is selected (today's
behavior). The `Theme` tab is always enabled.

## Auto-save

Mirror the existing `useAutoSave` from `@/features/editor/core`:

- 600ms debounce after the last change
- Save state pill: `Saved` / `Saving…` / `Unsaved` (tied to last error)
- Persist via `brandStore.updateBrand(brandId, {
  presentationThemes: { ...existing, [deckKind]: theme } })`

## Store

`src/shared/presentation/theme/store.ts`:

```ts
type DeckThemeStore = {
  byKey: Record<`${BrandId}:${DeckKind}`, PresentationTheme>;
  draftFor(brandId: string, deckKind: DeckKind): PresentationTheme;
  setTheme(brandId: string, deckKind: DeckKind, next: PresentationTheme): void;
  patchTheme(brandId: string, deckKind: DeckKind, patch: DeepPartial<PresentationTheme>): void;
  reset(brandId: string, deckKind: DeckKind): void;
};
```

Hydrates from `brand.presentationThemes` when the deck mounts.
Auto-save subscribes to `byKey` changes and writes back to the brand.

## Out of scope (defer)

- Per-slide theme overrides (one slide diverging from the deck theme).
  Live-edits already cover this case.
- Importing/exporting themes between brands.
- Theme presets ("Modern", "Editorial", "Bold"). Easy follow-up — they
  are just named `PresentationTheme` literals in a `presets.ts`.
- Animated transitions when the theme changes. Browser default is fine.

## File map

```
src/shared/presentation/theme/
  types.ts                  PresentationTheme, DeckKind, EMPTY_THEME
  buildDeckTokens.ts        buildDeckCssVars(brand, theme)
  DeckThemeProvider.tsx     wraps deck, applies CSS vars
  DeckThemePanel.tsx        the Theme tab UI
  useDeckTheme.ts           selector hook over the store
  store.ts                  Zustand store + auto-save wiring
  deck.css                  .deck-display / .deck-h1 / .deck-body / etc.
  presets.ts                (deferred) named themes

src/shared/types/brand.ts   + presentationThemes?: …
src/features/pitch-deck/pages/PitchDeckPage.tsx  → wrap + add Theme tab
src/features/pitch-deck/slides/UniexPitchSlides.tsx  → migrate to .deck-* classes
src/features/case-study-deck/slides/*  → same migration
src/features/logo-presentation/*       → same migration
src/shared/presentation/pages.tsx      → migrate generic pages
```

## Test plan

- `buildDeckTokens.test.ts`
  - empty theme + brand with full typescale → emits exactly the
    expected variable names and values from `brand.typescale.surfaces.presentation.semantic`.
  - `scaleMultiplier=1.2` → every `--deck-text-*` 1.2× the base.
  - `colors.bg = '#ff0000'` → `--deck-bg-page` is `#ff0000`.
  - density `compact` → `--deck-pad-x: 32px`.
- `DeckThemeProvider.test.tsx` — renders a child with className `deck-h1`,
  computed style font-size matches the typescale presentation h1 *
  scaleMultiplier.
- `pitch-deck-render.test.tsx` — render `PitchDeckPage` with a brand,
  flip `theme.density` from comfortable → compact, assert `--deck-pad-x`
  changes on the deck root.
- Snapshot test: `theme.style.logoPlacement` flips
  `data-logo-pos` attribute on the deck container.
- Manual QA matrix in `docs/brand-board/README.md` style:
  Uniex / Raqm / SKAM × pitch-deck × {default, scale 1.2, dark
  bg override, density compact}. Visual diff acceptable.

## Why this design

- **One token layer is the entire trick.** Once slides read from CSS
  vars, *every* surface (panel, master mode, presets, future
  AI-generated decks) is just a different writer of the same vars. The
  user gets "change once, applies everywhere" without slide-master
  edit-propagation magic.
- **Brand defaults stay live.** Editing brand typescale at
  `/typescale` still moves every deck that hasn't explicitly
  overridden the relevant token. Only deliberate overrides decouple.
- **No new shells.** Slot into the existing right-rail inspector via
  tabs — matches the `Slide` / `Theme` split mental model.
- **Reusable across deck kinds.** Same provider + panel for pitch
  deck, case-study deck, logo presentation — so the next deck type we
  build inherits the system for free.
