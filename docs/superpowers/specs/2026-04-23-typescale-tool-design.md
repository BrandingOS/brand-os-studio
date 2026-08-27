# Typescale Tool — Design Spec

**Date:** 2026-04-23
**Status:** Draft — pending user review
**Related:** `src/features/tools/README.md`, `src/features/tools/core/toolRegistry.ts`, `src/features/tools/ui-color-system/*` (reference implementation pattern)

---

## 1. Purpose

Ship a comprehensive, modern typescale tool as the third entry in the BrandingOS tools platform. It must be a first-class brand-identity tool: the typescale a user creates is persisted into brand data (`brand.typescale`) and instantly consumed by Brand Board, Identity, presentation templates, social designs, and website exports.

The tool has two surface forms:

1. **Full-page** — public `/tools/typescale` (anonymous, gated export, lead-gen funnel) and in-app `/b/:slug/tools/typescale` (brand-scoped, auto-save, no gates).
2. **Embedded dialog** — launched from Brand Setup, Identity → Typography, and Brand Board → TypographyPanel. Mounts the same editor inside a `<Dialog>`/`<Sheet>` in a compact variant.

## 2. Core decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Unified editor** — font pair + scale + live preview + exports in one view | User asked for "comprehensive"; matches `ui-color-system` pattern |
| 2 | **Two modes** — brand-scoped (primary) + public (lead-gen) | Matches existing tools platform; brand mode is the product |
| 3 | **Numeric ladder + semantic overlay** — one source of truth, two views | Users want both the math (steps `t0…tN`) and the meaning (`h1`, `body`, …) |
| 4 | **Font sources: Google + system + upload** | Comprehensive; upload handles licensed/private fonts |
| 5 | **Preview modes: Editorial / UI / Raw ladder** as tabs | Each answers a different question |
| 6 | **Exports: CSS, Tailwind v3, Tailwind v4 `@theme`, JSON, SCSS, JS/TS, W3C design tokens, Figma Tokens Studio, `@font-face`+Google `<link>`** | One panel with format tabs |
| 7 | **Brand integration: dual-write** — structured `brand.typescale` object AND sync to existing `brand.typography` (primary/secondary/scale from `TypographySystem` in `brandAssets.ts`) | Instant reflection in Brand Board / Identity without requiring them to read the new object |
| 8 | **Multiple scale surfaces per brand** — one font pair, separate ladders for `web` (fluid clamp), `ui`, `presentation`, `social` | BrandingOS ships presentation/social/web; each medium has its own typographic rhythm |

## 3. Architecture

### 3.1 File layout

```
src/shared/types/typescale.ts                  Typescale type (single source of truth)
src/shared/types/brand.ts                      Brand['typescale']?: Typescale
src/shared/typography/
  ├── fontLoader.ts                            Google <link> injection, @font-face for uploads
  ├── fontCatalog.ts                           Curated Google list + system stacks + utilities
  └── index.ts

src/features/tools/typescale/
  ├── engine/                                  Pure TS, no React, no DOM
  │   ├── scale.ts                             Ratio math, ladder generation
  │   ├── fluid.ts                             clamp() for the `web` surface
  │   ├── leading.ts                           Line-height curve (large = tight, small = loose)
  │   ├── tracking.ts                          Letter-spacing heuristics
  │   ├── ratios.ts                            Named ratios (minor-second … golden + custom)
  │   ├── surfaces.ts                          Defaults per surface (web/ui/presentation/social)
  │   └── __tests__/
  ├── export/                                  One module per format, pure TS
  │   ├── css.ts          tailwindV3.ts        tailwindV4.ts
  │   ├── scss.ts         js.ts                json.ts
  │   ├── w3c.ts          figmaTokens.ts       fontSnippet.ts
  │   └── __tests__/
  ├── components/
  │   ├── TypescaleEditor.tsx                  Composable root — variant: "full" | "compact"
  │   ├── FontPairPanel.tsx                    Heading / body / optional mono picker
  │   ├── SurfaceTabs.tsx                      Web | UI | Presentation | Social
  │   ├── ScaleControls.tsx                    Base, ratio, steps, leading, tracking, fluid
  │   ├── SemanticMap.tsx                      Role → step + font + weight overrides
  │   ├── preview/
  │   │   ├── PreviewTabs.tsx                  Editorial | UI | Ladder
  │   │   ├── EditorialPreview.tsx
  │   │   ├── UIPreview.tsx
  │   │   └── LadderPreview.tsx
  │   ├── ExportPanel.tsx                      Format tabs + copy/download
  │   └── BrandSyncBar.tsx                     "Synced — saved 2s ago" (in-app mode)
  ├── public/
  │   └── TypescaleLanding.tsx                 SEO landing, mirrors ui-color-system
  ├── routes.tsx                               Public + in-app route defs
  ├── claim.ts                                 Anon-session → brand materialization
  ├── EmbeddedTypescaleDialog.tsx              Modal wrapper for Brand Setup / Identity
  └── index.ts

src/features/tools/core/toolRegistry.ts        Add 'typescale' entry
```

### 3.2 Boundaries

- `src/shared/typography/` is the global primitive. Font loading and the font catalog are reused by Brand Board, Identity, and the tool. Pure TS, no React.
- `engine/` and `export/` in the tool are pure TS, unit-testable, no DOM.
- `TypescaleEditor` accepts `variant: "full" | "compact"` and stays agnostic to its container (ToolShell or Dialog).
- The tool reads/writes brand data only through `useBrandStore`.
- `EmbeddedTypescaleDialog` lives inside the tool folder and is imported by brand-edit features. This is consistent with how the tools platform treats tools as first-class features.

## 4. Data model

```ts
// src/shared/types/typescale.ts

export type FontSource = 'google' | 'system' | 'upload';

export type FontRef = {
  family: string;                  // "Inter", "Playfair Display", "system-ui"
  source: FontSource;
  weights: number[];
  italic: boolean;
  files?: { weight: number; italic: boolean; url: string; format: 'woff2' | 'woff' | 'ttf' }[];
  fallback: string;                // "ui-sans-serif, system-ui, sans-serif"
};

export type FontPair = { heading: FontRef; body: FontRef; mono?: FontRef };

export type RatioName =
  | 'minor-second' | 'major-second' | 'minor-third' | 'major-third'
  | 'perfect-fourth' | 'augmented-fourth' | 'perfect-fifth' | 'golden' | 'custom';
export type Ratio = { name: RatioName; value: number };

export type LeadingCurve = 'tight' | 'normal' | 'loose' | 'custom';
export type TrackingCurve = 'tight' | 'normal' | 'loose' | 'custom';

export type ScaleStep = {
  id: string;                      // stable "t0" … "tN"
  index: number;                   // 0 = base
  sizePx: number;
  lineHeight: number;              // unitless multiplier
  letterSpacingEm: number;
  weight: number;
  fluid?: { minPx: number; maxPx: number; minVwPx: number; maxVwPx: number; clamp: string };
};

export type SemanticRole =
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'bodyLg' | 'body' | 'bodySm' | 'caption' | 'overline' | 'label' | 'button' | 'code';

export type SemanticEntry = {
  stepId: string;
  font: 'heading' | 'body' | 'mono';
  weight?: number;
  italic?: boolean;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'smallcaps';
  trackingEmOverride?: number;
};

export type SemanticMap = Partial<Record<SemanticRole, SemanticEntry>>;

export type SurfaceKey = 'web' | 'ui' | 'presentation' | 'social';

export type ScaleSurface = {
  key: SurfaceKey;
  basePx: number;
  ratio: Ratio;
  stepsUp: number;
  stepsDown: number;
  leading: LeadingCurve;
  tracking: TrackingCurve;
  fluid?: { minVwPx: number; maxVwPx: number; minRatioMultiplier: number };
  steps: ScaleStep[];              // computed, cached
  semantic: SemanticMap;
};

export type Typescale = {
  schemaVersion: 1;
  fonts: FontPair;                 // one pair shared across all surfaces
  surfaces: Record<SurfaceKey, ScaleSurface>;
  activeSurface: SurfaceKey;
  updatedAt: string;               // ISO
};
```

Attach to brand (additive in `src/shared/types/brand.ts`):

```ts
export interface Brand {
  // ...existing fields
  typescale?: Typescale;
}
```

**Dual-write rule:** when `typescale.fonts` or a surface's semantic steps change, the brand store also writes to the existing `brand.typography` fields (from `TypographySystem` in `src/shared/types/brandAssets.ts`):

- `typescale.fonts.heading` → `brand.typography.primary` (family + weights + fallbacks + url/fontAssetId)
- `typescale.fonts.body` → `brand.typography.secondary`
- `typescale.fonts.mono` → `brand.typography.accent` (when present)
- `typescale.surfaces.web.semantic` sizes → `brand.typography.scale` (`h1…h6`, `body`, `bodyLarge`, `bodySmall`, `caption`, `overline` — serialized as `"Npx"` strings)

The `web` surface is the canonical source for the flat `FontScaleTokens` map because it's the one existing consumers (Brand Board, Identity, templates) already interpret as "brand typography." Other surfaces live only in `brand.typescale.surfaces.*`. This keeps Brand Board, Identity, and any existing consumer in sync without requiring them to read the new object.

**Stored sizes** (`ScaleStep.sizePx` is persisted rather than recomputed on read): cheaper reads across consumers; the engine is the single writer, so consistency risk is low.

**`schemaVersion: 1`** is included from day one for forward migrations.

## 5. Engine contracts & data flow

### 5.1 Pure functions

```ts
// engine/scale.ts
export function buildLadder(input: {
  basePx: number; ratio: number; stepsUp: number; stepsDown: number;
  leading: LeadingCurve; tracking: TrackingCurve;
}): ScaleStep[];

// engine/fluid.ts — web surface only
export function toFluid(step: ScaleStep, opts: {
  minVwPx: number; maxVwPx: number; minRatioMultiplier: number;
}): ScaleStep;

// engine/leading.ts
export function leadingFor(sizePx: number, curve: LeadingCurve): number;

// engine/tracking.ts
export function trackingFor(sizePx: number, curve: TrackingCurve): number;

// engine/surfaces.ts
export const DEFAULT_SURFACES: Record<SurfaceKey, Omit<ScaleSurface, 'steps' | 'semantic' | 'key'>>;
export function defaultSemanticMap(surface: SurfaceKey, steps: ScaleStep[]): SemanticMap;

// engine/ratios.ts
export const RATIOS: Record<Exclude<RatioName, 'custom'>, number>;
```

### 5.2 Flow

```
User edits control (base/ratio/steps/leading/tracking/fluid/fonts)
        │
        ▼
ScaleSurface draft held in component state
        │
        ▼
engine.buildLadder() → steps[]    (engine.toFluid() for web)
        │
        ▼
commitToBrand() via useBrandStore → brand.typescale + dual-write legacy font fields
        │                                 │
        ▼                                 ▼
Live previews (editorial/ui/ladder)     Brand Board / Identity / export consumers
Export panel re-serializes on demand
```

Scalar sliders (base, ratio, fluid viewports) debounce writes to the brand store at 150ms. Font picks commit immediately. Local draft updates are synchronous so previews feel live.

### 5.3 Font loading

`src/shared/typography/fontLoader.ts` keeps an in-memory `Set<string>` of currently-loaded font families.

- `ensureLoaded(ref: FontRef)`: idempotent.
  - `google`: inject `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...">` in `<head>`.
  - `upload`: inject a `<style>@font-face { ... }</style>` block for each file.
  - `system`: no-op.
- Loaded assets are not removed on tool unmount — other surfaces may rely on them.

## 6. UI structure

### 6.1 Full-page variant

Mounted inside `ToolShell` (three-pane):

```
┌─ ToolShell ───────────────────────────────────────────────────────┐
│ BrandSyncBar (in-app only)                                        │
├────────────┬──────────────────────────────┬──────────────────────┤
│ LEFT       │ CENTER                        │ RIGHT                │
│ FontPair   │ SurfaceTabs: Web|UI|Pres|Soc  │ ScaleControls        │
│  Panel     │ PreviewTabs: Editorial|UI|Lad │ SemanticMap          │
│            │ <live preview>                │ ExportPanel (drawer) │
└────────────┴──────────────────────────────┴──────────────────────┘
```

### 6.2 Compact variant

Mounted inside `<Dialog>` / `<Sheet>`:

```
┌─ EmbeddedTypescaleDialog ──────────────────────────────────────────┐
│ "Typescale — Raqm"                                   [Done] [×]    │
│ FontPair (collapsed card): Heading / Body summary + [Edit]         │
│ SurfaceTabs: Web | UI | Presentation | Social                      │
│ ScaleControls (compact strip)                                      │
│ LadderPreview (default) — button to open full editor               │
│ Export panel hidden in compact mode                                │
└────────────────────────────────────────────────────────────────────┘
```

Entry points: Brand Setup typography step, Identity → Typography "Open typescale editor", Brand Board → TypographyPanel "Edit scale".

SurfaceTabs show a dot indicator on surfaces that differ from defaults.

## 7. Persistence, modes, gate, claim

### 7.1 In-app (brand-scoped)

- Route: `/b/:slug/tools/typescale` (full) + `EmbeddedTypescaleDialog` (compact).
- Open: `useBrandStore` loads the active brand. If `brand.typescale` is undefined, seed defaults from existing `headingFont`/`bodyFont` + `basePx=16` + minor-third for each surface.
- Edit: writes debounced to `brand.typescale` and dual-writes the legacy font/size fields.
- Persistence: existing brand-store path (Supabase + localStorage fallback). No new storage code.
- No gates. Exports work freely. Default filenames come from the tool's naming module (`<brand-slug>-typescale.css` etc.).
- BrandSyncBar reports save state via existing `useAutoSave` patterns.

### 7.2 Public (anonymous)

- Route: `/tools/typescale` (full) + `TypescaleLanding.tsx` as the SEO landing.
- `useToolSession` persists the full `Typescale` object to localStorage under the tool's anon-session key.
- Uploaded font files stored in IndexedDB (keyed by session id), rendered via `URL.createObjectURL`.
- Gates (via `ToolGate`):
  - `export-any`: wraps every Copy/Download action in ExportPanel.
  - `save-to-brand`: wraps the "Save to Brand" CTA.
- CTA framing: "Sign up to export — we'll save this typescale to a new brand in your workspace."

### 7.3 Claim flow (public → signed up)

1. User signs up mid-session.
2. Platform's `claim.ts` hook materializes the anon session into a new draft brand.
3. `typescale/claim.ts` (tool-specific) reads the anon session's `Typescale` and writes it into the new brand's `typescale` + dual-writes legacy fields.
4. Font uploads: claim step uploads IndexedDB blobs to Supabase Storage (same bucket as brand assets) under the new brand, rewrites `FontRef.files[].url` to storage URLs.
5. User lands at `/b/<new>/tools/typescale` with work attached.

### 7.4 SEO / registry entry

`src/features/tools/core/toolRegistry.ts`:

```ts
typescale: {
  slug: 'typescale',
  name: 'Typescale Generator',
  tagline: 'Build a typography system your whole brand can use.',
  description: 'Pick fonts, tune your scale for web, UI, presentation, and social — get CSS, Tailwind, and design tokens. Free.',
  seo: {
    title: 'Typescale Generator — Build a typography system — BrandingOS',
    description: 'Free modern typescale tool. Pick Google Fonts, generate a fluid scale, export CSS, Tailwind, and W3C design tokens.',
    keywords: [
      'typescale generator', 'type scale', 'modular scale', 'fluid typography',
      'tailwind typography', 'design tokens typography', 'google fonts pair', 'type hierarchy',
    ],
  },
  Icon: Type,
},
```

## 8. Testing

### 8.1 Unit (Vitest, no DOM)

- `engine/scale.test.ts` — ladder math per named ratio; stepsUp/stepsDown boundaries; base 16 × minor-third produces known sizes.
- `engine/fluid.test.ts` — `clamp()` string correctness; stays within min/max viewport.
- `engine/leading.test.ts` — headings < 1.2, body ~1.5, tiny text > 1.55.
- `engine/tracking.test.ts` — big headings get negative tracking, small text positive.
- `engine/surfaces.test.ts` — default semantic map places `h1` and `body` sanely on every surface.
- `export/*.test.ts` — one snapshot per format; Tailwind v4 uses correct `@theme` prefix; W3C tokens declare `$type: "typography"`.

### 8.2 Component (happy-dom, shallow)

- `TypescaleEditor.test.tsx` — renders both variants; ratio change writes to brand store; surface switch updates visible steps.
- `BrandSyncBar.test.tsx` — shows Saved / Saving… / Error per `useAutoSave` states.
- `ExportPanel.test.tsx` — format tab switch updates preview; Copy pushes the right string to clipboard (mocked).

### 8.3 Manual test matrix

1. Open tool inside Raqm → surfaces seed from brand fonts → edit ratio → Brand Board heading size changes live.
2. Open embedded dialog from Identity → Typography → change body font → close dialog → Identity page reflects the new body font.
3. Open public tool anonymously → tweak scale → sign up → land at `/b/<new>/tools/typescale` with scale attached and fonts uploaded to Supabase.
4. Upload a custom font in-app → export CSS → downloaded file contains correct `@font-face` referencing the Supabase URL.
5. Switch to Presentation surface → base jumps to 24 → preview re-renders → export Tailwind v4 includes `--text-presentation-h1`.

### 8.4 Out of scope

- Visual regression tests.
- End-to-end Playwright runs.
- Figma Tokens Studio round-trip validation (export only).
- RTL / Arabic-specific metrics tuning (follow-up).

## 9. Hard constraints (project rules)

- Do not import from `src/shared/services/export/vectorize/*`.
- Do not modify `EditorWorkspace`.
- `engine/` and `export/` stay pure TS — no React, no Zustand, no DOM.
- Export filenames flow through the tool's naming module so the user can change the convention in one place.
- Keep `src/shared/typography/` reusable — nothing React-specific in that folder.

## 10. Explicitly out of scope (YAGNI)

- AI-suggested font pairings (follow-up; the curated catalog is enough).
- Live contrast testing against brand colors in this tool (Brand Board already does that).
- Print-specific units (pt, pica). All sizes remain `px` with optional `rem` export.
- Language-specific scale tuning (Latin-first; RTL later).
- Collaborative multi-user editing of a typescale (single-user editor for now).
- A separate "Save as preset" system — surfaces already act as presets.

## 11. Deliverables checklist

- [ ] `src/shared/types/typescale.ts` + additive field on `Brand`
- [ ] `src/shared/typography/{fontLoader,fontCatalog,index}.ts`
- [ ] `src/features/tools/typescale/engine/*` (+ tests)
- [ ] `src/features/tools/typescale/export/*` (+ tests)
- [ ] `src/features/tools/typescale/components/*`
- [ ] `src/features/tools/typescale/public/TypescaleLanding.tsx`
- [ ] `src/features/tools/typescale/{routes,claim,EmbeddedTypescaleDialog,index}.{ts,tsx}`
- [ ] Register entry in `toolRegistry.ts`
- [ ] Routes added in `App.tsx` (`/tools/typescale`, `/b/:slug/tools/typescale`)
- [ ] Brand-store typescale read/write + dual-write wiring
- [ ] Wire `EmbeddedTypescaleDialog` into Brand Setup, Identity → Typography, Brand Board → TypographyPanel
- [ ] Unit tests (engine + exports) passing
- [ ] Component tests (editor + sync bar + export panel) passing
- [ ] Manual test matrix walked
