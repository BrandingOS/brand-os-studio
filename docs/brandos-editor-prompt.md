# BrandOS Editor — Master Build Prompt

> **How to use this prompt.** Paste the **Master Context** at the start of every coding session. Then paste **one Phase** at a time. Do not advance to the next phase until the current one passes its acceptance criteria. The architecture depends on disciplined phasing — these are not suggestions.

> **Canonical references in this repo.** Read these before you write a line of code:
> - `CLAUDE.md` — repo-wide rules (page shells, editor primitives, off-limits zones, auth, palette helpers).
> - `src/features/editor/core/README.md` — editor-unification status & adoption guide.
> - `docs/ux-redesign/ARCHITECTURE.md` — IA, scopes (Workspace · Brand · Editor), routes.
> - `docs/brand-board/README.md` — Brand Board scenario & control spec (when touching identity surfaces).

---

## MASTER CONTEXT (always include)

You are a **senior frontend architect** completing the unified canvas editor for **BrandOS** — a centralized brand operating system for branding agencies and freelancers. Agencies manage many brands, many clients, and produce many design outputs from a single source of brand truth.

### What you are building

A **single unified canvas editor** that adapts to multiple content types (social posts, presentations, business cards, brand-guideline slides, banners, multi-page documents, mockups). One editor, configured per content type. Not multiple editors.

This is a **continuation of in-flight work**, not a greenfield build. The repo already ships six editor surfaces; the unification is incremental, primitive-first, and described in `src/features/editor/core/README.md`. Your job is to land the schema-first model and adapter boundary that the rest of those surfaces converge onto — without breaking what already ships.

### Non-negotiable architectural principles

These rules override all stylistic preferences. If a request conflicts with them, refuse and explain.

1. **EditorAdapter pattern.** All canvas/Fabric.js code lives behind an `EditorAdapter` interface. The rest of BrandOS (brand engine, AI, templates, content types) **must never import from `fabric` directly**. If a feature needs Fabric, it talks to the adapter. This makes Fabric replaceable.

2. **Schema-first.** The source of truth is a JSON document called `BrandOSDocument`, defined with **Zod**. The editor loads this document, the AI produces this document, the database stores this document. Fabric's native serialization is an implementation detail of the adapter and is **never persisted**.

3. **Three-layer separation, unidirectional flow.**
   - **Editor Layer** knows nothing about brands, AI, or templates. It loads / edits / exports `BrandOSDocument`.
   - **Brand Engine** owns brand kits and produces `BrandOSDocument` updates by transforming documents (e.g., applying a brand kit to a template).
   - **AI Layer** produces `BrandOSDocument` from prompts. It never writes to live editor state — it emits a full document that the editor loads.

4. **Content types are configs, not separate editors.** Differences between a social post and a presentation are: canvas dimensions, default panels visible, page model (single vs multi), export presets, default templates. All expressed as a `ContentTypeConfig` object. There is no `<PresentationEditor>` or `<DesignEditor>`. There is one `<Editor>` and a config.

5. **Reuse the existing editor primitives.** Every editor in this repo migrates to `EditorChrome` (top bar) and `useAutoSave` (debounced save + state machine). Do NOT roll a bespoke topbar or save loop. Import from `@/features/editor/core`.

6. **Resolve brand visuals through the canonical helpers.** When placing a logo on a background, go through `pickLogoOnBackground(brand, bgHex)` from `@/shared/brand/logoOnBackground`. When picking surface colors (page / card / brand / inverted), go through `pickSurfaceTokens(buildBrandPalette(brand, mode), kind)` from `@/shared/brand/brandPalette`. Never read `brand.colorSystem.primary.hex` directly into a paint.

7. **TypeScript: no `any`. No `as` casts unless commented and justified.** Note that `strictNullChecks` and `noImplicitAny` are OFF in the project `tsconfig.json` — defend against null at runtime in new code.

### Tech stack (locked — matches the actual repo)

- **Build:** Vite 5 + React 18 + TypeScript 5.8.
- **Routing:** React Router v6 (client-side SPA). No Next.js. No App Router.
- **State:** Zustand 5 (devtools + persist) for editor UI state. TanStack Query for server state. Document state lives **inside the adapter**, not in Zustand.
- **UI:** shadcn/ui (Radix primitives) + Tailwind CSS 3 + lucide-react.
- **Canvas:** Fabric.js **v6** (`fabric@^6.7.1` already installed). Use modular named imports (`import { Canvas, Rect, FabricImage, Textbox } from 'fabric'`). Do NOT use the v5 `fabric.X` global pattern. Use promise-based APIs (`await canvas.loadFromJSON(...)`), not callbacks.
- **Schema:** Zod 3 (`zod@^3.25.x` already installed).
- **Backend:** Supabase (PostgreSQL + Storage + RLS + Edge Functions). Project id `ciojgoozobzbeglwdxcz`. No Drizzle. No Redis.
- **AI:** Anthropic API (`@anthropic-ai/sdk@^0.81.0` already installed) with **Zod-enforced structured outputs** via tool use. Calls go through a **Supabase Edge Function**, not the browser — `VITE_ANTHROPIC_API_KEY` currently inlines into the bundle and that is being moved server-side (see `CLAUDE.md` "Security constraint").
- **DI:** Service container in `src/core/`. Access via `useService<T>(SERVICE_KEYS.X)` in components, or `services.x` from `@/shared/services/registry` in stores.

### Project layout (single repo, npm — NOT a monorepo)

The Vite app lives at the repo root. There is a separate `landingpage/` Vite project with its own `package.json` — leave it alone, the editor does not touch it.

```
src/
├── core/                                 # DI container, service contracts, boot
│   ├── boot.ts
│   ├── container/
│   ├── types/services.ts                 # service interfaces + SERVICE_KEYS
│   └── adapters/                         # service implementations (Local, Supabase)
├── features/
│   ├── editor/                           # ★ this build lands here
│   │   ├── core/                         # EditorChrome, useAutoSave (already shipped)
│   │   ├── schema/                       # NEW — Zod BrandOSDocument
│   │   ├── adapter/                      # NEW — EditorAdapter + FabricAdapter
│   │   ├── content-types/                # NEW — one config per content type
│   │   ├── components/                   # legacy DesignEditor — wire onto adapter
│   │   ├── hooks/
│   │   ├── data/
│   │   └── tools/
│   ├── brand/                            # Brand CRUD, sidebar, BrandChooserDialog
│   ├── brandkit/                         # Brand Kit modules (Identity, color engine)
│   ├── brand-board/                      # interactive identity poster editor
│   ├── guidelines/                       # slide-based guidelines editor
│   ├── ai-design/                        # NEW — prompt → intent → BrandOSDocument
│   └── templates/                        # NEW — template browser (brand-scoped)
├── shared/
│   ├── brand/                            # palette, logoOnBackground, path-rewrite
│   ├── layouts/                          # AppRail (live), page-shell rules
│   ├── presentation/                     # deck v2 (off-limits to editor work)
│   ├── services/registry.ts              # store-friendly DI bridge
│   ├── store/                            # Zustand: brandStore, sessionStore
│   ├── ui/                               # PageHeader and other primitives
│   └── upload/                           # AssetSourcePopover (canonical image picker)
├── pages/                                # route-level entry points
└── integrations/supabase/                # generated client + types
```

**Path alias:** `@/` → `./src/`. Use it everywhere — no relative `../../..` imports across features.

### Off-limits zones (hard freeze — see `CLAUDE.md`)

These are tagged `stable/editable-export-v1` and frozen. The editor unification works **around** them, never **through** them:

- `src/features/editor-workspace/` (the EditorWorkspace shell)
- `src/shared/services/export/vectorize/*`
- The `Brand Guides` route that uses EditorWorkspace.

If a refactor "would clean up" something inside these, stop. Document the gap and route around it.

### Forbidden patterns (rejected in code review)

- ❌ Importing `fabric` from outside `src/features/editor/adapter/`.
- ❌ Storing Fabric's native JSON in Supabase or localStorage. Always store `BrandOSDocument`.
- ❌ Bespoke editor topbars or save loops. Use `EditorChrome` + `useAutoSave`.
- ❌ Hand-painting brand colors (`bg.luminance > 0.5 ? black : white` style logic). Always go through `pickLogoOnBackground` / `pickSurfaceTokens`.
- ❌ Page-level `px-4 sm:px-6 lg:px-8` or `py-6` overrides — layouts own padding (page-shell rule §2 in `CLAUDE.md`).
- ❌ `useEffect` with no dependency array, or with stale closures over canvas state.
- ❌ Direct DOM manipulation outside the adapter (no `document.querySelector` against canvas elements).
- ❌ Class components in React. Hooks only.
- ❌ Catching errors silently. Either rethrow, log via the typed logger, or surface to the user (toast via `sonner`).
- ❌ Magic numbers in canvas math. Name them (`SNAP_THRESHOLD_PX`, `DEFAULT_HANDLE_SIZE`).
- ❌ Inline Tailwind classes >~6 utilities per element — extract a component or use `cn()` with class groups.
- ❌ Reading `brand.colorSystem.primary.hex` (or the deprecated `brand.primaryColor`) directly into a paint. Go through the palette/logo helpers.
- ❌ Inline brand asset picking — every "upload an image inside a brand" surface uses `@/shared/upload/AssetSourcePopover`. No one-off file pickers.

### Routes the editor lives under

The editor is **brand-scoped**. Live routes (see `CLAUDE.md` §UX & IA):

- `/b/:slug/design` — launchpad (Blank Canvas · AI Design · Recent).
- `/b/:slug/templates` — template browser.
- `/b/:slug/social-media?platform=X&format=Y` — opens editor directly (no dark modal picker).
- `/b/:slug/brand-board` — Brand Board (separate, has its own README).

Both `/b/:slug/...` (preferred) and the legacy `/dashboard/brand/:slug/...` work; new code uses the short form. Brand switching inside the editor MUST go through `rewriteBrandPath()` from `@/shared/brand/brandPathRewrite` so the user stays on the same tool when picking a different brand.

### Git conventions (per `CLAUDE.md`)

- Default branch is **`dev`** (not `main`). Land work on `dev`. Releases to `main` are manual.
- Conventional commits with scope: `feat(editor): …`, `fix(adapter): …`, `refine(schema): …`. Small. One concept per commit.
- Push: `git push origin dev`. Do **not** mirror to `x` unless the user explicitly asks (memory: `feedback_git_push.md`).

---

## PHASE 0 — Foundation: Schema + EditorAdapter Interface

**Goal:** No editor changes yet. Define the contract first, in this repo's structure.

### Tasks

1. Create `src/features/editor/schema/index.ts` with the Zod schemas. Slot references must target the **v3 brand fields** that already exist on `Brand` (`colorSystem`, `typography`, `logoSystem`, `brandAssets`) — not the deprecated flat fields.

```ts
// src/features/editor/schema/index.ts
import { z } from 'zod';

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);

/**
 * Slot references resolve against the v3 brand schema.
 * - `brand.color.*` → `brand.colorSystem.{primary|secondary|accent}.hex` (or a neutral from `brand.neutrals[]`).
 * - `brand.font.*`  → `brand.typography.{primary|secondary}.family`.
 * - `brand.logo.*`  → `brand.logoSystem.{primary|secondary|wordmark|iconmark|mono.black|mono.white}` (resolved to an asset url at render time).
 * - `brand.spacing.unit` → `brand.uiStyle.spacing` (compact|comfortable|spacious) mapped to a px value.
 */
export const SlotRefSchema = z.object({
  type: z.enum([
    'brand.color.primary',
    'brand.color.secondary',
    'brand.color.accent',
    'brand.color.neutral',
    'brand.font.heading',
    'brand.font.body',
    'brand.logo.primary',
    'brand.logo.secondary',
    'brand.logo.wordmark',
    'brand.logo.iconmark',
    'brand.logo.mono.black',
    'brand.logo.mono.white',
    'brand.spacing.unit',
  ]),
  /** Optional neutral index (0 = lightest … 5 = darkest), only valid for brand.color.neutral. */
  neutralIndex: z.number().int().min(0).max(5).optional(),
});

export const ResolvedValueSchema = z.union([z.string(), z.number(), SlotRefSchema]);

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
});

const BaseLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  transform: TransformSchema,
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  /** Brand-managed: the value comes from the brand kit and the user cannot override it. */
  brandLocked: z.boolean().default(false),
});

export const TextLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('text'),
  text: z.string(),
  fontFamily: ResolvedValueSchema,
  fontSize: z.number(),
  fontWeight: z.number().default(400),
  lineHeight: z.number().default(1.2),
  letterSpacing: z.number().default(0),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  /** Bi-directional support — the deck-v2 fix for bi-neutral chars in label tags lives in `src/shared/presentation/v2`. Same pattern applies here. */
  direction: z.enum(['auto', 'ltr', 'rtl']).default('auto'),
  color: ResolvedValueSchema,
});

export const ShapeLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('shape'),
  shape: z.enum(['rectangle', 'ellipse', 'line', 'polygon']),
  fill: ResolvedValueSchema.nullable(),
  stroke: ResolvedValueSchema.nullable(),
  strokeWidth: z.number().default(0),
  cornerRadius: z.number().default(0),
});

export const ImageLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('image'),
  /** Either an external URL, a Supabase Storage url, or an `assetId` reference into `brand.brandAssets[]`. */
  src: z.union([z.string().url(), z.object({ assetId: z.string() })]),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
});

export const SvgLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('svg'),
  src: z.union([z.string().url(), z.object({ assetId: z.string() })]),
  /** Per-fill overrides keyed by SVG path id, resolved through SlotRef. */
  fillOverrides: z.record(z.string(), ResolvedValueSchema).default({}),
});

export const LogoLayerSchema = BaseLayerSchema.extend({
  kind: z.literal('logo'),
  /** Maps to `brand.logoSystem` slots. The adapter MUST go through `pickLogoOnBackground` when the layer has a colored bg behind it. */
  variant: z
    .enum(['primary', 'secondary', 'wordmark', 'iconmark', 'mono.black', 'mono.white', 'auto'])
    .default('auto'),
});

export const GroupLayerSchema: z.ZodType<unknown> = BaseLayerSchema.extend({
  kind: z.literal('group'),
  children: z.lazy(() => z.array(LayerSchema)),
});

export const LayerSchema = z.discriminatedUnion('kind', [
  TextLayerSchema,
  ShapeLayerSchema,
  ImageLayerSchema,
  SvgLayerSchema,
  LogoLayerSchema,
  GroupLayerSchema,
]);

export const PageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  background: ResolvedValueSchema.default('#ffffff'),
  masterPageId: z.string().uuid().nullable().default(null),
  layers: z.array(LayerSchema),
});

export const BrandOSDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  /** Matches a `ContentTypeConfig.id`. */
  contentType: z.string(),
  /** Nullable for the standalone-editor flow (BrandChooserDialog → "Start without a brand"). */
  brandId: z.string().uuid().nullable(),
  masterPages: z.array(PageSchema).default([]),
  pages: z.array(PageSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type BrandOSDocument = z.infer<typeof BrandOSDocumentSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type SlotRef = z.infer<typeof SlotRefSchema>;
export type ResolvedValue = z.infer<typeof ResolvedValueSchema>;
```

2. Create `src/features/editor/adapter/EditorAdapter.ts` (interface only — no implementation yet):

```ts
import type { BrandOSDocument, Layer } from '@/features/editor/schema';

export interface SelectionState {
  layerIds: string[];
  pageId: string;
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'svg';
  /** 1 = native, 2 = retina. */
  scale?: number;
  /** undefined = all pages. */
  pageIds?: string[];
  /** 0–1 for jpg. */
  quality?: number;
}

export interface EditorAdapter {
  // Lifecycle
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;

  // Document
  loadDocument(doc: BrandOSDocument): Promise<void>;
  getDocument(): BrandOSDocument;

  // Page navigation
  setActivePage(pageId: string): void;

  // Layer operations
  addLayer(pageId: string, layer: Layer): void;
  updateLayer(pageId: string, layerId: string, patch: Partial<Layer>): void;
  removeLayer(pageId: string, layerId: string): void;
  reorderLayer(pageId: string, layerId: string, newIndex: number): void;

  // Selection
  getSelection(): SelectionState;
  setSelection(layerIds: string[]): void;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // Export
  exportAs(options: ExportOptions): Promise<Blob>;

  // Events
  on(event: 'change', handler: (doc: BrandOSDocument) => void): () => void;
  on(event: 'selection', handler: (sel: SelectionState) => void): () => void;
}
```

3. Stub `FabricAdapter` at `src/features/editor/adapter/FabricAdapter.ts`. Every method throws `new Error('NotImplemented')`. This compiles, lets us add tests against the interface in Phase 1, and asserts the import boundary now (so the ESLint rule below can be authored against a real file).

4. **Lint guard.** Add an ESLint `no-restricted-imports` rule (or a `forbid-fabric-outside-adapter` custom rule) to reject any `from 'fabric'` import outside `src/features/editor/adapter/`. Wire it into the existing `eslint.config.js`.

5. **Fixture.** Commit a hand-written sample `BrandOSDocument` JSON at `src/features/editor/schema/__fixtures__/social-post.sample.json`. Round-trip it through `BrandOSDocumentSchema.parse(...)` in a Vitest test.

### Acceptance criteria for Phase 0

- ✅ `npm run typecheck` passes.
- ✅ `npm run lint` passes, AND a deliberate `import { Canvas } from 'fabric'` in any non-adapter file fails lint.
- ✅ `npm run test` runs the schema round-trip and passes.
- ✅ `BrandOSDocumentSchema.parse(socialPostFixture)` returns a valid object.

**Stop. Show me the schema files, the adapter interface, the lint guard, and the fixture test. Wait for review before Phase 1.**

---

## PHASE 1 — Fabric Adapter (Single Page, Core Layers)

**Goal:** A working canvas that renders a `BrandOSDocument` and edits it in place. No multi-page yet. No brand engine. No AI. Reuse the existing `EditorChrome` + `useAutoSave`.

### Tasks

1. Implement `FabricAdapter` against the Phase 0 interface. Fabric.js v6, named imports only.

2. **Layer mapping** (Document Schema ↔ Fabric):
   - `TextLayer` → `Textbox` (NOT `IText` — Textbox supports width-based wrapping). Honor `direction` (`'rtl'` sets `direction: 'rtl'` on the Fabric object).
   - `ShapeLayer` rectangle → `Rect`, ellipse → `Ellipse`, line → `Line`. Polygon via `Polygon`.
   - `ImageLayer` → `FabricImage` via `await FabricImage.fromURL(src, { crossOrigin: 'anonymous' })`. If `src` is `{ assetId }`, resolve to a url through the brand engine (Phase 3) — for now, treat as an external URL stub.
   - `SvgLayer` → `await loadSVGFromString(svgString)` → group results.
   - `LogoLayer` → resolve to an `ImageLayer` via the brand engine (Phase 3). For now, render a placeholder rectangle with the layer name.
   - `GroupLayer` → `Group`.

3. Every Fabric object stores its document layer id on a custom property: `(fabricObj as unknown as { brandosId?: string }).brandosId = layer.id`. Use this to map canvas events back to layer updates. (Justify the cast in a one-line comment — Fabric's types do not allow arbitrary props.)

4. **Custom undo/redo.** Fabric does not ship one. Implement a snapshot ring buffer of `BrandOSDocument` (max 50 entries). Snapshot **after** every committed mutation, debounced 300ms for continuous mutations (drag/resize). Expose `canUndo()` / `canRedo()` for UI affordances.

5. **Snap guides.** Show alignment lines when an object's edge or center aligns with another object's edge or center within `SNAP_THRESHOLD_PX = 5`. Use Fabric's `object:moving` event. No magic numbers — name everything.

6. **Selection sync.** When the user clicks an object on canvas, fire the `selection` event. When external code calls `setSelection`, programmatically activate the corresponding Fabric objects. The `LayersPanel` and the canvas share one selection model.

7. **Editor shell.** Create the unified `<Editor>` at `src/features/editor/components/Editor.tsx`:
   - Wraps `EditorChrome` (from `@/features/editor/core`) for the topbar — back button, breadcrumb, title, save indicator, actions slot. Topbar height MUST be `h-12` (page-shell rule §4).
   - Uses `useAutoSave({ value: doc, save: persistDoc, debounceMs: 1200 })` for save semantics. The save indicator wires straight into `EditorChrome`.
   - Mounts the adapter into a canvas container ref.
   - Renders `<Toolbar />`, `<LayersPanel />`, `<PropertiesPanel />` as resizable panels via `react-resizable-panels` (already installed).
   - Reads `ContentTypeConfig` (Phase 2) to decide which panels render.

8. **State.** Use **Zustand** for editor UI state only (active panel, zoom, selected tool). Do **NOT** put document state in Zustand — the document lives inside the adapter and is observed via `adapter.on('change', …)`. New store at `src/features/editor/store/editorUIStore.ts`.

9. **Cmd+S / Ctrl+S** triggers `flush()` on the auto-save hook. **Cmd/Ctrl+Z** and **Cmd/Ctrl+Shift+Z** drive undo/redo. Centralize keybindings in `useEditorKeyboardShortcuts`.

10. **Migration path.** The existing `src/features/editor/components/DesignEditor.tsx` already uses `EditorChrome` + `useAutoSave` (per `editor/core/README.md`). Wire its content onto the new `Editor` shell behind a feature flag in `editorUIStore` (`useNewAdapter: boolean`) so the legacy path keeps working until parity is verified. Then delete the legacy path in a follow-up commit.

### Critical Fabric.js v6 patterns

```ts
// ✅ correct v6
import { Canvas, Rect, Textbox, FabricImage, loadSVGFromString } from 'fabric';

const canvas = new Canvas(canvasEl, {
  width: 1080,
  height: 1080,
  backgroundColor: '#ffffff',
  preserveObjectStacking: true,
});

const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
canvas.add(img);

// ❌ do NOT use v5 patterns
// fabric.Image.fromURL(url, callback)   // wrong: no global, no callbacks
// new fabric.Canvas(...)                 // wrong: use named imports
```

### Acceptance criteria for Phase 1

- ✅ Load a sample document; canvas renders it correctly.
- ✅ Drag, resize, rotate any layer — document updates in memory and `change` fires.
- ✅ Add new text/shape/image via toolbar.
- ✅ Reorder layers in `<LayersPanel>` — canvas reflects the new stack.
- ✅ Lock a layer — cannot be selected or moved.
- ✅ Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z work for undo/redo.
- ✅ Snap guides appear when dragging within `SNAP_THRESHOLD_PX` of another object's edge.
- ✅ Cmd/Ctrl+S flushes save; `EditorChrome`'s save indicator transitions saving → saved.
- ✅ Export PNG produces correct output at 2× scale.
- ✅ Round-trip: load doc → edit → `getDocument()` → load again → identical visual.
- ✅ Demo route: `/b/raqm/design/new?contentType=social-post` opens a blank canvas.
- ✅ `npm run typecheck`, `npm run lint`, `npm run test` all pass.

**Stop. Demo it. Wait for review before Phase 2.**

---

## PHASE 2 — Multi-Page + Master Pages + Content-Type Configs

**Goal:** The editor adapts to social post (single page) vs presentation (multi-page) via config. Master pages work like PowerPoint master slides.

### Tasks

1. Define `ContentTypeConfig` at `src/features/editor/content-types/types.ts`:

```ts
export interface ContentTypeConfig {
  /** stable id, e.g. 'social-post', 'presentation'. */
  id: string;
  label: string;
  /** lucide-react icon name. */
  icon: string;
  pageModel: 'single' | 'multi';
  defaultDimensions: { width: number; height: number };
  dimensionPresets?: Array<{ label: string; width: number; height: number }>;
  panels: {
    layers: boolean;
    properties: boolean;
    pageNavigator: boolean;
    assets: boolean;
    masterPages: boolean;
  };
  exportFormats: Array<'png' | 'jpg' | 'pdf' | 'svg'>;
  defaultExportFormat: 'png' | 'jpg' | 'pdf' | 'svg';
  supportsBrandKit: boolean;
  supportsMasterPages: boolean;
}
```

2. Ship config files in `src/features/editor/content-types/`:
   - `social-post.config.ts` — 1080×1080 (presets: 1080×1350, 1080×1920).
   - `presentation.config.ts` — 1920×1080, multi-page.
   - `business-card.config.ts` — 1050×600 (3.5″×2″ at 300dpi).
   - `brand-guideline-slide.config.ts` — 1920×1080, multi-page.
   - `banner.config.ts` — 1500×500 (web/print presets).
   - `document.config.ts` — A4 multi-page.
   - Export them from `src/features/editor/content-types/index.ts` keyed by `id`.

3. The `<Editor>` reads the config and conditionally renders `<PageNavigator />` (only `pageModel: 'multi'`), `<AssetPanel />`, etc. The launchpad at `/b/:slug/design` consumes the config registry to populate its tiles.

4. **Master pages.** A page can reference a `masterPageId`. When rendering, the master's layers are drawn first as a Fabric `Group` with `selectable: false, evented: false`, locked at `(0,0)`. Editing a master happens in a separate "Edit Master" mode — the chrome's title flips to `Master · <name>` and the topbar gets an "Exit master" action. On exit, all pages referencing that master re-render. Master pages live in `BrandOSDocument.masterPages` (separate from `pages`).

5. **Page navigator UI.** Thumbnail rail (left edge, vertical) of each page. Drag to reorder, click to activate. Right-click menu: "Duplicate," "Delete," "Apply master." Use the existing slide-preview thumbnailing pattern from `src/shared/presentation/v2` (recent commits `9b2b56a`, `2ee0b70` — read for reference, do not import directly).

6. **Social-media direct entry.** Wire `/b/:slug/social-media?platform=instagram&format=post` to open `<Editor>` with `social-post.config` and the matching dimension preset, no chooser modal in between.

### Acceptance criteria for Phase 2

- ✅ Switching `contentType` from `social-post` → `presentation` makes `<PageNavigator>` appear and dimensions change.
- ✅ Add multiple pages, navigate between them, content persists per page.
- ✅ Create a master page with a logo + footer; apply to all pages; logo + footer appear on every page; cannot be edited from main canvas.
- ✅ Edit master → all pages update.
- ✅ Page reorder works; thumbnails update.
- ✅ Export PDF includes all pages in order via `jspdf` (already installed).
- ✅ `/b/:slug/social-media?platform=instagram&format=story` opens directly into a 1080×1920 canvas.

---

## PHASE 3 — Brand Engine + Slot Resolution

**Goal:** A brand kit can be applied to any document, replacing slot references with actual brand values. Locking respected. All visuals route through the canonical helpers.

### Tasks

1. Brand-engine code lives at `src/features/editor/brand/`. Do **NOT** define a new `BrandKit` schema — use the existing `Brand` type from `@/shared/types/brand`. Slot resolution targets:
   - `brand.color.primary`   → `brand.colorSystem?.primary?.hex` (fall back to deprecated `brand.primaryColor`).
   - `brand.color.secondary` → `brand.colorSystem?.secondary?.hex`.
   - `brand.color.accent`    → `brand.colorSystem?.accent?.hex` (or `brand.accentColor`).
   - `brand.color.neutral`   → `brand.neutrals?.[neutralIndex ?? 2]`.
   - `brand.font.heading`    → `brand.typography?.primary?.family` (fall back to `brand.fonts.primary`).
   - `brand.font.body`       → `brand.typography?.secondary?.family ?? brand.typography?.primary?.family`.
   - `brand.logo.*`          → resolve `LogoSystemRefs` slot → `AssetRef` → look up `brand.brandAssets[assetId]` → pick best format (svg > png > webp).
   - `brand.spacing.unit`    → `{ compact: 4, comfortable: 8, spacious: 12 }[brand.uiStyle?.spacing ?? 'comfortable']`.

2. Implement the core function:

```ts
// src/features/editor/brand/applyBrand.ts
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';

export function applyBrandToDocument(
  doc: BrandOSDocument,
  brand: Brand,
  options?: { respectLocks?: boolean; mode?: 'light' | 'dark' },
): BrandOSDocument;
```

It walks every layer recursively, resolves any `SlotRef` against `brand`, and replaces it with a concrete value. Brand-locked layers are forced to brand-resolved values regardless of any local override. Non-brand layers are untouched.

3. **Logo + background contrast — non-negotiable.** When a `LogoLayer` resolves and there is a colored layer or page background behind it, route the variant pick through `pickLogoOnBackground(brand, bgHex)` from `@/shared/brand/logoOnBackground`. If `variant: 'auto'`, that helper chooses; if explicit, validate readability via the same helper and surface a warning in the properties panel when contrast falls below the readability floor (1.8). This is the rule that caught the SKAM red-on-red bug on 2026-04-25 — do not regress it.

4. **Surface tokens — also non-negotiable.** When a layer's `fill` or a page `background` is `brand.color.*` AND the layer's role is a "surface" (page, card, hero, inverted band), prefer `pickSurfaceTokens(buildBrandPalette(brand, mode), kind)` from `@/shared/brand/brandPalette` over a single hex. The `kind` is encoded on the layer via `metadata.surfaceKind` (`'page' | 'card' | 'elevated' | 'subtle' | 'brand' | 'brand-secondary' | 'inverted'`). Apply `applyPaletteToRoot(palette)` to the editor's canvas container so any CSS that reads `--bp-*` works.

5. **Inverse — `convertToTemplate(doc, brand)`.** Replaces concrete values that match brand values with `SlotRef`s, producing a brand-agnostic template. Used by the "Save as template" flow in Phase 4.

6. **Brand picker.** Reuse `BrandChooserDialog` from `@/features/brand/components/BrandChooserDialog` whenever the user picks which brand the editor opens against. Do NOT roll a new chooser. The dialog already supports "Start without a brand" → opens the editor with `brandId: null`.

7. **Brand switcher inside the editor.** The `EditorChrome` actions slot gets a brand switcher that calls `rewriteBrandPath()` from `@/shared/brand/brandPathRewrite` so picking a new brand keeps the user on the same tool/page. Picking a brand calls `adapter.loadDocument(applyBrandToDocument(doc, newBrand))`.

8. **Lockable elements.** The properties panel exposes a "Brand-managed" toggle per layer. When on, the layer's brand-derived properties become read-only and show a small lock badge. Re-applying the brand updates locked layers; non-locked layers are untouched.

9. **Wire into the DI container.** Add `IBrandEngineService` to `src/core/types/services.ts`, register a `BrandEngineService` in `src/core/boot.ts`, and consume it via `useService<IBrandEngineService>(SERVICE_KEYS.BRAND_ENGINE)`.

### Acceptance criteria for Phase 3

- ✅ Load a template with slot refs → apply Raqm → see Raqm's colors/fonts/logos.
- ✅ Apply SKAM to the same template → switches instantly, including its red primary, AND the red-logo-on-red-card bug does not recur (a black mono variant is picked).
- ✅ Apply Vector → switches; if a logo asset is missing, the layer renders the letter mark fallback and a console warning is emitted.
- ✅ Mark a logo layer as brand-locked → user cannot move/resize it from the properties panel; the canvas selection still highlights it.
- ✅ `convertToTemplate(applyBrandToDocument(template, brand), brand)` round-trips to the same template.
- ✅ The brand-engine module has zero imports from `fabric` and zero imports from `@/features/editor/adapter`.
- ✅ Picking a different brand from the topbar switcher keeps the user on `/b/:slug/design/:docId` (path rewrite verified in a unit test).

---

## PHASE 4 — Templates + Template Library

**Goal:** Users can save a design as a template, browse templates by content type and brand, and start a new design from a template.

### Tasks

1. **Template = `BrandOSDocument` + metadata** (`templateName`, `tags`, `thumbnailUrl`, `scope: 'global' | 'brand' | 'workspace'`). Define `ITemplatesService` in `src/core/types/services.ts` and add `SERVICE_KEYS.TEMPLATES`. Ship two implementations:
   - `LocalTemplatesService` (localStorage, dev/guest mode).
   - `SupabaseTemplatesService` (production). The document JSON lives in a `jsonb` column on a new `templates` table with RLS scoped by workspace.
   - `useAuth.reconfigureForAuth(true)` swaps `LocalTemplatesService` → `SupabaseTemplatesService`. Per `CLAUDE.md` ("DI service swaps must fan out to data stores"), call `useTemplatesStore.getState().loadAll()` immediately after each `reconfigureForAuth` call site (initial-session, SIGNED_IN, SIGNED_OUT). Wire it into all three.

2. **Thumbnail generation.** On save, call `adapter.exportAs({ format: 'png', scale: 1, pageIds: [doc.pages[0].id] })` to render the first page, upload via `IStorageService.uploadFile()` to Supabase Storage, store the public URL.

3. **Template browser UI** lives at `/b/:slug/templates` (route already exists per `CLAUDE.md` §UX & IA — Templates tabs: All · Brand Board · Guidelines · Bento · Social · Print · Screen · Utility). Filter by content type, by tag, by scope. Click a card → `applyBrandToDocument(template, brand)` → open `<Editor>` with the result.

4. **Templates from the workspace `/templates` page** force a brand chooser via `BrandChooserDialog` (already implemented behavior — do not bypass). Templates ARE brand-scoped at the editor entry point.

5. **Convert to template** action in the editor's overflow menu. Calls `convertToTemplate(doc, brand)` → opens a "Save template" dialog (name, tags, scope picker). Persists via `ITemplatesService.create(...)`.

### Acceptance criteria for Phase 4

- ✅ Save current design as a template (global, brand, or workspace scope).
- ✅ Browse templates filtered by content type and scope.
- ✅ Open a global template → apply a brand → editor opens with the brand applied.
- ✅ Thumbnails generated and stored in Supabase Storage; public URL displays in the browser grid.
- ✅ Sign-in/out swap reloads templates without requiring a page refresh (the `loadAll()` fan-out works).

---

## PHASE 5 — AI Design Generation v1

**Goal:** User types a prompt, gets a designed `BrandOSDocument` opened in the editor.

### Tasks

1. Define a structured intent schema (Zod) at `src/features/ai-design/schema.ts` — what the LLM is allowed to output:

```ts
import { z } from 'zod';

export const DesignIntentSchema = z.object({
  contentType: z.string(),
  primaryGoal: z.enum(['announce', 'promote', 'inform', 'celebrate', 'invite', 'educate']),
  mood: z.enum(['bold', 'minimal', 'playful', 'elegant', 'serious', 'energetic']),
  copy: z.object({
    headline: z.string(),
    subheadline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional(),
  }),
  hierarchy: z.enum(['headline-dominant', 'image-dominant', 'balanced']),
  preferredLayout: z.enum(['centered', 'split', 'stacked', 'asymmetric']).optional(),
});
export type DesignIntent = z.infer<typeof DesignIntentSchema>;
```

2. **Pipeline** (`src/features/ai-design/generate.ts`):
   ```
   prompt + brandId + contentType
     → Anthropic API (claude-opus-4-7 or claude-sonnet-4-6) with tool-use forcing DesignIntentSchema
     → template selector (filter ITemplatesService by contentType + mood + hierarchy, pick top N)
     → applyBrandToDocument(template, brand)
     → inject copy into named text slots (matched by `layer.name === 'headline' | 'subheadline' | 'cta' | 'body'`)
     → return BrandOSDocument
   ```

3. **Server-side, not browser-side.** The Anthropic call lives in a **Supabase Edge Function** at `supabase/functions/ai-design/index.ts`, invoked via the project's Supabase client. The browser does NOT see `ANTHROPIC_API_KEY`. This closes the security gap documented in `CLAUDE.md` ("VITE_ANTHROPIC_API_KEY is currently inlined into the client bundle … MUST be moved behind a server proxy"). Treat that migration as part of Phase 5 — do not ship AI design with the inlined key.

4. **UI.** "Generate with AI" entry on `/b/:slug/design` (the launchpad has an "AI Design" tile already per `CLAUDE.md`). Modal with prompt input + brand confirmation + content-type picker. On submit: show a loading state, then open the resulting document in the editor.

5. **Rule:** the AI never returns coordinates or canvas commands. It returns `DesignIntent`. The pipeline turns intent into a document via templates. This is non-negotiable — direct coordinate generation produces broken layouts.

6. **Default model selection.** Use `claude-opus-4-7` for first-pass generation, `claude-sonnet-4-6` for follow-up edits and "regenerate variation". Cache structured outputs aggressively (TanStack Query `staleTime: Infinity` keyed by `[prompt, brandId, contentType]` modulo a manual "regenerate" action).

### Acceptance criteria for Phase 5

- ✅ "Create an Instagram post for Raqm announcing a product launch" → produces a coherent, branded `BrandOSDocument` in the editor.
- ✅ Same prompt with brand SKAM → visually different but structurally similar.
- ✅ Same prompt twice with explicit "regenerate" → different template selection (variation works).
- ✅ User can edit the result freely afterward (no read-only mode).
- ✅ The Anthropic API key is **not** present in the production bundle (`grep -r ANTHROPIC dist/` is empty).
- ✅ Rate limiting + structured-error surfaces are in place at the Edge Function.

---

## PHASE 6+ — Polish & Production

Plan only after Phase 5 ships:

- **Real-time collaboration** — Yjs or Liveblocks integration via the adapter's mutation events.
- **Headless rendering service** for high-quality PDF export (Puppeteer or `@napi-rs/canvas`) hosted on a Cloudflare Worker or a dedicated Node service. Coordinate with the off-limits `vectorize` pipeline — don't replace it, complement it.
- **Performance:** layer virtualization for documents with 500+ layers; canvas memoization across pages.
- **Animations / transitions** for presentation mode (cross-fade, slide-from-edge).
- **Print-safe color** (CMYK preview) — only if customers ask.
- **Plugins:** third-party integrations via a typed plugin manifest.
- **Editor unification migration.** Migrate the remaining surfaces in `src/features/editor/core/README.md` §5 (Logo Maker, BrandKit Module Editor, Brand Edit, Guidelines Hub) onto the new schema-first model. `EditorWorkspace` stays frozen.

---

## Coding standards (every phase)

- **Tests.** Vitest + jsdom (matches `src/test/setup.ts`). Every public function in `editor/schema`, `editor/brand`, and `editor/adapter` has unit tests. The adapter has integration tests against a real Fabric canvas in jsdom.
- **Run before claiming done:** `npm run typecheck && npm run lint && npm run test`. UI / canvas changes also need a manual smoke test in the dev server (`npm run dev`, port 8080).
- **Commits.** Conventional commits with scope: `feat(editor): …`, `fix(adapter): …`, `refine(schema): …`. One concept per commit. Push to `dev`.
- **Naming.** Files: kebab-case. Components: PascalCase. Hooks: `useThing`. Types: PascalCase. Zod schemas: `XSchema`. Inferred types: `X` (from `z.infer<typeof XSchema>`).
- **Error handling.** Define a `BrandOSError` discriminated union for known errors (`ValidationError`, `BrandNotFound`, `RenderError`, etc.). Never throw strings. Never swallow errors. Surface to the user via `sonner` `toast.error(...)` or to logs via the typed logger.
- **Comments.** Comment the *why*, not the *what*. The Fabric adapter especially benefits from comments explaining v5→v6 differences and any non-obvious workarounds.
- **Imports.** Always `@/...` alias — never `../../..`. Never `from 'fabric'` outside the adapter.
- **Page-shell rules.** Layouts own padding. Editor topbar = `h-12`. Always use `<PageHeader>` from `@/shared/ui/PageHeader` for page headers. (`CLAUDE.md` §Page-shell rules.)
- **Radix portals.** When styling popover/dialog content, use unscoped selectors and `hsl(var(--muted))` tokens — `[data-cosmos="workspace"]` prefixes do not apply to portaled content. (`CLAUDE.md` §Radix Portal gotcha.)

---

## What "done" looks like

When all six phases are complete, BrandOS has:

- A single editor that handles 6+ content types via config.
- A schema-first document model that the AI, the brand engine, and the editor all share.
- A clean adapter boundary — Fabric is replaceable in roughly two weeks of work.
- A brand engine that turns any template into a fully branded design, with logo-on-bg and surface-token correctness baked in.
- An AI pipeline that produces editable, on-brand designs from natural language, with the API key safely on the server.
- Multi-page documents with master pages.
- High-quality export to PNG, JPG, PDF, SVG.
- A template library with brand-aware filtering, served by the DI service container.
- All wired through `EditorChrome` + `useAutoSave` so every editor surface in BrandOS finally feels like one product.

This is a serious commercial editor. Build it like one.
