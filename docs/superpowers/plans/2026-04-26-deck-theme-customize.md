# Deck Theme + Customize Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-coded inline typography/color in deck slides with a token system driven by a per-deck `PresentationTheme`, and add a Customize "Theme" tab to the pitch-deck right inspector that edits those tokens with auto-save.

**Architecture:** Pure-function `buildDeckCssVars(brand, theme)` derives a flat CSS-var bag from `brand.typescale.surfaces.presentation` + `buildBrandPalette(brand)` + theme overrides. A React provider applies the bag as `style` on the deck container. Slides render via shared `.deck-*` CSS classes that read those vars. A Zustand store holds the per-deck theme draft and auto-saves into `brand.presentationThemes[deckKind]` via the existing `brandStore.update`.

**Tech Stack:** React 18 + TypeScript, Zustand 5 (per-deck theme draft), Vitest + jsdom (existing test setup at `src/test/setup.ts`), existing `useAutoSave` from `@/features/editor/core`, existing `FontPicker` from `@/features/tools/typescale/components/FontPicker`.

**Spec:** `docs/superpowers/specs/2026-04-26-deck-theme-customize-design.md`

**Out of scope (deferred to follow-up plan):** case-study deck migration, logo-presentation migration, theme presets. This plan ships pitch-deck end-to-end. Same primitives, dropped into the other decks once they're proven.

---

## File Structure

```
src/shared/presentation/theme/
  types.ts                     PresentationTheme, DeckKind, EMPTY_THEME
  buildDeckTokens.ts           buildDeckCssVars(brand, theme): React.CSSProperties
  deck.css                     .deck-display .deck-h1 .deck-body .deck-card etc.
  DeckThemeProvider.tsx        wraps deck, applies CSS vars + data attrs
  store.ts                     Zustand draft store (per brand+deckKind)
  useDeckTheme.ts              selector hook + auto-save wiring
  DeckThemePanel.tsx           the Theme tab UI (composed of section files)
  panels/TypographySection.tsx
  panels/ColorsSection.tsx
  panels/DensitySection.tsx
  panels/StyleSection.tsx
  __tests__/buildDeckTokens.test.ts
  __tests__/DeckThemeProvider.test.tsx
  __tests__/store.test.ts

src/shared/types/brand.ts                                  + presentationThemes?
src/features/pitch-deck/pages/PitchDeckPage.tsx            wrap + Theme tab
src/features/pitch-deck/slides/UniexPitchSlides.tsx        migrate to .deck-* classes
```

---

## Task 1: PresentationTheme types

**Files:**
- Create: `src/shared/presentation/theme/types.ts`

- [ ] **Step 1: Write the file**

```ts
// src/shared/presentation/theme/types.ts

export type DeckKind = 'pitch-deck' | 'case-study' | 'logo-presentation';

export type DeckDensity = 'compact' | 'comfortable' | 'spacious';

export type DeckBgKind = 'solid' | 'gradient' | 'pattern';

export type DeckRadiusKind = 'sharp' | 'soft' | 'pill';

export type DeckShadowKind = 'none' | 'soft' | 'lifted';

export type DeckLogoPlacement = 'tl' | 'tr' | 'bl' | 'br' | 'hidden';

export interface PresentationTheme {
  typography: {
    headingFont?: string;        // CSS font-family string. undefined → fall back to brand.typescale.fonts.heading
    bodyFont?: string;
    scaleMultiplier: number;     // 1.0 default; clamped [0.85 .. 1.25]
    leadingMultiplier: number;   // 1.0 default; clamped [0.90 .. 1.20]
    headingWeight?: number;      // 300 | 400 | 500 | 600 | 700 | 800
    bodyWeight?: number;
  };
  colors: {
    bg?: string;
    heading?: string;
    body?: string;
    accent?: string;
    cardBg?: string;
    gradientEnd?: string;        // only meaningful when style.bgKind === 'gradient'
  };
  density: DeckDensity;
  style: {
    bgKind: DeckBgKind;
    borderRadius: DeckRadiusKind;
    shadow: DeckShadowKind;
    logoPlacement: DeckLogoPlacement;
  };
}

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

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: passes (no other code references this yet).

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/theme/types.ts
git commit -m "feat(deck-theme): add PresentationTheme types + EMPTY_THEME"
```

---

## Task 2: Brand type extension

**Files:**
- Modify: `src/shared/types/brand.ts:67` (add field next to existing optional fields)

- [ ] **Step 1: Add the import + field**

In `src/shared/types/brand.ts`, after the existing `import type { Typescale } from './typescale';` line add:

```ts
import type { DeckKind, PresentationTheme } from '@/shared/presentation/theme/types';
```

Inside the `Brand` interface, add the new field. Place it right before `isPublic?: boolean;` (around line 62):

```ts
/** Per-deck Customize theme overrides. Each deck kind owns its own theme; brand typescale + brandPalette are the defaults when an override is undefined. */
presentationThemes?: Partial<Record<DeckKind, PresentationTheme>>;
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: passes. Brand consumers don't have to change — the field is optional.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/brand.ts
git commit -m "feat(brand): add Brand.presentationThemes (per-deck theme overrides)"
```

---

## Task 3: buildDeckCssVars — token builder

**Files:**
- Create: `src/shared/presentation/theme/buildDeckTokens.ts`
- Test: `src/shared/presentation/theme/__tests__/buildDeckTokens.test.ts`

This is the core of the system. It's pure: brand + theme → CSS-var bag. Tests drive every behavior.

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/presentation/theme/__tests__/buildDeckTokens.test.ts
import { describe, it, expect } from 'vitest';
import { buildDeckCssVars } from '../buildDeckTokens';
import { EMPTY_THEME } from '../types';
import type { Brand } from '@/shared/types/brand';

const baseBrand: Brand = {
  id: 'b1',
  slug: 'b1',
  name: 'Test',
  primaryColor: '#001563',
  fonts: { primary: 'Inter' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('buildDeckCssVars', () => {
  it('emits font, text, color, density vars on empty theme', () => {
    const vars = buildDeckCssVars(baseBrand, EMPTY_THEME);
    expect(vars['--deck-font-heading']).toBeTypeOf('string');
    expect(vars['--deck-font-body']).toBeTypeOf('string');
    expect(vars['--deck-text-h1']).toMatch(/px$/);
    expect(vars['--deck-text-body']).toMatch(/px$/);
    expect(vars['--deck-bg-page']).toMatch(/^#/);
    expect(vars['--deck-text-heading']).toMatch(/^#/);
    expect(vars['--deck-pad-x']).toBe('56px');         // comfortable default
    expect(vars['--deck-pad-y']).toBe('40px');
  });

  it('scaleMultiplier scales every text size', () => {
    const small = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, scaleMultiplier: 1 } });
    const big   = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, scaleMultiplier: 1.2 } });
    const px = (v: string | undefined) => Number(String(v).replace('px', ''));
    expect(px(big['--deck-text-h1']))      .toBeCloseTo(px(small['--deck-text-h1'])      * 1.2, 1);
    expect(px(big['--deck-text-body']))    .toBeCloseTo(px(small['--deck-text-body'])    * 1.2, 1);
    expect(px(big['--deck-text-caption'])) .toBeCloseTo(px(small['--deck-text-caption']) * 1.2, 1);
  });

  it('leadingMultiplier scales line-heights', () => {
    const tight = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, leadingMultiplier: 1 } });
    const loose = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, leadingMultiplier: 1.2 } });
    expect(Number(loose['--deck-leading-body'])).toBeCloseTo(Number(tight['--deck-leading-body']) * 1.2, 2);
  });

  it('color overrides win over brand palette', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      colors: { bg: '#ff0000', heading: '#00ff00' },
    });
    expect(vars['--deck-bg-page']).toBe('#ff0000');
    expect(vars['--deck-text-heading']).toBe('#00ff00');
  });

  it('density compact → 32/24, spacious → 88/64', () => {
    const compact = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, density: 'compact' });
    expect(compact['--deck-pad-x']).toBe('32px');
    expect(compact['--deck-pad-y']).toBe('24px');
    expect(compact['--deck-gap']).toBe('16px');

    const spacious = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, density: 'spacious' });
    expect(spacious['--deck-pad-x']).toBe('88px');
    expect(spacious['--deck-pad-y']).toBe('64px');
    expect(spacious['--deck-gap']).toBe('32px');
  });

  it('style maps borderRadius / shadow', () => {
    const sharp = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, style: { ...EMPTY_THEME.style, borderRadius: 'sharp', shadow: 'none' } });
    expect(sharp['--deck-radius']).toBe('0px');
    expect(sharp['--deck-shadow']).toBe('none');

    const pill = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, style: { ...EMPTY_THEME.style, borderRadius: 'pill', shadow: 'lifted' } });
    expect(pill['--deck-radius']).toBe('999px');
    expect(pill['--deck-shadow']).toContain('rgba');
  });

  it('typography font overrides win', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      typography: { ...EMPTY_THEME.typography, headingFont: 'Garamond, serif', bodyFont: 'Helvetica, sans-serif' },
    });
    expect(vars['--deck-font-heading']).toBe('Garamond, serif');
    expect(vars['--deck-font-body']).toBe('Helvetica, sans-serif');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/shared/presentation/theme/__tests__/buildDeckTokens.test.ts`
Expected: FAIL with "Cannot find module '../buildDeckTokens'".

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/presentation/theme/buildDeckTokens.ts

import type { CSSProperties } from 'react';
import type { Brand } from '@/shared/types/brand';
import { buildBrandPalette } from '@/shared/brand/brandPalette';
import type { SemanticRole, SemanticEntry, ScaleSurface } from '@/shared/types/typescale';
import type { PresentationTheme, DeckDensity, DeckRadiusKind, DeckShadowKind } from './types';

/* ── Density ─────────────────────────────────────────────────────── */
const DENSITY: Record<DeckDensity, { padX: number; padY: number; gap: number }> = {
  compact:     { padX: 32, padY: 24, gap: 16 },
  comfortable: { padX: 56, padY: 40, gap: 24 },
  spacious:    { padX: 88, padY: 64, gap: 32 },
};

/* ── Radius ─────────────────────────────────────────────────────── */
const RADIUS: Record<DeckRadiusKind, string> = {
  sharp: '0px',
  soft:  '12px',
  pill:  '999px',
};

/* ── Shadow ─────────────────────────────────────────────────────── */
const SHADOW: Record<DeckShadowKind, string> = {
  none:    'none',
  soft:    '0 4px 12px rgba(13,13,13,0.06), 0 1px 2px rgba(13,13,13,0.04)',
  lifted:  '0 24px 48px -12px rgba(13,13,13,0.14), 0 8px 20px -8px rgba(13,13,13,0.10)',
};

/* ── Defaults when brand.typescale is missing ───────────────────── */
const DEFAULT_SIZE_BY_ROLE: Record<SemanticRole, number> = {
  display: 96,
  h1: 64,
  h2: 48,
  h3: 32,
  h4: 24,
  h5: 20,
  h6: 18,
  bodyLg: 22,
  body: 18,
  bodySm: 16,
  caption: 14,
  overline: 12,
  label: 13,
  button: 14,
  code: 14,
};

const DEFAULT_LEADING = 1.4;
const DEFAULT_LEADING_HEADING = 1.15;

/* ── Lookup helpers ─────────────────────────────────────────────── */
function findStep(surface: ScaleSurface | undefined, role: SemanticRole): { sizePx: number; lineHeight: number; weight: number } | undefined {
  if (!surface) return undefined;
  const entry: SemanticEntry | undefined = surface.semantic[role];
  if (!entry) return undefined;
  const step = surface.steps.find((s) => s.id === entry.stepId);
  if (!step) return undefined;
  return {
    sizePx: step.sizePx,
    lineHeight: step.lineHeight,
    weight: entry.weight ?? step.weight,
  };
}

function fontFamily(ref: { family: string; fallback: string } | undefined, fallback: string): string {
  if (!ref) return fallback;
  return `'${ref.family}', ${ref.fallback}`;
}

/* ── Public API ─────────────────────────────────────────────────── */

export function buildDeckCssVars(brand: Brand, theme: PresentationTheme): CSSProperties {
  const palette = buildBrandPalette(brand, 'light');
  const presentationSurface = brand.typescale?.surfaces.presentation;

  /* fonts */
  const headingFont = theme.typography.headingFont ?? fontFamily(brand.typescale?.fonts.heading, "system-ui, sans-serif");
  const bodyFont    = theme.typography.bodyFont    ?? fontFamily(brand.typescale?.fonts.body,    "system-ui, sans-serif");

  /* size + leading per role */
  const scale = theme.typography.scaleMultiplier;
  const lead  = theme.typography.leadingMultiplier;

  const role = (r: SemanticRole, fallbackSize = DEFAULT_SIZE_BY_ROLE[r], fallbackLead = r === 'body' || r === 'caption' || r === 'bodyLg' || r === 'bodySm' ? DEFAULT_LEADING : DEFAULT_LEADING_HEADING) => {
    const entry = findStep(presentationSurface, r);
    return {
      sizePx: (entry?.sizePx ?? fallbackSize) * scale,
      leading: (entry?.lineHeight ?? fallbackLead) * lead,
      weight: entry?.weight ?? 400,
    };
  };

  const display = role('display');
  const h1      = role('h1');
  const h2      = role('h2');
  const h3      = role('h3');
  const body    = role('body');
  const caption = role('caption');
  const label   = role('label');

  /* weights */
  const headingWeight = theme.typography.headingWeight ?? h1.weight ?? 700;
  const bodyWeight    = theme.typography.bodyWeight    ?? body.weight ?? 400;

  /* colors */
  const bgPage    = theme.colors.bg       ?? palette.bg.page;
  const bgCard    = theme.colors.cardBg   ?? palette.bg.surface;
  const bgInverted= palette.bg.inverted;
  const textHead  = theme.colors.heading  ?? palette.text.heading;
  const textBody  = theme.colors.body     ?? palette.text.body;
  const textMuted = palette.text.muted;
  const accent    = theme.colors.accent   ?? palette.brand.accent;
  const borderSub = palette.border.subtle;

  /* density */
  const dens = DENSITY[theme.density];

  return {
    '--deck-font-heading': headingFont,
    '--deck-font-body': bodyFont,
    '--deck-weight-heading': String(headingWeight),
    '--deck-weight-body': String(bodyWeight),

    '--deck-text-display':  `${display.sizePx}px`,
    '--deck-leading-display': String(display.leading),
    '--deck-text-h1':       `${h1.sizePx}px`,
    '--deck-leading-h1':    String(h1.leading),
    '--deck-text-h2':       `${h2.sizePx}px`,
    '--deck-leading-h2':    String(h2.leading),
    '--deck-text-h3':       `${h3.sizePx}px`,
    '--deck-leading-h3':    String(h3.leading),
    '--deck-text-body':     `${body.sizePx}px`,
    '--deck-leading-body':  String(body.leading),
    '--deck-text-caption':  `${caption.sizePx}px`,
    '--deck-leading-caption': String(caption.leading),
    '--deck-text-label':    `${label.sizePx}px`,

    '--deck-bg-page': bgPage,
    '--deck-bg-card': bgCard,
    '--deck-bg-inverted': bgInverted,
    '--deck-text-heading': textHead,
    '--deck-text-body': textBody,
    '--deck-text-muted': textMuted,
    '--deck-accent': accent,
    '--deck-border-subtle': borderSub,

    '--deck-pad-x': `${dens.padX}px`,
    '--deck-pad-y': `${dens.padY}px`,
    '--deck-gap':   `${dens.gap}px`,

    '--deck-radius': RADIUS[theme.style.borderRadius],
    '--deck-shadow': SHADOW[theme.style.shadow],
  } as CSSProperties;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/shared/presentation/theme/__tests__/buildDeckTokens.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/presentation/theme/buildDeckTokens.ts src/shared/presentation/theme/__tests__/buildDeckTokens.test.ts
git commit -m "feat(deck-theme): buildDeckCssVars derives flat token bag from brand + theme"
```

---

## Task 4: deck.css — shared role classes

**Files:**
- Create: `src/shared/presentation/theme/deck.css`

- [ ] **Step 1: Write the file**

```css
/* src/shared/presentation/theme/deck.css
 *
 * Shared role-based classes that read --deck-* CSS vars set by
 * <DeckThemeProvider>. Slides should style themselves with these
 * classes instead of inline font/color values.
 */

.deck-page-bg { background: var(--deck-bg-page); }
.deck-card-bg { background: var(--deck-bg-card); }

.deck-display {
  font-family: var(--deck-font-heading);
  font-weight: var(--deck-weight-heading);
  font-size: var(--deck-text-display);
  line-height: var(--deck-leading-display);
  color: var(--deck-text-heading);
  letter-spacing: -0.02em;
}

.deck-h1 {
  font-family: var(--deck-font-heading);
  font-weight: var(--deck-weight-heading);
  font-size: var(--deck-text-h1);
  line-height: var(--deck-leading-h1);
  color: var(--deck-text-heading);
  letter-spacing: -0.015em;
}

.deck-h2 {
  font-family: var(--deck-font-heading);
  font-weight: var(--deck-weight-heading);
  font-size: var(--deck-text-h2);
  line-height: var(--deck-leading-h2);
  color: var(--deck-text-heading);
}

.deck-h3 {
  font-family: var(--deck-font-heading);
  font-weight: var(--deck-weight-heading);
  font-size: var(--deck-text-h3);
  line-height: var(--deck-leading-h3);
  color: var(--deck-text-heading);
}

.deck-body {
  font-family: var(--deck-font-body);
  font-weight: var(--deck-weight-body);
  font-size: var(--deck-text-body);
  line-height: var(--deck-leading-body);
  color: var(--deck-text-body);
}

.deck-caption {
  font-family: var(--deck-font-body);
  font-weight: var(--deck-weight-body);
  font-size: var(--deck-text-caption);
  line-height: var(--deck-leading-caption);
  color: var(--deck-text-muted);
}

.deck-label {
  font-family: var(--deck-font-body);
  font-weight: 600;
  font-size: var(--deck-text-label);
  line-height: 1.2;
  color: var(--deck-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.deck-card {
  background: var(--deck-bg-card);
  border: 1px solid var(--deck-border-subtle);
  border-radius: var(--deck-radius);
  box-shadow: var(--deck-shadow);
}

.deck-pad   { padding: var(--deck-pad-y) var(--deck-pad-x); }
.deck-gap   { gap: var(--deck-gap); }
.deck-accent{ color: var(--deck-accent); }
.deck-border{ border-color: var(--deck-border-subtle); }
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/presentation/theme/deck.css
git commit -m "feat(deck-theme): add deck.css shared role classes"
```

---

## Task 5: DeckThemeProvider

**Files:**
- Create: `src/shared/presentation/theme/DeckThemeProvider.tsx`
- Test: `src/shared/presentation/theme/__tests__/DeckThemeProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/presentation/theme/__tests__/DeckThemeProvider.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DeckThemeProvider } from '../DeckThemeProvider';
import { EMPTY_THEME } from '../types';
import type { Brand } from '@/shared/types/brand';

const baseBrand: Brand = {
  id: 'b1', slug: 'b1', name: 'Test',
  primaryColor: '#001563',
  fonts: { primary: 'Inter' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
};

describe('DeckThemeProvider', () => {
  it('writes --deck-* vars on the wrapping element', () => {
    const { container } = render(
      <DeckThemeProvider brand={baseBrand} theme={EMPTY_THEME} deckKind="pitch-deck">
        <div data-testid="child">hi</div>
      </DeckThemeProvider>,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.getAttribute('data-deck')).toBe('pitch-deck');
    // Inline-style CSS vars are surfaced via .style — read directly.
    expect(wrap.style.getPropertyValue('--deck-text-h1')).toMatch(/px$/);
    expect(wrap.style.getPropertyValue('--deck-bg-page')).toMatch(/^#/);
  });

  it('emits data-logo-pos from theme.style.logoPlacement', () => {
    const { container } = render(
      <DeckThemeProvider brand={baseBrand} theme={{ ...EMPTY_THEME, style: { ...EMPTY_THEME.style, logoPlacement: 'tr' } }} deckKind="pitch-deck">
        <span />
      </DeckThemeProvider>,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.getAttribute('data-logo-pos')).toBe('tr');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/shared/presentation/theme/__tests__/DeckThemeProvider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// src/shared/presentation/theme/DeckThemeProvider.tsx

import type { ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { buildDeckCssVars } from './buildDeckTokens';
import type { DeckKind, PresentationTheme } from './types';
import './deck.css';

interface Props {
  brand: Brand;
  theme: PresentationTheme;
  deckKind: DeckKind;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a deck in a div that emits --deck-* CSS variables from
 * (brand + theme). Children consume the variables via .deck-* classes
 * defined in deck.css.
 */
export function DeckThemeProvider({ brand, theme, deckKind, children, className }: Props) {
  const style = buildDeckCssVars(brand, theme);
  return (
    <div
      data-deck={deckKind}
      data-logo-pos={theme.style.logoPlacement}
      data-bg-kind={theme.style.bgKind}
      className={className}
      style={{ ...style, contain: 'style' }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/shared/presentation/theme/__tests__/DeckThemeProvider.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/presentation/theme/DeckThemeProvider.tsx src/shared/presentation/theme/__tests__/DeckThemeProvider.test.tsx
git commit -m "feat(deck-theme): DeckThemeProvider applies tokens on wrapping div"
```

---

## Task 6: Theme draft store

**Files:**
- Create: `src/shared/presentation/theme/store.ts`
- Test: `src/shared/presentation/theme/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/presentation/theme/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDeckThemeStore } from '../store';
import { EMPTY_THEME } from '../types';

describe('useDeckThemeStore', () => {
  beforeEach(() => {
    useDeckThemeStore.setState({ byKey: {} });
  });

  it('returns EMPTY_THEME when nothing is set', () => {
    const t = useDeckThemeStore.getState().draftFor('b1', 'pitch-deck');
    expect(t).toEqual(EMPTY_THEME);
  });

  it('hydrates from a brand snapshot', () => {
    useDeckThemeStore.getState().hydrate('b1', 'pitch-deck', { ...EMPTY_THEME, density: 'spacious' });
    expect(useDeckThemeStore.getState().draftFor('b1', 'pitch-deck').density).toBe('spacious');
  });

  it('patchTheme deep-merges typography', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', { typography: { scaleMultiplier: 1.15 } });
    const t = useDeckThemeStore.getState().draftFor('b1', 'pitch-deck');
    expect(t.typography.scaleMultiplier).toBe(1.15);
    expect(t.typography.leadingMultiplier).toBe(1);   // preserved from EMPTY_THEME
  });

  it('reset clears the draft', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', { density: 'compact' });
    useDeckThemeStore.getState().reset('b1', 'pitch-deck');
    expect(useDeckThemeStore.getState().draftFor('b1', 'pitch-deck')).toEqual(EMPTY_THEME);
  });

  it('isolates per (brand, deckKind)', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', { density: 'compact' });
    expect(useDeckThemeStore.getState().draftFor('b1', 'case-study').density).toBe('comfortable');
    expect(useDeckThemeStore.getState().draftFor('b2', 'pitch-deck').density).toBe('comfortable');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/shared/presentation/theme/__tests__/store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/presentation/theme/store.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DeckKind, PresentationTheme } from './types';
import { EMPTY_THEME } from './types';

type Key = `${string}:${DeckKind}`;
const k = (brandId: string, kind: DeckKind): Key => `${brandId}:${kind}` as Key;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface DeckThemeStore {
  byKey: Partial<Record<Key, PresentationTheme>>;
  draftFor: (brandId: string, kind: DeckKind) => PresentationTheme;
  hydrate: (brandId: string, kind: DeckKind, theme: PresentationTheme | undefined) => void;
  setTheme: (brandId: string, kind: DeckKind, next: PresentationTheme) => void;
  patchTheme: (brandId: string, kind: DeckKind, patch: DeepPartial<PresentationTheme>) => void;
  reset: (brandId: string, kind: DeckKind) => void;
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const key of Object.keys(patch as object)) {
    const v = (patch as any)[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[key] = deepMerge((base as any)[key] ?? {}, v);
    } else if (v !== undefined) {
      out[key] = v;
    }
  }
  return out as T;
}

export const useDeckThemeStore = create<DeckThemeStore>()(
  devtools((set, get) => ({
    byKey: {},
    draftFor: (brandId, kind) => get().byKey[k(brandId, kind)] ?? EMPTY_THEME,
    hydrate: (brandId, kind, theme) => set((s) => ({ byKey: { ...s.byKey, [k(brandId, kind)]: theme ?? EMPTY_THEME } })),
    setTheme: (brandId, kind, next) => set((s) => ({ byKey: { ...s.byKey, [k(brandId, kind)]: next } })),
    patchTheme: (brandId, kind, patch) => set((s) => {
      const base = s.byKey[k(brandId, kind)] ?? EMPTY_THEME;
      return { byKey: { ...s.byKey, [k(brandId, kind)]: deepMerge(base, patch) } };
    }),
    reset: (brandId, kind) => set((s) => {
      const next = { ...s.byKey };
      delete next[k(brandId, kind)];
      return { byKey: next };
    }),
  }), { name: 'deck-theme-store' }),
);
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/shared/presentation/theme/__tests__/store.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/presentation/theme/store.ts src/shared/presentation/theme/__tests__/store.test.ts
git commit -m "feat(deck-theme): per (brand, deckKind) draft store with deep-merge patch"
```

---

## Task 7: useDeckTheme hook (read + auto-save)

**Files:**
- Create: `src/shared/presentation/theme/useDeckTheme.ts`

This hook is the integration glue: reads the current draft from the store, hydrates from the brand on mount, and auto-saves changes back into `brand.presentationThemes[deckKind]` via `brandStore.update`.

- [ ] **Step 1: Write the implementation**

```ts
// src/shared/presentation/theme/useDeckTheme.ts

import { useEffect } from 'react';
import { useBrandStore } from '@/shared/store/brandStore';
import { useAutoSave } from '@/features/editor/core';
import type { Brand } from '@/shared/types/brand';
import type { DeckKind, PresentationTheme } from './types';
import { useDeckThemeStore } from './store';
import { EMPTY_THEME } from './types';

interface Result {
  theme: PresentationTheme;
  saveState: ReturnType<typeof useAutoSave>['saveState'];
  patch: (patch: Partial<PresentationTheme>) => void;
  reset: () => void;
}

/**
 * Subscribe to a deck's theme draft + wire auto-save.
 *   const { theme, saveState, patch, reset } = useDeckTheme(brand, 'pitch-deck');
 *   <DeckThemeProvider brand={brand} theme={theme} ...>
 */
export function useDeckTheme(brand: Brand, deckKind: DeckKind): Result {
  const theme = useDeckThemeStore((s) => s.byKey[`${brand.id}:${deckKind}`] ?? EMPTY_THEME);
  const hydrate = useDeckThemeStore((s) => s.hydrate);
  const setTheme = useDeckThemeStore((s) => s.setTheme);
  const patchTheme = useDeckThemeStore((s) => s.patchTheme);
  const resetStore = useDeckThemeStore((s) => s.reset);
  const updateBrand = useBrandStore((s) => s.update);

  // Hydrate from brand on mount + when brand swaps.
  useEffect(() => {
    hydrate(brand.id, deckKind, brand.presentationThemes?.[deckKind]);
  }, [brand.id, deckKind, brand.presentationThemes, hydrate]);

  const { saveState, markDirty } = useAutoSave<PresentationTheme>({
    value: theme,
    debounceMs: 600,
    save: async (next) => {
      const existing = useBrandStore.getState().current?.presentationThemes ?? {};
      await updateBrand(brand.id, { presentationThemes: { ...existing, [deckKind]: next } });
    },
  });

  return {
    theme,
    saveState,
    patch: (p) => { patchTheme(brand.id, deckKind, p); markDirty(); },
    reset: () => {
      resetStore(brand.id, deckKind);
      // Setting an explicit empty draft makes the auto-save fire.
      setTheme(brand.id, deckKind, EMPTY_THEME);
      markDirty();
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/theme/useDeckTheme.ts
git commit -m "feat(deck-theme): useDeckTheme hook hydrates draft + auto-saves to brand"
```

---

## Task 8: Slide refactor — UniexPitchSlides.tsx

The longest task. Migrates every hard-coded `fontSize: N`, `fontFamily: ...`, `color: NAVY/WHITE` in the slide composition to `.deck-*` classes. Visual parity is the success bar.

**Files:**
- Modify: `src/features/pitch-deck/slides/UniexPitchSlides.tsx`

- [ ] **Step 1: Read the file end to end**

```bash
wc -l src/features/pitch-deck/slides/UniexPitchSlides.tsx
```

Expect ~1200 lines. Read it all once before editing.

- [ ] **Step 2: Replace constants block (top of file, ~lines 30-50)**

Find:
```ts
const FONT_DISPLAY = "'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif";
const FONT_BODY    = "'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif";
const NAVY  = '#001563';
const WHITE = '#FFFFFF';
const MINT  = '#68BE69';   // (or whatever color names exist)
```

Replace with a single comment:
```ts
// Typography + color come from the deck theme tokens written by
// <DeckThemeProvider> on the wrapping <div data-deck="pitch-deck">.
// Use the .deck-display / .deck-h1 / .deck-h2 / .deck-h3 / .deck-body
// / .deck-caption / .deck-label classes from deck.css instead of
// inline styles. For the deck accent (CTAs, dividers) read
// var(--deck-accent). Surfaces (cards, hero bands) read .deck-card-bg
// / .deck-page-bg.
```

Keep any non-typography constants (like geometric values, image URLs).

- [ ] **Step 3: Migrate `PageChrome`**

Find the `function PageChrome(...)` block. Replace its inline-styled brand label, page number, and any divider lines with `.deck-caption` and `.deck-label` classes.

Before:
```tsx
<div style={{ fontFamily: FONT_BODY, fontSize: 13, color: NAVY }}>{brandLabel}</div>
<div style={{ fontSize: 14, color: variant === 'light' ? NAVY : WHITE }}>0{idx} / 0{total}</div>
```

After:
```tsx
<div className="deck-caption">{brandLabel}</div>
<div className="deck-label">{String(idx).padStart(2,'0')} / {String(total).padStart(2,'0')}</div>
```

For logo placement, replace any `style={{ position: ... }}` derived from a `variant` prop with a CSS rule keyed off `[data-logo-pos="..."]` on the deck wrapper. Add to `deck.css` (Task 4 file) the position rules, OR inline a `data-logo-pos`-aware style in `PageChrome` itself. Pick whichever is shorter — both work. Recommended:

```tsx
// PageChrome computes logo position by reading the deck data attribute.
function getLogoCorner(): { top: number | 'auto', bottom: number | 'auto', left: number | 'auto', right: number | 'auto' } {
  const wrap = document.querySelector('[data-deck="pitch-deck"]');
  const pos = wrap?.getAttribute('data-logo-pos') ?? 'tl';
  switch (pos) {
    case 'tr': return { top: 32, bottom: 'auto', right: 32, left: 'auto' };
    case 'bl': return { top: 'auto', bottom: 32, left: 32, right: 'auto' };
    case 'br': return { top: 'auto', bottom: 32, right: 32, left: 'auto' };
    case 'hidden': return { top: -9999, bottom: 'auto', left: -9999, right: 'auto' };
    default:   return { top: 32, bottom: 'auto', left: 32, right: 'auto' };
  }
}
```

Then use this from `PageChrome` to position the brand mark.

- [ ] **Step 4: Migrate slide compositions in order**

For each variant (cover, problem, solution, …):
- Replace heading inline styles with one of `.deck-display`, `.deck-h1`, `.deck-h2`, `.deck-h3`.
- Replace body copy with `.deck-body`.
- Replace small captions / metadata with `.deck-caption`.
- Replace `eyebrow` / `kicker` rows (uppercase ALL CAPS thin text) with `.deck-label`.
- Replace cards/panels with `<div className="deck-card deck-pad">`.
- Replace navy / white literal colors that previously decided contrast with `pickFgOnBackground(currentBg, [palette.text.heading, palette.text.onInverted])` from `@/shared/brand/logoOnBackground` when the slide has a colored hero.

Walk slide-by-slide, not all at once. Commit at the halfway mark to keep the diff bisectable.

- [ ] **Step 5: Type-check + lint**

Run: `npm run typecheck && npm run lint`
Expected: passes.

- [ ] **Step 6: Commit (mid-migration)**

```bash
git add src/features/pitch-deck/slides/UniexPitchSlides.tsx
git commit -m "refactor(pitch-deck): migrate slide variants to .deck-* token classes (1/2)"
```

- [ ] **Step 7: Finish remaining variants and commit**

```bash
git add src/features/pitch-deck/slides/UniexPitchSlides.tsx
git commit -m "refactor(pitch-deck): finish migrating slides to .deck-* token classes (2/2)"
```

---

## Task 9: Wrap PitchDeckPage in DeckThemeProvider

**Files:**
- Modify: `src/features/pitch-deck/pages/PitchDeckPage.tsx`

- [ ] **Step 1: Add imports near the top**

```tsx
import { DeckThemeProvider } from '@/shared/presentation/theme/DeckThemeProvider';
import { useDeckTheme } from '@/shared/presentation/theme/useDeckTheme';
```

- [ ] **Step 2: Resolve the theme inside the component (after `const { brand, isLoading } = useBrandBySlug(slug);`)**

```tsx
const { theme, saveState, patch: patchTheme, reset: resetTheme } = useDeckTheme(brand!, 'pitch-deck');
```

(Guard: this call sits below the `if (isLoading || !brand) return ...` early-return, OR pass `brand!` and tolerate a transient render. Easier path: move the early-return before the hook call by destructuring with `brand?` and returning an `EMPTY_THEME` shortcut. Cleanest:)

```tsx
if (isLoading || !brand) {
  return (...existing loading branch...);
}
// after this point `brand` is non-null
const themeBundle = useDeckTheme(brand, 'pitch-deck');
```

This breaks rules-of-hooks. Replace with: extract the body below the early return into a sub-component `<PitchDeckShell brand={brand} ... />` that calls `useDeckTheme(brand, 'pitch-deck')`. Adopt that structure.

- [ ] **Step 3: Wrap the slide stage**

The current `<main ref={stageRef} ...>{UNIEX_SLIDES.map(...)}</main>` becomes:

```tsx
<DeckThemeProvider brand={brand} theme={theme} deckKind="pitch-deck" className="deck-page-bg" >
  <main ref={stageRef} ...>
    {UNIEX_SLIDES.map(...)}
  </main>
</DeckThemeProvider>
```

The thumbnail rail is wrapped in its own `DeckThemeProvider` so thumbnails read the same tokens:

```tsx
<DeckThemeProvider brand={brand} theme={theme} deckKind="pitch-deck">
  <aside style={{ width: 156, ... }}> ...thumbs... </aside>
</DeckThemeProvider>
```

(Two providers is fine — they each own their subtree's CSS vars.)

- [ ] **Step 4: Visual smoke test**

Run: `npm run dev`
Open: `http://localhost:8080/b/uniex/pitch-deck`
Expected: deck looks the same as before this task (since theme is EMPTY_THEME, all defaults come from brand typescale + brandPalette). Caption sizes may now read from `brand.typescale.surfaces.presentation` rather than the old hard-coded 13/14 — that's the goal.

- [ ] **Step 5: Type-check**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/features/pitch-deck/pages/PitchDeckPage.tsx
git commit -m "feat(pitch-deck): wrap stage + thumbnails in DeckThemeProvider"
```

---

## Task 10: DeckThemePanel — Typography section

**Files:**
- Create: `src/shared/presentation/theme/panels/TypographySection.tsx`

- [ ] **Step 1: Write the section**

```tsx
// src/shared/presentation/theme/panels/TypographySection.tsx

import type { PresentationTheme } from '../types';
import { Slider } from '@/components/ui/slider';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const HEADING_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;
const BODY_WEIGHTS = [400, 500, 600] as const;

export function TypographySection({ theme, onPatch }: Props) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Heading font + body font — uses native <input> for v1; can swap to FontPicker later */}
      <Field label="Heading font">
        <input
          type="text"
          value={theme.typography.headingFont ?? ''}
          placeholder="Inherit from brand"
          onChange={(e) => onPatch({ typography: { ...theme.typography, headingFont: e.target.value || undefined } })}
          style={inputStyle}
        />
      </Field>
      <Field label="Body font">
        <input
          type="text"
          value={theme.typography.bodyFont ?? ''}
          placeholder="Inherit from brand"
          onChange={(e) => onPatch({ typography: { ...theme.typography, bodyFont: e.target.value || undefined } })}
          style={inputStyle}
        />
      </Field>

      <Field label={`Scale  ${theme.typography.scaleMultiplier.toFixed(2)}×`}>
        <Slider
          min={0.85} max={1.25} step={0.05}
          value={[theme.typography.scaleMultiplier]}
          onValueChange={([v]) => onPatch({ typography: { ...theme.typography, scaleMultiplier: Number(v) } })}
        />
      </Field>

      <Field label={`Line-height  ${theme.typography.leadingMultiplier.toFixed(2)}×`}>
        <Slider
          min={0.9} max={1.2} step={0.05}
          value={[theme.typography.leadingMultiplier]}
          onValueChange={([v]) => onPatch({ typography: { ...theme.typography, leadingMultiplier: Number(v) } })}
        />
      </Field>

      <Field label="Heading weight">
        <Segmented
          value={theme.typography.headingWeight}
          options={HEADING_WEIGHTS.map((w) => ({ value: w, label: String(w) }))}
          onChange={(w) => onPatch({ typography: { ...theme.typography, headingWeight: w } })}
        />
      </Field>
      <Field label="Body weight">
        <Segmented
          value={theme.typography.bodyWeight}
          options={BODY_WEIGHTS.map((w) => ({ value: w, label: String(w) }))}
          onChange={(w) => onPatch({ typography: { ...theme.typography, bodyWeight: w } })}
        />
      </Field>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px',
  border: '1px solid var(--border)', borderRadius: 6,
  background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 12,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 12,
              border: 'none',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--accent-contrast)' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/theme/panels/TypographySection.tsx
git commit -m "feat(deck-theme): TypographySection panel"
```

---

## Task 11: DeckThemePanel — Colors section

**Files:**
- Create: `src/shared/presentation/theme/panels/ColorsSection.tsx`

- [ ] **Step 1: Write the section**

```tsx
// src/shared/presentation/theme/panels/ColorsSection.tsx

import type { Brand } from '@/shared/types/brand';
import type { PresentationTheme } from '../types';
import { buildBrandPalette } from '@/shared/brand/brandPalette';

interface Props {
  brand: Brand;
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

type ColorKey = 'bg' | 'heading' | 'body' | 'accent' | 'cardBg';

const FIELDS: Array<{ key: ColorKey; label: string; defaultFrom: (b: Brand) => string }> = [
  { key: 'bg',      label: 'Page background', defaultFrom: (b) => buildBrandPalette(b).bg.page },
  { key: 'heading', label: 'Heading text',    defaultFrom: (b) => buildBrandPalette(b).text.heading },
  { key: 'body',    label: 'Body text',       defaultFrom: (b) => buildBrandPalette(b).text.body },
  { key: 'accent',  label: 'Accent',          defaultFrom: (b) => buildBrandPalette(b).brand.accent },
  { key: 'cardBg',  label: 'Card background', defaultFrom: (b) => buildBrandPalette(b).bg.surface },
];

export function ColorsSection({ brand, theme, onPatch }: Props) {
  const setColor = (key: ColorKey, value: string | undefined) => onPatch({ colors: { ...theme.colors, [key]: value } });
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FIELDS.map(({ key, label, defaultFrom }) => {
        const override = theme.colors[key];
        const current = override ?? defaultFrom(brand);
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              aria-label={label}
              type="color"
              value={current}
              onChange={(e) => setColor(key, e.target.value)}
              style={{ width: 32, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{override ? current : `${current} (from brand)`}</span>
            </div>
            {override && (
              <button
                type="button"
                onClick={() => setColor(key, undefined)}
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                title="Use brand default"
              >
                Use brand
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/theme/panels/ColorsSection.tsx
git commit -m "feat(deck-theme): ColorsSection panel"
```

---

## Task 12: Density + Style sections

**Files:**
- Create: `src/shared/presentation/theme/panels/DensitySection.tsx`
- Create: `src/shared/presentation/theme/panels/StyleSection.tsx`

- [ ] **Step 1: Write DensitySection**

```tsx
// src/shared/presentation/theme/panels/DensitySection.tsx

import type { PresentationTheme, DeckDensity } from '../types';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const DENSITIES: { value: DeckDensity; label: string }[] = [
  { value: 'compact',     label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious',    label: 'Spacious' },
];

export function DensitySection({ theme, onPatch }: Props) {
  return (
    <section>
      <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', width: '100%' }}>
        {DENSITIES.map(({ value, label }) => {
          const active = theme.density === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPatch({ density: value })}
              style={{
                flex: 1, padding: '8px 0', fontSize: 12, border: 'none',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-contrast)' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write StyleSection**

```tsx
// src/shared/presentation/theme/panels/StyleSection.tsx

import type { PresentationTheme, DeckBgKind, DeckRadiusKind, DeckShadowKind, DeckLogoPlacement } from '../types';

interface Props {
  theme: PresentationTheme;
  onPatch: (patch: Partial<PresentationTheme>) => void;
}

const BG_KINDS:    { value: DeckBgKind;    label: string }[] = [{ value: 'solid', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }, { value: 'pattern', label: 'Pattern' }];
const RADII:       { value: DeckRadiusKind;label: string }[] = [{ value: 'sharp', label: 'Sharp' }, { value: 'soft',     label: 'Soft' }, { value: 'pill',    label: 'Pill' }];
const SHADOWS:     { value: DeckShadowKind;label: string }[] = [{ value: 'none',  label: 'None'  }, { value: 'soft',     label: 'Soft' }, { value: 'lifted',  label: 'Lifted' }];
const LOGO_POS:    { value: DeckLogoPlacement;label: string }[] = [
  { value: 'tl', label: 'TL' }, { value: 'tr', label: 'TR' },
  { value: 'bl', label: 'BL' }, { value: 'br', label: 'BR' },
  { value: 'hidden', label: 'Off' },
];

export function StyleSection({ theme, onPatch }: Props) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Group label="Background"      options={BG_KINDS} value={theme.style.bgKind}        onChange={(v) => onPatch({ style: { ...theme.style, bgKind: v } })} />
      <Group label="Border radius"   options={RADII}    value={theme.style.borderRadius}  onChange={(v) => onPatch({ style: { ...theme.style, borderRadius: v } })} />
      <Group label="Shadow"          options={SHADOWS}  value={theme.style.shadow}        onChange={(v) => onPatch({ style: { ...theme.style, shadow: v } })} />
      <Group label="Logo placement"  options={LOGO_POS} value={theme.style.logoPlacement} onChange={(v) => onPatch({ style: { ...theme.style, logoPlacement: v } })} />
    </section>
  );
}

function Group<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1, padding: '6px 10px', fontSize: 11, border: 'none',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-contrast)' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/shared/presentation/theme/panels/DensitySection.tsx src/shared/presentation/theme/panels/StyleSection.tsx
git commit -m "feat(deck-theme): Density + Style panels"
```

---

## Task 13: DeckThemePanel — composition + header

**Files:**
- Create: `src/shared/presentation/theme/DeckThemePanel.tsx`

- [ ] **Step 1: Write the panel**

```tsx
// src/shared/presentation/theme/DeckThemePanel.tsx

import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { DeckKind } from './types';
import { useDeckTheme } from './useDeckTheme';
import { TypographySection } from './panels/TypographySection';
import { ColorsSection } from './panels/ColorsSection';
import { DensitySection } from './panels/DensitySection';
import { StyleSection } from './panels/StyleSection';
import type { EditorSaveState } from '@/features/editor/core';

interface Props {
  brand: Brand;
  deckKind: DeckKind;
}

const SAVE_LABEL: Record<EditorSaveState, string> = {
  idle: 'Saved',
  saving: 'Saving…',
  saved: 'Saved',
  dirty: 'Unsaved',
  error: 'Save failed',
};

export function DeckThemePanel({ brand, deckKind }: Props) {
  const { theme, saveState, patch, reset } = useDeckTheme(brand, deckKind);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sticky header — reset + save state */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', fontSize: 11,
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
          title="Reset to brand defaults"
        >
          <RotateCcw className="w-3 h-3" /> Reset to brand
        </button>
        <span style={{ fontSize: 10, color: saveState === 'error' ? 'var(--critical)' : 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {SAVE_LABEL[saveState]}
        </span>
      </header>

      <Accordion title="Typography" defaultOpen>
        <TypographySection theme={theme} onPatch={patch} />
      </Accordion>
      <Accordion title="Colors">
        <ColorsSection brand={brand} theme={theme} onPatch={patch} />
      </Accordion>
      <Accordion title="Density">
        <DensitySection theme={theme} onPatch={patch} />
      </Accordion>
      <Accordion title="Style">
        <StyleSection theme={theme} onPatch={patch} />
      </Accordion>
    </div>
  );
}

function Accordion({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <section style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 0, marginBottom: open ? 12 : 0,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--text-secondary)',
        }}
      >
        {title}
        <ChevronDown className="w-3 h-3" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/theme/DeckThemePanel.tsx
git commit -m "feat(deck-theme): DeckThemePanel composes the four sections + reset header"
```

---

## Task 14: Add Theme tab to PitchDeckPage inspector

**Files:**
- Modify: `src/features/pitch-deck/pages/PitchDeckPage.tsx` (the inspector aside, ~line 370-414)

- [ ] **Step 1: Import Tabs + DeckThemePanel**

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DeckThemePanel } from '@/shared/presentation/theme/DeckThemePanel';
```

- [ ] **Step 2: Add `inspectorTab` state**

```tsx
const [inspectorTab, setInspectorTab] = useState<'slide' | 'theme'>('slide');
```

- [ ] **Step 3: Replace the inspector body**

Find the inspector aside (`{showInspector && (<aside ...>...</aside>)}`). Inside the `<aside>` after the `Slide {NN}` header + close button row, replace the body content with:

```tsx
<Tabs value={inspectorTab} onValueChange={(v) => setInspectorTab(v as 'slide' | 'theme')}>
  <TabsList style={{ width: '100%', display: 'inline-grid', gridTemplateColumns: '1fr 1fr' }}>
    <TabsTrigger value="slide">Slide</TabsTrigger>
    <TabsTrigger value="theme">Theme</TabsTrigger>
  </TabsList>
  <TabsContent value="slide" style={{ marginTop: 16 }}>
    <SelectionInspector selection={selection} onClearSelection={clearSelection} />
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      <PitchDeckInspector
        activeKind={UNIEX_SLIDES[activeIndex].kind}
        activeVariant={slideVariants[activeIndex] ?? 'A'}
        onVariant={(k) => setSlideVariant(activeIndex, k)}
        isHidden={hiddenSlides.includes(activeIndex)}
        onToggleHidden={() => toggleHidden(activeIndex)}
        hasFrozen={Boolean(slideFrozenHtml[activeIndex])}
        onResetFrozen={() => setSlideFrozen(activeIndex, undefined)}
      />
    </div>
  </TabsContent>
  <TabsContent value="theme" style={{ marginTop: 16 }}>
    <DeckThemePanel brand={brand} deckKind="pitch-deck" />
  </TabsContent>
</Tabs>
```

- [ ] **Step 4: Run dev + smoke test**

Run: `npm run dev`
Open: `http://localhost:8080/b/uniex/pitch-deck`
Click: the floating dock's "Customize" button.
Expected: inspector opens with two tabs (Slide / Theme). Clicking Theme reveals the four accordion sections. Toggling Density to Spacious expands every slide's padding live. Auto-save indicator flips Saving → Saved within ~700ms.

- [ ] **Step 5: Type-check + lint + tests**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/features/pitch-deck/pages/PitchDeckPage.tsx
git commit -m "feat(pitch-deck): add Theme tab to right inspector wired to DeckThemePanel"
```

---

## Task 15: Manual QA + sign-off

**Files:** none — verification only.

- [ ] **Step 1: Three-brand contrast check**

Open each in dev and exercise the panel:
- `http://localhost:8080/b/uniex/pitch-deck`
- `http://localhost:8080/b/raqm/pitch-deck`
- `http://localhost:8080/b/skam/pitch-deck` (if seeded)

For each:
1. Bump `Scale` to 1.20× — every heading + body line grows proportionally.
2. Bump `Line-height` to 1.15× — line gaps open up.
3. Flip `Density` to Compact — padding shrinks, layout still readable.
4. Override `Page background` to a brand-secondary color → text auto-keeps reading because `--deck-text-heading` was picked off the brand palette. If a slide goes unreadable, the brandPalette default needs adjusting (orthogonal — not a regression of this work).
5. Reset to brand → all overrides clear, slides return to Step 1 visuals.

- [ ] **Step 2: Reload persistence**

Hard-reload the page. Expected: the theme persists (lives on `brand.presentationThemes['pitch-deck']`).

- [ ] **Step 3: Build + push**

```bash
npm run build
git push origin dev
```

Expected: build succeeds, push lands on `dev`.

- [ ] **Step 4: Notify the user**

Tell the user: "Pitch deck Theme tab + token system is live on dev. Try `/b/uniex/pitch-deck` → Customize → Theme. The same primitives are ready to drop into case-study and logo-presentation when you want — those are the follow-up plan."
