# UI Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a premium, BrandingOS-native UI Color System generator that works both as a public standalone tool and as an integrated brand tool.

**Architecture:** Pure `lib/color-engine` (OKLCH shades via culori, WCAG + APCA via apca-w3, harmony/semantic/role/validate). Single `<ColorSystemGenerator />` React root. Two mounts: public `/tools/ui-color-system` and in-app `/b/:slug/tools/ui-color-system`. Mode/plan branching funneled through `useToolContext()`. Plugs into existing tools platform (`src/features/tools/`).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Radix UI, Zustand, culori, apca-w3, Vitest.

---

## File Structure

```
src/
  lib/color-engine/
    conversions.ts       # hex ↔ rgb ↔ hsl ↔ oklch (culori wrappers)
    generateShades.ts    # 11-stop OKLCH shade generation with lock support
    contrast.ts          # WCAG + APCA (apca-w3 wrapper)
    harmony.ts           # mono/analogous/complementary/triadic/tetradic
    semantic.ts          # success/warning/error/info suggestions
    roles.ts             # neutral + surface + text + on-color + interaction
    validate.ts          # palette validation rules
    types.ts             # ColorScale, ShadeValue, PaletteSystem, etc.
    index.ts
    __tests__/
      generateShades.test.ts
      conversions.test.ts
      contrast.test.ts
      harmony.test.ts
      semantic.test.ts
      roles.test.ts
      validate.test.ts

  features/tools/ui-color-system/
    engine/              # re-exports from lib/color-engine for ergonomics
    components/
      ColorSystemGenerator.tsx   # root
      SeedInputBar.tsx
      RoleRow.tsx
      ShadeSwatch.tsx
      ShadeDetailDrawer.tsx
      HarmonyPanel.tsx
      ContrastGrid.tsx
      PalettePreview.tsx
      ExportPanel.tsx
      SavedPalettesDrawer.tsx
      ShareDialog.tsx
      ProLock.tsx
      BrandSyncBar.tsx
    hooks/
      useToolContext.ts      # mode/plan/brand/user
      usePaletteState.ts     # single source of truth
      usePaletteHistory.ts   # undo/redo
    public/
      PublicLanding.tsx      # hero for /tools/ui-color-system
    materializer.ts          # claim flow → brand
    routes.tsx               # shared Studio mount
    index.ts

  pages/tools/ui-color-system.tsx          # public landing + studio
  pages/dashboard/brand/[slug]/tools/ui-color-system.tsx   # in-app

  App.tsx  (register 3 routes + lazy imports)

  features/tools/core/types.ts  (add 'ui-color-system' to ToolSlug)
  features/tools/core/toolRegistry.ts  (add meta)
```

## Phase-by-Phase

### Phase 1 — Color Engine (TDD, commit after)
- `conversions.ts`: hex/rgb/hsl/oklch using culori `converter('oklch')`, `formatHex`, etc.
- `generateShades.ts`: for a seed hex, produce 11 stops {50,100,200,300,400,500,600,700,800,900,950}. Target OKLCH lightness curve:
  50=0.98, 100=0.95, 200=0.89, 300=0.82, 400=0.70, 500=0.58, 600=0.50, 700=0.42, 800=0.34, 900=0.26, 950=0.18.
  Chroma curve reduces at extremes (multiply base chroma by 0.2, 0.35, 0.6, 0.85, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55, 0.4). Hue = seed hue (slight shift allowed at extremes for perceptual consistency, but keep identical for v1).
  If `lockedShade` given, solve the scale so that stop = seed exactly.
- `contrast.ts`: `wcagContrast(fg, bg)` → ratio; `apcaContrast(fg, bg)` → Lc (signed). Use `apca-w3`'s `APCAcontrast(sRGBtoY(fg), sRGBtoY(bg))`. Helpers for pass/fail at thresholds.
- `harmony.ts`: pure hue-angle rotations on seed HSL. Return new seeds.
- `semantic.ts`: suggest success/warning/error/info hues that are cohesive with seed (not raw #22c55e). Strategy: pick archetype hue (success≈145, warning≈42, error≈12, info≈220), then blend seed chroma/lightness so scales feel from same family.
- `roles.ts`: given scales, compute `semanticTokens` for `canvas/surface/surfaceElevated/border/divider/text*` for both light and dark.
- `validate.ts`: input-vs-output checks (text/bg, button, border, chart dedupe).
- `types.ts`: exact `PaletteSystem`, `ColorScale`, `ShadeValue`, `GenerationMode`, etc. per spec.
- Tests: snapshot `generateShades('#0EA5E9')`, `generateShades('#F97316')`, `generateShades('#14B8A6')`; WCAG values match known pairs; APCA signed; harmony rotations match; semantic suggestions produce valid hex.

**Commit:** `feat(ui-color-system): color engine with OKLCH shades, APCA + WCAG, harmony, semantic, roles`

### Phase 2 — Core Shade Generator UI
- `SeedInputBar`: large color input, hex field, paste button, randomize, upload image, eyedropper (if `EyeDropper` API), role selector, generation mode selector, lock-shade selector.
- `RoleRow`: label + 11 `ShadeSwatch`.
- `ShadeSwatch`: chip + shade# + hex, hover reveals copy + edit + lock + compare; click opens drawer.
- `ShadeDetailDrawer`: HEX/RGB/HSL/OKLCH inputs, lock/unlock, reset, copy, compare before/after, keyboard friendly, bottom sheet on mobile via Drawer/Sheet Radix.
- Root `<ColorSystemGenerator />` composes the above and wires `usePaletteState`.
- `usePaletteState.ts`: Zustand store with `roles`, `settings`, `semanticTokens`, derived selectors; `setSeed`, `editShade`, `lockShade`, `resetShade`, `applyHarmony`, `applyMode`.

**Commit:** `feat(ui-color-system): core shade generator UI + palette state`

### Phase 3 — Multi-role + Tool registration + Routes
- Add `'ui-color-system'` to `ToolSlug` union.
- Register meta in `toolRegistry.ts` with correct SEO.
- Create `src/pages/tools/ui-color-system.tsx` (public landing → studio).
- Create `src/pages/dashboard/brand/[slug]/tools/ui-color-system.tsx` (in-app).
- Wire routes in `App.tsx` (three entries + lazy imports).
- `useToolContext()` hook returning `{mode, user, brand, plan, perms}`. Reads from sessionStore, route, and plan heuristic (default free; auth → pro placeholder, clearly gated by future plan table).
- Add secondary/tertiary/neutral/success/warning/error rows, rendered conditionally based on `plan` and `activeRoles`.
- `ProLock` component for gated features.

**Commit:** `feat(ui-color-system): register tool + multi-role palette + routes + plan gates`

### Phase 4 — Harmony Panel
- Side panel with tabs: Mono/Analogous/Complementary/Split/Triadic/Tetradic.
- Each tab shows computed harmony swatches + descriptor (SaaS, enterprise, editorial, luxury, playful, fintech).
- Apply → updates secondary/tertiary scales via `applyHarmony`.
- Pro: multi-role application. Free: preview only.

**Commit:** `feat(ui-color-system): harmony panel`

### Phase 5 — Contrast Grid
- `<ContrastGrid />` computes all meaningful fg/bg combinations grouped by role.
- WCAG/APCA toggle (persisted).
- Filters: all/pass/fail/text/button.
- Click cell → mini preview with rendered sample (button, text block).
- Smart suggestions when fail: closest passing shade.

**Commit:** `feat(ui-color-system): contrast grid with WCAG + APCA`

### Phase 6 — Live Preview
- Realistic mocks: landing hero, SaaS dashboard, form, settings, marketing email, mobile screen, chart card, logo-on-bg, typography.
- Light/dark mode toggle.
- All elements read from `semanticTokens` + `chartColors`.

**Commit:** `feat(ui-color-system): live preview mockups`

### Phase 7 — Export Panel
- Tabs: Tailwind, CSS vars, SCSS, JSON, W3C tokens, HEX, HSL, RGB, OKLCH.
- Per-tab copy + per-token copy + download as file.
- Light/dark sets where applicable.

**Commit:** `feat(ui-color-system): export panel`

### Phase 8-9 — Save, Share, Brand Integration
- URL-encode palette state (lz-string or base64 JSON) for shareable links.
- Logged-in save → localStorage or brandStore extension; `SavedPalettesDrawer`.
- `BrandSyncBar` for integrated mode: sync from brand, save to brand, replace/merge.

**Commit:** `feat(ui-color-system): save/share + brand sync`

### Phase 10-13 — SEO, Gating, Polish, Tests
- OG image generation from palette (canvas draw + data URL).
- Keyboard shortcuts: R/C/E/L/?.
- Undo/redo via `usePaletteHistory` (simple ring buffer).
- Toasts, loading, empty, error states.
- Component tests for SeedInputBar, RoleRow, ContrastGrid.

**Commit:** `feat(ui-color-system): SEO, gating, polish, tests`

## Execution notes

- Types-first, tests-first per module in Phase 1.
- `strictNullChecks` is OFF project-wide; still write non-null code where possible.
- Follow page-shell rules: use `PageHeader` for in-app, no inner `max-w-*` wrappers inside layouts.
- Do NOT touch `EditorWorkspace` or `src/shared/services/export/vectorize/*`.
- Commit after each phase; push to origin dev + origin dev:x at end per global git convention.
