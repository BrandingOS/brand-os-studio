# Typescale Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a brand-aware typescale tool as the third entry in the tools platform. Full-page (public + in-app) and embedded-dialog variants. Same font pair across four scale surfaces (web/ui/presentation/social). Dual-writes to `brand.typescale` and the existing `brand.typography` so every downstream surface reflects changes instantly.

**Architecture:** Pure `engine/` + `export/` (no React). One composable `<TypescaleEditor variant="full"|"compact" />`. Full page inside `ToolShell`; embedded variant inside `<Dialog>`. Font-loading and font catalog lifted into `src/shared/typography/` as global primitives. Brand data flows through `useBrandStore` only; dual-write logic lives in the store, not the tool.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Radix UI, Zustand, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-23-typescale-tool-design.md`.

---

## File Structure

```
src/
  shared/
    types/
      typescale.ts                           # NEW — Typescale, FontRef, ScaleStep, ScaleSurface, Typescale
      brand.ts                               # MODIFY — add optional `typescale?: Typescale`
    typography/
      fontLoader.ts                          # NEW — ensureLoaded() for google/system/upload
      fontCatalog.ts                         # NEW — curated Google + system stacks
      index.ts                               # NEW — re-exports
    store/
      brandStore.ts                          # MODIFY — setTypescale() with dual-write to brand.typography

  features/tools/
    core/
      types.ts                               # MODIFY — add 'typescale' to ToolSlug
      toolRegistry.ts                        # MODIFY — register tool meta + SEO
    typescale/
      engine/
        ratios.ts                            # RATIOS map + names
        leading.ts                           # leadingFor(sizePx, curve)
        tracking.ts                          # trackingFor(sizePx, curve)
        scale.ts                             # buildLadder(...)
        fluid.ts                             # toFluid(step, ...) → clamp()
        surfaces.ts                          # DEFAULT_SURFACES, defaultSemanticMap
        index.ts
        __tests__/
          ratios.test.ts
          leading.test.ts
          tracking.test.ts
          scale.test.ts
          fluid.test.ts
          surfaces.test.ts
      export/
        css.ts                               # :root custom properties
        tailwindV3.ts                        # theme.extend snippet
        tailwindV4.ts                        # @theme block
        scss.ts                              # map + mixin
        js.ts                                # ES module
        json.ts                              # flat tokens
        w3c.ts                               # W3C design tokens ($type:"typography")
        figmaTokens.ts                       # Figma Tokens Studio format
        fontSnippet.ts                       # @font-face / Google <link>
        index.ts
        __tests__/
          css.test.ts
          tailwindV3.test.ts
          tailwindV4.test.ts
          scss.test.ts
          js.test.ts
          json.test.ts
          w3c.test.ts
          figmaTokens.test.ts
          fontSnippet.test.ts
      hooks/
        useTypescaleDraft.ts                 # local draft + debounced commit to brand store
        useSeedTypescale.ts                  # seed from brand.typography on first open
      components/
        TypescaleEditor.tsx                  # composable root — variant: "full" | "compact"
        FontPairPanel.tsx
        SurfaceTabs.tsx
        ScaleControls.tsx
        SemanticMap.tsx
        ExportPanel.tsx
        BrandSyncBar.tsx
        preview/
          PreviewTabs.tsx
          EditorialPreview.tsx
          UIPreview.tsx
          LadderPreview.tsx
      public/
        TypescaleLanding.tsx
      EmbeddedTypescaleDialog.tsx
      routes.tsx
      claim.ts
      index.ts

  App.tsx                                    # MODIFY — register /tools/typescale + /b/:slug/tools/typescale

  features/brand-board/panels/TypographyPanel.tsx     # MODIFY — add "Edit scale" button → EmbeddedTypescaleDialog
  features/brand/ (Identity → Typography page)        # MODIFY — add "Open typescale editor" button
  features/setup/ (or onboarding Brand Setup)         # MODIFY — typography step launches EmbeddedTypescaleDialog
```

---

## Phase 1 — Types + Shared Typography Primitives

### Task 1: Add `Typescale` type file

**Files:**
- Create: `src/shared/types/typescale.ts`

- [ ] **Step 1: Write the type definitions**

```ts
// src/shared/types/typescale.ts

export type FontSource = 'google' | 'system' | 'upload';

export interface FontFile {
  weight: number;
  italic: boolean;
  url: string;
  format: 'woff2' | 'woff' | 'ttf';
}

export interface FontRef {
  family: string;
  source: FontSource;
  weights: number[];
  italic: boolean;
  files?: FontFile[];
  fallback: string;
}

export interface FontPair {
  heading: FontRef;
  body: FontRef;
  mono?: FontRef;
}

export type RatioName =
  | 'minor-second' | 'major-second' | 'minor-third' | 'major-third'
  | 'perfect-fourth' | 'augmented-fourth' | 'perfect-fifth' | 'golden' | 'custom';

export interface Ratio { name: RatioName; value: number }

export type LeadingCurve = 'tight' | 'normal' | 'loose' | 'custom';
export type TrackingCurve = 'tight' | 'normal' | 'loose' | 'custom';

export interface FluidSpec {
  minPx: number;
  maxPx: number;
  minVwPx: number;
  maxVwPx: number;
  clamp: string;
}

export interface ScaleStep {
  id: string;
  index: number;
  sizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  weight: number;
  fluid?: FluidSpec;
}

export type SemanticRole =
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'bodyLg' | 'body' | 'bodySm' | 'caption' | 'overline' | 'label' | 'button' | 'code';

export interface SemanticEntry {
  stepId: string;
  font: 'heading' | 'body' | 'mono';
  weight?: number;
  italic?: boolean;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'smallcaps';
  trackingEmOverride?: number;
}

export type SemanticMap = Partial<Record<SemanticRole, SemanticEntry>>;

export type SurfaceKey = 'web' | 'ui' | 'presentation' | 'social';

export interface SurfaceFluidConfig {
  minVwPx: number;
  maxVwPx: number;
  minRatioMultiplier: number;
}

export interface ScaleSurface {
  key: SurfaceKey;
  basePx: number;
  ratio: Ratio;
  stepsUp: number;
  stepsDown: number;
  leading: LeadingCurve;
  tracking: TrackingCurve;
  fluid?: SurfaceFluidConfig;
  steps: ScaleStep[];
  semantic: SemanticMap;
}

export interface Typescale {
  schemaVersion: 1;
  fonts: FontPair;
  surfaces: Record<SurfaceKey, ScaleSurface>;
  activeSurface: SurfaceKey;
  updatedAt: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (new file with zero errors; no consumers yet)

### Task 2: Attach `typescale?` to `Brand`

**Files:**
- Modify: `src/shared/types/brand.ts`

- [ ] **Step 1: Add the field to the `Brand` interface**

Find the `Brand` interface. Add, near the existing `typography?: TypographySystem;` line:

```ts
import type { Typescale } from './typescale';
// ...inside Brand:
  /** Structured typescale (fonts + multi-surface ladders + semantic map). */
  typescale?: Typescale;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/typescale.ts src/shared/types/brand.ts
git commit -m "feat(typescale): add Typescale type + attach to Brand"
```

### Task 3: Font catalog (Google curated list + system stacks)

**Files:**
- Create: `src/shared/typography/fontCatalog.ts`

- [ ] **Step 1: Write the catalog**

```ts
// src/shared/typography/fontCatalog.ts
import type { FontRef } from '@/shared/types/typescale';

/** Curated Google Font pairings — safe, modern, loadable without auth. */
export const GOOGLE_FONT_CATALOG: readonly FontRef[] = [
  { family: 'Inter',             source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Manrope',           source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Space Grotesk',     source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'DM Sans',           source: 'google', weights: [400, 500, 700],      italic: true,  fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Plus Jakarta Sans', source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Work Sans',         source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Playfair Display',  source: 'google', weights: [400, 600, 700],      italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Fraunces',          source: 'google', weights: [400, 600, 700],      italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Source Serif 4',    source: 'google', weights: [400, 600, 700],      italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Lora',              source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'IBM Plex Sans',     source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'IBM Plex Serif',    source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'IBM Plex Mono',     source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-monospace, SFMono-Regular, monospace' },
  { family: 'JetBrains Mono',    source: 'google', weights: [400, 500, 700],      italic: true,  fallback: 'ui-monospace, SFMono-Regular, monospace' },
  { family: 'Geist',             source: 'google', weights: [400, 500, 600, 700], italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Geist Mono',        source: 'google', weights: [400, 500, 700],      italic: false, fallback: 'ui-monospace, SFMono-Regular, monospace' },
  { family: 'Cal Sans',          source: 'google', weights: [400, 600],           italic: false, fallback: 'ui-sans-serif, system-ui, sans-serif' },
  { family: 'Cormorant Garamond',source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'EB Garamond',       source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
  { family: 'Crimson Pro',       source: 'google', weights: [400, 500, 600, 700], italic: true,  fallback: 'ui-serif, Georgia, serif' },
] as const;

/** System font stacks — always available, zero load cost. */
export const SYSTEM_FONT_CATALOG: readonly FontRef[] = [
  {
    family: 'system-ui',
    source: 'system',
    weights: [400, 500, 600, 700],
    italic: true,
    fallback: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  },
  {
    family: 'ui-serif',
    source: 'system',
    weights: [400, 500, 600, 700],
    italic: true,
    fallback: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    family: 'ui-monospace',
    source: 'system',
    weights: [400, 500, 600, 700],
    italic: false,
    fallback: 'SFMono-Regular, Menlo, Consolas, monospace',
  },
] as const;

export function findCatalogEntry(family: string): FontRef | undefined {
  return [...GOOGLE_FONT_CATALOG, ...SYSTEM_FONT_CATALOG].find(f => f.family === family);
}

export function googleFontsCssUrl(ref: FontRef): string {
  if (ref.source !== 'google') throw new Error('googleFontsCssUrl requires a google FontRef');
  const family = ref.family.replace(/\s+/g, '+');
  const axes = ref.italic
    ? `ital,wght@${ref.weights.flatMap(w => [`0,${w}`, `1,${w}`]).join(';')}`
    : `wght@${ref.weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${family}:${axes}&display=swap`;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 4: Font loader

**Files:**
- Create: `src/shared/typography/fontLoader.ts`

- [ ] **Step 1: Write the loader**

```ts
// src/shared/typography/fontLoader.ts
import type { FontRef } from '@/shared/types/typescale';
import { googleFontsCssUrl } from './fontCatalog';

const loaded = new Set<string>();
const LINK_ATTR = 'data-typescale-font';
const STYLE_ATTR = 'data-typescale-fontface';

function keyFor(ref: FontRef): string {
  return `${ref.source}:${ref.family}:${ref.weights.join(',')}:${ref.italic ? 'i' : ''}`;
}

function injectGoogle(ref: FontRef) {
  if (typeof document === 'undefined') return;
  const href = googleFontsCssUrl(ref);
  if (document.querySelector(`link[${LINK_ATTR}="${ref.family}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute(LINK_ATTR, ref.family);
  document.head.appendChild(link);
}

function injectUpload(ref: FontRef) {
  if (typeof document === 'undefined') return;
  if (!ref.files?.length) return;
  if (document.querySelector(`style[${STYLE_ATTR}="${ref.family}"]`)) return;
  const css = ref.files
    .map(
      f => `@font-face{font-family:"${ref.family}";src:url("${f.url}") format("${f.format}");font-weight:${f.weight};font-style:${f.italic ? 'italic' : 'normal'};font-display:swap;}`,
    )
    .join('\n');
  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTR, ref.family);
  style.textContent = css;
  document.head.appendChild(style);
}

/** Idempotent: safe to call every render. */
export function ensureLoaded(ref: FontRef): void {
  const key = keyFor(ref);
  if (loaded.has(key)) return;
  if (ref.source === 'google') injectGoogle(ref);
  else if (ref.source === 'upload') injectUpload(ref);
  // 'system' needs no injection
  loaded.add(key);
}

export function ensurePairLoaded(pair: { heading: FontRef; body: FontRef; mono?: FontRef }) {
  ensureLoaded(pair.heading);
  ensureLoaded(pair.body);
  if (pair.mono) ensureLoaded(pair.mono);
}

/** For tests. */
export function __resetFontLoader() {
  loaded.clear();
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`link[${LINK_ATTR}]`).forEach(n => n.remove());
  document.querySelectorAll(`style[${STYLE_ATTR}]`).forEach(n => n.remove());
}
```

- [ ] **Step 2: Barrel export**

Create `src/shared/typography/index.ts`:

```ts
export * from './fontCatalog';
export * from './fontLoader';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/typography
git commit -m "feat(typography): font catalog + idempotent font loader"
```

---

## Phase 2 — Engine (TDD, pure TS)

Each task: write the failing test, verify it fails, implement, verify pass.

### Task 5: Ratios

**Files:**
- Create: `src/features/tools/typescale/engine/ratios.ts`
- Test: `src/features/tools/typescale/engine/__tests__/ratios.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// ratios.test.ts
import { describe, it, expect } from 'vitest';
import { RATIOS, resolveRatio } from '../ratios';

describe('ratios', () => {
  it('known ratios match canonical values', () => {
    expect(RATIOS['minor-second']).toBeCloseTo(1.067, 3);
    expect(RATIOS['major-second']).toBeCloseTo(1.125, 3);
    expect(RATIOS['minor-third']).toBeCloseTo(1.2, 3);
    expect(RATIOS['major-third']).toBeCloseTo(1.25, 3);
    expect(RATIOS['perfect-fourth']).toBeCloseTo(1.333, 3);
    expect(RATIOS['augmented-fourth']).toBeCloseTo(1.414, 3);
    expect(RATIOS['perfect-fifth']).toBeCloseTo(1.5, 3);
    expect(RATIOS['golden']).toBeCloseTo(1.618, 3);
  });

  it('resolveRatio returns custom value for custom name', () => {
    expect(resolveRatio({ name: 'custom', value: 1.42 })).toBe(1.42);
  });

  it('resolveRatio looks up known names', () => {
    expect(resolveRatio({ name: 'major-third', value: 0 })).toBeCloseTo(1.25, 3);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/features/tools/typescale/engine/__tests__/ratios.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// ratios.ts
import type { Ratio, RatioName } from '@/shared/types/typescale';

export const RATIOS: Record<Exclude<RatioName, 'custom'>, number> = {
  'minor-second':     1.067,
  'major-second':     1.125,
  'minor-third':      1.2,
  'major-third':      1.25,
  'perfect-fourth':   1.333,
  'augmented-fourth': 1.414,
  'perfect-fifth':    1.5,
  'golden':           1.618,
};

export function resolveRatio(r: Ratio): number {
  if (r.name === 'custom') return r.value;
  return RATIOS[r.name];
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/features/tools/typescale/engine/__tests__/ratios.test.ts`
Expected: PASS

### Task 6: Leading curve

**Files:**
- Create: `src/features/tools/typescale/engine/leading.ts`
- Test: `src/features/tools/typescale/engine/__tests__/leading.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { leadingFor } from '../leading';

describe('leadingFor', () => {
  it('normal curve: big headings tight, body loose', () => {
    expect(leadingFor(72, 'normal')).toBeLessThan(1.15);
    expect(leadingFor(48, 'normal')).toBeLessThan(1.25);
    expect(leadingFor(16, 'normal')).toBeGreaterThan(1.4);
    expect(leadingFor(12, 'normal')).toBeGreaterThan(1.5);
  });
  it('tight curve is tighter than normal at every size', () => {
    expect(leadingFor(48, 'tight')).toBeLessThan(leadingFor(48, 'normal'));
    expect(leadingFor(16, 'tight')).toBeLessThan(leadingFor(16, 'normal'));
  });
  it('loose curve is looser than normal at every size', () => {
    expect(leadingFor(48, 'loose')).toBeGreaterThan(leadingFor(48, 'normal'));
    expect(leadingFor(16, 'loose')).toBeGreaterThan(leadingFor(16, 'normal'));
  });
  it('custom falls back to normal when not provided', () => {
    expect(leadingFor(16, 'custom')).toBe(leadingFor(16, 'normal'));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/features/tools/typescale/engine/__tests__/leading.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// leading.ts
import type { LeadingCurve } from '@/shared/types/typescale';

/**
 * Target curve (normal): headings tight (~1.05 at 72px), body ~1.5, caption ~1.6.
 * Function is monotonically decreasing in sizePx.
 */
function normalAt(sizePx: number): number {
  const clamped = Math.min(Math.max(sizePx, 8), 120);
  // 8px  → 1.65
  // 16px → 1.5
  // 32px → 1.25
  // 64px → 1.10
  // 120px→ 1.02
  const a = 1.0, b = 4.5; // y = a + b / sizePx
  return a + b / clamped;
}

export function leadingFor(sizePx: number, curve: LeadingCurve): number {
  const base = normalAt(sizePx);
  if (curve === 'tight') return Math.max(base - 0.08, 1.0);
  if (curve === 'loose') return base + 0.12;
  return base; // 'normal' and 'custom' fallback
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/features/tools/typescale/engine/__tests__/leading.test.ts`
Expected: PASS

### Task 7: Tracking curve

**Files:**
- Create: `src/features/tools/typescale/engine/tracking.ts`
- Test: `src/features/tools/typescale/engine/__tests__/tracking.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { trackingFor } from '../tracking';

describe('trackingFor', () => {
  it('large headings get negative tracking on normal curve', () => {
    expect(trackingFor(72, 'normal')).toBeLessThan(0);
  });
  it('body text tracking is near zero on normal curve', () => {
    expect(Math.abs(trackingFor(16, 'normal'))).toBeLessThan(0.005);
  });
  it('tiny text gets positive tracking on normal curve', () => {
    expect(trackingFor(10, 'normal')).toBeGreaterThan(0);
  });
  it('tight curve is always <= normal', () => {
    expect(trackingFor(48, 'tight')).toBeLessThanOrEqual(trackingFor(48, 'normal'));
  });
  it('loose curve is always >= normal', () => {
    expect(trackingFor(16, 'loose')).toBeGreaterThanOrEqual(trackingFor(16, 'normal'));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// tracking.ts
import type { TrackingCurve } from '@/shared/types/typescale';

/** Returns em units. */
function normalAt(sizePx: number): number {
  // Linear interp: 10px → +0.02em, 16px → 0em, 72px → -0.015em
  if (sizePx <= 12) return 0.02;
  if (sizePx >= 64) return -0.02;
  if (sizePx <= 16) return 0 + (16 - sizePx) * (0.02 / 4);
  return 0 - (sizePx - 16) * (0.02 / 48);
}

export function trackingFor(sizePx: number, curve: TrackingCurve): number {
  const base = normalAt(sizePx);
  if (curve === 'tight') return base - 0.01;
  if (curve === 'loose') return base + 0.01;
  return base;
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 8: Scale ladder

**Files:**
- Create: `src/features/tools/typescale/engine/scale.ts`
- Test: `src/features/tools/typescale/engine/__tests__/scale.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildLadder } from '../scale';

describe('buildLadder', () => {
  it('produces stepsUp + stepsDown + 1 rungs', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.2, stepsUp: 6, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    expect(steps).toHaveLength(9);
  });
  it('base index is 0 and base size is basePx', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const base = steps.find(s => s.index === 0);
    expect(base?.sizePx).toBe(16);
  });
  it('steps are strictly increasing in sizePx', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 6, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const sorted = [...steps].sort((a, b) => a.index - b.index);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].sizePx).toBeGreaterThan(sorted[i - 1].sizePx);
  });
  it('ids are stable and unique', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.2, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const ids = new Set(steps.map(s => s.id));
    expect(ids.size).toBe(steps.length);
    expect(ids.has('t-2')).toBe(true);
    expect(ids.has('t0')).toBe(true);
    expect(ids.has('t4')).toBe(true);
  });
  it('16 × minor-third, step +4 ≈ 33.18', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.2, stepsUp: 4, stepsDown: 0, leading: 'normal', tracking: 'normal' });
    const top = steps.find(s => s.index === 4)!;
    expect(top.sizePx).toBeCloseTo(33.18, 1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// scale.ts
import type { LeadingCurve, ScaleStep, TrackingCurve } from '@/shared/types/typescale';
import { leadingFor } from './leading';
import { trackingFor } from './tracking';

export interface BuildLadderInput {
  basePx: number;
  ratio: number;
  stepsUp: number;
  stepsDown: number;
  leading: LeadingCurve;
  tracking: TrackingCurve;
}

export function buildLadder(input: BuildLadderInput): ScaleStep[] {
  const { basePx, ratio, stepsUp, stepsDown, leading, tracking } = input;
  const out: ScaleStep[] = [];
  for (let i = -stepsDown; i <= stepsUp; i++) {
    const sizePx = round2(basePx * Math.pow(ratio, i));
    out.push({
      id: `t${i}`,
      index: i,
      sizePx,
      lineHeight: round3(leadingFor(sizePx, leading)),
      letterSpacingEm: round4(trackingFor(sizePx, tracking)),
      weight: i >= 3 ? 700 : i >= 1 ? 600 : 400,
    });
  }
  return out;
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
```

- [ ] **Step 4: Run — expect PASS**

### Task 9: Fluid clamp

**Files:**
- Create: `src/features/tools/typescale/engine/fluid.ts`
- Test: `src/features/tools/typescale/engine/__tests__/fluid.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { toFluid } from '../fluid';
import type { ScaleStep } from '@/shared/types/typescale';

const step: ScaleStep = {
  id: 't2', index: 2, sizePx: 24, lineHeight: 1.3, letterSpacingEm: 0, weight: 600,
};

describe('toFluid', () => {
  it('embeds clamp() string in step.fluid.clamp', () => {
    const out = toFluid(step, { minVwPx: 320, maxVwPx: 1440, minRatioMultiplier: 0.75 });
    expect(out.fluid?.clamp.startsWith('clamp(')).toBe(true);
  });
  it('minPx = sizePx × minRatioMultiplier', () => {
    const out = toFluid(step, { minVwPx: 320, maxVwPx: 1440, minRatioMultiplier: 0.75 });
    expect(out.fluid?.minPx).toBeCloseTo(18, 2);
    expect(out.fluid?.maxPx).toBeCloseTo(24, 2);
  });
  it('preserves non-fluid fields', () => {
    const out = toFluid(step, { minVwPx: 320, maxVwPx: 1440, minRatioMultiplier: 0.75 });
    expect(out.sizePx).toBe(24);
    expect(out.lineHeight).toBe(1.3);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// fluid.ts
import type { ScaleStep } from '@/shared/types/typescale';

export interface FluidOpts { minVwPx: number; maxVwPx: number; minRatioMultiplier: number; }

export function toFluid(step: ScaleStep, opts: FluidOpts): ScaleStep {
  const minPx = round2(step.sizePx * opts.minRatioMultiplier);
  const maxPx = step.sizePx;
  const slope = (maxPx - minPx) / (opts.maxVwPx - opts.minVwPx);
  const intercept = round3(minPx - slope * opts.minVwPx);
  const vwCoef = round4(slope * 100);
  const clamp = `clamp(${minPx}px, ${intercept}px + ${vwCoef}vw, ${maxPx}px)`;
  return { ...step, fluid: { minPx, maxPx, minVwPx: opts.minVwPx, maxVwPx: opts.maxVwPx, clamp } };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }
```

- [ ] **Step 4: Run — expect PASS**

### Task 10: Surfaces (defaults + semantic map)

**Files:**
- Create: `src/features/tools/typescale/engine/surfaces.ts`
- Test: `src/features/tools/typescale/engine/__tests__/surfaces.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SURFACES, defaultSemanticMap } from '../surfaces';
import { buildLadder } from '../scale';

describe('DEFAULT_SURFACES', () => {
  it('web base 16, ui base 16, presentation base 24, social base 32', () => {
    expect(DEFAULT_SURFACES.web.basePx).toBe(16);
    expect(DEFAULT_SURFACES.ui.basePx).toBe(16);
    expect(DEFAULT_SURFACES.presentation.basePx).toBe(24);
    expect(DEFAULT_SURFACES.social.basePx).toBe(32);
  });
  it('only web has a fluid config', () => {
    expect(DEFAULT_SURFACES.web.fluid).toBeDefined();
    expect(DEFAULT_SURFACES.ui.fluid).toBeUndefined();
    expect(DEFAULT_SURFACES.presentation.fluid).toBeUndefined();
    expect(DEFAULT_SURFACES.social.fluid).toBeUndefined();
  });
});

describe('defaultSemanticMap', () => {
  it('maps h1 and body sensibly on web', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 6, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const map = defaultSemanticMap('web', steps);
    expect(map.body?.stepId).toBe('t0');
    expect(map.h1).toBeDefined();
    expect(map.h1!.stepId).not.toBe('t0');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// surfaces.ts
import type {
  ScaleStep, ScaleSurface, SemanticMap, SurfaceKey,
} from '@/shared/types/typescale';

type SurfaceDefault = Omit<ScaleSurface, 'steps' | 'semantic' | 'key'>;

export const DEFAULT_SURFACES: Record<SurfaceKey, SurfaceDefault> = {
  web: {
    basePx: 16,
    ratio: { name: 'minor-third', value: 1.2 },
    stepsUp: 7, stepsDown: 2,
    leading: 'normal', tracking: 'normal',
    fluid: { minVwPx: 360, maxVwPx: 1440, minRatioMultiplier: 0.78 },
  },
  ui: {
    basePx: 16,
    ratio: { name: 'major-second', value: 1.125 },
    stepsUp: 5, stepsDown: 2,
    leading: 'normal', tracking: 'normal',
  },
  presentation: {
    basePx: 24,
    ratio: { name: 'perfect-fourth', value: 1.333 },
    stepsUp: 6, stepsDown: 1,
    leading: 'tight', tracking: 'normal',
  },
  social: {
    basePx: 32,
    ratio: { name: 'major-third', value: 1.25 },
    stepsUp: 5, stepsDown: 1,
    leading: 'tight', tracking: 'tight',
  },
};

/** Roles we always try to map; the engine fills them with the nearest available step. */
const ROLE_TARGET_INDEX: Record<SurfaceKey, Array<[string, number]>> = {
  web:           [['display',7],['h1',6],['h2',5],['h3',4],['h4',3],['h5',2],['h6',1],['bodyLg',1],['body',0],['bodySm',-1],['caption',-2],['overline',-2]],
  ui:            [['display',5],['h1',4],['h2',3],['h3',2],['h4',1],['bodyLg',1],['body',0],['bodySm',-1],['caption',-2],['label',-1],['button',0]],
  presentation:  [['display',6],['h1',5],['h2',4],['h3',3],['h4',2],['bodyLg',1],['body',0],['caption',-1]],
  social:        [['display',5],['h1',4],['h2',3],['h3',2],['bodyLg',1],['body',0]],
};

export function defaultSemanticMap(surface: SurfaceKey, steps: ScaleStep[]): SemanticMap {
  const byIndex = new Map(steps.map(s => [s.index, s]));
  const out: SemanticMap = {};
  for (const [role, idx] of ROLE_TARGET_INDEX[surface]) {
    const step = byIndex.get(idx) ?? nearest(steps, idx);
    if (!step) continue;
    out[role as keyof SemanticMap] = {
      stepId: step.id,
      font: isHeadingRole(role) ? 'heading' : 'body',
      weight: isHeadingRole(role) ? (idx >= 3 ? 700 : 600) : 400,
    };
  }
  return out;
}

function nearest(steps: ScaleStep[], index: number): ScaleStep | undefined {
  let best: ScaleStep | undefined;
  let bestDist = Infinity;
  for (const s of steps) {
    const d = Math.abs(s.index - index);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best;
}

function isHeadingRole(role: string): boolean {
  return role === 'display' || role.startsWith('h') || role === 'overline';
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 11: Engine barrel + full test run

**Files:**
- Create: `src/features/tools/typescale/engine/index.ts`

- [ ] **Step 1: Write barrel**

```ts
// engine/index.ts
export * from './ratios';
export * from './leading';
export * from './tracking';
export * from './scale';
export * from './fluid';
export * from './surfaces';
```

- [ ] **Step 2: Run all engine tests**

Run: `npx vitest run src/features/tools/typescale/engine`
Expected: PASS (all 6 test files)

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/typescale/engine
git commit -m "feat(typescale): engine (ratios, leading, tracking, ladder, fluid, surfaces)"
```

---

## Phase 3 — Export Modules (TDD)

Each export module follows the same shape: a single `serialize(typescale: Typescale): string` function (or `{ filename, content }`), with a small Vitest snapshot. The serializers read only the structured `Typescale` object — no DOM, no React.

### Task 12: CSS custom properties export

**Files:**
- Create: `src/features/tools/typescale/export/css.ts`
- Test: `src/features/tools/typescale/export/__tests__/css.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeCss } from '../css';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

function makeTypescale(): Typescale {
  const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
  return {
    schemaVersion: 1,
    fonts: {
      heading: { family: 'Playfair Display', source: 'google', weights: [400, 700], italic: false, fallback: 'serif' },
      body:    { family: 'Inter',             source: 'google', weights: [400, 500, 700], italic: false, fallback: 'system-ui, sans-serif' },
    },
    surfaces: {
      web:          { key: 'web',          ...DEFAULT_SURFACES.web,          steps, semantic: defaultSemanticMap('web', steps) },
      ui:           { key: 'ui',           ...DEFAULT_SURFACES.ui,           steps, semantic: defaultSemanticMap('ui', steps) },
      presentation: { key: 'presentation', ...DEFAULT_SURFACES.presentation, steps, semantic: defaultSemanticMap('presentation', steps) },
      social:       { key: 'social',       ...DEFAULT_SURFACES.social,       steps, semantic: defaultSemanticMap('social', steps) },
    },
    activeSurface: 'web',
    updatedAt: '2026-04-23T00:00:00.000Z',
  };
}

describe('serializeCss', () => {
  it('declares :root scope', () => {
    expect(serializeCss(makeTypescale())).toMatch(/:root\s*{/);
  });
  it('emits font family custom properties', () => {
    const out = serializeCss(makeTypescale());
    expect(out).toContain('--font-heading:');
    expect(out).toContain('--font-body:');
  });
  it('emits per-surface semantic size properties (web-h1)', () => {
    expect(serializeCss(makeTypescale())).toMatch(/--text-web-h1:\s*[0-9.]+px/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// css.ts
import type { ScaleSurface, SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeCss(t: Typescale): string {
  const lines: string[] = [':root {'];
  lines.push(`  --font-heading: "${t.fonts.heading.family}", ${t.fonts.heading.fallback};`);
  lines.push(`  --font-body: "${t.fonts.body.family}", ${t.fonts.body.fallback};`);
  if (t.fonts.mono) {
    lines.push(`  --font-mono: "${t.fonts.mono.family}", ${t.fonts.mono.fallback};`);
  }
  for (const surface of Object.values(t.surfaces)) emitSurface(lines, surface);
  lines.push('}');
  return lines.join('\n');
}

function emitSurface(lines: string[], surface: ScaleSurface) {
  const byId = new Map(surface.steps.map(s => [s.id, s]));
  for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, NonNullable<ReturnType<typeof Object.entries>>[number][1]][]) {
    if (!entry) continue;
    const step = byId.get(entry.stepId);
    if (!step) continue;
    const size = step.fluid?.clamp ?? `${step.sizePx}px`;
    lines.push(`  --text-${surface.key}-${role}: ${size};`);
    lines.push(`  --leading-${surface.key}-${role}: ${step.lineHeight};`);
    lines.push(`  --tracking-${surface.key}-${role}: ${step.letterSpacingEm}em;`);
    lines.push(`  --weight-${surface.key}-${role}: ${entry.weight ?? step.weight};`);
  }
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 13: Tailwind v3 export

**Files:**
- Create: `src/features/tools/typescale/export/tailwindV3.ts`
- Test: `src/features/tools/typescale/export/__tests__/tailwindV3.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeTailwindV3 } from '../tailwindV3';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

function ts(): Typescale {
  const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
  return {
    schemaVersion: 1,
    fonts: { heading: { family:'Inter', source:'google', weights:[400,700], italic:false, fallback:'system-ui' },
             body:    { family:'Inter', source:'google', weights:[400,700], italic:false, fallback:'system-ui' } },
    surfaces: {
      web:         { key:'web',         ...DEFAULT_SURFACES.web,         steps, semantic: defaultSemanticMap('web', steps) },
      ui:          { key:'ui',          ...DEFAULT_SURFACES.ui,          steps, semantic: defaultSemanticMap('ui', steps) },
      presentation:{ key:'presentation',...DEFAULT_SURFACES.presentation,steps, semantic: defaultSemanticMap('presentation', steps) },
      social:      { key:'social',      ...DEFAULT_SURFACES.social,      steps, semantic: defaultSemanticMap('social', steps) },
    },
    activeSurface: 'web',
    updatedAt: '2026-04-23T00:00:00.000Z',
  };
}

describe('serializeTailwindV3', () => {
  it('returns a theme.extend block', () => {
    const out = serializeTailwindV3(ts());
    expect(out).toContain('theme: {');
    expect(out).toContain('extend: {');
    expect(out).toContain('fontSize:');
    expect(out).toContain('fontFamily:');
  });
  it('includes web-h1 entry with [fontSize, { lineHeight, letterSpacing }]', () => {
    expect(serializeTailwindV3(ts())).toMatch(/'web-h1':\s*\[/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// tailwindV3.ts
import type { ScaleSurface, SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeTailwindV3(t: Typescale): string {
  const fontSizes: string[] = [];
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const size = step.fluid?.clamp ?? `${step.sizePx}px`;
      fontSizes.push(
        `        '${surface.key}-${role}': ['${size}', { lineHeight: '${step.lineHeight}', letterSpacing: '${step.letterSpacingEm}em', fontWeight: '${entry.weight ?? step.weight}' }],`,
      );
    }
  }
  return `/** Paste into tailwind.config.(js|ts) */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        heading: ['"${t.fonts.heading.family}"', ${quoteList(t.fonts.heading.fallback)}],
        body:    ['"${t.fonts.body.family}"', ${quoteList(t.fonts.body.fallback)}],${t.fonts.mono ? `
        mono:    ['"${t.fonts.mono.family}"', ${quoteList(t.fonts.mono.fallback)}],` : ''}
      },
      fontSize: {
${fontSizes.join('\n')}
      },
    },
  },
};`;
}

function quoteList(fallback: string): string {
  return fallback.split(',').map(s => `'${s.trim()}'`).join(', ');
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 14: Tailwind v4 `@theme` export

**Files:**
- Create: `src/features/tools/typescale/export/tailwindV4.ts`
- Test: `src/features/tools/typescale/export/__tests__/tailwindV4.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeTailwindV4 } from '../tailwindV4';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

function ts(): Typescale {
  const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
  return {
    schemaVersion: 1,
    fonts: { heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
             body:   {family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'} },
    surfaces: {
      web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
      ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
      presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
      social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
    },
    activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z',
  };
}

describe('serializeTailwindV4', () => {
  it('emits an @theme block', () => expect(serializeTailwindV4(ts())).toContain('@theme'));
  it('uses --font-* and --text-* tokens', () => {
    const out = serializeTailwindV4(ts());
    expect(out).toContain('--font-heading:');
    expect(out).toContain('--text-web-h1:');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// tailwindV4.ts
import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeTailwindV4(t: Typescale): string {
  const lines: string[] = ['@theme {'];
  lines.push(`  --font-heading: "${t.fonts.heading.family}", ${t.fonts.heading.fallback};`);
  lines.push(`  --font-body: "${t.fonts.body.family}", ${t.fonts.body.fallback};`);
  if (t.fonts.mono) lines.push(`  --font-mono: "${t.fonts.mono.family}", ${t.fonts.mono.fallback};`);
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const size = step.fluid?.clamp ?? `${step.sizePx}px`;
      const key = `${surface.key}-${role}`;
      lines.push(`  --text-${key}: ${size};`);
      lines.push(`  --text-${key}--line-height: ${step.lineHeight};`);
      lines.push(`  --text-${key}--letter-spacing: ${step.letterSpacingEm}em;`);
      lines.push(`  --text-${key}--font-weight: ${entry.weight ?? step.weight};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 15: SCSS map export

**Files:**
- Create: `src/features/tools/typescale/export/scss.ts`
- Test: `src/features/tools/typescale/export/__tests__/scss.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeScss } from '../scss';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const t: Typescale = {
  schemaVersion:1,
  fonts:{heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
         body:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'}},
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z',
};

describe('serializeScss', () => {
  it('emits $typescale map with nested surface maps', () => {
    const out = serializeScss(t);
    expect(out).toContain('$typescale: (');
    expect(out).toContain('web: (');
    expect(out).toContain('h1: (');
  });
  it('emits a font-family token', () => {
    expect(serializeScss(t)).toContain('$font-heading:');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// scss.ts
import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeScss(t: Typescale): string {
  const lines: string[] = [];
  lines.push(`$font-heading: "${t.fonts.heading.family}", ${t.fonts.heading.fallback};`);
  lines.push(`$font-body: "${t.fonts.body.family}", ${t.fonts.body.fallback};`);
  if (t.fonts.mono) lines.push(`$font-mono: "${t.fonts.mono.family}", ${t.fonts.mono.fallback};`);
  lines.push('');
  lines.push('$typescale: (');
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    lines.push(`  ${surface.key}: (`);
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const size = step.fluid?.clamp ?? `${step.sizePx}px`;
      lines.push(
        `    ${role}: ( size: ${size}, line-height: ${step.lineHeight}, letter-spacing: ${step.letterSpacingEm}em, weight: ${entry.weight ?? step.weight} ),`,
      );
    }
    lines.push('  ),');
  }
  lines.push(');');
  return lines.join('\n');
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 16: JS/TS module export

**Files:**
- Create: `src/features/tools/typescale/export/js.ts`
- Test: `src/features/tools/typescale/export/__tests__/js.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeJs } from '../js';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const t: Typescale = { schemaVersion:1,
  fonts:{ heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
          body:   {family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'} },
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z' };

describe('serializeJs', () => {
  it('exports a const named `typescale`', () => {
    expect(serializeJs(t)).toMatch(/export const typescale\s*=/);
  });
  it('includes as const at the end for literal inference', () => {
    expect(serializeJs(t)).toMatch(/} as const;$/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// js.ts
import type { Typescale } from '@/shared/types/typescale';

export function serializeJs(t: Typescale): string {
  const body = JSON.stringify(t, null, 2);
  return `// Generated by BrandOS Typescale. Paste into a .ts file.
export const typescale = ${body} as const;`;
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 17: Flat JSON export

**Files:**
- Create: `src/features/tools/typescale/export/json.ts`
- Test: `src/features/tools/typescale/export/__tests__/json.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeJson } from '../json';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const t: Typescale = { schemaVersion:1,
  fonts:{ heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
          body:   {family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'} },
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z' };

describe('serializeJson', () => {
  it('produces parseable JSON containing "fonts" and "surfaces"', () => {
    const parsed = JSON.parse(serializeJson(t));
    expect(parsed.fonts).toBeDefined();
    expect(parsed.surfaces.web).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// json.ts
import type { Typescale } from '@/shared/types/typescale';
export function serializeJson(t: Typescale): string {
  return JSON.stringify(t, null, 2);
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 18: W3C Design Tokens export

**Files:**
- Create: `src/features/tools/typescale/export/w3c.ts`
- Test: `src/features/tools/typescale/export/__tests__/w3c.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeW3c } from '../w3c';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const t: Typescale = { schemaVersion:1,
  fonts:{ heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
          body:   {family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'} },
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z' };

describe('serializeW3c', () => {
  it('each leaf declares $type: "typography"', () => {
    const parsed = JSON.parse(serializeW3c(t));
    const h1 = parsed.typescale.web.h1;
    expect(h1.$type).toBe('typography');
    expect(h1.$value.fontFamily).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// w3c.ts
import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeW3c(t: Typescale): string {
  const out: any = { typescale: {} };
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    const leaf: any = {};
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const font = entry.font === 'mono' ? t.fonts.mono?.family : entry.font === 'body' ? t.fonts.body.family : t.fonts.heading.family;
      leaf[role] = {
        $type: 'typography',
        $value: {
          fontFamily: font,
          fontSize: step.fluid?.clamp ?? `${step.sizePx}px`,
          fontWeight: entry.weight ?? step.weight,
          lineHeight: step.lineHeight,
          letterSpacing: `${step.letterSpacingEm}em`,
        },
      };
    }
    out.typescale[surface.key] = leaf;
  }
  return JSON.stringify(out, null, 2);
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 19: Figma Tokens Studio export

**Files:**
- Create: `src/features/tools/typescale/export/figmaTokens.ts`
- Test: `src/features/tools/typescale/export/__tests__/figmaTokens.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeFigmaTokens } from '../figmaTokens';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const t: Typescale = { schemaVersion:1,
  fonts:{ heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
          body:   {family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'} },
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z' };

describe('serializeFigmaTokens', () => {
  it('uses Figma Tokens Studio "typography" type', () => {
    const parsed = JSON.parse(serializeFigmaTokens(t));
    expect(parsed.global.web.h1.type).toBe('typography');
    expect(parsed.global.web.h1.value.fontFamily).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// figmaTokens.ts
import type { SemanticRole, Typescale } from '@/shared/types/typescale';

export function serializeFigmaTokens(t: Typescale): string {
  const out: any = { global: {} };
  for (const surface of Object.values(t.surfaces)) {
    const byId = new Map(surface.steps.map(s => [s.id, s]));
    const leaf: any = {};
    for (const [role, entry] of Object.entries(surface.semantic) as [SemanticRole, any][]) {
      if (!entry) continue;
      const step = byId.get(entry.stepId);
      if (!step) continue;
      const font = entry.font === 'mono' ? t.fonts.mono?.family : entry.font === 'body' ? t.fonts.body.family : t.fonts.heading.family;
      leaf[role] = {
        type: 'typography',
        value: {
          fontFamily: font,
          fontWeight: `${entry.weight ?? step.weight}`,
          fontSize: step.fluid?.clamp ?? `${step.sizePx}`,
          lineHeight: `${step.lineHeight}`,
          letterSpacing: `${step.letterSpacingEm * 100}%`,
          textCase: entry.transform === 'uppercase' ? 'uppercase' : entry.transform === 'lowercase' ? 'lowercase' : 'none',
        },
      };
    }
    out.global[surface.key] = leaf;
  }
  return JSON.stringify(out, null, 2);
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 20: `@font-face` / Google `<link>` snippet

**Files:**
- Create: `src/features/tools/typescale/export/fontSnippet.ts`
- Test: `src/features/tools/typescale/export/__tests__/fontSnippet.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { serializeFontSnippet } from '../fontSnippet';
import type { Typescale } from '@/shared/types/typescale';

function make(mono = false): Typescale {
  return {
    schemaVersion:1,
    fonts:{
      heading:{family:'Playfair Display',source:'google',weights:[400,700],italic:false,fallback:'serif'},
      body:   {family:'Inter',source:'google',weights:[400,500,700],italic:true,fallback:'system-ui'},
      ...(mono ? { mono:{family:'MyMono',source:'upload',weights:[400],italic:false,fallback:'monospace',
        files:[{weight:400,italic:false,url:'https://cdn/ex/mymono.woff2',format:'woff2'}]}} : {}),
    },
    surfaces:{} as any, activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z',
  };
}

describe('serializeFontSnippet', () => {
  it('emits a Google <link> for every google font', () => {
    const out = serializeFontSnippet(make());
    expect(out).toContain('Playfair+Display');
    expect(out).toContain('fonts.googleapis.com');
  });
  it('emits @font-face for uploaded fonts', () => {
    const out = serializeFontSnippet(make(true));
    expect(out).toContain('@font-face');
    expect(out).toContain('MyMono');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// fontSnippet.ts
import type { FontRef, Typescale } from '@/shared/types/typescale';
import { googleFontsCssUrl } from '@/shared/typography';

export function serializeFontSnippet(t: Typescale): string {
  const fonts: FontRef[] = [t.fonts.heading, t.fonts.body, ...(t.fonts.mono ? [t.fonts.mono] : [])];
  const googleLinks = fonts.filter(f => f.source === 'google')
    .map(f => `<link rel="stylesheet" href="${googleFontsCssUrl(f)}" />`).join('\n');
  const faces = fonts.filter(f => f.source === 'upload' && f.files?.length)
    .flatMap(f => f.files!.map(file =>
      `@font-face { font-family: "${f.family}"; src: url("${file.url}") format("${file.format}"); font-weight: ${file.weight}; font-style: ${file.italic ? 'italic' : 'normal'}; font-display: swap; }`,
    )).join('\n');
  return [
    googleLinks ? `<!-- Google Fonts -->\n${googleLinks}` : '',
    faces ? `<style>\n${faces}\n</style>` : '',
  ].filter(Boolean).join('\n\n');
}
```

- [ ] **Step 4: Run — expect PASS**

### Task 21: Export barrel + run all export tests + commit

**Files:**
- Create: `src/features/tools/typescale/export/index.ts`

- [ ] **Step 1: Barrel**

```ts
// export/index.ts
export * from './css';
export * from './tailwindV3';
export * from './tailwindV4';
export * from './scss';
export * from './js';
export * from './json';
export * from './w3c';
export * from './figmaTokens';
export * from './fontSnippet';
```

- [ ] **Step 2: Run all export tests**

Run: `npx vitest run src/features/tools/typescale/export`
Expected: PASS (all 9)

- [ ] **Step 3: Commit**

```bash
git add src/features/tools/typescale/export
git commit -m "feat(typescale): export modules (css, tw v3/v4, scss, js, json, w3c, figma, font snippet)"
```

---

## Phase 4 — Brand store dual-write

### Task 22: `setTypescale` on the brand store

**Files:**
- Modify: `src/shared/store/brandStore.ts`

Read the file first to locate the update pattern (look for existing `updateBrand` / `setTypography` / similar).

- [ ] **Step 1: Add `setTypescale` action to the store slice**

Add to the store actions:

```ts
// In brandStore.ts — add after existing brand update actions
setTypescale: (brandId: string, next: Typescale) => {
  set((state) => ({
    brands: state.brands.map(b => {
      if (b.id !== brandId) return b;
      const mirror = mirrorTypographyFromTypescale(b.typography, next);
      return { ...b, typescale: next, typography: mirror, updatedAt: new Date().toISOString() };
    }),
  }));
  // Persist via existing Supabase/localStorage path
  get().persistBrand(brandId);
},
```

Then add `mirrorTypographyFromTypescale` inside the same file (above the store factory):

```ts
import type { Typescale } from '@/shared/types/typescale';
import type { TypographySystem, FontScaleTokens } from '@/shared/types/brandAssets';

function mirrorTypographyFromTypescale(
  current: TypographySystem | undefined,
  next: Typescale,
): TypographySystem {
  const web = next.surfaces.web;
  const scale: FontScaleTokens = {};
  const byId = new Map(web.steps.map(s => [s.id, s]));
  const pick = (role: keyof typeof web.semantic) => {
    const entry = web.semantic[role];
    if (!entry) return undefined;
    const step = byId.get(entry.stepId);
    return step ? `${step.sizePx}px` : undefined;
  };
  scale.h1 = pick('h1'); scale.h2 = pick('h2'); scale.h3 = pick('h3');
  scale.h4 = pick('h4'); scale.h5 = pick('h5'); scale.h6 = pick('h6');
  scale.body = pick('body'); scale.bodyLarge = pick('bodyLg'); scale.bodySmall = pick('bodySm');
  scale.caption = pick('caption'); scale.overline = pick('overline');
  return {
    ...(current ?? {} as TypographySystem),
    primary: {
      family: next.fonts.heading.family,
      weights: next.fonts.heading.weights,
      fallbacks: next.fonts.heading.fallback.split(',').map(s => s.trim()),
    },
    secondary: {
      family: next.fonts.body.family,
      weights: next.fonts.body.weights,
      fallbacks: next.fonts.body.fallback.split(',').map(s => s.trim()),
    },
    accent: next.fonts.mono ? {
      family: next.fonts.mono.family,
      weights: next.fonts.mono.weights,
      fallbacks: next.fonts.mono.fallback.split(',').map(s => s.trim()),
    } : current?.accent,
    scale,
  };
}
```

> **Adapter note:** if the store doesn't expose `persistBrand` with that exact name, check the existing actions that write brand changes — they already handle Supabase + localStorage fallback. Hook into the same path rather than introducing a new one.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Write a store test for the dual-write mapping**

Create `src/shared/store/__tests__/brandStore.typescale.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '@/features/tools/typescale/engine';

// Import the internal helper. If it isn't exported, export it for testing at the bottom of brandStore.ts:
//   export const __testing = { mirrorTypographyFromTypescale };
import { __testing } from '@/shared/store/brandStore';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const next: Typescale = {
  schemaVersion:1,
  fonts:{ heading:{family:'Playfair Display',source:'google',weights:[400,700],italic:false,fallback:'serif'},
          body:   {family:'Inter',             source:'google',weights:[400,500,700],italic:false,fallback:'system-ui'} },
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z',
};

describe('mirrorTypographyFromTypescale', () => {
  it('writes heading family to typography.primary.family', () => {
    const out = __testing.mirrorTypographyFromTypescale(undefined, next);
    expect(out.primary.family).toBe('Playfair Display');
    expect(out.secondary?.family).toBe('Inter');
  });
  it('populates flat scale (h1, body) as px strings', () => {
    const out = __testing.mirrorTypographyFromTypescale(undefined, next);
    expect(out.scale?.body).toMatch(/^[0-9.]+px$/);
    expect(out.scale?.h1).toMatch(/^[0-9.]+px$/);
  });
});
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/shared/store/__tests__/brandStore.typescale.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/store/brandStore.ts src/shared/store/__tests__/brandStore.typescale.test.ts
git commit -m "feat(brandStore): setTypescale with dual-write to brand.typography"
```

### Task 23: Seed helper for first-open

**Files:**
- Create: `src/features/tools/typescale/hooks/useSeedTypescale.ts`

- [ ] **Step 1: Write helper**

```ts
// hooks/useSeedTypescale.ts
import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { Typescale, FontRef } from '@/shared/types/typescale';
import { buildLadder, toFluid, DEFAULT_SURFACES, defaultSemanticMap } from '../engine';
import { findCatalogEntry } from '@/shared/typography';

function refFromBrandFamily(family: string | undefined, roleFallback: string): FontRef {
  const catalog = family ? findCatalogEntry(family) : undefined;
  if (catalog) return catalog;
  return {
    family: family ?? roleFallback,
    source: family ? 'google' : 'system',
    weights: [400, 500, 700],
    italic: false,
    fallback: family ? 'system-ui, sans-serif' : 'system-ui, sans-serif',
  };
}

export function seedTypescale(brand?: Brand | null): Typescale {
  const headingFamily = brand?.typography?.primary?.family;
  const bodyFamily    = brand?.typography?.secondary?.family ?? headingFamily;
  const heading = refFromBrandFamily(headingFamily, 'Inter');
  const body    = refFromBrandFamily(bodyFamily,    'Inter');
  const surfaces = {} as Typescale['surfaces'];
  (['web','ui','presentation','social'] as const).forEach((key) => {
    const def = DEFAULT_SURFACES[key];
    let steps = buildLadder({ basePx: def.basePx, ratio: def.ratio.value, stepsUp: def.stepsUp, stepsDown: def.stepsDown, leading: def.leading, tracking: def.tracking });
    if (key === 'web' && def.fluid) steps = steps.map(s => toFluid(s, def.fluid!));
    surfaces[key] = { key, ...def, steps, semantic: defaultSemanticMap(key, steps) };
  });
  return {
    schemaVersion: 1,
    fonts: { heading, body },
    surfaces,
    activeSurface: 'web',
    updatedAt: new Date().toISOString(),
  };
}

export function useSeedTypescale(brand?: Brand | null): Typescale {
  return useMemo(() => seedTypescale(brand), [brand?.id, brand?.typography?.primary?.family, brand?.typography?.secondary?.family]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 24: Debounced draft hook

**Files:**
- Create: `src/features/tools/typescale/hooks/useTypescaleDraft.ts`

- [ ] **Step 1: Write hook**

```ts
// hooks/useTypescaleDraft.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import { useBrandStore } from '@/shared/store/brandStore';
import { ensurePairLoaded } from '@/shared/typography';

const DEBOUNCE_MS = 150;

export function useTypescaleDraft(brandId: string | undefined, initial: Typescale) {
  const setTypescale = useBrandStore(s => s.setTypescale);
  const [draft, setDraft] = useState<Typescale>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { ensurePairLoaded(initial.fonts); }, []);
  useEffect(() => { ensurePairLoaded(draft.fonts); }, [draft.fonts.heading.family, draft.fonts.body.family, draft.fonts.mono?.family]);

  const commit = useCallback((next: Typescale) => {
    if (!brandId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setTypescale(brandId, { ...next, updatedAt: new Date().toISOString() });
    }, DEBOUNCE_MS);
  }, [brandId, setTypescale]);

  const update = useCallback((patch: (prev: Typescale) => Typescale) => {
    setDraft(prev => {
      const next = patch(prev);
      commit(next);
      return next;
    });
  }, [commit]);

  return { draft, update };
}
```

- [ ] **Step 2: Commit Phase 4**

```bash
git add src/features/tools/typescale/hooks src/shared/store src/shared/store/__tests__
git commit -m "feat(typescale): seed + debounced draft hooks + brand store wiring"
```

---

## Phase 5 — Component skeleton

All components use shadcn/Radix + Tailwind. Keep layout minimal; polish later. Every component listed here has the same commit rule: typecheck passes, `npm run lint` passes, commit at the end of the phase.

### Task 25: `TypescaleEditor` root

**Files:**
- Create: `src/features/tools/typescale/components/TypescaleEditor.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/TypescaleEditor.tsx
import { useEffect, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import { useTypescaleDraft } from '../hooks/useTypescaleDraft';
import { FontPairPanel } from './FontPairPanel';
import { SurfaceTabs } from './SurfaceTabs';
import { ScaleControls } from './ScaleControls';
import { SemanticMap } from './SemanticMap';
import { PreviewTabs } from './preview/PreviewTabs';
import { ExportPanel } from './ExportPanel';
import { BrandSyncBar } from './BrandSyncBar';

interface Props {
  variant: 'full' | 'compact';
  brandId?: string;
  initial: Typescale;
  onClose?: () => void;
  showBrandSync?: boolean;
}

export function TypescaleEditor({ variant, brandId, initial, onClose, showBrandSync }: Props) {
  const { draft, update } = useTypescaleDraft(brandId, initial);
  const [activeSurface, setActiveSurface] = useState(initial.activeSurface);

  useEffect(() => { update(p => ({ ...p, activeSurface })); }, [activeSurface, update]);

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-4">
        {showBrandSync && brandId && <BrandSyncBar brandId={brandId} />}
        <FontPairPanel draft={draft} onChange={update} compact />
        <SurfaceTabs value={activeSurface} onChange={setActiveSurface} surfaces={draft.surfaces} />
        <ScaleControls surface={draft.surfaces[activeSurface]} onChange={(next) => update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))} compact />
        <PreviewTabs draft={draft} activeSurface={activeSurface} defaultTab="ladder" />
        {onClose && <div className="flex justify-end"><button className="btn-primary" onClick={onClose}>Done</button></div>}
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-[18rem_minmax(0,1fr)_22rem] gap-4">
      <aside className="space-y-4">
        <FontPairPanel draft={draft} onChange={update} />
      </aside>
      <main className="space-y-4">
        {showBrandSync && brandId && <BrandSyncBar brandId={brandId} />}
        <SurfaceTabs value={activeSurface} onChange={setActiveSurface} surfaces={draft.surfaces} />
        <PreviewTabs draft={draft} activeSurface={activeSurface} />
      </main>
      <aside className="space-y-4">
        <ScaleControls surface={draft.surfaces[activeSurface]} onChange={(next) => update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))} />
        <SemanticMap surface={draft.surfaces[activeSurface]} onChange={(next) => update(p => ({ ...p, surfaces: { ...p.surfaces, [activeSurface]: next } }))} />
        <ExportPanel draft={draft} />
      </aside>
    </div>
  );
}
```

### Task 26: `FontPairPanel`

**Files:**
- Create: `src/features/tools/typescale/components/FontPairPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useState } from 'react';
import type { Typescale, FontRef } from '@/shared/types/typescale';
import { GOOGLE_FONT_CATALOG, SYSTEM_FONT_CATALOG, findCatalogEntry } from '@/shared/typography';

interface Props {
  draft: Typescale;
  onChange: (patch: (prev: Typescale) => Typescale) => void;
  compact?: boolean;
}

export function FontPairPanel({ draft, onChange, compact }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  const setFont = (slot: 'heading' | 'body' | 'mono', ref: FontRef) => {
    onChange(p => ({ ...p, fonts: { ...p.fonts, [slot]: ref } }));
  };

  const catalog = [...SYSTEM_FONT_CATALOG, ...GOOGLE_FONT_CATALOG];

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Font pair</h3>
      {(['heading', 'body'] as const).map(slot => (
        <label key={slot} className="block space-y-1">
          <span className="text-xs capitalize text-muted-foreground">{slot}</span>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={draft.fonts[slot].family}
            onChange={e => {
              const found = findCatalogEntry(e.target.value);
              if (found) setFont(slot, found);
            }}
          >
            {catalog.map(f => <option key={`${f.source}:${f.family}`} value={f.family}>{f.family}</option>)}
          </select>
        </label>
      ))}
      {!compact && (
        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setShowUpload(true)}>
          Upload custom font…
        </button>
      )}
      {showUpload && <UploadPicker onPicked={(ref) => { setFont('heading', ref); setShowUpload(false); }} onCancel={() => setShowUpload(false)} />}
    </section>
  );
}

function UploadPicker({ onPicked, onCancel }: { onPicked: (ref: FontRef) => void; onCancel: () => void }) {
  // Minimal: accept a single file, read via URL.createObjectURL, build a FontRef.
  return (
    <div className="rounded border p-2 text-xs">
      <input
        type="file"
        accept=".woff2,.woff,.ttf"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const format = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : 'ttf';
          const ref: FontRef = {
            family: file.name.replace(/\.(woff2|woff|ttf)$/i, ''),
            source: 'upload',
            weights: [400],
            italic: false,
            files: [{ weight: 400, italic: false, url, format }],
            fallback: 'system-ui, sans-serif',
          };
          onPicked(ref);
        }}
      />
      <button type="button" className="ml-2 underline" onClick={onCancel}>Cancel</button>
    </div>
  );
}
```

### Task 27: `SurfaceTabs`

**Files:**
- Create: `src/features/tools/typescale/components/SurfaceTabs.tsx`

- [ ] **Step 1: Write component**

```tsx
import type { ScaleSurface, SurfaceKey } from '@/shared/types/typescale';

const LABELS: Record<SurfaceKey, string> = { web: 'Web', ui: 'UI', presentation: 'Presentation', social: 'Social' };

interface Props {
  value: SurfaceKey;
  onChange: (k: SurfaceKey) => void;
  surfaces: Record<SurfaceKey, ScaleSurface>;
}

export function SurfaceTabs({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border p-0.5 text-sm">
      {(Object.keys(LABELS) as SurfaceKey[]).map(k => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`px-3 py-1 rounded ${value === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  );
}
```

### Task 28: `ScaleControls`

**Files:**
- Create: `src/features/tools/typescale/components/ScaleControls.tsx`

- [ ] **Step 1: Write component**

```tsx
import type { LeadingCurve, ScaleSurface, TrackingCurve } from '@/shared/types/typescale';
import { buildLadder, toFluid, RATIOS } from '../engine';

interface Props {
  surface: ScaleSurface;
  onChange: (next: ScaleSurface) => void;
  compact?: boolean;
}

function rebuild(s: ScaleSurface): ScaleSurface {
  let steps = buildLadder({
    basePx: s.basePx,
    ratio: s.ratio.value,
    stepsUp: s.stepsUp,
    stepsDown: s.stepsDown,
    leading: s.leading,
    tracking: s.tracking,
  });
  if (s.key === 'web' && s.fluid) steps = steps.map(st => toFluid(st, s.fluid!));
  return { ...s, steps };
}

export function ScaleControls({ surface, onChange }: Props) {
  const set = (patch: Partial<ScaleSurface>) => onChange(rebuild({ ...surface, ...patch } as ScaleSurface));
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Scale</h3>
      <label className="block text-xs">
        Base size: {surface.basePx}px
        <input type="range" min={12} max={48} step={1} value={surface.basePx}
               onChange={e => set({ basePx: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block text-xs">
        Ratio
        <select
          className="w-full rounded border px-2 py-1"
          value={surface.ratio.name === 'custom' ? 'custom' : surface.ratio.name}
          onChange={e => {
            const name = e.target.value as keyof typeof RATIOS;
            set({ ratio: { name, value: RATIOS[name] } });
          }}
        >
          {Object.keys(RATIOS).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="block text-xs">Steps up: {surface.stepsUp}
        <input type="range" min={1} max={10} step={1} value={surface.stepsUp}
               onChange={e => set({ stepsUp: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block text-xs">Steps down: {surface.stepsDown}
        <input type="range" min={0} max={4} step={1} value={surface.stepsDown}
               onChange={e => set({ stepsDown: Number(e.target.value) })} className="w-full" />
      </label>
      <label className="block text-xs">Leading
        <select className="w-full rounded border px-2 py-1" value={surface.leading}
                onChange={e => set({ leading: e.target.value as LeadingCurve })}>
          <option value="tight">tight</option><option value="normal">normal</option><option value="loose">loose</option>
        </select>
      </label>
      <label className="block text-xs">Tracking
        <select className="w-full rounded border px-2 py-1" value={surface.tracking}
                onChange={e => set({ tracking: e.target.value as TrackingCurve })}>
          <option value="tight">tight</option><option value="normal">normal</option><option value="loose">loose</option>
        </select>
      </label>
      {surface.key === 'web' && surface.fluid && (
        <fieldset className="space-y-2 text-xs">
          <legend className="font-medium">Fluid</legend>
          <label>Min vw: {surface.fluid.minVwPx}px
            <input type="range" min={280} max={640} step={10} value={surface.fluid.minVwPx}
                   onChange={e => set({ fluid: { ...surface.fluid!, minVwPx: Number(e.target.value) } })} className="w-full" />
          </label>
          <label>Max vw: {surface.fluid.maxVwPx}px
            <input type="range" min={1024} max={1920} step={20} value={surface.fluid.maxVwPx}
                   onChange={e => set({ fluid: { ...surface.fluid!, maxVwPx: Number(e.target.value) } })} className="w-full" />
          </label>
          <label>Min ratio × base: {surface.fluid.minRatioMultiplier}
            <input type="range" min={0.5} max={1} step={0.05} value={surface.fluid.minRatioMultiplier}
                   onChange={e => set({ fluid: { ...surface.fluid!, minRatioMultiplier: Number(e.target.value) } })} className="w-full" />
          </label>
        </fieldset>
      )}
    </section>
  );
}
```

### Task 29: `SemanticMap`

**Files:**
- Create: `src/features/tools/typescale/components/SemanticMap.tsx`

- [ ] **Step 1: Write component**

```tsx
import type { ScaleSurface, SemanticRole } from '@/shared/types/typescale';

const ROLES: SemanticRole[] = ['display','h1','h2','h3','h4','h5','h6','bodyLg','body','bodySm','caption','overline','label','button','code'];

interface Props {
  surface: ScaleSurface;
  onChange: (next: ScaleSurface) => void;
}

export function SemanticMap({ surface, onChange }: Props) {
  return (
    <section className="space-y-2 rounded-lg border p-4 text-xs">
      <h3 className="text-sm font-medium">Roles</h3>
      <table className="w-full">
        <thead><tr className="text-muted-foreground"><th className="text-left">role</th><th>step</th><th>font</th><th>weight</th></tr></thead>
        <tbody>
          {ROLES.map(role => {
            const entry = surface.semantic[role];
            if (!entry) return null;
            return (
              <tr key={role} className="border-t">
                <td className="py-1">{role}</td>
                <td>
                  <select
                    value={entry.stepId}
                    onChange={e => onChange({ ...surface, semantic: { ...surface.semantic, [role]: { ...entry, stepId: e.target.value } } })}
                    className="rounded border px-1"
                  >
                    {surface.steps.map(s => <option key={s.id} value={s.id}>{s.id} ({s.sizePx}px)</option>)}
                  </select>
                </td>
                <td>
                  <select
                    value={entry.font}
                    onChange={e => onChange({ ...surface, semantic: { ...surface.semantic, [role]: { ...entry, font: e.target.value as 'heading'|'body'|'mono' } } })}
                    className="rounded border px-1"
                  >
                    <option>heading</option><option>body</option><option>mono</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number" min={100} max={900} step={100} value={entry.weight ?? 400}
                    onChange={e => onChange({ ...surface, semantic: { ...surface.semantic, [role]: { ...entry, weight: Number(e.target.value) } } })}
                    className="w-16 rounded border px-1"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
```

### Task 30: Preview components

**Files:**
- Create: `src/features/tools/typescale/components/preview/PreviewTabs.tsx`
- Create: `src/features/tools/typescale/components/preview/EditorialPreview.tsx`
- Create: `src/features/tools/typescale/components/preview/UIPreview.tsx`
- Create: `src/features/tools/typescale/components/preview/LadderPreview.tsx`

- [ ] **Step 1: `LadderPreview`**

```tsx
// LadderPreview.tsx
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

export function LadderPreview({ draft, activeSurface }: Props) {
  const surface = draft.surfaces[activeSurface];
  return (
    <div className="space-y-2 rounded-lg border p-4">
      {[...surface.steps].sort((a,b)=>b.index-a.index).map(s => (
        <div key={s.id} className="flex items-baseline gap-3 border-b pb-2 last:border-none">
          <span className="w-12 shrink-0 text-xs text-muted-foreground">{s.id}</span>
          <span
            style={{
              fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`,
              fontSize: s.fluid?.clamp ?? `${s.sizePx}px`,
              lineHeight: s.lineHeight,
              letterSpacing: `${s.letterSpacingEm}em`,
              fontWeight: s.weight,
            }}
          >Quick brown fox</span>
          <span className="ml-auto text-xs text-muted-foreground">{s.sizePx}px · {s.lineHeight} · {s.letterSpacingEm}em · {s.weight}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `EditorialPreview`**

```tsx
// EditorialPreview.tsx
import type { Typescale, SurfaceKey, SemanticRole } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

function styleFor(draft: Typescale, surfaceKey: SurfaceKey, role: SemanticRole): React.CSSProperties | undefined {
  const surface = draft.surfaces[surfaceKey];
  const entry = surface.semantic[role];
  if (!entry) return undefined;
  const step = surface.steps.find(s => s.id === entry.stepId);
  if (!step) return undefined;
  const font = entry.font === 'mono'
    ? draft.fonts.mono
    : entry.font === 'body' ? draft.fonts.body : draft.fonts.heading;
  return {
    fontFamily: `"${font!.family}", ${font!.fallback}`,
    fontSize: step.fluid?.clamp ?? `${step.sizePx}px`,
    lineHeight: step.lineHeight,
    letterSpacing: `${step.letterSpacingEm}em`,
    fontWeight: entry.weight ?? step.weight,
    textTransform: entry.transform === 'uppercase' ? 'uppercase' : entry.transform === 'lowercase' ? 'lowercase' : 'none',
  };
}

export function EditorialPreview({ draft, activeSurface }: Props) {
  return (
    <article className="rounded-lg border p-6 space-y-4">
      <h1 style={styleFor(draft, activeSurface, 'h1')}>A typographic system for your brand</h1>
      <h2 style={styleFor(draft, activeSurface, 'h2')}>Set the rhythm, everywhere</h2>
      <p style={styleFor(draft, activeSurface, 'body')}>
        BrandOS turns one typographic decision into a system — for web, UI, presentations, and social
        designs. The same pair, tuned per medium, exported in every format you need.
      </p>
      <h3 style={styleFor(draft, activeSurface, 'h3')}>How it works</h3>
      <p style={styleFor(draft, activeSurface, 'body')}>
        Pick a pair, tune base and ratio per surface, let the engine handle leading and tracking.
        Drop the export into your codebase or Figma and you're done.
      </p>
      <blockquote style={styleFor(draft, activeSurface, 'bodyLg')}>“Typography is what language looks like.” — Ellen Lupton</blockquote>
      <p style={styleFor(draft, activeSurface, 'caption')}>Caption: read the small print.</p>
    </article>
  );
}
```

- [ ] **Step 3: `UIPreview`**

```tsx
// UIPreview.tsx
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';

interface Props { draft: Typescale; activeSurface: SurfaceKey; }

export function UIPreview({ draft, activeSurface }: Props) {
  const surface = draft.surfaces[activeSurface];
  const size = (role: keyof typeof surface.semantic) => {
    const entry = surface.semantic[role]; if (!entry) return undefined;
    const step = surface.steps.find(s => s.id === entry.stepId); if (!step) return undefined;
    return step.fluid?.clamp ?? `${step.sizePx}px`;
  };
  return (
    <div className="rounded-lg border p-6 bg-background">
      <div style={{ fontFamily: `"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`, fontSize: size('h1') }}>
        Dashboard
      </div>
      <div style={{ fontFamily: `"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`, fontSize: size('body') }} className="mt-2 text-muted-foreground">
        Revenue over the last 30 days
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {['Sessions','Conversions','Revenue'].map((label) => (
          <div key={label} className="rounded border p-3">
            <div style={{ fontFamily:`"${draft.fonts.body.family}", ${draft.fonts.body.fallback}`, fontSize: size('caption') }} className="text-muted-foreground">{label}</div>
            <div style={{ fontFamily:`"${draft.fonts.heading.family}", ${draft.fonts.heading.fallback}`, fontSize: size('h3') }}>12,840</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `PreviewTabs`**

```tsx
// PreviewTabs.tsx
import { useState } from 'react';
import type { Typescale, SurfaceKey } from '@/shared/types/typescale';
import { EditorialPreview } from './EditorialPreview';
import { UIPreview } from './UIPreview';
import { LadderPreview } from './LadderPreview';

type Tab = 'editorial' | 'ui' | 'ladder';

interface Props { draft: Typescale; activeSurface: SurfaceKey; defaultTab?: Tab; }

export function PreviewTabs({ draft, activeSurface, defaultTab = 'editorial' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border p-0.5 text-xs">
        {(['editorial','ui','ladder'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${tab===t?'bg-primary text-primary-foreground':'text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'editorial' && <EditorialPreview draft={draft} activeSurface={activeSurface} />}
      {tab === 'ui' && <UIPreview draft={draft} activeSurface={activeSurface} />}
      {tab === 'ladder' && <LadderPreview draft={draft} activeSurface={activeSurface} />}
    </div>
  );
}
```

### Task 31: `ExportPanel`

**Files:**
- Create: `src/features/tools/typescale/components/ExportPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useMemo, useState } from 'react';
import type { Typescale } from '@/shared/types/typescale';
import {
  serializeCss, serializeTailwindV3, serializeTailwindV4, serializeScss,
  serializeJs, serializeJson, serializeW3c, serializeFigmaTokens, serializeFontSnippet,
} from '../export';

type Fmt = 'css'|'tw3'|'tw4'|'scss'|'js'|'json'|'w3c'|'figma'|'fonts';
const FORMATS: Array<[Fmt, string, (t: Typescale) => string]> = [
  ['css',   'CSS vars',       serializeCss],
  ['tw3',   'Tailwind v3',    serializeTailwindV3],
  ['tw4',   'Tailwind v4',    serializeTailwindV4],
  ['scss',  'SCSS',           serializeScss],
  ['js',    'JS/TS',          serializeJs],
  ['json',  'JSON',           serializeJson],
  ['w3c',   'W3C Tokens',     serializeW3c],
  ['figma', 'Figma Tokens',   serializeFigmaTokens],
  ['fonts', '@font-face',     serializeFontSnippet],
];

export function ExportPanel({ draft }: { draft: Typescale }) {
  const [fmt, setFmt] = useState<Fmt>('css');
  const selected = FORMATS.find(([k]) => k === fmt)!;
  const content = useMemo(() => selected[2](draft), [draft, fmt]);
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Export</h3>
      <div className="flex flex-wrap gap-1 text-xs">
        {FORMATS.map(([k, label]) => (
          <button key={k} onClick={() => setFmt(k)}
            className={`px-2 py-1 rounded ${k===fmt?'bg-primary text-primary-foreground':'bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      <pre className="max-h-64 overflow-auto rounded border bg-muted/30 p-2 text-[11px] leading-snug">{content}</pre>
      <div className="flex gap-2">
        <button className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
                onClick={() => navigator.clipboard.writeText(content)}>Copy</button>
      </div>
    </section>
  );
}
```

### Task 32: `BrandSyncBar`

**Files:**
- Create: `src/features/tools/typescale/components/BrandSyncBar.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useBrandStore } from '@/shared/store/brandStore';

interface Props { brandId: string; }

export function BrandSyncBar({ brandId }: Props) {
  const brand = useBrandStore(s => s.brands.find(b => b.id === brandId));
  if (!brand) return null;
  const when = brand.typescale?.updatedAt;
  return (
    <div className="flex items-center justify-between rounded border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
      <span>Synced to <strong className="text-foreground">{brand.name}</strong></span>
      <span>{when ? `Saved ${new Date(when).toLocaleTimeString()}` : 'Not saved yet'}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit Phase 5**

```bash
npm run typecheck
git add src/features/tools/typescale/components
git commit -m "feat(typescale): editor components (font pair, surface tabs, controls, roles, previews, export)"
```

---

## Phase 6 — Tool registration, routes, public landing

### Task 33: Add `'typescale'` to `ToolSlug`

**Files:**
- Modify: `src/features/tools/core/types.ts`

- [ ] **Step 1: Add slug**

Find the `ToolSlug` union and add `'typescale'`:

```ts
// BEFORE
export type ToolSlug = 'ui-color-system' | 'logo-variant-generator';

// AFTER
export type ToolSlug = 'ui-color-system' | 'logo-variant-generator' | 'typescale';
```

- [ ] **Step 2: Typecheck**

Expected: will fail in `toolRegistry.ts` because the registry object is missing the `typescale` key — fix in next task.

### Task 34: Register in `toolRegistry`

**Files:**
- Modify: `src/features/tools/core/toolRegistry.ts`

- [ ] **Step 1: Add the entry**

Add an import for the icon and the registry entry:

```ts
import { Type, Wand2, Palette } from 'lucide-react';

// ...inside TOOL_REGISTRY:
  'typescale': {
    slug: 'typescale',
    name: 'Typescale Generator',
    tagline: 'Build a typography system your whole brand can use.',
    description:
      'Pick a font pair, tune the scale for web, UI, presentations, and social — then export ' +
      'CSS, Tailwind v3/v4, SCSS, W3C design tokens, and Figma Tokens Studio. Free.',
    seo: {
      title: 'Typescale Generator — Build a typography system — BrandOS',
      description:
        'Free modern typescale tool. Pick Google Fonts, generate a fluid scale, export CSS, ' +
        'Tailwind, and W3C design tokens.',
      keywords: [
        'typescale generator',
        'type scale',
        'modular scale',
        'fluid typography',
        'tailwind typography',
        'design tokens typography',
        'google fonts pair',
        'type hierarchy',
      ],
    },
    Icon: Type,
  },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 35: Routes + landing + Studio mount

**Files:**
- Create: `src/features/tools/typescale/routes.tsx`
- Create: `src/features/tools/typescale/public/TypescaleLanding.tsx`
- Create: `src/features/tools/typescale/index.ts`

- [ ] **Step 1: `TypescaleLanding`**

```tsx
// public/TypescaleLanding.tsx
import { ToolLanding } from '@/features/tools/core';

export function TypescaleLanding() {
  return (
    <ToolLanding
      slug="typescale"
      hero={{
        title: 'Build a typography system your whole brand can use.',
        subtitle: 'Pick a font pair. Tune the scale per medium. Export to every format that matters.',
        cta: 'Start building',
      }}
    />
  );
}
```

> **If `ToolLanding` prop signature differs** from the above, open `src/features/tools/core/ToolLanding.tsx` and adapt — copy `ui-color-system/public/PublicLanding.tsx` as the reference pattern.

- [ ] **Step 2: `routes.tsx` (studio mounts for both modes)**

```tsx
// routes.tsx
import { useParams } from 'react-router-dom';
import { ToolShell } from '@/features/tools/core';
import { useBrandStore } from '@/shared/store/brandStore';
import { TypescaleEditor } from './components/TypescaleEditor';
import { useSeedTypescale } from './hooks/useSeedTypescale';

export function InAppTypescaleStudio() {
  const { slug } = useParams<{ slug: string }>();
  const brand = useBrandStore(s => s.brands.find(b => b.slug === slug));
  const seed = useSeedTypescale(brand);
  const initial = brand?.typescale ?? seed;
  if (!brand) return <div className="p-8">Brand not found.</div>;
  return (
    <ToolShell slug="typescale">
      <TypescaleEditor variant="full" brandId={brand.id} initial={initial} showBrandSync />
    </ToolShell>
  );
}

export function PublicTypescaleStudio() {
  const seed = useSeedTypescale(null);
  return (
    <ToolShell slug="typescale">
      <TypescaleEditor variant="full" initial={seed} />
    </ToolShell>
  );
}
```

- [ ] **Step 3: Barrel**

```ts
// index.ts
export * from './components/TypescaleEditor';
export * from './EmbeddedTypescaleDialog';
export * from './routes';
export { TypescaleLanding } from './public/TypescaleLanding';
```

### Task 36: Wire routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add lazy imports + routes**

Follow the exact pattern used for `ui-color-system` in `App.tsx` (search for `ui-color-system` to find the three route definitions and lazy import). Add matching entries for typescale:

```tsx
// Near other lazy imports:
const TypescaleLanding = lazy(() => import('@/features/tools/typescale').then(m => ({ default: m.TypescaleLanding })));
const PublicTypescaleStudio = lazy(() => import('@/features/tools/typescale').then(m => ({ default: m.PublicTypescaleStudio })));
const InAppTypescaleStudio = lazy(() => import('@/features/tools/typescale').then(m => ({ default: m.InAppTypescaleStudio })));

// Inside <Routes>:
<Route path="/tools/typescale" element={<TypescaleLanding />} />
<Route path="/tools/typescale/studio" element={<PublicTypescaleStudio />} />
<Route path="/b/:slug/tools/typescale" element={<InAppTypescaleStudio />} />
<Route path="/dashboard/brand/:slug/tools/typescale" element={<InAppTypescaleStudio />} />
```

> **If `ui-color-system`'s public route structure is different** (for example, a single `/tools/ui-color-system` that swaps landing/studio on auth state), mirror that pattern instead of the four-route form above.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

### Task 37: Wrap exports and save-to-brand in `ToolGate` for public mode

**Files:**
- Modify: `src/features/tools/typescale/components/ExportPanel.tsx`

- [ ] **Step 1: Wrap Copy action**

```tsx
// At top:
import { ToolGate } from '@/features/tools/core';

// Replace the <button ...>Copy</button> with:
<ToolGate feature="export-any">
  <button className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
          onClick={() => navigator.clipboard.writeText(content)}>Copy</button>
</ToolGate>
```

> `ToolGate` already knows mode/auth via `useToolSession` from the tools platform. In in-app mode it's a passthrough; in public anonymous mode it shows the signup modal on click.

- [ ] **Step 2: Commit Phase 6**

```bash
git add src/features/tools/typescale src/features/tools/core src/App.tsx
git commit -m "feat(typescale): register tool, public landing, routes, export gate"
```

---

## Phase 7 — Claim flow + public-mode persistence

### Task 38: Anon-session persistence

**Files:**
- Modify: `src/features/tools/typescale/hooks/useTypescaleDraft.ts`

- [ ] **Step 1: Persist to tool session when `brandId` is missing**

Wrap `commit` so public mode goes through `useToolSession`:

```ts
// top:
import { useToolSession } from '@/features/tools/core';

// inside hook:
const session = useToolSession('typescale');

// Replace commit:
const commit = useCallback((next: Typescale) => {
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(() => {
    const ts = { ...next, updatedAt: new Date().toISOString() };
    if (brandId) {
      setTypescale(brandId, ts);
    } else {
      session.update({ typescale: ts });
    }
  }, DEBOUNCE_MS);
}, [brandId, setTypescale, session]);
```

> **Adapter note:** the exact API of `useToolSession` may take the session state shape differently. Open `src/features/tools/core/useToolSession.ts` and conform. The existing `ui-color-system` tool is the reference — match its persistence call.

### Task 39: Claim module

**Files:**
- Create: `src/features/tools/typescale/claim.ts`

- [ ] **Step 1: Write claim function**

```ts
// claim.ts
import type { Brand } from '@/shared/types/brand';
import type { Typescale, FontRef } from '@/shared/types/typescale';

export interface TypescaleClaimInput {
  /** Shape we write to the anon session — see hooks/useTypescaleDraft */
  typescale: Typescale;
  /** Uploaded font blobs, if any (public mode only) */
  uploadedBlobs?: Array<{ family: string; blob: Blob; format: 'woff2'|'woff'|'ttf'; weight: number; italic: boolean }>;
}

/**
 * Materialize a public-mode typescale onto a real brand.
 * - Uploaded fonts are moved to Supabase Storage (same bucket as brand assets) and
 *   their blob URLs are rewritten in `typescale.fonts.*.files[].url`.
 * - The structured typescale is written to `brand.typescale`.
 * - Dual-write to `brand.typography` happens through `setTypescale` which the
 *   caller should invoke after this function returns the rewritten typescale.
 */
export async function materializeTypescale(
  brand: Brand,
  input: TypescaleClaimInput,
  uploadFn: (args: { blob: Blob; path: string }) => Promise<{ url: string }>,
): Promise<Typescale> {
  const remapFont = async (ref: FontRef): Promise<FontRef> => {
    if (ref.source !== 'upload') return ref;
    const blobs = input.uploadedBlobs?.filter(b => b.family === ref.family) ?? [];
    if (blobs.length === 0) return ref;
    const files = await Promise.all(blobs.map(async (b, i) => {
      const path = `brands/${brand.id}/fonts/${ref.family}-${b.weight}${b.italic ? 'i' : ''}.${b.format}`;
      const { url } = await uploadFn({ blob: b.blob, path });
      return { weight: b.weight, italic: b.italic, url, format: b.format };
    }));
    return { ...ref, files };
  };
  const heading = await remapFont(input.typescale.fonts.heading);
  const body    = await remapFont(input.typescale.fonts.body);
  const mono    = input.typescale.fonts.mono ? await remapFont(input.typescale.fonts.mono) : undefined;
  return {
    ...input.typescale,
    fonts: { heading, body, ...(mono ? { mono } : {}) },
    updatedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Wire into the platform claim pipeline**

Open `src/features/tools/core/claim.ts` and add a dispatch for `slug === 'typescale'` that calls `materializeTypescale` then `brandStore.setTypescale(newBrand.id, …)`. Follow the exact pattern the existing `ui-color-system` claim uses in that file.

- [ ] **Step 3: Commit Phase 7**

```bash
git add src/features/tools/typescale src/features/tools/core/claim.ts
git commit -m "feat(typescale): anon session + claim flow (public → brand)"
```

---

## Phase 8 — Embedded dialog + brand-editor integrations

### Task 40: `EmbeddedTypescaleDialog`

**Files:**
- Create: `src/features/tools/typescale/EmbeddedTypescaleDialog.tsx`

- [ ] **Step 1: Write component**

```tsx
// EmbeddedTypescaleDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBrandStore } from '@/shared/store/brandStore';
import { TypescaleEditor } from './components/TypescaleEditor';
import { useSeedTypescale } from './hooks/useSeedTypescale';

interface Props {
  brandId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EmbeddedTypescaleDialog({ brandId, open, onOpenChange }: Props) {
  const brand = useBrandStore(s => s.brands.find(b => b.id === brandId));
  const seed = useSeedTypescale(brand);
  if (!brand) return null;
  const initial = brand.typescale ?? seed;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Typescale — {brand.name}</DialogTitle></DialogHeader>
        <TypescaleEditor
          variant="compact"
          brandId={brandId}
          initial={initial}
          onClose={() => onOpenChange(false)}
          showBrandSync
        />
      </DialogContent>
    </Dialog>
  );
}
```

> **If `@/components/ui/dialog` path differs** in this project, open `src/components/ui/` and use the actual shadcn dialog export.

### Task 41: Hook into Brand Board's `TypographyPanel`

**Files:**
- Modify: `src/features/brand-board/panels/TypographyPanel.tsx`

- [ ] **Step 1: Add "Edit scale" button + dialog**

At the top of the component function, add:

```tsx
import { useState } from 'react';
import { EmbeddedTypescaleDialog } from '@/features/tools/typescale';
// ...inside component:
const [open, setOpen] = useState(false);
```

In the rendered panel, add a button (use existing Button component conventions in that file):

```tsx
<Button variant="outline" size="sm" onClick={() => setOpen(true)}>Edit scale</Button>
{brand?.id && <EmbeddedTypescaleDialog brandId={brand.id} open={open} onOpenChange={setOpen} />}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Open Brand Board for a brand, open the Typography panel, click "Edit scale" — dialog should open and changes should reflect live in the BrandBoardCanvas heading/body CSS custom properties (`--bb-weight-heading` etc.) via the dual-write into `brand.typography`.

### Task 42: Hook into Identity → Typography tab

**Files:**
- Modify: the Identity Typography tab component (search for `/identity` route and the `Typography` tab inside `src/features/brand/`)

- [ ] **Step 1: Add "Open typescale editor" button + dialog**

```tsx
// at top of the tab component:
import { useState } from 'react';
import { EmbeddedTypescaleDialog } from '@/features/tools/typescale';

// inside the component, above the return:
const [typescaleOpen, setTypescaleOpen] = useState(false);

// in the rendered tab (near the existing font selection UI):
<Button variant="outline" size="sm" onClick={() => setTypescaleOpen(true)}>
  Open typescale editor
</Button>
{brand?.id && (
  <EmbeddedTypescaleDialog
    brandId={brand.id}
    open={typescaleOpen}
    onOpenChange={setTypescaleOpen}
  />
)}
```

The dialog mutates `brand.typescale` + dual-writes `brand.typography`, so the surrounding Typography tab re-renders on close with the new font family and scale.

### Task 43: Hook into Brand Setup

**Files:**
- Modify: `src/features/setup/` (the Setup page that was introduced in recent commits: `237cc77 feat(ux-v2): persist Setup edits to the brand store`)

- [ ] **Step 1: Locate the typography step in setup**

Run: `grep -rn "typography\|font" src/features/setup/ 2>/dev/null | head`

In the step that handles fonts, add a "Open typescale editor" button that opens `EmbeddedTypescaleDialog`. If there isn't a typography step yet, add one that mounts the dialog as its primary action.

```tsx
// at top of the setup step component:
import { useState } from 'react';
import { EmbeddedTypescaleDialog } from '@/features/tools/typescale';
import { useBrandStore } from '@/shared/store/brandStore';

// inside component:
const [open, setOpen] = useState(false);
const activeBrand = useBrandStore(s => s.brands.find(b => b.slug === /* existing slug source */));

// in JSX:
<button
  type="button"
  className="w-full rounded-lg border p-4 text-left hover:bg-muted/40"
  onClick={() => setOpen(true)}
>
  <div className="font-medium">Typography</div>
  <div className="text-sm text-muted-foreground">
    Pick fonts and tune your scale for web, UI, presentation and social.
  </div>
</button>
{activeBrand?.id && (
  <EmbeddedTypescaleDialog
    brandId={activeBrand.id}
    open={open}
    onOpenChange={setOpen}
  />
)}
```

- [ ] **Step 2: Commit Phase 8**

```bash
git add src/features/tools/typescale/EmbeddedTypescaleDialog.tsx src/features/brand-board src/features/brand src/features/setup
git commit -m "feat(typescale): embedded dialog + integration into Brand Board, Identity, Setup"
```

---

## Phase 9 — Component tests + final checks

### Task 44: Component tests (editor + export panel)

**Files:**
- Create: `src/features/tools/typescale/components/__tests__/TypescaleEditor.test.tsx`
- Create: `src/features/tools/typescale/components/__tests__/ExportPanel.test.tsx`

- [ ] **Step 1: `TypescaleEditor` test (renders both variants)**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypescaleEditor } from '../TypescaleEditor';
import { seedTypescale } from '../../hooks/useSeedTypescale';

describe('TypescaleEditor', () => {
  it('renders full variant', () => {
    const initial = seedTypescale(null);
    render(<TypescaleEditor variant="full" initial={initial} />);
    expect(screen.getByText(/Font pair/i)).toBeInTheDocument();
    expect(screen.getByText(/Export/i)).toBeInTheDocument();
  });
  it('renders compact variant without export panel', () => {
    const initial = seedTypescale(null);
    render(<TypescaleEditor variant="compact" initial={initial} />);
    expect(screen.getByText(/Font pair/i)).toBeInTheDocument();
    expect(screen.queryByText(/Export/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: `ExportPanel` test (format switch + copy)**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportPanel } from '../ExportPanel';
import { seedTypescale } from '../../hooks/useSeedTypescale';

describe('ExportPanel', () => {
  it('switches format on tab click', () => {
    render(<ExportPanel draft={seedTypescale(null)} />);
    fireEvent.click(screen.getByText(/Tailwind v4/i));
    expect(screen.getByText(/@theme/)).toBeInTheDocument();
  });
  it('copies content to clipboard on Copy click', async () => {
    const write = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText: write } });
    render(<ExportPanel draft={seedTypescale(null)} />);
    fireEvent.click(screen.getByText('Copy'));
    expect(write).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run all typescale tests**

Run: `npx vitest run src/features/tools/typescale`
Expected: PASS

### Task 45: Manual test matrix

- [ ] **Step 1: Dev server + walkthrough**

Run: `npm run dev`

Walk the matrix from the spec:
1. Open `/b/<existing-slug>/tools/typescale` → seeds from brand fonts → change ratio → Brand Board and Identity reflect new heading size.
2. Open Brand Board → Typography panel → "Edit scale" → body font change → close → Identity Typography tab reflects it.
3. Open `/tools/typescale` in an incognito window → tweak scale → sign up → new brand created, typescale attached, land on `/b/<new>/tools/typescale`.
4. Upload a `.woff2` in-app → open Export → `@font-face` tab → snippet references the Supabase URL (not `blob:`).
5. Switch to Presentation → base jumps to 24 → Tailwind v4 export contains `--text-presentation-h1`.

Mark any deviations as follow-ups; do NOT retrofit them in this plan — capture in a new spec.

### Task 46: Final commit + push

- [ ] **Step 1: Typecheck + lint + tests**

```bash
npm run typecheck && npm run lint && npm run test
```
Expected: PASS all

- [ ] **Step 2: Push**

```bash
git push origin dev
```

---

## Execution notes

- Types-first, tests-first for Phase 1–3 (engine + exports). These are the foundations; getting them right makes the UI work trivial.
- `strictNullChecks` is OFF in this repo — still write non-null code where possible; don't lean on the escape hatch.
- Follow the tools-platform hard constraints: no imports from `src/shared/services/export/vectorize/*`, no edits to `EditorWorkspace`, engines/exports stay pure TS.
- Reuse `ToolShell` / `ToolGate` / `useToolSession` / `ToolLanding` — do not fork them.
- Keep commit boundaries at phase boundaries (plus tiny commits inside phases for each module where the plan says "commit").
- Per project convention: push to `origin dev` only at the end; don't mirror to `x` unless the user asks.
