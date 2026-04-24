# BrandingOS — Mockup Studio Implementation Document (v2)

**Status:** Spec for autonomous Claude Code execution
**Owner:** Hamza
**Project:** BrandingOS (brandingos.ai)
**Inspiration:** Placeit, Smartmockups (Canva Mockups), Freepik Mockups
**Last updated:** April 2026

---

## ⚠️ STOP — READ THIS FIRST (Phase 0 is mandatory)

This document describes a feature, not a copy-paste implementation. Before writing a single line of feature code, you MUST complete **Phase 0: Codebase Audit & Adaptation Plan** (§5). The example code in this document is illustrative — your job is to make it idiomatic to *this* codebase, not to paste it verbatim.

**Three places where you will go wrong if you skip Phase 0:**
1. Using a different state management pattern than the rest of the app uses.
2. Using a different API/data-fetching pattern (axios vs fetch vs TanStack Query vs SWR vs server actions).
3. Using a different folder/naming convention than the existing features.

**Output of Phase 0 must be a written `MOCKUP_STUDIO_ADAPTATION_PLAN.md` checked into the repo before any feature code is written.** No exceptions.

---

## 0. TL;DR for Claude Code

Build a **Mockup Studio** that lives in BrandingOS in **three modes**:

1. **Standalone Tool** — User opens "Tools → Mockup Studio" without needing a brand. Picks a template, uploads a design, edits, exports. Anonymous usable.
2. **Brand-aware Mode** — After a user creates their brand in BrandingOS, every mockup template in the Studio is auto-populated with their brand assets (logo, colors, typography, imagery from their Brand Kit). User opens the Studio and sees their brand already on every t-shirt, business card, mug, etc., on first load.
3. **Fully Custom Mode** — Every element of every mockup is editable: the printed design, any text, any color, the background, even individual scene elements (mug color, t-shirt color, paper color, background color/image). Power users can build mockups from scratch by adding zones, text layers, and shape layers.

The technical engine is the **same in all three modes**: PixiJS v8 + Displacement Mapping + Lighting Composite. The differences are entirely in the data layer (which design and which colors get loaded into the engine on mount) and the UI layer (which controls are exposed). Build the engine once, build a thin adapter for each mode.

Implementation is split into **8 phases**. Each phase has acceptance criteria. Do not move to the next phase until all criteria are met. Phase 0 is mandatory and produces a written adaptation plan.

---

## 1. Feature Definition — All Three Modes

### Mode A: Standalone Tool

**Path:** `Tools → Mockup Studio` from the BrandingOS sidebar/dashboard.

**User flow:**
1. User opens the tool. No brand required.
2. Browses template gallery (filter by category, search by name).
3. Picks a template. Editor opens with the template's *default* placeholder design.
4. Uploads their own design (or pastes from clipboard, or drags from desktop).
5. Edits position, scale, rotation, color tint, text overlays.
6. Exports as PNG/JPG.

**State persistence:**
- If user is logged in: project saved to `user_mockup_projects` (resumable).
- If anonymous: state persisted to `localStorage` only. Show a "Sign up to save" CTA.

### Mode B: Brand-aware Mode (auto-fill from Brand Kit)

**Path:** From inside a brand's dashboard → "Brand Mockups" tab. Or from the Mockup Studio when the user has an active brand.

**User flow:**
1. User has previously created/imported a brand in BrandingOS. Their Brand Kit contains: logo (multiple variants — primary/secondary/icon-only/wordmark), color palette (primary/secondary/accent/neutral), typography (heading font + body font), brand imagery (uploaded photos), tagline/copy snippets.
2. User opens the brand's "Mockups" section.
3. Sees a gallery of templates **already pre-filled with their brand**. The t-shirt mockup shows their logo. The business card shows their logo + name + tagline + brand colors. The packaging shows their full brand system. The phone screen shows their app icon if uploaded, or their logo. Every preview thumbnail in the gallery is rendered with their brand.
4. Clicks any template → editor opens with their brand assets already placed in the right zones.
5. User can override anything (swap to a different logo variant, change colors, edit text), but the defaults are smart.
6. Bulk export: "Export all 30 mockups with my brand" → zip download.

**Why this is the killer feature:** No competitor (Placeit, Smartmockups, Freepik) does this because none of them know what your brand is. BrandingOS does. This is the moat.

### Mode C: Fully Custom Mode (everything editable)

**Path:** Inside any mockup editor — all customization controls are exposed by default. This is not a separate mode so much as a property of the editor: nothing is locked.

**What's editable in every mockup:**
- The **printed design** (the user's artwork on the product) — uploadable, multiple zones, individually editable.
- **Text overlays** — add/edit/delete text layers anywhere on the canvas. Font, size, weight, color, alignment, letter spacing all editable. Smart defaults pull from Brand Kit typography.
- **Product colors** — for tintable templates, change t-shirt color, mug color, packaging base color, paper color.
- **Scene/background** — replace the background photo, change to solid color, change to gradient, blur, replace with one of BrandingOS's stock backgrounds, or upload a custom one.
- **Individual scene elements** — for templates with multiple props (e.g., "laptop on a desk with coffee mug and notebook"), let users hide/show/recolor individual props (hide the coffee, change the notebook color).
- **Lighting intensity** — slider to adjust how strong the lighting overlay is (some users want more "flat" looks, some want more "photographed" looks).
- **Shadows** — toggle drop shadows on/off, adjust intensity.

**UI principle:** "Everything looks editable." If something on the canvas can be changed, hovering it must show a hover state, and clicking it must select it and reveal its controls in the right sidebar. No hidden depths. No "you can't edit that, only paid users can."

---

## 2. Technical Architecture (Engine = Same Across All Modes)

### 2.1 The Core Technique — Displacement Mapping

Every mockup template is **a stack of pre-baked image layers** plus a **JSON metadata file** describing where the user's design goes and what's editable. There is no 3D model in V1.

The image layers per template (per zone):

| Layer | Format | Purpose |
|---|---|---|
| `base.jpg` | JPG, sRGB | Photograph of the product with a neutral fill where designs go. |
| `displacement.png` | PNG, 16-bit grayscale (8-bit OK for V1) | Surface curvature. R = X offset, G = Y offset. Mid-gray = no offset. |
| `lighting.png` | PNG, RGBA | Highlights/shadows isolated from base photo. Multiplied over the design. |
| `mask.png` | PNG, 8-bit alpha | Defines where the design appears (printable area shape). |
| `tint_mask.png` | PNG, 8-bit alpha *(optional)* | For tintable products: defines the recolorable surface. |
| `prop_mask_*.png` | PNG, 8-bit alpha *(optional, multiple)* | For templates with hideable/recolorable props (one mask per prop). |

### 2.2 Render Pipeline (per zone, per frame change)

```
1. Background sprite (base.jpg or replaced background)
2. For each tintable region: tint_mask sprite tinted to user color, multiply blend
3. For each design zone:
   a. Position user's design at (x, y, scale, rotation)
   b. Apply DisplacementFilter using zone's displacement texture
   c. Mask with zone's mask texture
   d. Overlay lighting texture, multiply blend
4. For each text layer: Pixi BitmapText or HTML overlay (V1 = HTML overlay above canvas, simpler)
5. For each shape/element layer: Pixi Graphics
6. Render to screen
```

### 2.3 Library Choice — Why PixiJS v8

| Library | Verdict | Why |
|---|---|---|
| **PixiJS v8** | ✅ **Use this** | 2D WebGL renderer with built-in `DisplacementFilter`, masks, blend modes, render textures. Strong React story. MIT. |
| Three.js | ❌ Overkill for V1 | Reserve for V2 if real 3D is added. |
| Konva, Fabric | ❌ No GPU shaders | Displacement in JS would be too slow. |
| Raw WebGL | ❌ Reinventing the wheel | We'd be writing PixiJS but worse. |

**Decision:** PixiJS v8 + a thin React wrapper. **Whether to use `@pixi/react` or roll a custom hook is a Phase 0 decision** — depends on what React version and patterns BrandingOS already uses. See §5.

### 2.4 Three Layers of Code

```
┌─────────────────────────────────────────────────────────┐
│  UI LAYER (React components, mode-specific)             │
│  - StandaloneEditor / BrandAwareEditor / CustomEditor   │
│  - Sidebars, toolbars, modals                           │
└─────────────────────────────────────────────────────────┘
                         ↓ uses
┌─────────────────────────────────────────────────────────┐
│  STATE & DATA LAYER (mode-aware adapters)               │
│  - useStandaloneProject, useBrandAwareProject, useCustom│
│  - Brand Kit auto-fill logic                            │
│  - API clients, persistence                             │
└─────────────────────────────────────────────────────────┘
                         ↓ feeds
┌─────────────────────────────────────────────────────────┐
│  ENGINE LAYER (mode-agnostic, pure rendering)           │
│  - MockupRenderer (PixiJS)                              │
│  - Displacement/lighting compositor                     │
│  - Export pipeline                                      │
│  - Same for all three modes — knows nothing about modes │
└─────────────────────────────────────────────────────────┘
```

The engine layer takes a `MockupState` object as input and renders it. It does not care whether that state came from a user upload, a Brand Kit, or a mix. This separation is critical — build it wrong and you'll be rewriting half the code when you add Mode B.

### 2.5 The MockupState Schema (the contract between layers)

```typescript
interface MockupState {
  templateId: string;
  canvasWidth: number;
  canvasHeight: number;

  // Background customization
  background: {
    type: 'template' | 'solid' | 'gradient' | 'image';
    value: string; // 'template' = use template's default; otherwise hex/gradient/url
  };

  // Per-zone design data
  zones: {
    [zoneId: string]: {
      designUrl: string | null;
      transform: { x: number; y: number; scale: number; rotation: number };
      tint?: string; // optional color overlay on the design itself
      visible: boolean;
    };
  };

  // Tintable product surfaces (e.g., t-shirt color)
  tints: {
    [tintMaskId: string]: { color: string; visible: boolean };
  };

  // Toggleable scene props (e.g., hide the coffee mug from the desk scene)
  props: {
    [propMaskId: string]: { visible: boolean; tint?: string };
  };

  // Text layers (free-floating, not tied to zones)
  textLayers: Array<{
    id: string;
    text: string;
    x: number; y: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    align: 'left' | 'center' | 'right';
    letterSpacing: number;
    rotation: number;
  }>;

  // Free-floating shape/element layers (rectangles, circles, lines, uploaded images)
  elementLayers: Array<{
    id: string;
    type: 'rect' | 'circle' | 'line' | 'image';
    /* shape-specific props */
  }>;

  // Effect controls
  effects: {
    lightingIntensity: number; // 0–1, default 1
    shadowsEnabled: boolean;
  };
}
```

**This is the single source of truth for the renderer.** Any mode produces a `MockupState`; the renderer consumes it. For Brand Kit auto-fill, write a function `applyBrandKit(template, brandKit) → MockupState` that produces a populated state. For standalone, the user's actions mutate the state directly.

---

## 3. Mockup Template Schema (`template.json`)

What ships with each template, so the engine knows what's possible:

```json
{
  "version": 1,
  "id": "white-tshirt-flat-lay",
  "name": "White t-shirt — flat lay",
  "category": "apparel",
  "canvas": { "width": 2000, "height": 2000 },
  "assets": {
    "base": "base.jpg",
    "thumbnail": "thumbnail.jpg",
    "background_alpha": "base_no_bg.png"
  },

  "zones": [
    {
      "id": "chest",
      "label": "Chest print",
      "displacement": "chest_displacement.png",
      "lighting": "chest_lighting.png",
      "mask": "chest_mask.png",
      "displacement_scale": 12,
      "lighting_blend": "multiply",
      "default_transform": { "x": 1000, "y": 900, "width": 600, "height": 600, "rotation": 0 },
      "constraints": { "min_scale": 0.3, "max_scale": 1.5, "lock_aspect": true },

      "brand_kit_hints": {
        "preferred_asset": "logo_primary",
        "fallback_assets": ["logo_icon", "logo_wordmark"],
        "preferred_color_role": null
      }
    }
  ],

  "tintable_regions": [
    {
      "id": "shirt_color",
      "label": "T-shirt color",
      "mask": "shirt_tint_mask.png",
      "default_color": "#FFFFFF",
      "swatches": ["#FFFFFF", "#000000", "#1F2937", "#DC2626", "#2563EB"],
      "brand_kit_hints": { "preferred_color_role": "neutral_light" }
    }
  ],

  "props": [
    { "id": "coffee_mug", "label": "Coffee mug", "mask": "prop_coffee_mask.png", "default_visible": true, "tintable": false }
  ],

  "default_text_slots": [
    {
      "id": "company_name",
      "label": "Company name",
      "x": 1000, "y": 1500,
      "font_size": 48, "align": "center",
      "brand_kit_hints": { "preferred_field": "brand_name", "preferred_font_role": "heading" }
    }
  ],

  "background_replaceable": true
}
```

**Key addition vs v1 of this doc:** `brand_kit_hints` on every zone, tint, and text slot. This is how Mode B knows what to auto-fill from the Brand Kit. Without these hints, the auto-fill becomes guesswork.

---

## 4. Brand Kit Integration (Mode B, the killer feature)

### 4.1 What's in a Brand Kit

```typescript
interface BrandKit {
  brandName: string;
  tagline: string | null;
  logos: {
    primary: { url: string; aspectRatio: number } | null;
    secondary: { url: string; aspectRatio: number } | null;
    icon: { url: string; aspectRatio: number } | null;
    wordmark: { url: string; aspectRatio: number } | null;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral_light: string;
    neutral_dark: string;
  };
  typography: {
    heading: { family: string; weights: number[] };
    body: { family: string; weights: number[] };
  };
  imagery: Array<{ url: string; tags: string[] }>;
}
```

### 4.2 The Auto-fill Algorithm

Function signature:
```typescript
function applyBrandKit(template: TemplateMeta, brandKit: BrandKit): MockupState
```

Logic per element:

**For each zone in the template:**
1. Read `zone.brand_kit_hints.preferred_asset` (e.g., `"logo_primary"`).
2. Look up that asset in the brand kit. If present, set `zones[zoneId].designUrl = brandKit.logos.primary.url`.
3. If not present, walk `fallback_assets` in order until one is found.
4. Calculate transform: center inside the zone's `default_transform`, scale to fit while respecting `lock_aspect`.

**For each tintable region:**
1. Read `tintable_regions[i].brand_kit_hints.preferred_color_role` (e.g., `"primary"`).
2. Look up that color: `tints[regionId].color = brandKit.colors[role]`.
3. If `null`, use template's `default_color`.

**For each default text slot:**
1. Read `text_slots[i].brand_kit_hints.preferred_field` (e.g., `"brand_name"`).
2. Pull from brand kit: `brandKit[field]`.
3. Read `preferred_font_role`, pull family from `brandKit.typography[role].family`.
4. Color: pick a high-contrast color from the brand palette against the surrounding background. Default = `brandKit.colors.neutral_dark` if background is light, `neutral_light` if dark.

**For background:**
- If template has `background_replaceable: true` and the brand has on-brand imagery tagged appropriately, optionally swap. Default: keep template background.

### 4.3 Bulk Operations

- **Bulk preview generation:** When a user enters Brand Mode, a background job pre-renders thumbnails of all 30 templates with the brand applied. Cached in Cloudflare R2 keyed by `(brand_id, template_id, brand_kit_version)`. Cache busts when brand kit changes.
- **Bulk export:** "Export all" → server-side job that renders all 30 mockups at chosen resolution and zips them. Email/notify when done. (Don't try to do this client-side, it'll OOM the browser.)

### 4.4 Brand Kit Version Tracking

Add `brand_kit_version` (incrementing integer) to the brand record. Increment on any brand kit change. All cached Brand Mode previews/exports key off this version, so updating the brand kit invalidates the cache automatically.

---

## 5. Phase 0 — Codebase Audit & Adaptation Plan (MANDATORY)

**Do not skip. Do not start Phase 1 without completing this.**

### 5.1 What you need to discover

Open the BrandingOS repo and answer these questions in writing:

**Stack:**
- [ ] Frontend framework (Next.js / Vite + React / something else)? Version?
- [ ] React version? (Determines `@pixi/react` compatibility — v8 needs React 19 in some configs.)
- [ ] TypeScript or JavaScript? Strictness level?
- [ ] Backend (Node API, edge functions, separate service)?
- [ ] Database (Postgres, MySQL, SQLite, something on Cloudflare like D1)?
- [ ] ORM/query builder (Prisma, Drizzle, Kysely, raw SQL)?
- [ ] Auth (Clerk, NextAuth, Supabase, custom)?
- [ ] File storage (R2, S3, Supabase Storage)?
- [ ] Deployment (Cloudflare Pages, Vercel, Netlify)?

**Patterns:**
- [ ] How does the app fetch data today? (TanStack Query? SWR? Server Components? Server Actions? Plain `fetch` in `useEffect`?)
- [ ] How is global state managed? (Zustand? Redux? Context only? Jotai?)
- [ ] How are forms built? (React Hook Form? Formik? Native?)
- [ ] How are modals/dialogs built? (Radix? Headless UI? Custom?)
- [ ] What's the styling approach? (Tailwind? CSS Modules? styled-components? Vanilla Extract?)
- [ ] What's the component library, if any? (shadcn/ui? Mantine? Custom design system?)
- [ ] Where do icons come from? (lucide-react? Heroicons? Custom SVGs?)
- [ ] Naming conventions for files/folders/exports? (kebab-case files? PascalCase? Default vs named exports?)

**Existing features:**
- [ ] Where does the Brand Kit live in the codebase? What's its data model? How is it fetched?
- [ ] Is there an existing "Tools" section? How is it structured?
- [ ] What's the existing route convention? (App Router? Pages? File-based?)
- [ ] Is there an admin area? How is access controlled?
- [ ] Existing API endpoint patterns (REST? tRPC? GraphQL? Server Actions?)?

**Pre-existing implementations:**
- [ ] **Critical:** Is there any partial mockup/preview/canvas code already? Search for: `pixi`, `canvas`, `mockup`, `preview`, `displacement`, `fabric`, `konva`, `three`. Document what exists and decide: extend or replace?

### 5.2 Output

Write `MOCKUP_STUDIO_ADAPTATION_PLAN.md` at the repo root. It must contain:

1. **Stack summary table** filled out from the discoveries above.
2. **Adaptation decisions** for each section of this document. For example:
   - "This document suggests TanStack Query, but BrandingOS uses Server Components + Server Actions. The API endpoints in §10 will be implemented as Server Actions in `app/(tools)/mockup-studio/actions.ts` instead."
   - "This document suggests `@pixi/react`, but our React version is 18 and `@pixi/react` v8-beta is shaky on 18. We'll roll a custom `useMockupRenderer` hook that mounts/unmounts a vanilla PixiJS Application against a `<canvas ref>`."
   - "Our naming convention is kebab-case files with default exports. The folder structure in §11 will be adapted to match."
3. **Database migration plan** — what tables/columns to add, written in the project's existing migration tooling syntax (Drizzle migrations, Prisma migrations, raw SQL, etc.).
4. **Conflict report** — anything in this document that conflicts with existing BrandingOS conventions, and how you propose to resolve it.
5. **Updated folder structure** for all new files, matching project conventions.
6. **Risk list** — anything you discovered that this document didn't anticipate (e.g., "the existing Brand Kit doesn't store logo aspect ratio, we'll need a migration to backfill that").

### 5.3 Acceptance for Phase 0

- [ ] `MOCKUP_STUDIO_ADAPTATION_PLAN.md` exists at repo root.
- [ ] Every checkbox in §5.1 is answered.
- [ ] Every code snippet in this document has either been confirmed compatible OR has an adaptation note explaining what'll change.
- [ ] Hamza has reviewed the plan and approved it before any Phase 1 code is written.

**Stop here. Wait for review. Do not write feature code yet.**

---

## 6. Implementation Phases (1–7, after Phase 0 is approved)

### Phase 1 — Engine Foundation

**Goal:** PixiJS engine layer mounts, loads a template, renders the base image. No interactivity yet. Mode-agnostic.

**Tasks:**
1. Install dependencies (versions pinned to whatever Phase 0 decided):
   ```bash
   npm install pixi.js@^8
   # @pixi/react only if Phase 0 confirmed compatibility
   ```
2. Create the engine layer (folder per Phase 0's plan): `MockupRenderer` class or hook that takes `(canvasEl, templateMeta) → mounts PixiJS app and renders base`.
3. Build `GET /api/mockup-templates` and `GET /api/mockup-templates/:id` (or Server Action equivalent).
4. Create the route per Phase 0's plan (e.g., `/tools/mockup-studio` if that matches the Tools convention).
5. Build a minimal page: template grid on the left, empty canvas on the right. Click a template → URL changes → engine loads template → base image renders.
6. Seed 3 templates (1 apparel, 1 print, 1 device) with full asset bundles.

**Acceptance:**
- [ ] Page loads at `/tools/mockup-studio`, no console errors.
- [ ] Three template thumbnails appear.
- [ ] Clicking a template loads it. Base image renders at correct aspect ratio.
- [ ] Engine code is mode-agnostic (no references to "standalone" or "brand").

---

### Phase 2 — Single-Zone Design Placement (Engine + Standalone Mode)

**Goal:** User can upload a design and see it composited correctly. Standalone Mode (Mode A) MVP.

**Tasks:**
1. Extend the engine: render `MockupState` (per §2.5). Implement zones with displacement + lighting + mask compositing.
2. Build the standalone editor UI: file upload (drag-drop + click), shows currently uploaded design.
3. State management per Phase 0's pattern: `useStandaloneProject` hook (or Zustand store, or whatever) holds the `MockupState` and exposes mutations.
4. On upload → mutate state → engine re-renders.
5. Validate the displacement+lighting math on at least 3 visually distinct templates (light bg vs dark bg, flat vs heavily wrinkled).

**Acceptance:**
- [ ] Upload a logo on a business-card template → renders correctly with subtle paper curl and lighting.
- [ ] Try a dark logo on a light shirt and a light logo on a dark shirt — both look right.
- [ ] No visible mask seams or flickering.
- [ ] Engine is still mode-agnostic — only the standalone hook touches it directly.

---

### Phase 3 — Full Customization Controls (Mode C primitives)

**Goal:** Every customizable property in §1 Mode C is exposed and works. This phase delivers the customization engine that all three modes will use.

**Tasks:**

**3a. Transform controls (the design itself):**
- Drag to move (clamp to within mask bounds visually, but allow extending — design is clipped).
- Corner handles for scale (respect `constraints`).
- Rotation handle.
- Right-sidebar numeric controls (X, Y, scale %, rotation °, "Reset").

**3b. Product color tinting:**
- Render `tintable_regions` per template.
- For each: show a color picker + swatch row in the sidebar.
- On change: update `MockupState.tints[id].color` → engine recomposites.

**3c. Background replacement:**
- Background panel: tabs for "Template default / Solid color / Gradient / Image upload / Stock library."
- Each option mutates `MockupState.background`.
- Engine swaps the base background sprite accordingly (template's `background_alpha` asset is used when user replaces background, so the product's natural background can be removed).

**3d. Text layers (add/edit/delete):**
- "+ Add Text" button. Adds a `TextLayer` at canvas center.
- Text layers render as **HTML overlays absolutely positioned over the canvas** (V1 approach — simpler than Pixi BitmapText, and they remain crisp at all zoom levels). For export, render text into Pixi at export time.
- Inline editing: double-click text → contenteditable.
- Right sidebar when text selected: font family (from a curated list including all loaded brand fonts), size, weight, color, alignment, letter spacing, rotation, delete.
- Drag to move, handles to resize.

**3e. Element layers (shapes & uploaded images):**
- Toolbar: rectangle, circle, line, image-upload.
- Each adds an `ElementLayer` to state.
- Render as Pixi Graphics (shapes) or Pixi Sprites (images) above the design layer but below text.
- Same selection/transform UX as text layers.

**3f. Scene props toggle:**
- For templates with `props[]`: list each in the sidebar with a visibility toggle and (if `tintable`) a color picker.
- Toggle hides/shows that prop's mask from the composite.

**3g. Lighting & shadow controls:**
- "Realism" panel: slider for `effects.lightingIntensity` (0–100%).
- Toggle for `effects.shadowsEnabled`.

**3h. Layer panel:**
- Right or left sidebar: a layers list (like Photoshop). Shows all zones, text layers, element layers in z-order. Allows reorder, hide, lock.

**Acceptance:**
- [ ] Every property in §1 Mode C is editable from the UI.
- [ ] Hovering any element on canvas shows a hover state. Clicking selects it. Selection reveals its controls in the sidebar.
- [ ] Undo/redo works for all mutations (use immer or a command-pattern history stack; decided in Phase 0).
- [ ] Performance stays smooth (no jank during drag) on a 5-year-old laptop.
- [ ] All mutations go through the `MockupState`, never direct PixiJS manipulation from UI code.

---

### Phase 4 — Multi-Zone Templates

**Goal:** Templates with > 1 design zone work. Tested with a 4-zone greeting-card template (Freepik-style).

**Tasks:**
1. Sidebar for multi-zone templates shows a tabbed/list interface, one entry per zone.
2. Selecting a zone in the sidebar focuses it on canvas (highlight zone bounds, scroll camera if needed).
3. Each zone has its own design upload, transform, and tint state.
4. All zones render simultaneously (the user always sees the full mockup).
5. Performance check: up to 6 zones must render at 60fps on a mid-range laptop.

**Acceptance:**
- [ ] A 4-zone greeting-card template is in the gallery.
- [ ] Each zone holds a different design.
- [ ] All zones render correctly together.
- [ ] No state leakage between zones.

---

### Phase 5 — Brand-aware Mode (Mode B, the killer feature)

**Goal:** When a user has a brand, every template is auto-filled with their brand. Bulk previews and bulk export work.

**Tasks:**

**5a. Brand Kit fetch & cache:**
- Build `useBrandKit(brandId)` hook (or equivalent per Phase 0 pattern).
- Fetch the brand kit. Cache.

**5b. The `applyBrandKit` function:**
- Implement per §4.2.
- Pure function: `(template, brandKit) → MockupState`.
- Unit-tested with multiple brand/template combinations.

**5c. Brand-aware editor:**
- New entry point: `/brands/:brandId/mockups`.
- Template gallery: every thumbnail shows the brand-applied preview (rendered server-side or via cached pre-render — decide in Phase 0).
- Click any template → editor opens with brand applied. User can override anything.

**5d. Bulk preview generation:**
- Background job (or client-side render-then-upload during gallery first-load) that pre-renders all template thumbnails with the brand applied.
- Cached in R2 keyed by `(brand_id, template_id, brand_kit_version)`.
- Invalidates when `brand_kit_version` increments.

**5e. Bulk export:**
- "Export all mockups" button on the brand mockups page.
- Server-side job: renders all templates at chosen resolution, zips them, uploads to R2, emails the user a download link.
- Use a job queue if BrandingOS already has one; otherwise add a simple one (BullMQ on Redis, or Cloudflare Queues if fully on Cloudflare).

**Acceptance:**
- [ ] User with a complete brand kit opens `/brands/:id/mockups` and sees their brand on every template thumbnail in < 5 seconds.
- [ ] Opening any template shows the brand pre-applied.
- [ ] Editing the Brand Kit and returning shows updated previews (cache invalidation works).
- [ ] Bulk export of 30 mockups completes within 2 minutes server-side and produces a valid zip.

---

### Phase 6 — High-Resolution Export

**Goal:** User can export current mockup at 1x, 2x, 4x as PNG/JPG.

**Tasks:**
1. Build `exportMockup(state, scale, format) → Blob` in the engine layer.
2. Use a separate off-screen Pixi Application at the export resolution (don't resize the on-screen one).
3. For text layers: at export time, render text into Pixi (since they're HTML overlays at edit time, they need to be baked into the canvas for export).
4. Show progress modal during export.
5. Free tier: stamp a watermark. Paid tier: clean export.
6. Upload to R2, return signed download URL. Persist URL in `user_mockup_projects.last_export_url`.

**Acceptance:**
- [ ] 1x, 2x, 4x exports all work.
- [ ] 4x export is sharp at 300 DPI for common print sizes.
- [ ] Text layers render correctly in export.
- [ ] Free users see watermark, paid users don't.

---

### Phase 7 — Admin Template Management

**Goal:** Hamza can upload new templates without engineering help.

**Tasks:**
1. Admin-only page: `/admin/mockup-templates`.
2. Template list with edit/publish/unpublish/delete actions.
3. Upload form: name, category, premium flag, all asset files, JSON metadata.
4. Server-side validation:
   - All required files present.
   - Image dimensions match `template.json` declared canvas.
   - JSON schema valid.
5. On submit: upload to R2, insert/update DB row, invalidate caches.
6. Test publish: render a preview using a stock test design before going live.

**Acceptance:**
- [ ] Hamza uploads a new template via UI in < 5 minutes.
- [ ] Invalid uploads show clear errors.
- [ ] Published templates appear in user gallery immediately.
- [ ] Templates can be unpublished without deletion.

---

## 7. UI/UX Principles (Critical — read carefully)

### 7.1 "Easy. Editable. Everything visible."

The user should never wonder *if* something is editable. If it can be changed, the affordance is visible.

**Concrete rules:**

1. **Hover state on every editable element.** Hovering the t-shirt → shows a soft highlight outline + tooltip "Click to change color." Hovering the design → outline + "Click to edit." Hovering text → outline + "Double-click to edit text."
2. **Click to select, click outside to deselect.** Selected elements show transform handles + reveal their controls in the right sidebar.
3. **Right sidebar is contextual.** Default state: shows global properties (background, lighting). When something is selected: shows that thing's properties.
4. **Left sidebar is templates / layers / assets.** Tabs for: Templates browser (when no template loaded), Layers panel (when template loaded), Brand Assets (when in Mode B).
5. **Top toolbar is global actions.** Undo, redo, zoom, save, export.
6. **Keyboard shortcuts:** Cmd/Ctrl+Z undo, Shift+Cmd+Z redo, Cmd/Ctrl+S save, Delete removes selected, Cmd/Ctrl+D duplicate, arrow keys nudge.
7. **No hidden depth.** Avoid "Advanced" panels behind a toggle. If it's an option, it's visible.

### 7.2 Mobile

V1 = desktop and tablet. On phones, show a "Best on desktop" notice and offer a read-only preview. Real mobile editing is V2 (it's a different design problem and significantly more work).

### 7.3 Loading & errors

- Template loading: skeleton placeholder, not spinner. Stream in zones as they load.
- Design upload: optimistic preview while uploading.
- Export: modal with progress bar + cancel button.
- Errors: inline, friendly, with a "Try again" button. Never a raw error message.

### 7.4 Empty states

- No templates yet (admin): "Upload your first template to get started" + button.
- No brand kit (Mode B attempted without brand): redirect to brand creation flow with a callback URL.
- No designs uploaded (standalone, freshly opened template): show the template's default placeholder design with a hint "Upload your design to get started" floating over the drop zone.

### 7.5 Accessibility

- All controls keyboard-navigable.
- Color pickers have hex input + named color labels.
- Image alt text on all uploaded designs (auto-generated, user-overridable).
- Sufficient contrast on all UI chrome.
- Honor `prefers-reduced-motion` (no spring animations in transforms).

---

## 8. Asset Pipeline — How Templates Are Made

This is the operational bottleneck. Document this internally so contractors can produce templates without engineering involvement.

### 8.1 Per-template Photoshop workflow

1. **High-res product photo** (min 2000px long edge). Take or buy.
2. **Export `base.jpg`** at sRGB, quality 90.
3. **Displacement map:** duplicate base → desaturate → adjust Levels so print area centers around mid-gray (128) → Gaussian blur 1–3px → save `displacement.png`.
4. **Lighting layer:** duplicate base → desaturate → adjust Levels (white = no effect, dark = shadow) → save `lighting.png`.
5. **Mask:** trace printable area (or Select Subject) → fill white on black → 1–2px feather → save `mask.png`.
6. **Tint mask** *(if tintable)*: grayscale mask of recolorable surface → save `tint_mask.png`.
7. **Prop masks** *(if removable props)*: one mask per prop, named `prop_<id>_mask.png`.
8. **Background-removed base** *(if `background_replaceable`)*: cut out the product against transparency → save `base_no_bg.png`.
9. **Write `template.json`** with all zones, tints, props, brand_kit_hints.
10. **Test in BrandingOS staging** with several diverse designs before publishing.

### 8.2 Estimate

~30–45 minutes per template for an experienced designer. Plan accordingly.

### 8.3 V2 acceleration ideas

- Photoshop script that auto-exports all 4 layers + JSON skeleton in one click.
- AI pipeline: feed base photo into MiDaS or Depth-Anything → auto-generate displacement → use Photoshop's neural filters or a separate model → auto-generate lighting layer.
- Outsource to an offshore team of designers cranking out templates per spec.

---

## 9. Tech Stack Summary (subject to Phase 0 confirmation)

| Concern | Default choice | Override basis |
|---|---|---|
| Renderer | PixiJS v8 | Don't override unless you find a major blocker. |
| React bindings | `@pixi/react` if compatible, else custom hook | Phase 0 React version check. |
| Frontend framework | (existing in BrandingOS) | Use what's there. |
| State management | (existing in BrandingOS) | Use what's there. For mockup state specifically, use immer for immutable updates regardless of state lib. |
| Data fetching | (existing in BrandingOS) | Use what's there. |
| Styling | (existing in BrandingOS) | Use what's there. |
| File uploads | Direct-to-R2 presigned URLs | Don't proxy through backend. |
| Asset storage | Cloudflare R2 | Existing infra. |
| CDN | Cloudflare | Existing infra. |
| Database | (existing in BrandingOS) | Use what's there. |
| Job queue | (existing if any, or Cloudflare Queues / BullMQ) | Phase 0 decision. |
| Image processing (admin upload validation) | sharp (Node) | Standard. |

---

## 10. API Endpoints / Server Actions

Adapt the names/styles to match BrandingOS's existing API conventions (Phase 0 will determine REST vs Server Actions vs tRPC).

```
# Public templates
GET    /api/mockup-templates?category=&search=&page=
GET    /api/mockup-templates/:id

# User uploads
POST   /api/uploads/presigned         # presigned R2 URL for design upload

# Projects
POST   /api/mockup-projects
GET    /api/mockup-projects/:id
PATCH  /api/mockup-projects/:id
DELETE /api/mockup-projects/:id
POST   /api/mockup-projects/:id/export

# Brand-aware mode
GET    /api/brands/:brandId/mockup-previews          # cached thumbnails per template
POST   /api/brands/:brandId/mockup-bulk-export       # kicks off bulk export job
GET    /api/brands/:brandId/mockup-bulk-export/:jobId # check status

# Admin
POST   /api/admin/mockup-templates
PATCH  /api/admin/mockup-templates/:id
DELETE /api/admin/mockup-templates/:id
POST   /api/admin/mockup-templates/:id/test-render   # validate by rendering with a stock design
```

---

## 11. Folder Structure (suggested — adapt to project conventions in Phase 0)

```
src/
  features/
    mockup-studio/
      engine/                     # ⚠️ MODE-AGNOSTIC. Touches PixiJS only.
        renderer.ts               # The compositor
        export.ts                 # High-res export
        types.ts                  # MockupState, TemplateMeta types
        utils/
          displacement.ts
          lighting.ts
          masks.ts

      modes/
        standalone/
          StandaloneEditor.tsx
          useStandaloneProject.ts
        brand-aware/
          BrandAwareEditor.tsx
          useBrandAwareProject.ts
          applyBrandKit.ts        # Pure function: (template, brandKit) → MockupState
          applyBrandKit.test.ts
        custom/                   # If Mode C is a separate route, otherwise it's just full controls in the other modes
          CustomEditor.tsx

      ui/                         # Mode-shared UI components
        TemplateBrowser.tsx
        EditorCanvas.tsx          # The PixiJS canvas wrapper
        EditorToolbar.tsx
        LayersPanel.tsx
        PropertiesSidebar.tsx
        TextLayerOverlay.tsx
        TransformHandles.tsx
        ColorPicker.tsx
        BackgroundPanel.tsx
        ZoneTabs.tsx
        ExportModal.tsx

      hooks/
        useTemplate.ts
        useDesignUpload.ts
        useUndoRedo.ts

      api/                        # API client (or server actions, per Phase 0)
        templates.ts
        projects.ts
        brand-mockups.ts

      pages/                      # Or routes/ — match project convention
        ToolsMockupStudioPage.tsx
        BrandMockupsPage.tsx
        AdminTemplatesPage.tsx
```

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Performance on low-end devices.** | Throttle re-render during drag (rAF). Reduce displacement during interaction, restore on drop. Test on a 5-year-old laptop before shipping each phase. |
| **Memory with large textures.** | Cap design uploads at 4096×4096 (resize larger client-side). Use webp where supported. |
| **Slow asset loading.** | Aggressive Cloudflare caching. Preload on hover. Skeleton loaders. |
| **Template creation cost.** | 30–45 min per template × 30 templates = 15–22 hours. Plan for it. Consider offshore designers. |
| **Brand Kit incompleteness breaks Mode B.** | Always have fallback assets (e.g., generate a text-based logo from brand name if no logo uploaded). Never crash; always render *something* on-brand. |
| **PixiJS v8 + React bindings still beta.** | Pin exact versions. Have a fallback to vanilla PixiJS documented. |
| **Browser-based DRM / hot-linking.** | Sign asset URLs with short-lived tokens. Watermark previews. |
| **Smartmockups shutdown means competitors will multiply.** | Move fast. Differentiate hard on Brand-aware mode (Mode B) — that's the moat. |
| **Engine code leaks into UI code.** | Code review every PR. The engine layer must not import from the UI layer. UI must not call PixiJS APIs directly. State flows one direction. |

---

## 13. V2 Roadmap (Not in V1)

- **AI scene generation** (à la ListyStyle / Magic Edit). FAL/Replicate, SDXL-Inpaint or Flux-Fill. Fills the "I want a unique scene, not a template" gap.
- **Video mockups** via `MediaRecorder`.
- **Real 3D for mug/bottle/box** via Three.js + GLTF.
- **Mobile editor** — proper touch-first design.
- **User-uploaded templates** with AI-generated displacement (MiDaS/Depth-Anything).
- **Template marketplace** with revenue share.
- **Animated brand reveals** — short export videos showing the brand applied to a sequence of products.

---

## 14. Definition of Done for V1

- [ ] Phase 0 adaptation plan reviewed and approved.
- [ ] All 7 implementation phases shipped, each meeting its acceptance criteria.
- [ ] 30+ templates live across 5 categories.
- [ ] Standalone Mode usable without account.
- [ ] Brand-aware Mode auto-fills correctly for all 30 templates.
- [ ] Custom Mode: every property in §1 Mode C is editable.
- [ ] Export at 1x/2x/4x working.
- [ ] Save/resume working in all modes.
- [ ] No console errors on Chrome/Safari/Firefox latest.
- [ ] Lighthouse score > 80 on the editor page.
- [ ] Internal docs for Hamza on adding new templates.
- [ ] Engine is mode-agnostic — verified by reading the engine layer's imports (only PixiJS, types, no UI imports).

---

## 15. Suggested Build Order for Claude Code with Worktrees

After Phase 0 is approved:

- **Worktree A — Backend & Data:** Database migrations, API endpoints, R2 integration, admin upload, brand-aware caching, bulk export job. Phases 1, 5 (backend), 6 (export upload), 7.
- **Worktree B — Engine:** PixiJS engine, displacement/lighting/mask compositor, export rendering, MockupState contract. Phases 1, 2, 4, 6 (renderer).
- **Worktree C — UI & Modes:** Editor components, sidebars, toolbars, all three mode wrappers (Standalone/Brand-aware/Custom controls), brand kit auto-fill UI. Phases 2, 3, 4, 5 (frontend).

**Merge points:**
1. After Worktree B Phase 1 → Worktree C can start mounting the engine in UI.
2. After Worktree A Phase 1 → Worktree C can fetch templates.
3. After Worktrees B & C complete Phase 2 → integration test with real users (Hamza).
4. Phase 3 mostly Worktree C.
5. Phase 5 needs Worktrees A + B + C all converging — coordinate carefully.
6. Final integration test before each phase ships.

Each worktree pulls main daily, merges main into itself, resolves conflicts (mostly in `engine/types.ts` and the API client), and pushes.

---

## 16. Final Reminders for Claude Code

1. **Phase 0 is mandatory. No feature code before the adaptation plan is approved.**
2. **The engine is mode-agnostic.** If you ever import a Brand Kit type into the engine, you've broken the architecture. Stop and refactor.
3. **The MockupState is the single source of truth.** Never bypass it to mutate PixiJS directly from UI code.
4. **Match existing project conventions.** The patterns in this document are defaults, not commands. Phase 0 tells you what to override.
5. **Stop and ask if blocked.** A clarifying question is cheaper than a bad architectural decision.
6. **Commit at the end of each task.** Granular commits make review easier.
7. **Wait for review at the end of each phase.** Do not auto-advance to the next phase.

---

## End of document
