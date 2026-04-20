# Onboarding v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a parallel `/onboarding-v3` flow (Set up + Create: Define/Feel/Generate) from the `docs/onboard/` mockups, without modifying the existing `/onboarding` or `/onboarding-brand` routes.

**Architecture:** A new feature module at `src/features/onboarding-v3/` with scoped Cosmos design tokens, a single Zustand store, four new Supabase Edge Functions, and a `LogoEngine` interface that stubs out until the real engine arrives. The Generate step reuses `generateBrand()` from `onboarding-brand`.

**Tech Stack:** React 18 + TypeScript, Vite 5, Tailwind 3 + shadcn, Zustand 5 (persist), Framer Motion 12, react-dropzone (new dep), Supabase (DB + Storage + Edge Functions + pg_cron), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-20-onboarding-v3-design.md`

---

## Phase 1 — Foundation

### Task 1: Install dependencies and scaffold directories

**Files:**
- Modify: `package.json`
- Create: `src/features/onboarding-v3/components/.gitkeep`
- Create: `src/features/onboarding-v3/screens/.gitkeep`
- Create: `src/features/onboarding-v3/steps/.gitkeep`
- Create: `src/features/onboarding-v3/services/.gitkeep`
- Create: `src/features/onboarding-v3/store/.gitkeep`
- Create: `src/features/onboarding-v3/styles/.gitkeep`
- Create: `src/features/onboarding-v3/utils/.gitkeep`
- Create: `src/pages/onboarding-v3/.gitkeep`
- Create: `supabase/functions/generate-description/.gitkeep`
- Create: `supabase/functions/fetch-url-preview/.gitkeep`
- Create: `supabase/functions/finalize-onboarding-assets/.gitkeep`
- Create: `supabase/functions/cleanup-onboarding-scratch/.gitkeep`

- [ ] **Step 1: Install `react-dropzone`**

Run:
```bash
npm install react-dropzone@^14.2.3
```

- [ ] **Step 2: Create directory skeleton**

Run:
```bash
mkdir -p src/features/onboarding-v3/{components,screens,steps,services,store,styles,utils}
mkdir -p src/pages/onboarding-v3
mkdir -p supabase/functions/{generate-description,fetch-url-preview,finalize-onboarding-assets,cleanup-onboarding-scratch}
touch src/features/onboarding-v3/{components,screens,steps,services,store,styles,utils}/.gitkeep
touch src/pages/onboarding-v3/.gitkeep
touch supabase/functions/{generate-description,fetch-url-preview,finalize-onboarding-assets,cleanup-onboarding-scratch}/.gitkeep
```

- [ ] **Step 3: Verify install succeeded**

Run:
```bash
npm run typecheck
```

Expected: PASS (no type errors introduced).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/features/onboarding-v3 src/pages/onboarding-v3 supabase/functions
git commit -m "chore(onboarding-v3): scaffold directories and install react-dropzone"
```

---

### Task 2: Cosmos design tokens and Tailwind bridge

**Files:**
- Create: `src/features/onboarding-v3/styles/cosmos.css`
- Modify: `tailwind.config.ts`
- Modify: `src/index.css` (import cosmos.css)

- [ ] **Step 1: Create the token stylesheet**

Create `src/features/onboarding-v3/styles/cosmos.css`:

```css
/* Scoped Cosmos tokens for /onboarding-v3. Applied only when a parent has
 * data-onboarding="cosmos" so tokens don't leak into the rest of the app. */

[data-onboarding="cosmos"] {
  --background: #f5f4ef;
  --surface: #ffffff;
  --surface-elevated: #ffffff;
  --surface-hover: #faf9f5;
  --surface-sunken: #efede6;

  --border: #e6e4dd;
  --border-strong: #d6d4cc;
  --dash: #c8c6bd;
  --dash-strong: #6b6963;

  --text-primary: #0e0e0e;
  --text-secondary: #6b6963;
  --text-muted: #9a988f;

  --accent: #111113;
  --accent-hover: #2a2a2a;
  --accent-active: #000000;
  --accent-muted: rgba(17, 17, 19, 0.07);
  --accent-ring: rgba(17, 17, 19, 0.16);
  --accent-contrast: #ffffff;

  --shadow-xs: 0 1px 2px rgba(16, 16, 20, 0.05);
  --shadow-sm: 0 2px 6px rgba(16, 16, 20, 0.06);
  --shadow-md: 0 8px 24px rgba(16, 16, 20, 0.08);

  --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
}

:root.dark [data-onboarding="cosmos"],
[data-onboarding="cosmos"][data-theme="dark"] {
  --background: #0d0d0d;
  --surface: #161616;
  --surface-elevated: #1c1c1c;
  --surface-hover: #1f1f1f;
  --surface-sunken: #262626;

  --border: #2a2a2a;
  --border-strong: #3a3a3a;
  --dash: #363636;
  --dash-strong: #8a8a86;

  --text-primary: #f5f4f0;
  --text-secondary: #a8a6a0;
  --text-muted: #6e6c67;

  --accent: #f5f4f0;
  --accent-hover: #ffffff;
  --accent-active: #e3e0d9;
  --accent-muted: rgba(245, 244, 240, 0.10);
  --accent-ring: rgba(245, 244, 240, 0.24);
  --accent-contrast: #0d0d0d;

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.45);
  --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.55);
}

[data-onboarding="cosmos"] {
  background: var(--background);
  color: var(--text-primary);
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

@keyframes cosmos-dash-march {
  to { stroke-dashoffset: -24; }
}
```

- [ ] **Step 2: Import the stylesheet globally**

Modify `src/index.css` — add at the top of the file, after any existing `@tailwind` directives:

```css
@import './features/onboarding-v3/styles/cosmos.css';
```

- [ ] **Step 3: Extend Tailwind theme**

Modify `tailwind.config.ts` — inside `theme.extend.colors`, add a `cosmos` object:

```ts
cosmos: {
  bg: 'var(--background)',
  surface: 'var(--surface)',
  'surface-elevated': 'var(--surface-elevated)',
  'surface-hover': 'var(--surface-hover)',
  'surface-sunken': 'var(--surface-sunken)',
  border: 'var(--border)',
  'border-strong': 'var(--border-strong)',
  dash: 'var(--dash)',
  'dash-strong': 'var(--dash-strong)',
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  accent: 'var(--accent)',
  'accent-hover': 'var(--accent-hover)',
  'accent-contrast': 'var(--accent-contrast)',
},
```

- [ ] **Step 4: Verify typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding-v3/styles/cosmos.css src/index.css tailwind.config.ts
git commit -m "feat(onboarding-v3): add scoped Cosmos design tokens and Tailwind bridge"
```

---

### Task 3: Shared types

**Files:**
- Create: `src/features/onboarding-v3/types.ts`

- [ ] **Step 1: Create the types file**

Create `src/features/onboarding-v3/types.ts`:

```ts
export type HexColor = `#${string}`;

export interface FeelStyle {
  id: string;
  label: string;
  imageUrl: string;
  moodKeywords: string[];
  locked: boolean;
}

export interface FeelPalette {
  id: string;
  name: string;
  colors: [string, string, string, string, string];
  mood: string;
  locked: boolean;
  isCustom: boolean;
}

export type AssetKind = 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link';

export interface OnboardingAsset {
  id: string;
  filename: string;
  mimeType: string;
  kind: AssetKind;
  previewUrl: string | null;
  scratchPath: string | null;
  remotePath: string | null;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
  sourceUrl?: string;
}

export interface DefineAnswers {
  name: string;
  description: string;
  audience: string;
  market: string;
  goals: string;
  values: string;
}

export interface OgMeta {
  title: string;
  description: string;
  imageUrl: string | null;
  faviconUrl: string | null;
}

export type AiState = 'idle' | 'generating' | 'error';
export type OnboardingFlow = 'setup' | 'create';
export type CreateStep = 1 | 2 | 3;
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding-v3/types.ts
git commit -m "feat(onboarding-v3): add shared feature types"
```

---

### Task 4: Seed data — styles and palettes

**Files:**
- Create: `src/features/onboarding-v3/utils/seedStyles.ts`
- Create: `src/features/onboarding-v3/utils/seedPalettes.ts`
- Copy: `docs/onboard/assets/style-*.jpg` → `public/onboarding-v3/styles/`

- [ ] **Step 1: Copy style images into public assets**

Run:
```bash
mkdir -p public/onboarding-v3/styles
cp "docs/onboard/assets/style-amber.jpg" public/onboarding-v3/styles/amber.jpg
cp "docs/onboard/assets/style-crater.jpg" public/onboarding-v3/styles/crater.jpg
cp "docs/onboard/assets/style-mindshift.jpg" public/onboarding-v3/styles/mindshift.jpg
cp "docs/onboard/assets/style-nuworld.jpg" public/onboarding-v3/styles/nuworld.jpg
cp "docs/onboard/assets/style-soan.jpg" public/onboarding-v3/styles/soan.jpg
cp "docs/onboard/assets/style-spectrum.jpg" public/onboarding-v3/styles/spectrum.jpg
```

- [ ] **Step 2: Create seed styles**

Create `src/features/onboarding-v3/utils/seedStyles.ts`:

```ts
import type { FeelStyle } from '../types';

export const SEED_STYLES: FeelStyle[] = [
  { id: 'amber',     label: 'Amber',     imageUrl: '/onboarding-v3/styles/amber.jpg',     moodKeywords: ['warm', 'editorial', 'earthy'], locked: false },
  { id: 'crater',    label: 'Crater',    imageUrl: '/onboarding-v3/styles/crater.jpg',    moodKeywords: ['minimal', 'bold', 'architectural'], locked: false },
  { id: 'mindshift', label: 'Mindshift', imageUrl: '/onboarding-v3/styles/mindshift.jpg', moodKeywords: ['playful', 'vibrant', 'modern'], locked: false },
  { id: 'nuworld',   label: 'Nuworld',   imageUrl: '/onboarding-v3/styles/nuworld.jpg',   moodKeywords: ['futuristic', 'clean', 'tech'], locked: false },
  { id: 'soan',      label: 'Soan',      imageUrl: '/onboarding-v3/styles/soan.jpg',      moodKeywords: ['organic', 'calm', 'natural'], locked: false },
  { id: 'spectrum',  label: 'Spectrum',  imageUrl: '/onboarding-v3/styles/spectrum.jpg',  moodKeywords: ['colorful', 'expressive', 'bold'], locked: false },
];
```

- [ ] **Step 3: Create seed palettes**

Create `src/features/onboarding-v3/utils/seedPalettes.ts`:

```ts
import type { FeelPalette } from '../types';
import { generateHarmony, hexToHSL, hslToHex } from '@/features/brandkit/engine/colorEngine';

const MOODS = [
  'warm', 'cool', 'vibrant', 'muted', 'pastel', 'earthy', 'bold', 'monochrome',
  'dusk', 'ocean', 'forest', 'sunset', 'meadow', 'desert', 'arctic',
] as const;

const HARMONY_RULES: Array<'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic'> = [
  'complementary', 'analogous', 'triadic', 'split-complementary', 'monochromatic',
];

function randomHue(): number {
  return Math.floor(Math.random() * 360);
}

function paletteId(): string {
  return `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function generateOnePalette(locked = false): FeelPalette {
  const hue = randomHue();
  const rule = HARMONY_RULES[Math.floor(Math.random() * HARMONY_RULES.length)];
  const baseHex = hslToHex({ h: hue, s: 55 + Math.random() * 25, l: 45 + Math.random() * 15 });
  const harmony = generateHarmony(baseHex, rule);
  const colors = [harmony[0], harmony[1] ?? harmony[0], harmony[2] ?? harmony[0], harmony[3] ?? harmony[0], harmony[4] ?? harmony[0]]
    .slice(0, 5) as [string, string, string, string, string];
  const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  const name = `${mood[0].toUpperCase()}${mood.slice(1)} ${rule.split('-')[0]}`;
  return { id: paletteId(), name, colors, mood, locked, isCustom: false };
}

export function generateSeedPalettes(): [FeelPalette, FeelPalette, FeelPalette] {
  return [generateOnePalette(), generateOnePalette(), generateOnePalette()];
}

export { hexToHSL, hslToHex };
```

**Note:** if `generateHarmony` or `hslToHex` do not exist with these exact names, check `src/features/brandkit/engine/colorEngine.ts` for the actual export names and adjust imports accordingly. Do NOT add new color-math code here — reuse existing.

- [ ] **Step 4: Verify typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS. If colorEngine export names differ, adjust the imports in `seedPalettes.ts` to match.

- [ ] **Step 5: Commit**

```bash
git add public/onboarding-v3 src/features/onboarding-v3/utils/seedStyles.ts src/features/onboarding-v3/utils/seedPalettes.ts
git commit -m "feat(onboarding-v3): seed styles and palette generator"
```

---

### Task 5: `shuffle.ts` utility (TDD)

**Files:**
- Create: `src/features/onboarding-v3/utils/shuffle.ts`
- Create: `src/features/onboarding-v3/utils/shuffle.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/onboarding-v3/utils/shuffle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reshuffle } from './shuffle';

type Item = { id: string; locked: boolean; value: number };

describe('reshuffle', () => {
  it('preserves locked items at their original indices', () => {
    const items: Item[] = [
      { id: 'a', locked: false, value: 1 },
      { id: 'b', locked: true,  value: 2 },
      { id: 'c', locked: false, value: 3 },
      { id: 'd', locked: true,  value: 4 },
    ];
    const generate = (): Item => ({ id: 'new', locked: false, value: 99 });
    const out = reshuffle(items, generate);
    expect(out[1]).toEqual(items[1]);
    expect(out[3]).toEqual(items[3]);
    expect(out[0].value).toBe(99);
    expect(out[2].value).toBe(99);
  });

  it('returns the same array when everything is locked', () => {
    const items: Item[] = [
      { id: 'a', locked: true, value: 1 },
      { id: 'b', locked: true, value: 2 },
    ];
    const out = reshuffle(items, () => ({ id: 'never', locked: false, value: 0 }));
    expect(out).toEqual(items);
  });

  it('replaces every item when nothing is locked', () => {
    const items: Item[] = [
      { id: 'a', locked: false, value: 1 },
      { id: 'b', locked: false, value: 2 },
    ];
    let i = 0;
    const out = reshuffle(items, () => ({ id: `g${i++}`, locked: false, value: 10 + i }));
    expect(out.every(x => x.value >= 10)).toBe(true);
  });

  it('handles an empty array', () => {
    expect(reshuffle<Item>([], () => ({ id: 'x', locked: false, value: 0 }))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/features/onboarding-v3/utils/shuffle.test.ts
```

Expected: FAIL — "Cannot find module './shuffle'".

- [ ] **Step 3: Write the implementation**

Create `src/features/onboarding-v3/utils/shuffle.ts`:

```ts
export interface Lockable {
  locked: boolean;
}

export function reshuffle<T extends Lockable>(items: T[], generate: () => T): T[] {
  return items.map(item => (item.locked ? item : generate()));
}

export function lockedCount<T extends Lockable>(items: T[]): number {
  return items.reduce((n, x) => n + (x.locked ? 1 : 0), 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/features/onboarding-v3/utils/shuffle.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding-v3/utils/shuffle.ts src/features/onboarding-v3/utils/shuffle.test.ts
git commit -m "feat(onboarding-v3): lock-aware shuffle utility"
```

---

### Task 6: Asset type detection utility

**Files:**
- Create: `src/features/onboarding-v3/utils/assetTypeIcon.ts`
- Create: `src/features/onboarding-v3/utils/assetTypeIcon.test.ts`
- Copy: `docs/onboard/assets/file-{pdf,logo,link,svg,png,jpg}*` → `public/onboarding-v3/icons/`

- [ ] **Step 1: Copy file-type icons to public**

Run:
```bash
mkdir -p public/onboarding-v3/icons
cp "docs/onboard/assets/file-pdf.svg" public/onboarding-v3/icons/pdf.svg
cp "docs/onboard/assets/file-logo.svg" public/onboarding-v3/icons/logo.svg
cp "docs/onboard/assets/file-link.svg" public/onboarding-v3/icons/link.svg
cp "docs/onboard/assets/file-svg.webp" public/onboarding-v3/icons/svg.webp
cp "docs/onboard/assets/file-jpg.png" public/onboarding-v3/icons/jpg.png
cp "docs/onboard/assets/file-png.png" public/onboarding-v3/icons/png.png
cp "docs/onboard/assets/file-pdf.png" public/onboarding-v3/icons/pdf.png
```

- [ ] **Step 2: Write failing tests**

Create `src/features/onboarding-v3/utils/assetTypeIcon.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectAssetKind, iconForKind } from './assetTypeIcon';

describe('detectAssetKind', () => {
  it('detects images', () => {
    expect(detectAssetKind('logo.png', 'image/png')).toBe('image');
    expect(detectAssetKind('pic.jpg', 'image/jpeg')).toBe('image');
    expect(detectAssetKind('icon.svg', 'image/svg+xml')).toBe('image');
  });
  it('detects pdfs', () => {
    expect(detectAssetKind('guide.pdf', 'application/pdf')).toBe('pdf');
  });
  it('detects fonts', () => {
    expect(detectAssetKind('Inter.otf', 'font/otf')).toBe('font');
    expect(detectAssetKind('Inter.ttf', 'application/octet-stream')).toBe('font');
    expect(detectAssetKind('Inter.woff2', '')).toBe('font');
  });
  it('detects design files', () => {
    expect(detectAssetKind('hero.fig', '')).toBe('design');
    expect(detectAssetKind('brand.ai', '')).toBe('design');
    expect(detectAssetKind('layout.sketch', '')).toBe('design');
    expect(detectAssetKind('cover.psd', '')).toBe('design');
  });
  it('detects zips', () => {
    expect(detectAssetKind('kit.zip', 'application/zip')).toBe('zip');
  });
});

describe('iconForKind', () => {
  it('returns a public path', () => {
    expect(iconForKind('pdf')).toBe('/onboarding-v3/icons/pdf.svg');
    expect(iconForKind('link')).toBe('/onboarding-v3/icons/link.svg');
    expect(iconForKind('font')).toBe('/onboarding-v3/icons/logo.svg');
  });
});
```

- [ ] **Step 3: Run tests — they fail**

Run:
```bash
npx vitest run src/features/onboarding-v3/utils/assetTypeIcon.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Write implementation**

Create `src/features/onboarding-v3/utils/assetTypeIcon.ts`:

```ts
import type { AssetKind } from '../types';

const DESIGN_EXT = ['fig', 'ai', 'sketch', 'psd', 'xd', 'indd'];
const FONT_EXT = ['otf', 'ttf', 'woff', 'woff2'];

function extOf(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase();
}

export function detectAssetKind(filename: string, mimeType: string): AssetKind {
  const ext = extOf(filename);
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (FONT_EXT.includes(ext) || mimeType.startsWith('font/')) return 'font';
  if (DESIGN_EXT.includes(ext)) return 'design';
  if (mimeType === 'application/zip' || ext === 'zip') return 'zip';
  return 'image'; // sensible fallback for unknown image-like content
}

export function iconForKind(kind: AssetKind): string {
  switch (kind) {
    case 'pdf':    return '/onboarding-v3/icons/pdf.svg';
    case 'link':   return '/onboarding-v3/icons/link.svg';
    case 'font':   return '/onboarding-v3/icons/logo.svg';
    case 'design': return '/onboarding-v3/icons/logo.svg';
    case 'zip':    return '/onboarding-v3/icons/logo.svg';
    case 'image':  return '/onboarding-v3/icons/png.png';
  }
}

export const ACCEPTED_MIME: Record<string, string[]> = {
  'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'],
  'application/pdf': ['.pdf'],
  'font/otf': ['.otf'],
  'font/ttf': ['.ttf'],
  'font/woff': ['.woff'],
  'font/woff2': ['.woff2'],
  'application/zip': ['.zip'],
  'application/octet-stream': ['.fig', '.ai', '.sketch', '.psd'],
};
```

- [ ] **Step 5: Run tests — PASS**

Run:
```bash
npx vitest run src/features/onboarding-v3/utils/assetTypeIcon.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add public/onboarding-v3/icons src/features/onboarding-v3/utils/assetTypeIcon.ts src/features/onboarding-v3/utils/assetTypeIcon.test.ts
git commit -m "feat(onboarding-v3): asset kind detection and icon mapping"
```

---

## Phase 2 — State

### Task 7: `onboardingStore` (Zustand, TDD)

**Files:**
- Create: `src/features/onboarding-v3/store/onboardingStore.ts`
- Create: `src/features/onboarding-v3/store/onboardingStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/onboarding-v3/store/onboardingStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from './onboardingStore';

const reset = () => useOnboardingStore.getState().reset();

describe('onboardingStore', () => {
  beforeEach(reset);

  it('initializes with a session id and three palettes and six styles', () => {
    const s = useOnboardingStore.getState();
    expect(s.sessionId).toMatch(/^onb-/);
    expect(s.feel.styles).toHaveLength(6);
    expect(s.feel.palettes).toHaveLength(3);
    expect(s.step).toBe(1);
  });

  it('updates define answers by patch', () => {
    useOnboardingStore.getState().updateDefine({ name: 'Acme' });
    expect(useOnboardingStore.getState().define.name).toBe('Acme');
  });

  it('locks and unlocks a style', () => {
    const { styles } = useOnboardingStore.getState().feel;
    const id = styles[0].id;
    useOnboardingStore.getState().toggleStyleLock(id);
    expect(useOnboardingStore.getState().feel.styles[0].locked).toBe(true);
    useOnboardingStore.getState().toggleStyleLock(id);
    expect(useOnboardingStore.getState().feel.styles[0].locked).toBe(false);
  });

  it('selects and deselects a style (single-select)', () => {
    const { styles } = useOnboardingStore.getState().feel;
    useOnboardingStore.getState().selectStyle(styles[0].id);
    expect(useOnboardingStore.getState().feel.selectedStyleId).toBe(styles[0].id);
    useOnboardingStore.getState().selectStyle(styles[1].id);
    expect(useOnboardingStore.getState().feel.selectedStyleId).toBe(styles[1].id);
  });

  it('shuffle styles preserves locked', () => {
    const { styles } = useOnboardingStore.getState().feel;
    useOnboardingStore.getState().toggleStyleLock(styles[0].id);
    const beforeId = styles[0].id;
    useOnboardingStore.getState().shuffle('styles');
    const after = useOnboardingStore.getState().feel.styles;
    expect(after[0].id).toBe(beforeId);
    expect(after[0].locked).toBe(true);
  });

  it('addAsset appends and removeAsset removes', () => {
    useOnboardingStore.getState().addAsset({
      id: 'a1', filename: 'f.png', mimeType: 'image/png', kind: 'image',
      previewUrl: null, scratchPath: null, remotePath: null,
      uploadProgress: 0, uploadStatus: 'pending',
    });
    expect(useOnboardingStore.getState().assets).toHaveLength(1);
    useOnboardingStore.getState().removeAsset('a1');
    expect(useOnboardingStore.getState().assets).toHaveLength(0);
  });

  it('reset returns to initial state', () => {
    useOnboardingStore.getState().updateDefine({ name: 'X' });
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().define.name).toBe('');
  });
});
```

- [ ] **Step 2: Run tests — FAIL**

Run:
```bash
npx vitest run src/features/onboarding-v3/store/onboardingStore.test.ts
```

Expected: FAIL — "Cannot find module './onboardingStore'".

- [ ] **Step 3: Write the store**

Create `src/features/onboarding-v3/store/onboardingStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FeelStyle, FeelPalette, OnboardingAsset, DefineAnswers,
  AiState, OnboardingFlow, CreateStep,
} from '../types';
import { SEED_STYLES } from '../utils/seedStyles';
import { generateSeedPalettes, generateOnePalette } from '../utils/seedPalettes';
import { reshuffle } from '../utils/shuffle';
import type { GeneratedBrand } from '@/features/onboarding-brand/types';

function newSessionId(): string {
  return `onb-${crypto.randomUUID()}`;
}

const EMPTY_DEFINE: DefineAnswers = {
  name: '', description: '', audience: '', market: '', goals: '', values: '',
};

interface OnboardingState {
  sessionId: string;
  flow: OnboardingFlow | null;
  step: CreateStep;
  define: DefineAnswers;
  feel: {
    styles: FeelStyle[];
    selectedStyleId: string | null;
    palettes: FeelPalette[];
    selectedPaletteId: string | null;
  };
  assets: OnboardingAsset[];
  aiState: AiState;
  variations: GeneratedBrand[] | null;
  variationsError: string | null;
}

interface OnboardingActions {
  setFlow(f: OnboardingFlow): void;
  setStep(s: CreateStep): void;
  updateDefine(patch: Partial<DefineAnswers>): void;
  toggleStyleLock(id: string): void;
  selectStyle(id: string): void;
  togglePaletteLock(id: string): void;
  selectPalette(id: string): void;
  updatePaletteColors(id: string, colors: string[]): void;
  shuffle(target: 'all' | 'styles' | 'palettes'): void;
  addAsset(a: OnboardingAsset): void;
  removeAsset(id: string): void;
  updateAssetProgress(id: string, progress: number): void;
  markAssetDone(id: string, remotePath: string): void;
  markAssetError(id: string, msg: string): void;
  setAiState(s: AiState): void;
  setVariations(v: GeneratedBrand[] | null): void;
  setVariationsError(msg: string | null): void;
  reset(): void;
}

function initialState(): OnboardingState {
  return {
    sessionId: newSessionId(),
    flow: null,
    step: 1,
    define: { ...EMPTY_DEFINE },
    feel: {
      styles: SEED_STYLES.map(s => ({ ...s })),
      selectedStyleId: null,
      palettes: generateSeedPalettes(),
      selectedPaletteId: null,
    },
    assets: [],
    aiState: 'idle',
    variations: null,
    variationsError: null,
  };
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setFlow: (flow) => set({ flow }),
      setStep: (step) => set({ step }),
      updateDefine: (patch) => set({ define: { ...get().define, ...patch } }),

      toggleStyleLock: (id) => set({
        feel: { ...get().feel, styles: get().feel.styles.map(s => s.id === id ? { ...s, locked: !s.locked } : s) },
      }),
      selectStyle: (id) => set({ feel: { ...get().feel, selectedStyleId: id } }),

      togglePaletteLock: (id) => set({
        feel: { ...get().feel, palettes: get().feel.palettes.map(p => p.id === id ? { ...p, locked: !p.locked } : p) },
      }),
      selectPalette: (id) => set({ feel: { ...get().feel, selectedPaletteId: id } }),

      updatePaletteColors: (id, colors) => {
        const safeColors = [...colors.slice(0, 5)] as [string, string, string, string, string];
        while (safeColors.length < 5) safeColors.push(colors[colors.length - 1] ?? '#000000');
        set({
          feel: {
            ...get().feel,
            palettes: get().feel.palettes.map(p => p.id === id ? { ...p, colors: safeColors, isCustom: true } : p),
          },
        });
      },

      shuffle: (target) => {
        const { feel } = get();
        if (target === 'styles' || target === 'all') {
          const pool = SEED_STYLES.filter(s => !feel.styles.some(fs => fs.locked && fs.id === s.id));
          let idx = 0;
          const styles = reshuffle(feel.styles, () => {
            const pick = pool[idx++ % pool.length];
            return { ...pick, locked: false };
          });
          set({ feel: { ...get().feel, styles } });
        }
        if (target === 'palettes' || target === 'all') {
          const palettes = reshuffle(get().feel.palettes, () => generateOnePalette()) as FeelPalette[];
          set({ feel: { ...get().feel, palettes } });
        }
      },

      addAsset: (a) => set({ assets: [...get().assets, a] }),
      removeAsset: (id) => set({ assets: get().assets.filter(a => a.id !== id) }),
      updateAssetProgress: (id, progress) => set({
        assets: get().assets.map(a => a.id === id ? { ...a, uploadProgress: progress, uploadStatus: 'uploading' } : a),
      }),
      markAssetDone: (id, remotePath) => set({
        assets: get().assets.map(a => a.id === id ? { ...a, uploadProgress: 1, uploadStatus: 'done', remotePath } : a),
      }),
      markAssetError: (id, msg) => set({
        assets: get().assets.map(a => a.id === id ? { ...a, uploadStatus: 'error', errorMessage: msg } : a),
      }),

      setAiState: (aiState) => set({ aiState }),
      setVariations: (variations) => set({ variations }),
      setVariationsError: (variationsError) => set({ variationsError }),

      reset: () => set(initialState()),
    }),
    {
      name: 'brandos-onboarding-v3',
      partialize: (s) => ({
        sessionId: s.sessionId,
        flow: s.flow,
        step: s.step,
        define: s.define,
        feel: s.feel,
        // assets, aiState, variations deliberately excluded — they reset on refresh
      }),
    },
  ),
);
```

- [ ] **Step 4: Run tests — PASS**

Run:
```bash
npx vitest run src/features/onboarding-v3/store/onboardingStore.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding-v3/store/onboardingStore.ts src/features/onboarding-v3/store/onboardingStore.test.ts
git commit -m "feat(onboarding-v3): onboardingStore with persist and shuffle"
```

---

## Phase 3 — Backend (Supabase)

### Task 8: Storage buckets and rate-limit table migration

**Files:**
- Create: `supabase/migrations/20260420_onboarding_v3.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260420_onboarding_v3.sql`:

```sql
-- Onboarding v3: storage buckets and rate-limit table

-- 1. Storage buckets
insert into storage.buckets (id, name, public)
values ('onboarding-scratch', 'onboarding-scratch', false)
on conflict (id) do nothing;

-- brand-assets bucket assumed to already exist. If not, uncomment:
-- insert into storage.buckets (id, name, public)
-- values ('brand-assets', 'brand-assets', false)
-- on conflict (id) do nothing;

-- 2. Storage policies on onboarding-scratch
-- Authenticated users can insert to their own session prefix.
create policy "scratch_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'onboarding-scratch'
  and (storage.foldername(name))[1] is not null
);

create policy "scratch_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'onboarding-scratch'
);

create policy "scratch_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'onboarding-scratch'
);

-- 3. Rate-limit table
create table if not exists public.onboarding_rate_limits (
  id bigserial primary key,
  session_id text not null,
  function_name text not null,
  called_at timestamptz not null default now()
);

create index if not exists onboarding_rate_limits_session_fn_idx
  on public.onboarding_rate_limits (session_id, function_name, called_at desc);

alter table public.onboarding_rate_limits enable row level security;

-- Clients cannot read or write directly. Edge Functions use the service role.
create policy "rate_limits_no_client_access"
on public.onboarding_rate_limits for all
to authenticated, anon
using (false) with check (false);
```

- [ ] **Step 2: Apply migration**

Run:
```bash
npx supabase db push
```

Expected: migration applied without errors. If Supabase CLI is not configured locally, apply via the Supabase Studio SQL editor by pasting the migration.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420_onboarding_v3.sql
git commit -m "feat(onboarding-v3): scratch bucket and rate-limit table"
```

---

### Task 9: Edge Function — `generate-description`

**Files:**
- Create: `supabase/functions/generate-description/index.ts`
- Create: `supabase/functions/generate-description/deno.json`

- [ ] **Step 1: Create deno config**

Create `supabase/functions/generate-description/deno.json`:

```json
{
  "tasks": { "dev": "deno run --allow-all index.ts" },
  "imports": {
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@^0.81.0"
  }
}
```

- [ ] **Step 2: Write the function**

Create `supabase/functions/generate-description/index.ts`:

```ts
// Edge Function: generate a 1–2 sentence brand description via Claude.
// Input: { sessionId: string, brandName: string, assetContext?: string[] }
// Output: text/plain streaming body
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
});

const SYSTEM = `You are a world-class brand copywriter. Given a brand name
and optional context, write a single 1–2 sentence description of the brand
that is concrete, specific, and free of marketing fluff. No emojis, no
hashtags, no lists. Plain prose only.`;

async function rateLimit(sessionId: string): Promise<boolean> {
  const url = `${Deno.env.get('SUPABASE_URL')}/rest/v1/onboarding_rate_limits`;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const count = await fetch(
    `${url}?session_id=eq.${sessionId}&function_name=eq.generate-description&called_at=gte.${since}&select=id`,
    { headers: { ...headers, Prefer: 'count=exact' } },
  );
  const contentRange = count.headers.get('content-range') ?? '*/0';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);
  if (total >= 10) return false;
  await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id: sessionId, function_name: 'generate-description' }),
  });
  return true;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  let body: { sessionId?: string; brandName?: string; assetContext?: string[] };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

  const { sessionId, brandName, assetContext } = body;
  if (!sessionId || !brandName) {
    return new Response('sessionId and brandName required', { status: 400, headers: cors });
  }
  if (!(await rateLimit(sessionId))) {
    return new Response('Rate limit exceeded', { status: 429, headers: cors });
  }

  const user = `Brand name: ${brandName}${
    assetContext && assetContext.length ? `\nContext from uploaded assets: ${assetContext.join('; ')}` : ''
  }`;

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });

  const body$ = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(ev.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  return new Response(body$, { headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' } });
});
```

- [ ] **Step 3: Deploy the function**

Run:
```bash
npx supabase functions deploy generate-description --no-verify-jwt
npx supabase secrets set ANTHROPIC_API_KEY="$VITE_ANTHROPIC_API_KEY"
```

Expected: deploy succeeds. (If the user is running this plan, they may need their own ANTHROPIC_API_KEY value.)

- [ ] **Step 4: Smoke test with curl**

Run:
```bash
curl -N -X POST "$(npx supabase status --output json | jq -r '.FUNCTIONS_URL')/generate-description" \
  -H "content-type: application/json" \
  -d '{"sessionId":"onb-test","brandName":"Meridian Coffee"}'
```

Expected: text stream describing Meridian Coffee.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-description
git commit -m "feat(onboarding-v3): generate-description edge function"
```

---

### Task 10: Edge Function — `fetch-url-preview`

**Files:**
- Create: `supabase/functions/fetch-url-preview/index.ts`

- [ ] **Step 1: Write the function**

Create `supabase/functions/fetch-url-preview/index.ts`:

```ts
// Edge Function: fetch a URL and extract OG metadata.
// Input: { sessionId: string, url: string }
// Output: JSON { title, description, imageUrl, faviconUrl }

function isPrivateHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '0.0.0.0') return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
  return false;
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

async function rateLimit(sessionId: string): Promise<boolean> {
  const url = `${Deno.env.get('SUPABASE_URL')}/rest/v1/onboarding_rate_limits`;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const count = await fetch(
    `${url}?session_id=eq.${sessionId}&function_name=eq.fetch-url-preview&called_at=gte.${since}&select=id`,
    { headers: { ...headers, Prefer: 'count=exact' } },
  );
  const total = parseInt((count.headers.get('content-range') ?? '*/0').split('/')[1] || '0', 10);
  if (total >= 30) return false;
  await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ session_id: sessionId, function_name: 'fetch-url-preview' }),
  });
  return true;
}

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  let body: { sessionId?: string; url?: string };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
  const { sessionId, url } = body;
  if (!sessionId || !url) return new Response('sessionId and url required', { status: 400, headers: cors });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return new Response('Invalid URL', { status: 400, headers: cors }); }
  if (!['http:', 'https:'].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
    return new Response('Disallowed URL', { status: 400, headers: cors });
  }
  if (!(await rateLimit(sessionId))) {
    return new Response('Rate limit exceeded', { status: 429, headers: cors });
  }

  const res = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'BrandOSPreviewBot/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return new Response(`Upstream ${res.status}`, { status: 502, headers: cors });
  const html = await res.text();

  const title = pickMeta(html, 'og:title') ?? (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? parsed.hostname);
  const description = pickMeta(html, 'og:description') ?? pickMeta(html, 'description') ?? '';
  const image = pickMeta(html, 'og:image');
  const favicon = `${parsed.origin}/favicon.ico`;

  return new Response(JSON.stringify({ title, description, imageUrl: image, faviconUrl: favicon }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy**

Run:
```bash
npx supabase functions deploy fetch-url-preview --no-verify-jwt
```

- [ ] **Step 3: Smoke test**

Run:
```bash
curl -X POST "$(npx supabase status --output json | jq -r '.FUNCTIONS_URL')/fetch-url-preview" \
  -H "content-type: application/json" \
  -d '{"sessionId":"onb-test","url":"https://stripe.com"}'
```

Expected: JSON with title, description, imageUrl, faviconUrl.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/fetch-url-preview
git commit -m "feat(onboarding-v3): fetch-url-preview edge function"
```

---

### Task 11: Edge Function — `finalize-onboarding-assets`

**Files:**
- Create: `supabase/functions/finalize-onboarding-assets/index.ts`

- [ ] **Step 1: Write the function**

Create `supabase/functions/finalize-onboarding-assets/index.ts`:

```ts
// Edge Function: move scratch files to brand-assets when a brand is created.
// Input: { sessionId: string, brandId: string, assetIds: string[] }
// Output: { moved: string[], failed: { assetId: string, error: string }[] }
import { createClient } from 'npm:@supabase/supabase-js@^2.56.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  let body: { sessionId?: string; brandId?: string; assetIds?: string[] };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
  const { sessionId, brandId, assetIds } = body;
  if (!sessionId || !brandId || !Array.isArray(assetIds)) {
    return new Response('sessionId, brandId, assetIds required', { status: 400, headers: cors });
  }

  const moved: string[] = [];
  const failed: { assetId: string; error: string }[] = [];

  for (const assetId of assetIds) {
    const { data: list, error: listErr } = await supabase.storage
      .from('onboarding-scratch')
      .list(sessionId, { search: assetId });
    if (listErr || !list || list.length === 0) {
      failed.push({ assetId, error: listErr?.message ?? 'not found' });
      continue;
    }
    const scratchName = list[0].name;
    const fromPath = `${sessionId}/${scratchName}`;
    const toPath = `${brandId}/${scratchName}`;
    const { error: moveErr } = await supabase.storage
      .from('onboarding-scratch')
      .move(fromPath, toPath, { destinationBucket: 'brand-assets' });
    if (moveErr) {
      failed.push({ assetId, error: moveErr.message });
      continue;
    }
    moved.push(assetId);
  }

  return new Response(JSON.stringify({ moved, failed }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

**Note:** Supabase's cross-bucket `move` is supported via the `destinationBucket` option in recent `supabase-js` versions. If the option is not available in the runtime the project ships, fall back to `copy` + `remove` within this function.

- [ ] **Step 2: Deploy**

Run:
```bash
npx supabase functions deploy finalize-onboarding-assets
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/finalize-onboarding-assets
git commit -m "feat(onboarding-v3): finalize-onboarding-assets edge function"
```

---

### Task 12: Edge Function — `cleanup-onboarding-scratch` (cron)

**Files:**
- Create: `supabase/functions/cleanup-onboarding-scratch/index.ts`

- [ ] **Step 1: Write the function**

Create `supabase/functions/cleanup-onboarding-scratch/index.ts`:

```ts
// Edge Function: purge onboarding-scratch files older than 24h. Cron daily.
import { createClient } from 'npm:@supabase/supabase-js@^2.56.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const { data: sessions, error: topErr } = await supabase.storage
    .from('onboarding-scratch').list('', { limit: 1000 });
  if (topErr) return new Response(topErr.message, { status: 500 });

  let removed = 0;
  for (const session of sessions ?? []) {
    const { data: files } = await supabase.storage
      .from('onboarding-scratch').list(session.name, { limit: 1000 });
    for (const file of files ?? []) {
      const created = file.created_at ? new Date(file.created_at).getTime() : 0;
      if (created < cutoff) {
        const { error } = await supabase.storage
          .from('onboarding-scratch').remove([`${session.name}/${file.name}`]);
        if (!error) removed += 1;
      }
    }
  }
  return new Response(JSON.stringify({ removed }), { headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 2: Deploy and schedule cron**

Run:
```bash
npx supabase functions deploy cleanup-onboarding-scratch
```

Then in the Supabase dashboard → Edge Functions → `cleanup-onboarding-scratch` → Schedule, set cron: `0 3 * * *` (3am UTC daily).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/cleanup-onboarding-scratch
git commit -m "feat(onboarding-v3): cleanup-onboarding-scratch daily cron"
```

---

## Phase 4 — Client services

### Task 13: `uploadAssets.ts` — scratch uploader

**Files:**
- Create: `src/features/onboarding-v3/services/uploadAssets.ts`

- [ ] **Step 1: Write the service**

Create `src/features/onboarding-v3/services/uploadAssets.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

export interface UploadHandle {
  assetId: string;
  scratchPath: string;
  promise: Promise<void>;
  cancel(): void;
}

/**
 * Uploads a single file to onboarding-scratch/{sessionId}/{assetId}.{ext}.
 * Calls onProgress(0..1) periodically (Supabase JS doesn't stream progress
 * natively; we emit 0 on start and 1 on completion, with a synthetic 0.5
 * for UX smoothness when the file is large).
 */
export function uploadToScratch(
  sessionId: string,
  assetId: string,
  file: File,
  onProgress: (pct: number) => void,
): UploadHandle {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const scratchPath = `${sessionId}/${assetId}.${ext}`;
  const abort = new AbortController();

  const promise = (async () => {
    onProgress(0);
    if (file.size > 512 * 1024) {
      // synthetic midpoint for UX; Supabase JS v2 upload() does not expose progress events.
      setTimeout(() => onProgress(0.5), 200);
    }
    const { error } = await supabase.storage
      .from('onboarding-scratch')
      .upload(scratchPath, file, { upsert: true });
    if (abort.signal.aborted) return;
    if (error) throw error;
    onProgress(1);
  })();

  return {
    assetId,
    scratchPath,
    promise,
    cancel: () => abort.abort(),
  };
}

export async function removeFromScratch(scratchPath: string): Promise<void> {
  await supabase.storage.from('onboarding-scratch').remove([scratchPath]);
}
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding-v3/services/uploadAssets.ts
git commit -m "feat(onboarding-v3): scratch upload service"
```

---

### Task 14: Client wrappers for Edge Functions

**Files:**
- Create: `src/features/onboarding-v3/services/generateDescription.ts`
- Create: `src/features/onboarding-v3/services/fetchUrlPreview.ts`
- Create: `src/features/onboarding-v3/services/finalizeAssets.ts`

- [ ] **Step 1: Create `generateDescription` client**

Create `src/features/onboarding-v3/services/generateDescription.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

/** Streams 1–2 sentence brand description from Claude via Edge Function. */
export async function* generateDescriptionStream(
  sessionId: string,
  brandName: string,
  assetContext?: string[],
): AsyncGenerator<string, void, void> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-description`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sessionId, brandName, assetContext }),
  });
  if (!res.ok || !res.body) throw new Error(`generate-description ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    yield decoder.decode(value, { stream: true });
  }
}
```

- [ ] **Step 2: Create `fetchUrlPreview` client**

Create `src/features/onboarding-v3/services/fetchUrlPreview.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';
import type { OgMeta } from '../types';

export async function fetchUrlPreview(sessionId: string, url: string): Promise<OgMeta> {
  const { data: { session } } = await supabase.auth.getSession();
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-url-preview`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sessionId, url }),
  });
  if (!res.ok) throw new Error(`fetch-url-preview ${res.status}`);
  return res.json();
}
```

- [ ] **Step 3: Create `finalizeAssets` client**

Create `src/features/onboarding-v3/services/finalizeAssets.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

export interface FinalizeResult {
  moved: string[];
  failed: { assetId: string; error: string }[];
}

export async function finalizeAssets(
  sessionId: string, brandId: string, assetIds: string[],
): Promise<FinalizeResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-onboarding-assets`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sessionId, brandId, assetIds }),
  });
  if (!res.ok) throw new Error(`finalize-onboarding-assets ${res.status}`);
  return res.json();
}
```

- [ ] **Step 4: Verify typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding-v3/services/generateDescription.ts src/features/onboarding-v3/services/fetchUrlPreview.ts src/features/onboarding-v3/services/finalizeAssets.ts
git commit -m "feat(onboarding-v3): client wrappers for edge functions"
```

---

### Task 15: LogoEngine interface and stub

**Files:**
- Create: `src/features/onboarding-v3/services/logoEngine.ts`

- [ ] **Step 1: Create the interface and stub**

Create `src/features/onboarding-v3/services/logoEngine.ts`:

```ts
import type { FeelStyle, FeelPalette } from '../types';

export interface LogoBrief {
  brandName: string;
  description: string;
  style: FeelStyle;
  palette: FeelPalette;
  values?: string;
}

export interface LogoResult {
  svg: string;
  layoutId: string;
  fontId: string;
  symbolId?: string;
  mockupSceneUrl?: string;
}

export interface LogoEngine {
  generate(brief: LogoBrief): Promise<LogoResult[]>;
}

export class StubLogoEngine implements LogoEngine {
  async generate(): Promise<LogoResult[]> { return []; }
}

export const logoEngine: LogoEngine = new StubLogoEngine();
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/services/logoEngine.ts
git commit -m "feat(onboarding-v3): LogoEngine seam with StubLogoEngine"
```

---

## Phase 5 — Primitive components

### Task 16: `OnboardingHeader` — top bar with cross-link

**Files:**
- Create: `src/features/onboarding-v3/components/OnboardingHeader.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/OnboardingHeader.tsx`:

```tsx
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  crossLink: { to: string; label: string };
}

export function OnboardingHeader({ title, subtitle, crossLink }: Props) {
  return (
    <header className="flex items-start justify-between px-6 py-5 border-b border-cosmos-border">
      <div>
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-cosmos-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[14px] text-cosmos-secondary">{subtitle}</p>
        )}
      </div>
      <Link
        to={crossLink.to}
        className="text-[13px] text-cosmos-secondary hover:text-cosmos-primary underline-offset-4 hover:underline"
      >
        {crossLink.label}
      </Link>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/OnboardingHeader.tsx
git commit -m "feat(onboarding-v3): OnboardingHeader"
```

---

### Task 17: `StepDots` — 3-step indicator

**Files:**
- Create: `src/features/onboarding-v3/components/StepDots.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/StepDots.tsx`:

```tsx
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CreateStep } from '../types';

const LABELS: Record<CreateStep, string> = { 1: 'Define', 2: 'Feel', 3: 'Generate' };

export function StepDots({ current }: { current: CreateStep }) {
  const steps: CreateStep[] = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {steps.map((s, i) => {
        const state: 'done' | 'active' | 'pending' =
          s < current ? 'done' : s === current ? 'active' : 'pending';
        return (
          <div key={s} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                layout
                className="relative grid place-items-center w-6 h-6 rounded-full border"
                style={{
                  borderColor: state === 'pending' ? 'var(--border)' : 'var(--accent)',
                  background: state === 'active' ? 'var(--accent)' : 'transparent',
                }}
                animate={state === 'active' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: state === 'active' ? Infinity : 0 }}
              >
                {state === 'done' && <Check size={12} className="text-cosmos-accent" />}
                {state === 'active' && <div className="w-2 h-2 rounded-full bg-cosmos-accent-contrast" />}
              </motion.div>
              <span
                className="text-[11px] font-medium tracking-wider uppercase"
                style={{ color: state === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {LABELS[s]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-10 h-px mb-4"
                style={{ background: s < current ? 'var(--accent)' : 'var(--border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/StepDots.tsx
git commit -m "feat(onboarding-v3): StepDots indicator"
```

---

### Task 18: `SparkleAssist` — AI description draft button

**Files:**
- Create: `src/features/onboarding-v3/components/SparkleAssist.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/SparkleAssist.tsx`:

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { generateDescriptionStream } from '../services/generateDescription';
import { useOnboardingStore } from '../store/onboardingStore';

interface Props {
  brandName: string;
  assetContext?: string[];
  onText(text: string): void;
  onError?(err: string): void;
}

export function SparkleAssist({ brandName, assetContext, onText, onError }: Props) {
  const sessionId = useOnboardingStore(s => s.sessionId);
  const [running, setRunning] = useState(false);

  const disabled = !brandName.trim() || running;

  async function run() {
    setRunning(true);
    try {
      let accumulated = '';
      for await (const chunk of generateDescriptionStream(sessionId, brandName.trim(), assetContext)) {
        accumulated += chunk;
        onText(accumulated);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-cosmos-border px-2.5 py-1 text-[11px] font-medium bg-cosmos-surface hover:bg-cosmos-surface-hover disabled:opacity-40"
      aria-label="Draft description with AI"
    >
      <motion.span
        animate={running ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: running ? Infinity : 0, ease: 'linear' }}
        className="inline-flex"
      >
        <Sparkles size={12} />
      </motion.span>
      {running ? 'Drafting…' : 'Draft with AI'}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/SparkleAssist.tsx
git commit -m "feat(onboarding-v3): SparkleAssist AI description button"
```

---

### Task 19: `LockBadge` — lock toggle

**Files:**
- Create: `src/features/onboarding-v3/components/LockBadge.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/LockBadge.tsx`:

```tsx
import { Lock, Unlock } from 'lucide-react';

interface Props {
  locked: boolean;
  onToggle(): void;
  className?: string;
}

export function LockBadge({ locked, onToggle, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={
        `absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full border ` +
        `${locked ? 'bg-cosmos-accent text-cosmos-accent-contrast border-cosmos-accent' : 'bg-cosmos-surface text-cosmos-secondary border-cosmos-border opacity-0 group-hover:opacity-100'} ` +
        `transition-opacity ` + className
      }
      aria-label={locked ? 'Unlock' : 'Lock'}
    >
      {locked ? <Lock size={12} /> : <Unlock size={12} />}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/LockBadge.tsx
git commit -m "feat(onboarding-v3): LockBadge toggle"
```

---

### Task 20: `UrlPillInput` — URL ingestion pill

**Files:**
- Create: `src/features/onboarding-v3/components/UrlPillInput.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/UrlPillInput.tsx`:

```tsx
import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { fetchUrlPreview } from '../services/fetchUrlPreview';
import { useOnboardingStore } from '../store/onboardingStore';
import type { OnboardingAsset } from '../types';

function newId() { return `a-${crypto.randomUUID()}`; }

export function UrlPillInput() {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useOnboardingStore(s => s.sessionId);
  const addAsset = useOnboardingStore(s => s.addAsset);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true); setError(null);
    try {
      const meta = await fetchUrlPreview(sessionId, value.trim());
      const asset: OnboardingAsset = {
        id: newId(),
        filename: meta.title || value,
        mimeType: 'text/html',
        kind: 'link',
        previewUrl: meta.imageUrl,
        scratchPath: null,
        remotePath: null,
        uploadProgress: 1,
        uploadStatus: 'done',
        sourceUrl: value.trim(),
      };
      addAsset(asset);
      setValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 rounded-full border border-cosmos-border bg-cosmos-surface px-3 h-[44px]">
        <Link2 size={14} className="text-cosmos-muted shrink-0" />
        <input
          type="url"
          placeholder="or paste a URL"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-cosmos-muted"
          disabled={busy}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="text-[12px] font-medium text-cosmos-accent disabled:opacity-40"
        >
          {busy ? 'Fetching…' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/UrlPillInput.tsx
git commit -m "feat(onboarding-v3): UrlPillInput URL ingestion"
```

---

### Task 21: `UploadTile` — per-file tile

**Files:**
- Create: `src/features/onboarding-v3/components/UploadTile.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/UploadTile.tsx`:

```tsx
import { X, RotateCw } from 'lucide-react';
import type { OnboardingAsset } from '../types';
import { iconForKind } from '../utils/assetTypeIcon';

interface Props {
  asset: OnboardingAsset;
  onRemove(id: string): void;
  onRetry?(id: string): void;
}

export function UploadTile({ asset, onRemove, onRetry }: Props) {
  const showImage = asset.kind === 'image' && asset.previewUrl;
  const iconSrc = iconForKind(asset.kind);

  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden bg-cosmos-surface-sunken border border-cosmos-border">
      {showImage ? (
        <img src={asset.previewUrl!} alt={asset.filename} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center">
          <img src={iconSrc} alt="" className="w-10 h-10 opacity-80" />
        </div>
      )}

      {asset.uploadStatus === 'uploading' && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-cosmos-border">
          <div className="h-full bg-cosmos-accent transition-all" style={{ width: `${asset.uploadProgress * 100}%` }} />
        </div>
      )}

      {asset.uploadStatus === 'error' && (
        <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center gap-1 text-[11px] text-red-600 px-2 text-center">
          <span className="line-clamp-2">{asset.errorMessage ?? 'Upload failed'}</span>
          {onRetry && (
            <button type="button" onClick={() => onRetry(asset.id)} className="inline-flex items-center gap-1 underline">
              <RotateCw size={10} /> retry
            </button>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform bg-black/55 text-white text-[11px] px-2 py-1 truncate">
        {asset.filename}
      </div>

      <button
        type="button"
        onClick={() => onRemove(asset.id)}
        className="absolute top-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100"
        aria-label="Remove"
      >
        <X size={10} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/UploadTile.tsx
git commit -m "feat(onboarding-v3): UploadTile"
```

---

### Task 22: `OnboardingDropzone` — hero drag-drop

**Files:**
- Create: `src/features/onboarding-v3/components/OnboardingDropzone.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/OnboardingDropzone.tsx`:

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useOnboardingStore } from '../store/onboardingStore';
import { detectAssetKind, ACCEPTED_MIME } from '../utils/assetTypeIcon';
import { uploadToScratch } from '../services/uploadAssets';
import type { OnboardingAsset } from '../types';
import { UploadTile } from './UploadTile';

const MAX_FILES = 10;
const MAX_SIZE_MB = 40;

function newAssetId() { return `a-${crypto.randomUUID()}`; }

export function OnboardingDropzone() {
  const sessionId = useOnboardingStore(s => s.sessionId);
  const assets = useOnboardingStore(s => s.assets);
  const addAsset = useOnboardingStore(s => s.addAsset);
  const removeAsset = useOnboardingStore(s => s.removeAsset);
  const updateProgress = useOnboardingStore(s => s.updateAssetProgress);
  const markDone = useOnboardingStore(s => s.markAssetDone);
  const markError = useOnboardingStore(s => s.markAssetError);
  const blobs = useRef<Map<string, string>>(new Map());

  useEffect(() => () => { blobs.current.forEach(URL.revokeObjectURL); blobs.current.clear(); }, []);

  const onDrop = useCallback((files: File[]) => {
    const room = MAX_FILES - assets.length;
    if (files.length > room) {
      toast.error(`You can add up to ${MAX_FILES} assets.`);
      files = files.slice(0, room);
    }
    files.forEach((file) => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${MAX_SIZE_MB}MB.`);
        return;
      }
      const id = newAssetId();
      const kind = detectAssetKind(file.name, file.type);
      const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;
      if (previewUrl) blobs.current.set(id, previewUrl);
      const asset: OnboardingAsset = {
        id, filename: file.name, mimeType: file.type, kind, previewUrl,
        scratchPath: null, remotePath: null, uploadProgress: 0, uploadStatus: 'pending',
      };
      addAsset(asset);

      const handle = uploadToScratch(sessionId, id, file, (p) => updateProgress(id, p));
      handle.promise
        .then(() => markDone(id, handle.scratchPath))
        .catch((e) => markError(id, e instanceof Error ? e.message : String(e)));
    });
  }, [assets.length, sessionId, addAsset, updateProgress, markDone, markError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxFiles: MAX_FILES,
    multiple: true,
  });

  const remove = useCallback((id: string) => {
    const url = blobs.current.get(id);
    if (url) { URL.revokeObjectURL(url); blobs.current.delete(id); }
    removeAsset(id);
  }, [removeAsset]);

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative rounded-2xl bg-cosmos-surface min-h-[280px] p-6 cursor-pointer transition-colors
          ${isDragActive ? 'bg-cosmos-surface-hover' : ''}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'><rect width='100%25' height='100%25' rx='16' ry='16' fill='none' stroke='%23c8c6bd' stroke-width='2' stroke-dasharray='8 6' /></svg>\")",
          backgroundSize: '100% 100%',
          animation: isDragActive ? 'cosmos-dash-march 1.6s linear infinite' : 'none',
        }}
      >
        <input {...getInputProps()} />
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex -space-x-3">
              <img src="/onboarding-v3/icons/png.png" alt="" className="w-12 h-12" />
              <img src="/onboarding-v3/icons/jpg.png" alt="" className="w-12 h-12" />
              <img src="/onboarding-v3/icons/pdf.png" alt="" className="w-12 h-12" />
            </div>
            <p className="text-[14px] font-medium text-cosmos-primary">
              Drag & drop up to {MAX_FILES} assets
            </p>
            <p className="text-[12px] text-cosmos-secondary">
              Images, PDFs, fonts, design files. Max {MAX_SIZE_MB}MB each.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {assets.map(a => <UploadTile key={a.id} asset={a} onRemove={remove} />)}
            {assets.length < MAX_FILES && (
              <div className="aspect-square grid place-items-center rounded-xl border border-dashed border-cosmos-dash text-cosmos-secondary text-[13px]">
                + Add more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding-v3/components/OnboardingDropzone.tsx
git commit -m "feat(onboarding-v3): OnboardingDropzone with animated dashed border"
```

---

### Task 23: `StyleCard` + `StyleCardGrid`

**Files:**
- Create: `src/features/onboarding-v3/components/StyleCard.tsx`
- Create: `src/features/onboarding-v3/components/StyleCardGrid.tsx`

- [ ] **Step 1: Write `StyleCard`**

Create `src/features/onboarding-v3/components/StyleCard.tsx`:

```tsx
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { FeelStyle } from '../types';
import { LockBadge } from './LockBadge';

interface Props {
  style: FeelStyle;
  selected: boolean;
  onSelect(id: string): void;
  onToggleLock(id: string): void;
}

export function StyleCard({ style, selected, onSelect, onToggleLock }: Props) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(style.id)}
      className="group relative aspect-square rounded-2xl overflow-hidden border border-cosmos-border bg-cosmos-surface"
      animate={{
        scale: selected ? 1.02 : 1,
        rotateX: style.locked ? -1 : 0,
        translateZ: style.locked ? 8 : 0,
      }}
      whileHover={{ scale: 1.02 }}
      style={{
        outline: selected ? '2px solid var(--accent)' : 'none',
        outlineOffset: 2,
        transformStyle: 'preserve-3d',
      }}
    >
      <img src={style.imageUrl} alt={style.label} className="absolute inset-0 w-full h-full object-cover" />
      <LockBadge locked={style.locked} onToggle={() => onToggleLock(style.id)} />
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
        <span className="text-[11px] font-medium text-white uppercase tracking-wider">{style.label}</span>
      </div>
      {selected && (
        <div className="absolute top-2 left-2 grid place-items-center w-5 h-5 rounded-full bg-cosmos-accent text-cosmos-accent-contrast">
          <Check size={12} />
        </div>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 2: Write `StyleCardGrid`**

Create `src/features/onboarding-v3/components/StyleCardGrid.tsx`:

```tsx
import { useOnboardingStore } from '../store/onboardingStore';
import { StyleCard } from './StyleCard';

export function StyleCardGrid() {
  const styles = useOnboardingStore(s => s.feel.styles);
  const selectedId = useOnboardingStore(s => s.feel.selectedStyleId);
  const selectStyle = useOnboardingStore(s => s.selectStyle);
  const toggleLock = useOnboardingStore(s => s.toggleStyleLock);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {styles.map(style => (
        <StyleCard
          key={style.id}
          style={style}
          selected={selectedId === style.id}
          onSelect={selectStyle}
          onToggleLock={toggleLock}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding-v3/components/StyleCard.tsx src/features/onboarding-v3/components/StyleCardGrid.tsx
git commit -m "feat(onboarding-v3): style cards"
```

---

### Task 24: `PaletteCard` + `PaletteCardList` + `PaletteEditor`

**Files:**
- Create: `src/features/onboarding-v3/components/PaletteCard.tsx`
- Create: `src/features/onboarding-v3/components/PaletteCardList.tsx`
- Create: `src/features/onboarding-v3/components/PaletteEditor.tsx`

- [ ] **Step 1: Write `PaletteCard`**

Create `src/features/onboarding-v3/components/PaletteCard.tsx`:

```tsx
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { FeelPalette } from '../types';
import { LockBadge } from './LockBadge';

interface Props {
  palette: FeelPalette;
  selected: boolean;
  onSelect(id: string): void;
  onToggleLock(id: string): void;
}

export function PaletteCard({ palette, selected, onSelect, onToggleLock }: Props) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(palette.id)}
      className="group relative rounded-2xl overflow-hidden border border-cosmos-border bg-cosmos-surface w-full text-left"
      animate={{
        scale: selected ? 1.01 : 1,
        rotateX: palette.locked ? -1 : 0,
        translateZ: palette.locked ? 8 : 0,
      }}
      style={{
        outline: selected ? '2px solid var(--accent)' : 'none',
        outlineOffset: 2,
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="flex h-20">
        {palette.colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <p className="text-[13px] font-medium text-cosmos-primary">{palette.name}</p>
          <p className="text-[11px] uppercase tracking-wider text-cosmos-muted">{palette.mood}</p>
        </div>
        {selected && (
          <div className="grid place-items-center w-5 h-5 rounded-full bg-cosmos-accent text-cosmos-accent-contrast">
            <Check size={12} />
          </div>
        )}
      </div>
      <LockBadge locked={palette.locked} onToggle={() => onToggleLock(palette.id)} />
    </motion.button>
  );
}
```

- [ ] **Step 2: Write `PaletteEditor`**

Create `src/features/onboarding-v3/components/PaletteEditor.tsx`:

```tsx
import { useState } from 'react';
import type { FeelPalette } from '../types';

interface Props {
  palette: FeelPalette;
  onChange(colors: string[]): void;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function PaletteEditor({ palette, onChange }: Props) {
  const [local, setLocal] = useState<string[]>(palette.colors);
  const [errors, setErrors] = useState<(string | null)[]>([null, null, null, null, null]);

  function update(idx: number, value: string) {
    const next = [...local];
    next[idx] = value;
    setLocal(next);
    const nextErrors = [...errors];
    nextErrors[idx] = HEX_RE.test(value) ? null : 'Use #RRGGBB';
    setErrors(nextErrors);
    if (nextErrors.every(e => e === null)) onChange(next);
  }

  return (
    <div className="mt-3 p-3 rounded-xl border border-cosmos-border bg-cosmos-surface-hover grid grid-cols-5 gap-3">
      {local.map((hex, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <input
            type="color"
            value={HEX_RE.test(hex) ? hex : '#000000'}
            onChange={(e) => update(idx, e.target.value)}
            className="w-full h-10 rounded-lg border border-cosmos-border cursor-pointer"
          />
          <input
            type="text"
            value={hex}
            onChange={(e) => update(idx, e.target.value)}
            className={`h-8 rounded-md border bg-cosmos-surface px-2 text-[11px] font-mono uppercase
              ${errors[idx] ? 'border-red-500' : 'border-cosmos-border'}`}
            maxLength={7}
          />
          {errors[idx] && <p className="text-[10px] text-red-500">{errors[idx]}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `PaletteCardList`**

Create `src/features/onboarding-v3/components/PaletteCardList.tsx`:

```tsx
import { useOnboardingStore } from '../store/onboardingStore';
import { PaletteCard } from './PaletteCard';
import { PaletteEditor } from './PaletteEditor';

export function PaletteCardList() {
  const palettes = useOnboardingStore(s => s.feel.palettes);
  const selectedId = useOnboardingStore(s => s.feel.selectedPaletteId);
  const selectPalette = useOnboardingStore(s => s.selectPalette);
  const toggleLock = useOnboardingStore(s => s.togglePaletteLock);
  const updateColors = useOnboardingStore(s => s.updatePaletteColors);

  return (
    <div className="flex flex-col gap-3">
      {palettes.map(p => (
        <div key={p.id}>
          <PaletteCard
            palette={p}
            selected={selectedId === p.id}
            onSelect={selectPalette}
            onToggleLock={toggleLock}
          />
          {selectedId === p.id && (
            <PaletteEditor
              palette={p}
              onChange={(colors) => updateColors(p.id, colors)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/onboarding-v3/components/PaletteCard.tsx src/features/onboarding-v3/components/PaletteEditor.tsx src/features/onboarding-v3/components/PaletteCardList.tsx
git commit -m "feat(onboarding-v3): palette cards + editor"
```

---

### Task 25: `ShuffleControls`

**Files:**
- Create: `src/features/onboarding-v3/components/ShuffleControls.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/onboarding-v3/components/ShuffleControls.tsx`:

```tsx
import { Shuffle } from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';
import { lockedCount } from '../utils/shuffle';

export function ShuffleControls() {
  const shuffle = useOnboardingStore(s => s.shuffle);
  const styles = useOnboardingStore(s => s.feel.styles);
  const palettes = useOnboardingStore(s => s.feel.palettes);
  const total = lockedCount(styles) + lockedCount(palettes);

  const btn = 'inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[11px] font-medium border border-cosmos-border hover:bg-cosmos-surface-hover';

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => shuffle('all')} className={btn}>
        <Shuffle size={12} />
        Reshuffle all{total > 0 ? ` (${total} locked)` : ''}
      </button>
      <button type="button" onClick={() => shuffle('styles')} className={btn}>
        <Shuffle size={12} /> Style
      </button>
      <button type="button" onClick={() => shuffle('palettes')} className={btn}>
        <Shuffle size={12} /> Palette
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/components/ShuffleControls.tsx
git commit -m "feat(onboarding-v3): ShuffleControls"
```

---

## Phase 6 — Steps

### Task 26: `DefineStep`

**Files:**
- Create: `src/features/onboarding-v3/steps/DefineStep.tsx`

- [ ] **Step 1: Write the step**

Create `src/features/onboarding-v3/steps/DefineStep.tsx`:

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboardingStore } from '../store/onboardingStore';
import { SparkleAssist } from '../components/SparkleAssist';

interface Props { onNext(): void; onBack?(): void }

export function DefineStep({ onNext, onBack }: Props) {
  const define = useOnboardingStore(s => s.define);
  const update = useOnboardingStore(s => s.updateDefine);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const coreValid = define.name.trim().length > 0 && define.description.trim().length > 0;

  const input = 'w-full h-[44px] rounded-xl border border-cosmos-border bg-cosmos-surface px-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';
  const textarea = 'w-full min-h-[96px] rounded-xl border border-cosmos-border bg-cosmos-surface p-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';
  const label = 'text-[11px] font-medium uppercase tracking-wider text-cosmos-muted';

  return (
    <div className="flex flex-col gap-8 max-w-[620px] mx-auto">
      <section className="flex flex-col gap-4">
        <h2 className={label}>Core</h2>
        <div>
          <input
            type="text"
            className={input}
            placeholder="Brand name"
            value={define.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="relative">
          <textarea
            className={textarea}
            placeholder="Describe your brand in a sentence or two"
            value={define.description}
            onChange={(e) => update({ description: e.target.value })}
          />
          <SparkleAssist
            brandName={define.name}
            onText={(t) => update({ description: t })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={label}>Context <span className="text-cosmos-muted normal-case">(optional)</span></h2>
        <input type="text" className={input} placeholder="Target audience"
          value={define.audience} onChange={(e) => update({ audience: e.target.value })} />
        <input type="text" className={input} placeholder="Market or competitors"
          value={define.market} onChange={(e) => update({ market: e.target.value })} />
      </section>

      <section className="flex flex-col gap-4">
        <button type="button" onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-cosmos-muted hover:text-cosmos-primary">
          {showAdvanced ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          Advanced
        </button>
        {showAdvanced && (
          <>
            <textarea className={textarea} placeholder="Goals"
              value={define.goals} onChange={(e) => update({ goals: e.target.value })} />
            <textarea className={textarea} placeholder="Values"
              value={define.values} onChange={(e) => update({ values: e.target.value })} />
          </>
        )}
      </section>

      <footer className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} disabled={!onBack}
          className="text-[13px] text-cosmos-secondary disabled:opacity-30">Previous</button>
        <button type="button" onClick={onNext} disabled={!coreValid}
          className="rounded-full h-10 px-5 bg-cosmos-accent text-cosmos-accent-contrast text-[13px] font-medium disabled:opacity-40">
          Next →
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/steps/DefineStep.tsx
git commit -m "feat(onboarding-v3): DefineStep"
```

---

### Task 27: `FeelStep`

**Files:**
- Create: `src/features/onboarding-v3/steps/FeelStep.tsx`

- [ ] **Step 1: Write the step**

Create `src/features/onboarding-v3/steps/FeelStep.tsx`:

```tsx
import { useOnboardingStore } from '../store/onboardingStore';
import { StyleCardGrid } from '../components/StyleCardGrid';
import { PaletteCardList } from '../components/PaletteCardList';
import { ShuffleControls } from '../components/ShuffleControls';

interface Props { onNext(): void; onBack(): void }

export function FeelStep({ onNext, onBack }: Props) {
  const selectedStyleId = useOnboardingStore(s => s.feel.selectedStyleId);
  const selectedPaletteId = useOnboardingStore(s => s.feel.selectedPaletteId);
  const canProceed = !!selectedStyleId && !!selectedPaletteId;
  const label = 'text-[11px] font-medium uppercase tracking-wider text-cosmos-muted';

  return (
    <div className="flex flex-col gap-8 max-w-[820px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className={label}>Feel</h2>
        <ShuffleControls />
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-[13px] font-medium text-cosmos-primary">Choose a style</h3>
        <StyleCardGrid />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-[13px] font-medium text-cosmos-primary">Pick a palette</h3>
        <PaletteCardList />
      </section>

      <footer className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack}
          className="text-[13px] text-cosmos-secondary">← Previous</button>
        <button type="button" onClick={onNext} disabled={!canProceed}
          className="rounded-full h-10 px-5 bg-cosmos-accent text-cosmos-accent-contrast text-[13px] font-medium disabled:opacity-40">
          Generate →
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/steps/FeelStep.tsx
git commit -m "feat(onboarding-v3): FeelStep"
```

---

### Task 28: `GenerateStep`

**Files:**
- Create: `src/features/onboarding-v3/steps/GenerateStep.tsx`

- [ ] **Step 1: Write the step**

Create `src/features/onboarding-v3/steps/GenerateStep.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useOnboardingStore } from '../store/onboardingStore';
import { generateBrand, isAIConfigured } from '@/features/onboarding-brand/services/brandGenerator';
import { GeneratedBrandCard } from '@/features/onboarding-brand/components/GeneratedBrandCard';
import type { GeneratedBrand } from '@/features/onboarding-brand/types';

interface Props { onBack(): void; onPick(variation: GeneratedBrand): void }

function buildPrompt(state: ReturnType<typeof useOnboardingStore.getState>): string {
  const { define, feel } = state;
  const style = feel.styles.find(s => s.id === feel.selectedStyleId);
  const palette = feel.palettes.find(p => p.id === feel.selectedPaletteId);
  return [
    `Brand: ${define.name}`,
    `Description: ${define.description}`,
    define.audience && `Audience: ${define.audience}`,
    define.market && `Market: ${define.market}`,
    define.goals && `Goals: ${define.goals}`,
    define.values && `Values: ${define.values}`,
    style && `Visual style: ${style.label} (${style.moodKeywords.join(', ')})`,
    palette && `Preferred palette: ${palette.name} — colors ${palette.colors.join(', ')}, mood ${palette.mood}`,
    `Produce three variations that RESPECT the palette colors and style mood.`,
  ].filter(Boolean).join('\n');
}

export function GenerateStep({ onBack, onPick }: Props) {
  const aiState = useOnboardingStore(s => s.aiState);
  const variations = useOnboardingStore(s => s.variations);
  const error = useOnboardingStore(s => s.variationsError);
  const setAiState = useOnboardingStore(s => s.setAiState);
  const setVariations = useOnboardingStore(s => s.setVariations);
  const setError = useOnboardingStore(s => s.setVariationsError);
  const [retries, setRetries] = useState(0);

  async function run() {
    setAiState('generating'); setError(null);
    if (!isAIConfigured()) {
      toast.message('AI offline — showing local variations.');
      setVariations([]);
      setAiState('idle');
      return;
    }
    try {
      const prompt = buildPrompt(useOnboardingStore.getState());
      const out = await generateBrand(prompt);
      setVariations(out.variations);
      setAiState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAiState('error');
    }
  }

  useEffect(() => {
    if (aiState === 'idle' && variations == null) run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[820px] mx-auto">
      <AnimatePresence mode="wait">
        {aiState === 'generating' && (
          <motion.div key="loading" className="h-[320px] relative rounded-2xl overflow-hidden border border-cosmos-border bg-cosmos-surface"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="absolute inset-y-0 w-1/3"
              style={{ background: 'linear-gradient(90deg, transparent, var(--accent-muted), transparent)' }}
              animate={{ x: ['-40%', '140%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 grid place-items-center text-[13px] text-cosmos-secondary">
              Crafting three directions…
            </div>
          </motion.div>
        )}

        {aiState === 'error' && (
          <motion.div key="error" className="p-6 rounded-2xl border border-red-500/30 bg-red-500/5 text-[13px] text-red-600">
            <p>Generation failed: {error}</p>
            <button type="button" onClick={() => { setRetries(r => r + 1); run(); }}
              disabled={retries >= 3}
              className="mt-3 rounded-full h-9 px-4 bg-cosmos-accent text-cosmos-accent-contrast disabled:opacity-40">
              Retry
            </button>
          </motion.div>
        )}

        {aiState === 'idle' && variations && (
          <motion.div key="results"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            initial="hidden" animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
            {variations.map((v, i) => (
              <motion.div key={i}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <button type="button" onClick={() => onPick(v)} className="text-left w-full">
                  <GeneratedBrandCard brand={v} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} className="text-[13px] text-cosmos-secondary">← Previous</button>
      </footer>
    </div>
  );
}
```

**Note:** this step imports `generateBrand` and `GeneratedBrandCard` from existing code. If the actual export names differ, search the source and adjust.

- [ ] **Step 2: Verify typecheck**

Run:
```bash
npm run typecheck
```

If `generateBrand` is not a named export, inspect `src/features/onboarding-brand/services/brandGenerator.ts` and `src/features/onboarding-brand/hooks/useBrandGenerator.ts` to find the correct export, then update the import.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding-v3/steps/GenerateStep.tsx
git commit -m "feat(onboarding-v3): GenerateStep with existing brandGenerator"
```

---

## Phase 7 — Screens

### Task 29: `SetUpScreen`

**Files:**
- Create: `src/features/onboarding-v3/screens/SetUpScreen.tsx`

- [ ] **Step 1: Write the screen**

Create `src/features/onboarding-v3/screens/SetUpScreen.tsx`:

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { OnboardingDropzone } from '../components/OnboardingDropzone';
import { UrlPillInput } from '../components/UrlPillInput';
import { SparkleAssist } from '../components/SparkleAssist';
import { finalizeAssets } from '../services/finalizeAssets';
import { createBrandFromOnboardingV3 } from '@/features/onboarding/utils/createBrandFromAnswers';

export function SetUpScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then') || null;
  const [busy, setBusy] = useState(false);

  const sessionId = useOnboardingStore(s => s.sessionId);
  const define = useOnboardingStore(s => s.define);
  const assets = useOnboardingStore(s => s.assets);
  const update = useOnboardingStore(s => s.updateDefine);
  const reset = useOnboardingStore(s => s.reset);
  const setFlow = useOnboardingStore(s => s.setFlow);
  setFlow('setup');

  const canSubmit = define.name.trim().length > 0 && assets.length >= 1 && assets.every(a => a.uploadStatus !== 'uploading');

  async function onSetup() {
    setBusy(true);
    try {
      const { brandId, slug } = await createBrandFromOnboardingV3({
        mode: 'import',
        define,
        assets,
      });
      const uploaded = assets.filter(a => a.uploadStatus === 'done' && a.scratchPath);
      if (uploaded.length) {
        const result = await finalizeAssets(sessionId, brandId, uploaded.map(a => a.id));
        if (result.failed.length) {
          toast.error(`${result.failed.length} asset(s) failed — retry from the Identity page.`);
        }
      }
      reset();
      navigate(then ?? `/b/${slug}/identity`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full h-[44px] rounded-xl border border-cosmos-border bg-cosmos-surface px-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';
  const textarea = 'w-full min-h-[96px] rounded-xl border border-cosmos-border bg-cosmos-surface p-3.5 text-[14px] placeholder:text-cosmos-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]';

  return (
    <div data-onboarding="cosmos" className="min-h-screen">
      <OnboardingHeader
        title="Set up your Brand"
        subtitle="Upload what you already have — logos, PDFs, fonts, references."
        crossLink={{ to: `/onboarding-v3/create${then ? `?then=${encodeURIComponent(then)}` : ''}`, label: 'or create one from scratch →' }}
      />

      <main className="max-w-[620px] mx-auto px-6 py-8 flex flex-col gap-5">
        <input
          type="text"
          className={input}
          placeholder="Brand name"
          value={define.name}
          onChange={(e) => update({ name: e.target.value })}
        />

        <div className="relative">
          <textarea
            className={textarea}
            placeholder="Describe your brand"
            value={define.description}
            onChange={(e) => update({ description: e.target.value })}
          />
          <SparkleAssist
            brandName={define.name}
            onText={(t) => update({ description: t })}
          />
        </div>

        <OnboardingDropzone />
        <UrlPillInput />

        <button
          type="button"
          onClick={onSetup}
          disabled={!canSubmit || busy}
          className="self-end rounded-full h-10 px-6 bg-cosmos-accent text-cosmos-accent-contrast text-[13px] font-medium disabled:opacity-40"
        >
          {busy ? 'Setting up…' : 'Set up'}
        </button>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/screens/SetUpScreen.tsx
git commit -m "feat(onboarding-v3): SetUpScreen"
```

---

### Task 30: `CreateScreen`

**Files:**
- Create: `src/features/onboarding-v3/screens/CreateScreen.tsx`

- [ ] **Step 1: Write the screen**

Create `src/features/onboarding-v3/screens/CreateScreen.tsx`:

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { StepDots } from '../components/StepDots';
import { DefineStep } from '../steps/DefineStep';
import { FeelStep } from '../steps/FeelStep';
import { GenerateStep } from '../steps/GenerateStep';
import { createBrandFromOnboardingV3 } from '@/features/onboarding/utils/createBrandFromAnswers';

export function CreateScreen() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then') || null;
  const [busy, setBusy] = useState(false);

  const step = useOnboardingStore(s => s.step);
  const setStep = useOnboardingStore(s => s.setStep);
  const setFlow = useOnboardingStore(s => s.setFlow);
  const reset = useOnboardingStore(s => s.reset);
  setFlow('create');

  async function onPick(variation: unknown) {
    setBusy(true);
    try {
      const { slug } = await createBrandFromOnboardingV3({
        mode: 'generate',
        define: useOnboardingStore.getState().define,
        feel: useOnboardingStore.getState().feel,
        chosenVariation: variation,
      });
      reset();
      navigate(then ?? `/b/${slug}/identity`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-onboarding="cosmos" className="min-h-screen">
      <OnboardingHeader
        title="Create your Brand"
        crossLink={{ to: `/onboarding-v3${then ? `?then=${encodeURIComponent(then)}` : ''}`, label: 'or import an existing one →' }}
      />
      <StepDots current={step} />
      <main className="px-6 py-6">
        {busy && <p className="text-center text-[13px] text-cosmos-secondary mb-4">Creating brand…</p>}
        {step === 1 && <DefineStep onNext={() => setStep(2)} />}
        {step === 2 && <FeelStep onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <GenerateStep onBack={() => setStep(2)} onPick={(v) => onPick(v)} />}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding-v3/screens/CreateScreen.tsx
git commit -m "feat(onboarding-v3): CreateScreen (step dispatcher)"
```

---

### Task 31: Extend `createBrandFromAnswers` (additive, reflection-first)

This task depends on the exact shape of the existing `createBrandFromAnswers` — do NOT write code until you have read the real signature.

**Files:**
- Modify: the file that exports `createBrandFromAnswers` (discover in Step 1)
- No new file — adapter lives next to the original

- [ ] **Step 1: Locate the existing function and read it**

Run:
```bash
rg -l "export (async )?function createBrandFromAnswers" src
```

Open the file. Read the function signature, the full type of its `answers` parameter, the returned object (look for `brandId`, `slug`, or whatever keys it returns), and any helper types it imports (e.g., `BrandAnswers`, `StartFreshAnswers`, `ImportBrandAnswers`).

**Write down in a comment on the task tracker:**
- Exact parameter type name
- Exact return type (or shape of the resolved promise)
- Whether there is one function or two (one each for start-fresh + import)

- [ ] **Step 2: Inspect the GeneratedBrand type**

Open `src/features/onboarding-brand/types.ts`. Read `GeneratedBrand` in full. You'll use every field of it.

- [ ] **Step 3: Write the v3 adapter matching the real shapes**

At the bottom of the `createBrandFromAnswers` file, append this adapter and fill in the field mappings so the code type-checks against the real `BrandAnswers` (or equivalent) type you read in Step 1. The two mapping tables below are the mental model; translate them into code.

**Import flow field mapping:**

| v3 field | legacy field |
|---|---|
| `input.define.name` | `name` |
| `input.define.description` | `description` |
| `input.define.audience` | `audience` (or whatever the legacy import type calls it) |
| `input.assets` | `logoUrls` + `assetUrls` (legacy fields for uploaded logos + other assets). Pass `scratchPath` values; finalize happens in the caller. |

**Generate flow field mapping:**

| v3 / chosen variation | legacy field |
|---|---|
| `chosen.name` | `name` |
| `chosen.tagline` | `tagline` |
| `chosen.description` | `description` |
| `chosen.colors.{primary,secondary,accent,neutrals}` | the legacy colors shape |
| `chosen.fonts.{heading, body}` | the legacy fonts shape |
| `chosen.voice.{traits, tone}` | legacy voice |
| `chosen.personality.{values, visualStyle}` | legacy personality |
| `chosen.logoConcept.description` | legacy `logoConceptDescription` (or nearest equivalent) |
| `input.feel.selectedStyle.label` | legacy `visualStyle` or `styleDirection` |
| `input.feel.selectedPalette.colors` | legacy `colorPalette` if distinct from `chosen.colors` |

Append this code (with the two TODO mapping regions filled in against the real types):

```ts
import type { GeneratedBrand } from '@/features/onboarding-brand/types';
import type { OnboardingAsset, DefineAnswers, FeelPalette, FeelStyle } from '@/features/onboarding-v3/types';

export interface OnboardingV3ImportInput {
  mode: 'import';
  define: DefineAnswers;
  assets: OnboardingAsset[];
}

export interface OnboardingV3GenerateInput {
  mode: 'generate';
  define: DefineAnswers;
  feel: {
    styles: FeelStyle[];
    selectedStyleId: string | null;
    palettes: FeelPalette[];
    selectedPaletteId: string | null;
  };
  chosenVariation: GeneratedBrand;
}

export type OnboardingV3Input = OnboardingV3ImportInput | OnboardingV3GenerateInput;

export async function createBrandFromOnboardingV3(
  input: OnboardingV3Input,
): Promise<{ brandId: string; slug: string }> {
  if (input.mode === 'import') {
    // Map input.define + input.assets into the exact type that
    // createBrandFromAnswers accepts. Use the table in Step 3 above.
    const answers = {/* FILL IN USING IMPORT MAPPING TABLE */};
    const result = await createBrandFromAnswers(answers);
    // Normalize to { brandId, slug }. If the existing function returns a
    // different shape (e.g., { id, slug } or just a Brand object), adapt
    // here so all callers of this adapter see the same return type.
    return { brandId: result.id ?? result.brandId, slug: result.slug };
  }

  const style = input.feel.styles.find((s) => s.id === input.feel.selectedStyleId);
  const palette = input.feel.palettes.find((p) => p.id === input.feel.selectedPaletteId);
  const chosen = input.chosenVariation;

  // Map chosen + style + palette + define into the exact type that
  // createBrandFromAnswers accepts. Use the table in Step 3 above.
  const answers = {/* FILL IN USING GENERATE MAPPING TABLE */};

  const result = await createBrandFromAnswers(answers);
  return { brandId: result.id ?? result.brandId, slug: result.slug };
}
```

The `/* FILL IN ... */` markers MUST be replaced with concrete TypeScript that type-checks. If you leave them as comments the file will not compile — typecheck in the next step forces you to resolve them.

- [ ] **Step 4: Typecheck — must pass with no errors**

Run:
```bash
npm run typecheck
```

Expected: PASS with zero errors. If errors appear, read them, re-read the legacy `createBrandFromAnswers` parameter type, and adjust the two `answers` objects. Do NOT add `@ts-expect-error` or `as any` to pass this step.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/utils/createBrandFromAnswers.ts
git commit -m "feat(onboarding-v3): createBrandFromOnboardingV3 adapter"
```

---

### Task 32: `PreviewScreen` (thin wrapper)

**Files:**
- Create: `src/features/onboarding-v3/screens/PreviewScreen.tsx`

- [ ] **Step 1: Inspect the existing preview page**

Read `src/pages/onboarding/preview.tsx` to see what it expects. If it consumes data from `localStorage` or a shared route state, the v3 preview can be a thin wrapper over the same component.

- [ ] **Step 2: Write the screen**

Create `src/features/onboarding-v3/screens/PreviewScreen.tsx`. Because v3 builds the brand inline on variation-pick (no separate preview step), this screen is only needed if a deep-link scenario exists. For v1, render a simple redirect:

```tsx
import { Navigate } from 'react-router-dom';

export function PreviewScreen() {
  return <Navigate to="/onboarding-v3/create" replace />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding-v3/screens/PreviewScreen.tsx
git commit -m "feat(onboarding-v3): PreviewScreen (redirect placeholder)"
```

---

## Phase 8 — Routing

### Task 33: Page handlers and route wiring

**Files:**
- Create: `src/pages/onboarding-v3/index.tsx`
- Create: `src/pages/onboarding-v3/create.tsx`
- Create: `src/pages/onboarding-v3/preview.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write page handlers**

Create `src/pages/onboarding-v3/index.tsx`:

```tsx
import { SetUpScreen } from '@/features/onboarding-v3/screens/SetUpScreen';
export default function OnboardingV3Page() { return <SetUpScreen />; }
```

Create `src/pages/onboarding-v3/create.tsx`:

```tsx
import { CreateScreen } from '@/features/onboarding-v3/screens/CreateScreen';
export default function OnboardingV3CreatePage() { return <CreateScreen />; }
```

Create `src/pages/onboarding-v3/preview.tsx`:

```tsx
import { PreviewScreen } from '@/features/onboarding-v3/screens/PreviewScreen';
export default function OnboardingV3PreviewPage() { return <PreviewScreen />; }
```

- [ ] **Step 2: Wire routes**

Modify `src/App.tsx`. Near the existing `OnboardingPage` / `OnboardingBrandPage` lazy imports (around line 23), add:

```tsx
const OnboardingV3Page = lazy(() => import("./pages/onboarding-v3"));
const OnboardingV3CreatePage = lazy(() => import("./pages/onboarding-v3/create"));
const OnboardingV3PreviewPage = lazy(() => import("./pages/onboarding-v3/preview"));
```

Near the existing onboarding routes (around line 182), add:

```tsx
<Route path="/onboarding-v3" element={<OnboardingV3Page />} />
<Route path="/onboarding-v3/create" element={<OnboardingV3CreatePage />} />
<Route path="/onboarding-v3/preview" element={<OnboardingV3PreviewPage />} />
```

- [ ] **Step 3: Verify build and typecheck**

Run:
```bash
npm run typecheck && npm run lint
```

Expected: PASS on both.

- [ ] **Step 4: Smoke test in dev**

Run:
```bash
npm run dev
```

Navigate to `http://localhost:8080/onboarding-v3` — page renders, header shows the cross-link, dropzone is present, background uses Cosmos tokens (muted cream in light mode). Click the cross-link → lands on `/onboarding-v3/create` showing step dots with Define active.

- [ ] **Step 5: Commit**

```bash
git add src/pages/onboarding-v3 src/App.tsx
git commit -m "feat(onboarding-v3): wire routes"
```

---

## Phase 9 — Verification

### Task 34: Manual E2E run-through + regression

**Files:** none modified — this task is a checklist.

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Set up flow — happy path**

Navigate to `/onboarding-v3`. Perform the following and confirm each works:

- [ ] Page renders in both light and dark modes (toggle via system theme).
- [ ] Type a brand name; click Sparkle → description streams in.
- [ ] Drag 3 images + 1 PDF + 1 font → tiles appear with correct icons.
- [ ] Try to drop an 11th file → rejected with a toast.
- [ ] Paste a URL into the pill → preview tile appears.
- [ ] Remove one upload mid-progress → blob URL revoked, no console error.
- [ ] Click "Set up" → brand created, lands on `/b/:slug/identity`.
- [ ] `/onboarding-v3?then=/b/raqm/design` → after create, lands at the `then` target.

- [ ] **Step 3: Create flow — happy path**

Navigate to `/onboarding-v3/create`.

- [ ] Fill Core, click Next → reaches Feel.
- [ ] Click 2 styles, 1 palette → latest selection wins per group.
- [ ] Lock 1 palette, click `Reshuffle all` → locked palette colors unchanged.
- [ ] Expand a palette, edit a hex to `not-hex` → error shows, no commit to store.
- [ ] Click Generate → sweep animation, then 3 cards stagger in.
- [ ] Pick a card → brand created, lands on `/b/:slug/identity`.
- [ ] Refresh mid-Feel → styles/palettes and selections persist.
- [ ] Disable `VITE_ANTHROPIC_API_KEY` (set to empty in `.env.local`), retry Generate → local fallback toast and empty variation list.

- [ ] **Step 4: Regression**

- [ ] `/onboarding` still works (old flow).
- [ ] `/onboarding-brand` still works.
- [ ] `BrandChooserDialog` still routes "Create new brand" to `/onboarding`.
- [ ] The existing brand Identity page still loads without errors.

- [ ] **Step 5: Final commit**

If any tweaks are needed, commit them. Otherwise:

```bash
git commit --allow-empty -m "chore(onboarding-v3): E2E verification complete"
```

- [ ] **Step 6: Push to remotes**

```bash
git push origin dev && git push origin dev:x
```

- [ ] **Step 7: Tell the user**

> v3 is live at `/onboarding-v3`. The old flows at `/onboarding` and `/onboarding-brand` are untouched. When you're satisfied that v3 is solid, we'll write the follow-up spec to flip `BrandChooserDialog` and retire v1/v2.

---

## Self-Review Notes

- **Spec §3 routing:** Tasks 33 cover routes and cross-links.
- **Spec §4 Set up:** Tasks 18, 20, 21, 22, 29. Sparkle Assist, URL pill, dropzone, tiles, CTA.
- **Spec §5.1 StepDots:** Task 17.
- **Spec §5.2 Define:** Task 26.
- **Spec §5.3 Feel (style cards, palettes, shuffle, lock):** Tasks 19, 23, 24, 25, 27.
- **Spec §5.4 Generate:** Task 28 (stub on existing `brandGenerator`).
- **Spec §6 Cosmos tokens:** Task 2.
- **Spec §7 upload pipeline:** Tasks 13, 22, 11 (finalize function), 14 (client).
- **Spec §8 store:** Task 7.
- **Spec §9 file structure:** covered by all tasks creating files; structure matches.
- **Spec §10 reuse:** Tasks 28 (generateBrand), 31 (createBrandFromAnswers adapter), 4 (colorEngine).
- **Spec §11 Edge Functions:** Tasks 9, 10, 11, 12.
- **Spec §11.2 LogoEngine seam:** Task 15.
- **Spec §12 data flow:** Tasks 29, 30 implement the two flows end-to-end.
- **Spec §13 error handling:** per-task (dropzone toast limits, SparkleAssist error callback, GenerateStep error+retry, finalize partial failure handled via toast in SetUpScreen).
- **Spec §14 testing:** Task 5 (shuffle), 6 (assetTypeIcon), 7 (store). E2E in Task 34. Component tests on dropzone/palette-editor/step-dots are NOT in this plan — add as follow-ups if needed; manual E2E covers them for v1.
- **Spec §14.3 E2E checklist:** Task 34 mirrors it directly.
- **Spec §16 out of scope:** respected — no logo engine, mockup scenes, font licensing, i18n, or deprecation work in this plan.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-onboarding-v3.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
