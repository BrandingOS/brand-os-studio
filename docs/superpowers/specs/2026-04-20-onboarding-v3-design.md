# Onboarding v3 — Design Spec

**Date:** 2026-04-20
**Author:** Claude (brainstorm w/ Hamza)
**Source mockups:** `docs/onboard/index.html`, `docs/onboard/brandOS set up your brand.html`, `docs/onboard/brandOS create your brand.html`, `docs/onboard/logo-system/`
**Status:** Approved for planning

---

## 1. Goal

Implement the two onboarding flows from the HTML mockups as a new React feature (`onboarding-v3`) that runs **in parallel** with the existing `/onboarding` and `/onboarding-brand`. Nothing existing is removed in this spec. Once the user has verified v3 end-to-end, a follow-up spec handles the deprecation / route swap.

The scope of this spec is **pieces 1 + 2 + 3** from the agreed decomposition: UI, asset upload pipeline, and a Generate step stub wired to today's `brandGenerator.ts`. The 5-layer logo engine, mockup-scene compositor, font licensing, and symbol commissioning are explicitly out of scope and each get their own spec later.

## 2. Non-goals

- Deleting or modifying `src/features/onboarding/*` or `src/features/onboarding-brand/*`.
- Rendering real SVG logos (the orchestrated logo engine).
- Photoshoot-based mockup scenes.
- Font licensing or symbol-library commissioning.
- Arabic / i18n (English-only for v1).
- Changing the `BrandChooserDialog` default route.

## 3. Information architecture & routing

| Route | Screen | Status |
|---|---|---|
| `/onboarding-v3` | Set up your Brand (import, 1 page) | new |
| `/onboarding-v3/create` | Create your Brand (3-step wizard) | new |
| `/onboarding-v3/preview` | Variation picker (post-Generate) | new (mirrors existing `/onboarding/preview` shape) |
| `/onboarding` | existing flow | untouched |
| `/onboarding-brand` | existing prompt-based generator | untouched |

- Landing = `/onboarding-v3` (Set up). Header cross-link: *"or create one from scratch →"* → `/onboarding-v3/create`. Reverse link on Create.
- `?then=<returnUrl>` query param is preserved across both v3 flows for the `BrandChooserDialog` round-trip contract.
- `BrandChooserDialog` default target remains `/onboarding` in this spec. A separate spec flips the default after verification.

## 4. Screen — Set up your Brand (`/onboarding-v3`)

Single screen, centered column `max-w-[620px]`, Cosmos tokens.

Elements, top to bottom:

1. **Page header** — h1 "Set up your Brand", subtitle one sentence, app-standard `<PageHeader>` usage disabled here because Cosmos overrides; uses a local `<OnboardingHeader>` with cross-link on the right.
2. **Brand name** — text input, 44px height, radius 12px, required.
3. **Description** — textarea, 3-row min, with a **Sparkle Assist** affordance at bottom-right. The sparkle is a small animated icon (framer-motion loop) when the textarea is empty; on hover it resolves to a pill *"✨ Draft with AI"*; on click it calls the `generate-description` Edge Function (see §11) with `{ brandName, assetContext }` and streams the response into the textarea.
4. **Dropzone** — large rounded box, dashed border. On drag-over, the dash pattern animates via `stroke-dashoffset` CSS animation. Shows file-type icons (`docs/onboard/assets/file-*.svg`) stacked inside when empty. Accepts up to 10 files: images (jpg/png/webp/svg), PDFs, fonts (otf/ttf/woff/woff2), design files (ai/fig/sketch/psd/zip). Uses `react-dropzone` (already installed).
5. **URL pill** — smaller pill input *"or paste a URL"* beside the dropzone. On Enter or paste, calls the `fetch-url-preview` Edge Function to resolve OG metadata and stores a `link` asset.
6. **Asset tiles** — when assets exist, render as a 3-column grid below the dropzone. Each tile: type icon or image thumb, filename (truncated), progress ring during upload, remove button on hover.
7. **CTA** — pill button "Set up", full-width on mobile, 240px on desktop. Disabled until `name.length > 0 && assets.length >= 1`. On click:
   1. Finalize asset upload (move scratch → branded bucket — see §7).
   2. Call `createBrandFromAnswers({ name, description, mode: 'import', assets })` (existing util, extended).
   3. Navigate to `/b/:slug/identity` OR the `?then=` target.

Error states: upload failure → tile flips red with retry; name missing → inline red label below field; edge-function failure (description or URL) → inline "Couldn't reach AI — try again" under the affordance, doesn't block submission.

## 5. Screen — Create your Brand (`/onboarding-v3/create`)

Three-step wizard in one page component. Step state lives in the `onboardingStore` (see §8), so browser back/forward works per step via `history.pushState`.

### 5.1 Header — step dots

A horizontal row: `● — ○ — ○` with text labels under each dot (*Define*, *Feel*, *Generate*). Active dot is filled; completed dots get a small check glyph. Dot transitions animated via framer-motion `layoutId`. Height 48px, centered, above the step body.

### 5.2 Step 1 — Define

Three grouped sections, stacked:

- **Core** (required): brand name, describe your brand (textarea + Sparkle Assist same as §4.3).
- **Context** (*Optional* badge, always visible): target audience (text), market / competitors (text).
- **Advanced** (disclosure, collapsed by default): goals (textarea), values (textarea, optional tag-style input).

Footer: `Previous` (ghost, disabled on step 1) · `Next →` (primary, disabled until Core is filled). Right-aligned small text *"Skip optional"* if any optional field is empty; clicking it does not skip the step — it jumps focus to Next.

### 5.3 Step 2 — Feel

Two subsections:

**Style** — heading *Choose a style*. 6 image cards, each aspect-1:1, in a 2×3 grid on desktop, 1×6 on mobile. Images source from `docs/onboard/assets/style-{amber|crater|mindshift|nuworld|soan|spectrum}.jpg`. Metadata per card (id, label, moodKeywords) in `seedStyles.ts`. States:

- Default: scale 1, subtle shadow.
- Hover: scale 1.02, shadow-md.
- Selected: 2px accent ring, small check in corner.
- Locked: lock badge in top-right corner + `transform: translateZ(8px) rotateX(-1deg)` tilt (GPU-accelerated, no layout thrash).

**Palette** — heading *Pick a palette*. 3 palette cards, each a horizontal row of 5 color swatches (flex, equal width) with name + mood word below. States match Style. **Click** selects. **Click on a selected palette** expands a `PaletteEditor` inline below it: 5 color wells (HTML `<input type="color">` + hex text input, two-way bound, validates `/^#[0-9a-f]{6}$/i`). Saving edits the palette in-place and persists to store.

**Shuffle controls** — sticky top-right of the Feel panel container:

- `↻ Reshuffle all` — reshuffles styles + palettes, skipping any item where `locked === true`.
- `↻ Style` — style cards only.
- `↻ Palette` — palette cards only.

Shuffle logic in `utils/shuffle.ts`. Styles draw from the 6 seed styles (random 6 of N when there are more seed styles later). Palettes regenerate via `brandkit/engine/colorEngine.ts` — for each slot, pick a random seed hue + harmony rule (complementary / analogous / triadic / split-complementary / monochromatic), expand to 5 colors, pick a mood word from the harmony's mood list. Locked palettes keep their exact colors and position.

Locked count: `↻ Reshuffle (2 locked)` appears in the button label when ≥1 card is locked.

Footer: `← Previous` · `Generate →`. Generate disabled unless both a style and a palette are selected (non-null `selectedStyleId` + `selectedPaletteId`).

### 5.4 Step 3 — Generate

The reveal moment. Panel widens to `max-w-[820px]`.

Flow:

1. On entry, `aiState` transitions `idle → generating`.
2. Build prompt context from store:
   ```
   const userMessage = `
   Brand: ${define.name}
   Description: ${define.description}
   Audience: ${define.audience || 'unspecified'}
   Market: ${define.market || 'unspecified'}
   Goals: ${define.goals || 'unspecified'}
   Values: ${define.values || 'unspecified'}
   Visual style: ${selectedStyle.label} (${selectedStyle.moodKeywords.join(', ')})
   Preferred palette: ${selectedPalette.name} — colors ${selectedPalette.colors.join(', ')}, mood ${selectedPalette.mood}
   Produce three variations that RESPECT the palette colors and style mood.
   `;
   ```
3. Call `generateBrand(userMessage)` from `features/onboarding-brand/services/brandGenerator.ts`. Returns `{ variations: GeneratedBrand[] }` (schema already defined there).
4. Loading UI: sweeping gradient bar (existing `BrandRevealAnimation`), step-dot pulse, faint ribbons in the selected palette colors drifting behind 3 card skeletons.
5. On success → render 3 `GeneratedBrandCard`s (existing component) with a framer-motion stagger (0.12s) and palette-tint halo per card.
6. User clicks a card → confirm dialog with the chosen variation → on confirm:
   1. Finalize asset uploads (none on Create flow unless the user uploaded something earlier — skipped).
   2. Call `createBrandFromAnswers({ mode: 'generate', define, feel, chosenVariation })`.
   3. Navigate to `/b/:slug/identity` or `?then=`.

Failure modes:

- `!isAIConfigured()` → show a **local fallback**: 3 cards generated purely from palette + style + `examplePrompts.ts` (random names from a seed list, fonts from `colorEngine`'s suggested pairs, no logo concept). Toast: *"AI offline — showing local variations."*
- API error → error card with retry button; retry calls `generateBrand` again; 3 retries max before suggesting the user proceed with the Set up flow instead.

## 6. Design system — Cosmos tokens

New stylesheet `src/features/onboarding-v3/styles/cosmos.css`:

- Defines the tokens from the mockups verbatim: `--background`, `--surface`, `--surface-elevated`, `--surface-hover`, `--surface-sunken`, `--border`, `--border-strong`, `--dash`, `--dash-strong`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`, `--accent-active`, `--accent-muted`, `--accent-ring`, `--accent-contrast`, shadows `--shadow-xs|sm|md`, easing `--ease`.
- Both light and dark variants defined under `[data-theme="light"]` and `[data-theme="dark"]` which follow the app's existing theme attribute.
- All tokens scoped under `[data-onboarding="cosmos"]` root attribute on each v3 page. No leakage into the rest of the app.

Tailwind bridge in `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      cosmos: {
        bg: 'var(--background)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent-contrast': 'var(--accent-contrast)',
        muted: 'var(--text-muted)',
        // ...full mapping
      },
    },
  },
}
```

Pages can use either raw CSS vars (via inline styles or utility classes) or Tailwind `bg-cosmos-surface`. Both resolve to the same runtime value.

## 7. Upload pipeline

### 7.1 Components

- `OnboardingDropzone` — wraps `react-dropzone`, handles cap, type whitelist, preview generation.
- `UploadTile` — per-file tile with preview, progress ring, remove button, retry on error.
- `UrlPillInput` — small input + enter-to-submit, calls `fetch-url-preview`.

### 7.2 Storage model

**Scratch phase** (before brand exists):
- Each onboarding session gets a `sessionId` (UUID, stored in `onboardingStore`, persisted to `localStorage`).
- Uploads go to `onboarding-scratch/{sessionId}/{assetId}.{ext}` in Supabase storage.
- Max concurrency: 3 parallel uploads; queue the rest.
- Progress events from Supabase client update `asset.uploadProgress` in the store.

**Finalize phase** (on brand create):
- Edge Function `finalize-onboarding-assets` receives `{ sessionId, brandId }`, moves each scratch file to `brand-assets/{brandId}/{assetId}.{ext}` (Supabase storage `move`), updates the `brand_assets` table with the new paths.
- On failure of any single move, the whole op retries; on repeated failure, brand is still created and the failed assets are flagged in the UI on the Identity page with a retry action.

**Cleanup:**
- Edge Function `cleanup-onboarding-scratch` (cron daily) deletes scratch prefixes older than 24h.

### 7.3 URL ingestion

`fetch-url-preview` Edge Function accepts `{ url }`, fetches the page server-side, extracts OG metadata (title, description, image, favicon), returns JSON. Stored as a `link` asset with `previewImageUrl` populated. No full page content scraped.

## 8. State — `onboardingStore` (Zustand)

```ts
type FeelStyle = {
  id: string;
  label: string;
  imageUrl: string;
  moodKeywords: string[];
  locked: boolean;
};

type FeelPalette = {
  id: string;
  name: string;
  colors: [string, string, string, string, string];
  mood: string;
  locked: boolean;
  isCustom: boolean; // true if user edited
};

type OnboardingAsset = {
  id: string;
  filename: string;
  mimeType: string;
  kind: 'image' | 'pdf' | 'font' | 'design' | 'zip' | 'link';
  previewUrl: string | null;        // blob URL for images, remote OG image for links
  scratchPath: string | null;       // set once upload starts
  remotePath: string | null;        // set once finalized
  uploadProgress: number;            // 0..1
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
};

interface OnboardingStore {
  sessionId: string;
  flow: 'setup' | 'create' | null;
  step: 1 | 2 | 3;
  define: {
    name: string;
    description: string;
    audience: string;
    market: string;
    goals: string;
    values: string;
  };
  feel: {
    styles: FeelStyle[];            // always 6
    selectedStyleId: string | null;
    palettes: FeelPalette[];        // always 3
    selectedPaletteId: string | null;
  };
  assets: OnboardingAsset[];        // setup flow only
  aiState: 'idle' | 'generating' | 'error';
  variations: GeneratedBrand[] | null;
  variationsError: string | null;

  // actions
  setFlow(f: 'setup' | 'create'): void;
  setStep(s: 1 | 2 | 3): void;
  updateDefine(patch: Partial<OnboardingStore['define']>): void;
  toggleStyleLock(id: string): void;
  selectStyle(id: string): void;
  togglePaletteLock(id: string): void;
  selectPalette(id: string): void;
  updatePaletteColors(id: string, colors: string[]): void;
  shuffle(target: 'all' | 'styles' | 'palettes'): void;
  addAsset(file: File | { url: string; meta: OgMeta }): void;
  removeAsset(id: string): void;
  updateAssetProgress(id: string, progress: number): void;
  markAssetDone(id: string, remotePath: string): void;
  markAssetError(id: string, msg: string): void;
  generate(): Promise<void>;
  reset(): void;
}
```

Persistence: Zustand `persist` middleware, key `brandos-onboarding-v3`, serializes everything except `variations` and in-flight upload state (those reset on refresh so we don't replay stale AI results).

## 9. File structure

```
src/features/onboarding-v3/
  components/
    OnboardingDropzone.tsx
    UploadTile.tsx
    UrlPillInput.tsx
    StepDots.tsx
    StyleCard.tsx
    StyleCardGrid.tsx
    PaletteCard.tsx
    PaletteCardList.tsx
    PaletteEditor.tsx
    ShuffleControls.tsx
    LockBadge.tsx
    SparkleAssist.tsx
    OnboardingHeader.tsx
  screens/                     // feature-internal screen components (NOT route files)
    SetUpScreen.tsx            // the Set up UI, imported by src/pages/onboarding-v3/index.tsx
    CreateScreen.tsx           // the Create wizard, imported by src/pages/onboarding-v3/create.tsx
    PreviewScreen.tsx          // variation picker, imported by src/pages/onboarding-v3/preview.tsx
  steps/
    DefineStep.tsx
    FeelStep.tsx
    GenerateStep.tsx
  services/
    logoEngine.ts        // interface + StubLogoEngine
    generateDescription.ts
    fetchUrlPreview.ts
    uploadAssets.ts
    finalizeAssets.ts
  store/
    onboardingStore.ts
  styles/
    cosmos.css
  utils/
    shuffle.ts
    seedStyles.ts
    seedPalettes.ts
    assetTypeIcon.ts
  index.ts               // barrel re-export (no default export; consumers import named)

src/pages/onboarding-v3/
  index.tsx              // route handler; renders <SetUpScreen />
  create.tsx             // route handler; renders <CreateScreen />
  preview.tsx            // route handler; renders <PreviewScreen />

supabase/functions/
  generate-description/
    index.ts             // Claude API call (Messages API), streams text
  fetch-url-preview/
    index.ts             // fetches URL, parses OG
  finalize-onboarding-assets/
    index.ts             // moves scratch → brand-assets
  cleanup-onboarding-scratch/
    index.ts             // daily cron; purges >24h scratch
```

Route wiring in `src/App.tsx`:

```tsx
const OnboardingV3SetUpPage = lazy(() => import('./pages/onboarding-v3'));
const OnboardingV3CreatePage = lazy(() => import('./pages/onboarding-v3/create'));
const OnboardingV3PreviewPage = lazy(() => import('./pages/onboarding-v3/preview'));
// ...
<Route path="/onboarding-v3" element={<OnboardingV3SetUpPage />} />
<Route path="/onboarding-v3/create" element={<OnboardingV3CreatePage />} />
<Route path="/onboarding-v3/preview" element={<OnboardingV3PreviewPage />} />
```

## 10. Reuse inventory (nothing deleted)

| Reused | Where | Why |
|---|---|---|
| `createBrandFromAnswers` | `src/features/onboarding/utils/…` | Data-layer mapping survives; extended to accept `{ mode: 'import' \| 'generate', ... }` if needed, backwards-compatibly. |
| `generateBrand` + `GeneratedBrand` types | `src/features/onboarding-brand/services/brandGenerator.ts` | Claude call and schema already ship. |
| `BrandRevealAnimation`, `GeneratedBrandCard` | `src/features/onboarding-brand/components/` | Good reveal UX, reused on Generate step. |
| `colorEngine.ts` | `src/features/brandkit/engine/colorEngine.ts` | Harmony + hex conversions for palette shuffle. |
| `react-dropzone`, `framer-motion`, Zustand, Supabase client | dependencies | Already installed. |

## 11. Integrations

### 11.1 Supabase Edge Functions (new)

1. **`generate-description`**
   - Input: `{ brandName: string, assetContext?: string[] }`
   - Calls `claude-sonnet-4-20250514` with a short system prompt that returns a 1–2 sentence brand description.
   - Streams text back via SSE so the UI fills the textarea progressively.
   - Auth: requires a valid Supabase session (anon or authed).
   - Rate limit: 10 calls / session / hour (stored in a Postgres table `onboarding_rate_limits` with columns `session_id`, `function_name`, `called_at`; row-level policies deny client reads, server-only writes).

2. **`fetch-url-preview`**
   - Input: `{ url: string }`
   - Validates URL, blocks private IPs / localhost.
   - Fetches, extracts OG tags, returns `{ title, description, imageUrl, faviconUrl }`.
   - Rate limit: 30 calls / session / hour.

3. **`finalize-onboarding-assets`**
   - Input: `{ sessionId: string, brandId: string }`
   - Moves scratch files to brand-assets. Atomic per file; reports partial successes.

4. **`cleanup-onboarding-scratch`** (cron, daily)
   - Deletes scratch files older than 24h.

All four functions live in `supabase/functions/`, deployed via `supabase functions deploy`.

### 11.2 Logo engine seam

```ts
// services/logoEngine.ts
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

The Generate step doesn't call `logoEngine.generate` yet — it uses `generateBrand` for full variations and renders the `logoConcept.description` as text on the variation card. When the real engine arrives, it's a single binding swap.

### 11.3 BrandChooserDialog

No changes in this spec. Still points at `/onboarding`. Follow-up spec flips it to `/onboarding-v3` once v3 is verified.

## 12. Data flow

```
Set up flow:
  SetUpScreen → [store.assets, store.define] → on CTA click:
     uploadAssets.finalize(sessionId, newBrandId)   ← Edge Function
     createBrandFromAnswers(mode: 'import', store)
     navigate(/b/:slug/identity | ?then=…)

Create flow:
  DefineStep → store.define
    ↓
  FeelStep → store.feel (shuffle uses colorEngine)
    ↓
  GenerateStep → build prompt → brandGenerator.generateBrand()
     → store.variations (3 options)
     → user picks one → createBrandFromAnswers(mode: 'generate', store, chosen)
     → navigate(/b/:slug/identity | ?then=…)
```

## 13. Error handling

| Failure | Behavior |
|---|---|
| Upload error (single file) | Tile turns red with retry button. Other uploads continue. |
| Upload error (all files) | "Set up" button surfaces a retry that restarts all pending uploads. |
| Edge Function timeout (description/url) | Inline error under the field, does NOT block Next / Set up. |
| `generateBrand` fails | Error card with retry (≤3). After 3 fails, a "Use Set up instead" escape link. |
| `generateBrand` offline / key missing (`!isAIConfigured()`) | Local fallback with palette + style only. Toast: *"AI offline — showing local variations."* |
| `createBrandFromAnswers` fails | Full-page error with retry; state preserved in store. |
| Asset finalize partial failure | Brand is created anyway; failed assets are listed with a toast at the top of `/b/:slug/identity` on first visit — each has a "retry" action that re-runs `finalize-onboarding-assets` for that `scratchPath`. No new UI surface on the Identity page — piggybacks on the existing toast stack. |
| Network offline during Create | Banner at top: "You're offline. Your progress is saved." (store is persisted.) |

## 14. Testing

### 14.1 Unit (Vitest)

- `utils/shuffle.ts`: locked items preserved by reference; non-locked reshuffled; empty arrays handled; all-locked = no-op.
- `utils/seedPalettes.ts`: generated palettes produce valid 6-char hex; mood words non-empty.
- `store/onboardingStore.ts`: each action produces the expected state delta; persist excludes `variations`.
- `services/uploadAssets.ts`: mocked Supabase client, verifies scratch path + progress events.

### 14.2 Component (Vitest + jsdom)

- `OnboardingDropzone`: rejects disallowed types; enforces 10-file cap; revokes blob URLs on remove.
- `PaletteEditor`: hex validation (`#abc` rejected, `#aabbcc` accepted); two-way bind with store.
- `StepDots`: active/completed/pending state rendering.
- `SparkleAssist`: click triggers `generateDescription`; streaming text appears.

### 14.3 Manual E2E checklist (in the spec file, executed before v3 replaces v1)

**Set up flow:**
- [ ] Land on `/onboarding-v3`, page renders in both light and dark modes.
- [ ] Type a brand name; click Sparkle → description streams in from AI.
- [ ] Drag 3 images + 1 PDF + 1 font into the dropzone → tiles appear with correct icons.
- [ ] Try to drop an 11th file → rejected with a toast.
- [ ] Paste a URL into the pill → preview tile appears with OG image.
- [ ] Remove one upload mid-progress → in-flight upload cancels cleanly.
- [ ] Click "Set up" → brand is created, lands on `/b/:slug/identity`.
- [ ] `/onboarding-v3?then=/b/raqm/design` → after create, lands on `/b/:slug/design` (or whatever `then=` was).

**Create flow:**
- [ ] Fill Core, click Next → reaches Feel.
- [ ] Click 2 styles, 1 palette → only the latest selection stays per group.
- [ ] Lock 1 palette, click `Reshuffle all` → locked palette colors unchanged.
- [ ] Expand a palette, edit a hex to an invalid value → error shows, save disabled until fixed.
- [ ] Click Generate → sweeping gradient appears, then 3 cards stagger in.
- [ ] Pick a card → confirm → brand is created, lands on `/b/:slug/identity`.
- [ ] Refresh mid-Feel → styles/palettes persisted; selections persisted.
- [ ] Disable `VITE_ANTHROPIC_API_KEY`, retry Generate → local fallback renders.

**Regression:**
- [ ] `/onboarding` still works (old flow).
- [ ] `/onboarding-brand` still works.
- [ ] `BrandChooserDialog` still routes to `/onboarding`.

## 15. Risks & open questions

- **Supabase Edge Function latency** — streaming Claude responses through an Edge Function introduces a ~300–800ms cold-start penalty on first use. Mitigation: keep the function warm with a low-frequency cron ping during business hours.
- **Sparkle Assist cost** — if every user clicks it, the API bill scales with signups. Mitigation: rate limit (10/hr/session) + an "Accept & proceed" state that disables the button after one successful use per session.
- **Palette editor two-way bind with native color picker** — Safari's `<input type="color">` is finicky; may need a fallback component. Decision: ship native, measure, swap for a custom picker only if friction surfaces.
- **Cosmos token bleed** — the scoping attribute `[data-onboarding="cosmos"]` must be set on the top-level page container; forgetting it on any subtree will cause untokened gray boxes. Mitigation: unit test each page renders with the attribute set.
- **Move vs copy on finalize** — Supabase storage `move` is cheap but not atomic across many files. Mitigation: finalize is idempotent (re-running skips already-moved files) and the cleanup cron catches orphans.
- **`createBrandFromAnswers` extension** — if extending to accept `mode: 'import' \| 'generate'` breaks existing call sites, we fall back to two separate entry points: `createBrandFromImport` and `createBrandFromGenerate`, both sharing internals. Decide during implementation based on the current signature.

## 16. Out of scope / future specs

- **Logo engine v1** — 5-layer system from `docs/onboard/logo-system/`. Own spec. Slots in via `LogoEngine` interface.
- **Mockup scene compositor** — photoshoot + projection. Own spec, blocked on photography procurement.
- **Font & symbol library ingestion** — procurement-gated; has its own mini-spec once licensing is sorted.
- **Deprecation of `/onboarding` and `/onboarding-brand`** — own spec, post-verification. Must include route redirects (`301` to `/onboarding-v3`) and analytics migration.
- **Arabic / i18n** — own spec; many mockup strings and visual directions assume LTR.
- **A/B traffic split** — out of scope. v3 is launched by flipping `BrandChooserDialog`'s default; a later initiative can split traffic if desired.

## 17. Estimate

Implementation plan will decompose into tasks. Rough T-shirt size for the spec:

- Component library (dropzone, step dots, style/palette cards, palette editor, shuffle, sparkle): **4–5 days**
- Two pages + three steps + store + routing: **3–4 days**
- Edge Functions (×4) + scratch/finalize pipeline: **3 days**
- Cosmos tokens + Tailwind bridge + theme test: **1 day**
- Tests (unit + component) + manual E2E run-through: **2 days**
- Polish pass + bug bash: **1–2 days**

**Total: ~2.5–3 weeks for one engineer.**

## 18. Acceptance

v3 is considered "done" and ready for deprecation of v1/v2 when:

1. All E2E checklist items in §14.3 pass.
2. No crashes reported across a week of internal dogfooding.
3. A v3-created brand is indistinguishable in the DB from a v1-created brand (same `brands` / `brand_assets` shape, same redirects).
4. Light + dark mode render without visual regressions (manual QA screenshots archived).
5. Follow-up spec for deprecation is drafted.
