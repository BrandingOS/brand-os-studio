# Brand Kit → global Design (Invoice slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Brand Kit hand deliverable editing to the global Design environment, proven end-to-end on Invoice, so every later family costs only registration + configuration + renderer + bindings.

**Architecture:** Four additive changes to the Design side — a `renderer` capability on `ContentTypeConfig`, a split of `EditorAdapter` into `DocumentAdapter` + `LayerEditingAdapter`, an optional typed `body` on `BrandOSDocument`, and a renderer registry replacing one hardcoded constructor. Then a second renderer (`template-instance`) that paints the existing Brand Kit React artwork instead of Fabric layers, reusing the content model, `<Bind>` and the content panel that already exist. Brand Kit gains `Use Template` (deep-copy snapshot) and `Edit Template` (opens the master).

**Tech Stack:** Vite 5 · React 18 · TypeScript 5.8 · Zod · Zustand · Vitest (jsdom + Playwright/Chromium projects) · Fabric.js 6 (untouched, behind the adapter)

**Spec:** `docs/superpowers/specs/2026-08-20-brand-kit-to-global-design-design.md` — read it before starting. This plan argues from it.

## Global Constraints

- **Branch:** work lands on `demo`. Every push to `demo` DEPLOYS to https://demo.brandingos.ai — do not push until the slice is reviewed.
- **Type errors:** `npm run typecheck:ci` is the gate. It fails only on NEW errors (baseline 321). Never add one. Do not fix the baseline as a side quest.
- **`strictNullChecks` and `noImplicitAny` are OFF.** Nullable values will not raise compile errors but still crash at runtime. Guard explicitly.
- **Lint:** `npm run lint` — 0 errors expected (~226 pre-existing warnings are fine).
- **Importing `fabric` outside `src/features/editor/adapter/` is a lint error**, enforced in `eslint.config.js`. Nothing in this plan may import it.
- **`EditorWorkspace` and `src/shared/services/export/vectorize/*` are frozen** (`stable/editable-export-v1`). Do not refactor through them.
- **Tests:** every change lands with the layers that apply — unit (jsdom), adapter integration, browser E2E (`*.browser.test.tsx`). `npx vitest run --project unit` runs the jsdom projects only; the browser project needs `npx playwright install` once per machine.
- **Known-failing on a clean checkout:** `src/features/brand-kit/data/recolorLogo.test.ts` ("keeps a curated brand palette intact"). Pre-existing. Not your regression unless you touched `logoCombosFor`.
- **UI work requires the pre-flight** in `CLAUDE.md` ("UI reuse policy + MANDATORY pre-flight") and ends with the COMPONENT / DS PRE-FLIGHT report. Reuse `@/shared/ds` primitives; never edit generated `tokens.css` / `tokens.ts`.
- **Editor CSS is portaled** — `.bk-editor-*` and `.bk-bind-*` rules are deliberately UNSCOPED (no `[data-workspace]` prefix). Keep it that way.
- **Commit convention:** `feat(scope): …` / `fix(scope): …` / `refactor(scope): …`. Commit at the end of every task.
- **Invariant that must never be broken (spec §7.2):** editing a master template must not alter an existing working Design. `sourceTemplateId` is provenance only; nothing resolves through it at load time.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/features/editor/adapter/DocumentAdapter.ts` | The renderer-agnostic adapter contract |
| `src/features/editor/renderers/types.ts` | `DesignRenderer` trio type |
| `src/features/editor/renderers/index.ts` | Registry: `contentType` → renderer |
| `src/features/editor/renderers/fabric/index.ts` | Fabric renderer registration |
| `src/features/editor/renderers/template-instance/index.ts` | Template-instance registration |
| `src/features/editor/renderers/template-instance/TemplateInstanceAdapter.ts` | Document state, history, export, change events |
| `src/features/editor/renderers/template-instance/TemplateInstanceCanvas.tsx` | Paints the artwork + `BindProvider` |
| `src/features/editor/renderers/template-instance/TemplateInstanceProperties.tsx` | The Design properties panel |
| `src/features/editor/renderers/template-instance/templateArtwork.ts` | The ONLY import seam to Brand Kit artwork |
| `src/features/editor/renderers/template-instance/createDocument.ts` | Builds a template-instance `BrandOSDocument` |
| `src/features/brandkit/content/*` | The content layer, re-homed (moved, not copied) |
| `src/features/brandkit/content/schema.ts` | Zod schemas for the content model |
| `src/features/brand-kit/kit/masterTemplates.ts` | Which Design id is the master for a deliverable+variant |

**Modified**

| File | Change |
|---|---|
| `src/features/editor/content-types/types.ts` | `renderer` field |
| `src/features/editor/content-types/invoice.config.ts` | `renderer: 'template-instance'` |
| `src/features/editor/adapter/EditorAdapter.ts` | Extends `DocumentAdapter`; alias retained |
| `src/features/editor/schema/index.ts` | Optional `body` on `BrandOSDocumentSchema` |
| `src/features/editor/shell/Editor.tsx:294` + canvas region | Registry lookup instead of `new FabricAdapter()` |
| `src/features/brand-kit/BrandKitCosmosPage.tsx` | `Use Template` / `Edit Template`; editor demoted |
| `src/features/editor/shell/v2/panels/TemplatesPanel.tsx` | Filter `isTemplate` out of My Designs |
| `src/features/design-alt/DesignRecentRow.tsx` | Filter `isTemplate` out of Recent |

**Deliberately NOT moved in this slice:** `src/features/brand-kit/renderers/*` (~6,400 LOC). The template-instance renderer reaches it through the single existing dispatcher `renderCosmosTemplate(template, brand, mockBrand?, content?)`, wrapped in `templateArtwork.ts`. Confining the cross-feature import to one file gets the benefit without a 30-file move; promote to a shared domain layer when the second family lands.

---

### Task 1: `renderer` capability on `ContentTypeConfig`

**Files:**
- Modify: `src/features/editor/content-types/types.ts`
- Modify: `src/features/editor/content-types/invoice.config.ts`
- Test: `src/features/editor/content-types/contentTypes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DesignRendererId = 'fabric' | 'template-instance'`; `ContentTypeConfig.renderer: DesignRendererId` (defaulted to `'fabric'` by the schema).

- [ ] **Step 1: Write the failing test**

Append to `src/features/editor/content-types/contentTypes.test.ts`:

```ts
import { ContentTypeConfigSchema } from './types';
import { getContentTypeConfig } from './index';

describe('renderer capability', () => {
  it('defaults to fabric when a config omits it', () => {
    const parsed = ContentTypeConfigSchema.parse({
      id: 'x', label: 'X', icon: 'Square', pageModel: 'single',
      defaultDimensions: { width: 100, height: 100 },
      panels: { layers: true, properties: true, pageNavigator: false, assets: true, masterPages: false },
      exportFormats: ['png'], defaultExportFormat: 'png',
      supportsBrandKit: false, supportsMasterPages: false, resizeStrategy: 'fixed',
    });
    expect(parsed.renderer).toBe('fabric');
  });

  it('rejects an unknown renderer', () => {
    expect(() =>
      ContentTypeConfigSchema.parse({
        id: 'x', label: 'X', icon: 'Square', pageModel: 'single',
        defaultDimensions: { width: 100, height: 100 },
        panels: { layers: true, properties: true, pageNavigator: false, assets: true, masterPages: false },
        exportFormats: ['png'], defaultExportFormat: 'png',
        supportsBrandKit: false, supportsMasterPages: false, resizeStrategy: 'fixed',
        renderer: 'webgl',
      }),
    ).toThrow();
  });

  it('marks invoice as template-instance and leaves every other type on fabric', () => {
    expect(getContentTypeConfig('invoice').renderer).toBe('template-instance');
    expect(getContentTypeConfig('presentation').renderer).toBe('fabric');
    expect(getContentTypeConfig('social-post').renderer).toBe('fabric');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/features/editor/content-types/contentTypes.test.ts`
Expected: FAIL — `parsed.renderer` is `undefined`.

- [ ] **Step 3: Add the field**

Check first that `src/features/editor/content-types/index.ts` re-exports `./types`
(`export * from './types'` or an explicit list). Task 5 imports `DesignRendererId`
from `@/features/editor/content-types`, so add it to the export list if the barrel
is explicit.

In `src/features/editor/content-types/types.ts`, above `ContentTypeConfigSchema`:

```ts
/**
 * Which surface paints and edits documents of this content type.
 *
 *   • 'fabric'            — the layer canvas. Every type that existed
 *                           before renderers were pluggable.
 *   • 'template-instance' — a Brand Kit master design painted by its own
 *                           React renderer, edited through its content
 *                           model. No layers.
 *
 * Adding a renderer means adding a member here and registering the trio
 * in `src/features/editor/renderers/index.ts` — never a change to the
 * Design shell.
 */
export const DesignRendererIdSchema = z.enum(['fabric', 'template-instance']);
export type DesignRendererId = z.infer<typeof DesignRendererIdSchema>;
```

Then add to `ContentTypeConfigSchema`, after `resizeStrategy`:

```ts
  renderer: DesignRendererIdSchema.default('fabric'),
```

In `src/features/editor/content-types/invoice.config.ts`, add to the exported object:

```ts
  renderer: 'template-instance',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/features/editor/content-types/`
Expected: PASS, including the pre-existing suite.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck:ci
git add src/features/editor/content-types/
git commit -m "feat(editor): a content type declares which renderer paints it"
```

---

### Task 2: Split `EditorAdapter` into `DocumentAdapter` + `LayerEditingAdapter`

Zero behaviour change. Pure type surgery, so a reviewer can approve it on its own.

**Files:**
- Create: `src/features/editor/adapter/DocumentAdapter.ts`
- Modify: `src/features/editor/adapter/EditorAdapter.ts`
- Test: `src/features/editor/adapter/adapterContracts.test.ts` (create)

**Interfaces:**
- Consumes: Task 1's nothing.
- Produces:
  - `DocumentAdapter` — `mount(container: HTMLElement): Promise<void>`, `unmount(): void`, `loadDocument(doc: BrandOSDocument): Promise<void>`, `getDocument(): BrandOSDocument`, `replaceDocument(doc: BrandOSDocument): Promise<void>`, `setActivePage(pageId: string): void`, `getActivePageId(): string`, `undo(): void`, `redo(): void`, `canUndo(): boolean`, `canRedo(): boolean`, `batch(label: string, fn: () => void): void`, `setBrand(brand: Brand | undefined): void`, `exportAs(options: ExportOptions): Promise<Blob>`, `on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe`
  - `LayerEditingAdapter extends DocumentAdapter` — every page, master, layer and selection member currently on `EditorAdapter`
  - `EditorAdapter = LayerEditingAdapter` (alias, so no call site changes)

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/adapter/adapterContracts.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest';
import type { DocumentAdapter, LayerEditingAdapter, EditorAdapter } from './EditorAdapter';
import { FabricAdapter } from './FabricAdapter';

describe('adapter contracts', () => {
  it('FabricAdapter still satisfies the full layer-editing contract', () => {
    expectTypeOf<FabricAdapter>().toMatchTypeOf<LayerEditingAdapter>();
  });

  it('EditorAdapter stays an alias for the layer-editing contract', () => {
    expectTypeOf<EditorAdapter>().toEqualTypeOf<LayerEditingAdapter>();
  });

  it('a layer-editing adapter is usable wherever a document adapter is wanted', () => {
    expectTypeOf<LayerEditingAdapter>().toMatchTypeOf<DocumentAdapter>();
  });

  it('the document contract carries no layer vocabulary', () => {
    expectTypeOf<DocumentAdapter>().not.toHaveProperty('addLayer');
    expectTypeOf<DocumentAdapter>().not.toHaveProperty('addPage');
    expectTypeOf<DocumentAdapter>().not.toHaveProperty('getSelection');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/features/editor/adapter/adapterContracts.test.ts`
Expected: FAIL — `DocumentAdapter` and `LayerEditingAdapter` are not exported.

- [ ] **Step 3: Create `DocumentAdapter.ts`**

```ts
// DocumentAdapter — what the Design shell needs from ANY renderer.
//
// Split out of EditorAdapter when the editor gained a second renderer.
// The line it draws: a document has an identity, a body, history, a
// brand and an export; only SOME documents are pages of layers.
//
// Layer editing lives in `LayerEditingAdapter` (same file as before) so
// a layerless renderer does not have to publish two dozen no-op methods
// — which would be the smell that says the abstraction was forced.
//
// `on('selection')` is declared here because the event union is one
// type, but a layerless renderer never emits it.

import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type {
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  Unsubscribe,
} from './EditorAdapter';

export interface DocumentAdapter {
  // Lifecycle
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;

  // Document
  loadDocument(doc: BrandOSDocument): Promise<void>;
  getDocument(): BrandOSDocument;
  replaceDocument(doc: BrandOSDocument): Promise<void>;

  // Page navigation — every document has at least one page by schema.
  setActivePage(pageId: string): void;
  getActivePageId(): string;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  batch(label: string, fn: () => void): void;

  // Brand context
  setBrand(brand: Brand | undefined): void;

  // Export
  exportAs(options: ExportOptions): Promise<Blob>;

  // Events
  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe;
}
```

- [ ] **Step 4: Rewrite `EditorAdapter.ts`'s interface declaration**

Keep every existing type (`SelectionState`, `ExportOptions`, `ApplyLayerPatchAcrossPagesResult`, `EditorEvent`, `EditorEventHandler`, `Unsubscribe`) and every doc comment exactly where it is. Change only the interface declaration and its membership:

- Add at the top, after the existing imports:
  ```ts
  import type { DocumentAdapter } from './DocumentAdapter';
  export type { DocumentAdapter } from './DocumentAdapter';
  ```
- Rename `export interface EditorAdapter {` to `export interface LayerEditingAdapter extends DocumentAdapter {`.
- DELETE from that interface body the members now inherited: `mount`, `unmount`, `loadDocument`, `getDocument`, `replaceDocument` (move its long doc comment across to `DocumentAdapter` too), `setActivePage`, `getActivePageId`, `undo`, `redo`, `canUndo`, `canRedo`, `batch`, `setBrand`, `exportAs`, `on`.
- KEEP: `addPage`, `removePage`, `duplicatePage`, `duplicatePageAsVariant`, `duplicatePageEmpty`, `reorderPage`, `updatePageDimensions`, `addMasterPage`, `removeMasterPage`, `applyMasterToPage`, `enterMasterMode`, `exitMasterMode`, `getEditingMasterId`, `addLayer`, `updateLayer`, `removeLayer`, `reorderLayer`, `applyLayerPatchAcrossPages`, `getSelection`, `setSelection`.
- Append after the interface:
  ```ts
  /**
   * The layer-editing contract, under its original name.
   *
   * Every existing call site imports `EditorAdapter` and means "the
   * Fabric editor's adapter", which is exactly `LayerEditingAdapter`.
   * Keeping the alias makes this split a no-op for all of them.
   */
  export type EditorAdapter = LayerEditingAdapter;
  ```

- [ ] **Step 5: Run the adapter suite to verify it passes**

Run: `npx vitest run --project unit src/features/editor/adapter/`
Expected: PASS — `adapterContracts.test.ts` plus the pre-existing `FabricAdapter.test.ts`, `layerMapping.test.ts`, `duplicatePage.adapter.test.ts`, `snapGuides.test.ts`.

- [ ] **Step 6: Prove no call site broke**

Run: `npm run typecheck:ci && npm run lint`
Expected: no NEW type errors; 0 lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/editor/adapter/
git commit -m "refactor(editor): separate what every document needs from what layers need"
```

---

### Task 3: Re-home the content layer to `features/brandkit/content/`

A mechanical move. `features/brandkit/` (no dash) is the established shared domain layer for code both UI shells depend on; the Design editor must not import a Brand Kit internal.

**Files:**
- Move: `src/features/brand-kit/content/*` → `src/features/brandkit/content/*` (git mv, all 7 files including `content.test.ts`)
- Modify: every importer (below)
- Test: `src/features/brandkit/content/content.test.ts` (moves with it, unchanged)

**Interfaces:**
- Consumes: nothing.
- Produces: the same public surface at a new path — `@/features/brandkit/content` exporting `ContentKind`, `DeliverableContent`, `PersonContent`, `LetterContent`, `InvoiceContent`, `InvoiceLineItem`, `contentKindForTemplateType`, `defaultContentFor`, `hydrateContent`, `nextLineItemId`, `isPerson`, `isLetter`, `isInvoice`, `getStringAtPath`, `setAtPath`, `invoiceTotals`, `formatMoney`, `fieldGroupsFor`, `findFieldForPath`, `FieldSpec`, `FieldGroup`, `Bind`, `BindProvider`, `useBindContext`, `BindFit`, `BindContextValue`.

- [ ] **Step 1: Find every importer before moving**

Run: `grep -rn "brand-kit/content\|from '\.\./content'\|from '\.\./\.\./content'" src/ | grep -v node_modules`
Expected: importers in `components/BrandKitCardEditor.tsx`, `components/quick-edit/ContentPanel.tsx`, `renderers/index.tsx`, `renderers/BusinessCardsExtended.tsx`, `renderers/BusinessCardsExtended2.tsx`, `renderers/InvoicesExtended.tsx`, `renderers/LetterheadExtended.tsx`, `renderers/LetterheadExtended2.tsx`, `renderers/WebEmailSignatureExtended.tsx`, `__tests__/quickEdit.browser.test.tsx`. Write the list down — Step 3 updates exactly these.

- [ ] **Step 2: Move the folder**

```bash
git mv src/features/brand-kit/content src/features/brandkit/content
```

- [ ] **Step 3: Update every importer to the absolute path**

Replace relative imports with `@/features/brandkit/content` in each file from Step 1. Example, in `src/features/brand-kit/renderers/InvoicesExtended.tsx`:

```ts
// before
import { Bind, type InvoiceContent } from '../content';
// after
import { Bind, type InvoiceContent } from '@/features/brandkit/content';
```

- [ ] **Step 4: Run the content suite and the brand-kit suites**

Run: `npx vitest run --project unit src/features/brandkit/content/ src/features/brand-kit/`
Expected: PASS. (`recolorLogo.test.ts` fails on a clean checkout — see Global Constraints. Everything else must pass.)

- [ ] **Step 5: Prove nothing still points at the old path**

Run: `grep -rn "brand-kit/content" src/ | grep -v node_modules`
Expected: no output.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add -A src/features/brandkit/content src/features/brand-kit
git commit -m "refactor(brandkit): the content model is shared domain, not a Brand Kit internal"
```

---

### Task 4: Zod content schemas and the optional document `body`

**Files:**
- Create: `src/features/brandkit/content/schema.ts`
- Modify: `src/features/brandkit/content/index.ts` (export it)
- Modify: `src/features/editor/schema/index.ts`
- Test: `src/features/brandkit/content/schema.test.ts` (create)
- Test: `src/features/editor/schema/schema.test.ts` (append)

**Interfaces:**
- Consumes: Task 3's `@/features/brandkit/content` types.
- Produces:
  - `DeliverableContentSchema` — zod discriminated union on `kind`, parsing to `DeliverableContent`
  - `TemplateDesignPicksSchema` / `TemplateDesignPicks` = `{ primaryColor?: string; secondaryColor?: string; logoId?: string; logoColor?: string; fontId?: string; showLogo?: boolean }`
  - `DesignBodySchema` — discriminated union on `kind`, currently one member `'template-instance'` with `{ templateId: string; content: DeliverableContent; design: TemplateDesignPicks }`
  - `BrandOSDocument.body?: DesignBody`

- [ ] **Step 1: Write the failing content-schema test**

Create `src/features/brandkit/content/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DeliverableContentSchema } from './schema';
import { defaultContentFor } from './kinds';

const brand = { name: 'SKAM' };

describe('DeliverableContentSchema', () => {
  it.each(['person', 'letter', 'invoice'] as const)('round-trips a default %s', (kind) => {
    const value = defaultContentFor(kind, brand);
    expect(DeliverableContentSchema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });

  it('keeps line items as structured rows, not a string', () => {
    const parsed = DeliverableContentSchema.parse(defaultContentFor('invoice', brand));
    if (parsed.kind !== 'invoice') throw new Error('expected an invoice');
    expect(parsed.lineItems).toHaveLength(4);
    expect(parsed.lineItems[0]).toMatchObject({ id: 'li-1', qty: 1 });
    expect(typeof parsed.lineItems[0].unitPrice).toBe('number');
  });

  it('rejects a kind it does not know', () => {
    expect(() => DeliverableContentSchema.parse({ kind: 'spaceship' })).toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/brandkit/content/schema.test.ts`
Expected: FAIL — `./schema` does not exist.

- [ ] **Step 3: Write `schema.ts`**

```ts
/**
 * Zod mirrors of the content kinds.
 *
 * The TS types in `kinds.ts` stay the source of truth for authoring; these
 * exist because content now crosses a STORAGE boundary — it is the body of
 * a saved Design — and anything read back from storage must be validated
 * rather than trusted.
 *
 * `hydrateContent` is still what fills a partial value out to a complete
 * one. These schemas answer a narrower question: is this the right shape
 * at all.
 */
import { z } from 'zod';

export const PersonContentSchema = z.object({
  fullName: z.string(),
  jobTitle: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
});

export const LetterContentSchema = z.object({
  senderName: z.string(),
  senderAddress: z.string(),
  website: z.string(),
  phone: z.string(),
  date: z.string(),
  recipient: z.string(),
  subject: z.string(),
  body: z.string(),
});

export const InvoiceLineItemSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
});

export const InvoiceContentSchema = z.object({
  issuerName: z.string(),
  issuerAddress: z.string(),
  clientName: z.string(),
  clientAddress: z.string(),
  number: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string(),
  lineItems: z.array(InvoiceLineItemSchema),
  discountRate: z.number(),
  taxRate: z.number(),
  notes: z.string(),
});

export const DeliverableContentSchema = z.discriminatedUnion('kind', [
  PersonContentSchema.extend({ kind: z.literal('person') }),
  LetterContentSchema.extend({ kind: z.literal('letter') }),
  InvoiceContentSchema.extend({ kind: z.literal('invoice') }),
]);

/**
 * The choices that are not content: which brand colours, which logo,
 * which typeface. Every field optional — an unanswered pick means "use
 * the brand's default", which is what a freshly instantiated template
 * wants.
 */
export const TemplateDesignPicksSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoId: z.string().optional(),
  logoColor: z.string().optional(),
  fontId: z.string().optional(),
  showLogo: z.boolean().optional(),
});
export type TemplateDesignPicks = z.infer<typeof TemplateDesignPicksSchema>;
```

Add to `src/features/brandkit/content/index.ts`:

```ts
export * from './schema';
```

- [ ] **Step 4: Run the content-schema test to verify it passes**

Run: `npx vitest run --project unit src/features/brandkit/content/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing document-body test**

Append to `src/features/editor/schema/schema.test.ts`:

```ts
import { BrandOSDocumentSchema } from './index';
import { defaultContentFor } from '@/features/brandkit/content';

const page = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Page 1',
  width: 1240,
  height: 1754,
  background: '#ffffff',
  masterPageId: null,
  layers: [],
};

const base = {
  schemaVersion: 1 as const,
  id: '22222222-2222-4222-8222-222222222222',
  contentType: 'invoice',
  brandId: 'skam',
  masterPages: [],
  pages: [page],
  metadata: {},
};

describe('template-instance document body', () => {
  it('parses a document carrying a template-instance body', () => {
    const doc = BrandOSDocumentSchema.parse({
      ...base,
      body: {
        kind: 'template-instance',
        templateId: 'invoices-ext-4',
        content: defaultContentFor('invoice', { name: 'SKAM' }),
        design: { primaryColor: '#E5322D' },
      },
    });
    expect(doc.body?.kind).toBe('template-instance');
    if (doc.body?.kind !== 'template-instance') throw new Error('narrowing failed');
    expect(doc.body.templateId).toBe('invoices-ext-4');
    expect(doc.body.content.kind).toBe('invoice');
  });

  it('leaves a layer document unchanged — body is absent, not null', () => {
    const doc = BrandOSDocumentSchema.parse(base);
    expect(doc.body).toBeUndefined();
    expect('body' in JSON.parse(JSON.stringify(doc))).toBe(false);
  });

  it('rejects a body whose content does not match the union', () => {
    expect(() =>
      BrandOSDocumentSchema.parse({
        ...base,
        body: { kind: 'template-instance', templateId: 'x', content: { kind: 'nope' }, design: {} },
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/editor/schema/schema.test.ts`
Expected: FAIL — `body` is stripped, so `doc.body` is `undefined` in the first test.

- [ ] **Step 7: Add `body` to the document schema**

In `src/features/editor/schema/index.ts`, above `BrandOSDocumentSchema`.

**Import the LEAF module, not the barrel.** `@/features/brandkit/content`
re-exports `Bind.tsx`, so importing the barrel here would pull React and JSX
into the document schema's module graph — a schema that is parsed in plain
node contexts and by every test that touches a document.

```ts
import {
  DeliverableContentSchema,
  TemplateDesignPicksSchema,
} from '@/features/brandkit/content/schema';

/**
 * The document's payload, for renderers whose documents are not pages of
 * layers.
 *
 * `pages` is deliberately NOT relaxed. A template-instance carries one
 * page with zero layers, and that page still earns its place: the shell
 * reads its width/height for zoom-to-fit, thumbnails and export sizing.
 * Keeping `pages.min(1)` satisfiable is what makes this field purely
 * additive.
 *
 * A discriminated union rather than a loose record, so adding a second
 * layerless renderer later is a member here — and every existing reader
 * keeps narrowing correctly.
 */
export const DesignBodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('template-instance'),
    /** The Brand Kit design that paints this document. */
    templateId: z.string().min(1),
    content: DeliverableContentSchema,
    design: TemplateDesignPicksSchema,
  }),
]);
export type DesignBody = z.infer<typeof DesignBodySchema>;
```

Then add to `BrandOSDocumentSchema`, after `sourceDesignId`:

```ts
  /**
   * Payload for layerless renderers. Absent on every Fabric document —
   * they serialize exactly as they did before this field existed.
   */
  body: DesignBodySchema.optional(),
```

- [ ] **Step 8: Run both suites to verify they pass**

Run: `npx vitest run --project unit src/features/editor/schema/ src/features/brandkit/content/`
Expected: PASS.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/brandkit/content src/features/editor/schema
git commit -m "feat(editor): a document may carry a body instead of layers"
```

---

### Task 5: Renderer registry, with Fabric as the only member

No user-visible change. `Editor.tsx` stops naming `FabricAdapter` and asks the registry instead.

**Files:**
- Create: `src/features/editor/renderers/types.ts`
- Create: `src/features/editor/renderers/index.ts`
- Create: `src/features/editor/renderers/fabric/index.ts`
- Modify: `src/features/editor/shell/Editor.tsx` (line 24 import, line 294 construction, canvas region ~792)
- Test: `src/features/editor/renderers/registry.test.ts` (create)

**Interfaces:**
- Consumes: Task 1's `DesignRendererId`; Task 2's `DocumentAdapter`.
- Produces:
  - `type DesignCanvasProps = { adapter: DocumentAdapter; initialDocument: BrandOSDocument }`
  - `type DesignPropertiesProps = { adapter: DocumentAdapter; brand?: Brand }`
  - `type DesignRenderer = { id: DesignRendererId; createAdapter(): DocumentAdapter; Canvas: ComponentType<DesignCanvasProps>; Properties: ComponentType<DesignPropertiesProps> | null; supportsLayerEditing: boolean }`
  - `getDesignRenderer(contentType: string): DesignRenderer`

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/renderers/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getDesignRenderer } from './index';

describe('design renderer registry', () => {
  it('resolves a layer content type to the fabric renderer', () => {
    const r = getDesignRenderer('presentation');
    expect(r.id).toBe('fabric');
    expect(r.supportsLayerEditing).toBe(true);
  });

  it('falls back to fabric for an unknown content type rather than throwing', () => {
    expect(getDesignRenderer('a-type-nobody-registered').id).toBe('fabric');
  });

  it('builds a working adapter', () => {
    const adapter = getDesignRenderer('presentation').createAdapter();
    expect(typeof adapter.loadDocument).toBe('function');
    expect(typeof adapter.exportAs).toBe('function');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/editor/renderers/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `types.ts`**

```ts
// What a renderer must supply for the Design shell to open a document.
//
// The shell owns the chrome — top bar, autosave, save/rename/export/
// duplicate, brand context, the app rail and panel frames, zoom. A
// renderer owns the canvas surface and the properties body, and says
// whether layer-editing affordances apply at all.
//
// Adding a renderer must never require a change to the shell. If it
// does, this type is missing something — extend it here rather than
// branching inside Editor.tsx.

import type { ComponentType } from 'react';
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { DesignRendererId } from '@/features/editor/content-types';
import type { Brand } from '@/shared/types/brand';

export type DesignCanvasProps = {
  adapter: DocumentAdapter;
  initialDocument: BrandOSDocument;
};

export type DesignPropertiesProps = {
  adapter: DocumentAdapter;
  brand?: Brand;
};

export type DesignRenderer = {
  id: DesignRendererId;
  createAdapter(): DocumentAdapter;
  Canvas: ComponentType<DesignCanvasProps>;
  /** null when the renderer has no properties body of its own — Fabric
   *  uses the floating toolbar over the selected layer instead. */
  Properties: ComponentType<DesignPropertiesProps> | null;
  /** Drives the shell's layer affordances (Insert, floating toolbar,
   *  page navigator add/remove). False for layerless renderers. */
  supportsLayerEditing: boolean;
};
```

- [ ] **Step 4: Write `fabric/index.ts`**

```ts
import { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import { EditorCanvasMount } from '@/features/editor/shell/EditorCanvasMount';
import type { DesignRenderer } from '../types';

export const fabricRenderer: DesignRenderer = {
  id: 'fabric',
  createAdapter: () => new FabricAdapter(),
  Canvas: EditorCanvasMount,
  // Fabric's properties live in the floating toolbar over the selected
  // layer, not in a panel — see EditorFloatingToolbar.
  Properties: null,
  supportsLayerEditing: true,
};
```

- [ ] **Step 5: Write `index.ts`**

```ts
import { getContentTypeConfig } from '@/features/editor/content-types';
import { fabricRenderer } from './fabric';
import type { DesignRenderer } from './types';

export type {
  DesignRenderer,
  DesignCanvasProps,
  DesignPropertiesProps,
} from './types';

const RENDERERS: Record<string, DesignRenderer> = {
  fabric: fabricRenderer,
};

/**
 * The renderer for a content type.
 *
 * Falls back to Fabric for a type nobody registered rather than throwing:
 * an unknown content type is a document we should still try to open, and
 * every type that predates pluggable renderers is a Fabric document.
 */
export function getDesignRenderer(contentType: string): DesignRenderer {
  const config = getContentTypeConfig(contentType);
  return RENDERERS[config?.renderer ?? 'fabric'] ?? fabricRenderer;
}

/** Registration point. Called once per renderer module at import time. */
export function registerDesignRenderer(renderer: DesignRenderer): void {
  RENDERERS[renderer.id] = renderer;
}
```

- [ ] **Step 6: Run the registry test to verify it passes**

Run: `npx vitest run --project unit src/features/editor/renderers/`
Expected: PASS. If `getContentTypeConfig` throws on an unknown id rather than returning undefined, wrap the call in a try/catch inside `getDesignRenderer` and return `fabricRenderer` — the fallback test pins the behaviour either way.

- [ ] **Step 7: Point `Editor.tsx` at the registry**

In `src/features/editor/shell/Editor.tsx`:

- Delete the `FabricAdapter` import (line 24) and the `EditorCanvasMount` import (line 32).
- Add:
  ```ts
  import { getDesignRenderer } from '@/features/editor/renderers';
  ```
- Replace line 294:
  ```ts
  // before
  const adapter = useMemo<EditorAdapter>(() => new FabricAdapter(), []);
  // after
  const renderer = useMemo(
    () => getDesignRenderer(initialDocument.contentType),
    [initialDocument.contentType],
  );
  const adapter = useMemo(() => renderer.createAdapter(), [renderer]);
  ```
- In the canvas region (~line 792) replace the `<EditorCanvasMount …/>` element with:
  ```tsx
  <renderer.Canvas adapter={adapter} initialDocument={initialDocument} />
  ```

Everything downstream that needs layer methods (`EditorFloatingToolbar`, page navigator handlers, `handleLayerUpdate`) keeps compiling because Fabric is still the only registered renderer and `adapter` is still typed through it. Where TypeScript now complains that `DocumentAdapter` lacks a layer method, narrow at the use site:

```ts
const layerAdapter = renderer.supportsLayerEditing
  ? (adapter as LayerEditingAdapter)
  : null;
```

and guard the layer-only JSX with `layerAdapter && …`. Do NOT widen `DocumentAdapter` to make the error go away — that would undo Task 2.

- [ ] **Step 8: Run the editor suites to prove no behaviour changed**

Run: `npx vitest run --project unit src/features/editor/`
Then: `npx vitest run --project browser src/features/editor/shell/`
Expected: PASS, including `Editor.browser.test.tsx`, `Phase2.browser.test.tsx` and `v2.test.tsx`, with no screenshot diffs — this task is defined as behaviour-neutral.

- [ ] **Step 9: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/editor/renderers src/features/editor/shell/Editor.tsx
git commit -m "refactor(editor): the shell asks the registry which surface opens a document"
```

---

### Task 6: `TemplateInstanceAdapter`

**Files:**
- Create: `src/features/editor/renderers/template-instance/TemplateInstanceAdapter.ts`
- Test: `src/features/editor/renderers/template-instance/TemplateInstanceAdapter.test.ts` (create)

**Interfaces:**
- Consumes: Task 2's `DocumentAdapter`; Task 4's `DesignBody`.
- Produces: `class TemplateInstanceAdapter implements DocumentAdapter`, plus the members the canvas and properties panel share:
  - `updateBody(next: DesignBody, label: string): void` — replaces the body, records one history entry, emits `change`
  - `getBody(): DesignBody | undefined`
  - `getSelectedPath(): string | null`
  - `setSelectedPath(path: string | null): void`
  - `onSelectedPathChange(fn: (path: string | null) => void): Unsubscribe`

**Why selection lives on the adapter.** The canvas and the properties panel are
siblings mounted by the shell in different regions — the artwork on the left, the
panel on the right — so neither can own the other's state. The adapter is the one
object both already hold. Without this, clicking `Acme Co.` on the artwork could
not open its control in the panel, and the existing "Selected" group in
`ContentPanel` would be dead code. It is deliberately NOT part of the document:
a selection is not something to save or undo.

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/renderers/template-instance/TemplateInstanceAdapter.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { defaultContentFor } from '@/features/brandkit/content';
import type { BrandOSDocument } from '@/features/editor/schema';

function doc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '22222222-2222-4222-8222-222222222222',
    contentType: 'invoice',
    brandId: 'skam',
    masterPages: [],
    pages: [{
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Page 1', width: 1240, height: 1754,
      background: '#ffffff', masterPageId: null, layers: [],
    }],
    metadata: {},
    body: {
      kind: 'template-instance',
      templateId: 'invoices-ext-4',
      content: defaultContentFor('invoice', { name: 'SKAM' }),
      design: {},
    },
  } as BrandOSDocument;
}

describe('TemplateInstanceAdapter', () => {
  it('holds the loaded document and returns its body', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    expect(a.getBody()?.kind).toBe('template-instance');
    expect(a.getDocument().contentType).toBe('invoice');
  });

  it('emits change when the body is updated', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const onChange = vi.fn();
    a.on('change', onChange);

    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');
    a.updateBody({ ...body, content: { ...body.content, clientName: 'New Client' } as never }, 'Edit client');

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = a.getDocument();
    if (next.body?.kind !== 'template-instance' || next.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(next.body.content.clientName).toBe('New Client');
  });

  it('undoes one body update in one step', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');

    expect(a.canUndo()).toBe(false);
    a.updateBody({ ...body, templateId: 'invoices-ext-8' }, 'Switch design');
    expect(a.canUndo()).toBe(true);

    a.undo();
    const back = a.getBody();
    if (back?.kind !== 'template-instance') throw new Error('narrowing failed');
    expect(back.templateId).toBe('invoices-ext-4');
  });

  it('records one history entry for a batch of updates', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');

    a.batch('Reset', () => {
      a.updateBody({ ...body, templateId: 'invoices-ext-8' }, 'a');
      a.updateBody({ ...body, templateId: 'invoices-ext-3' }, 'b');
    });

    a.undo();
    const back = a.getBody();
    if (back?.kind !== 'template-instance') throw new Error('narrowing failed');
    expect(back.templateId).toBe('invoices-ext-4');
  });

  it('never emits selection — it has no layers', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const onSelection = vi.fn();
    a.on('selection', onSelection);
    const body = a.getBody()!;
    if (body.kind !== 'template-instance') throw new Error('narrowing failed');
    a.updateBody({ ...body, templateId: 'invoices-ext-8' }, 'x');
    expect(onSelection).not.toHaveBeenCalled();
  });

  it('shares the selected content path between the canvas and the panel', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    const seen: Array<string | null> = [];
    a.onSelectedPathChange((p) => seen.push(p));

    expect(a.getSelectedPath()).toBeNull();
    a.setSelectedPath('clientName');
    expect(a.getSelectedPath()).toBe('clientName');
    a.setSelectedPath(null);
    expect(seen).toEqual(['clientName', null]);
  });

  it('does not record a selection in history — it is not a document change', async () => {
    const a = new TemplateInstanceAdapter();
    await a.loadDocument(doc());
    a.setSelectedPath('clientName');
    expect(a.canUndo()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/editor/renderers/template-instance/`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter**

```ts
/**
 * The adapter for documents that are a template plus its content.
 *
 * It is a plain state holder, and that is the point: there is no canvas
 * to command. React paints the artwork; this owns the document, the
 * history and the change events the shell's autosave already listens to.
 *
 * `mount` is a no-op. The shell calls it because a Fabric adapter needs a
 * DOM container to attach a canvas to; this renderer's surface is a React
 * component that subscribes to `on('change')` instead. Rather than making
 * the shell branch on renderer kind, the no-op keeps one lifecycle.
 */
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import type {
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  Unsubscribe,
} from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, DesignBody } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

/** Depth chosen to match FabricAdapter's ring buffer. */
const HISTORY_LIMIT = 50;

export class TemplateInstanceAdapter implements DocumentAdapter {
  private doc: BrandOSDocument | null = null;
  private past: BrandOSDocument[] = [];
  private future: BrandOSDocument[] = [];
  private brand: Brand | undefined;
  private changeHandlers = new Set<(doc: BrandOSDocument) => void>();
  /** Depth of nested `batch` calls; >0 suppresses per-update history. */
  private batchDepth = 0;
  private batchBaseline: BrandOSDocument | null = null;

  async mount(): Promise<void> {}
  unmount(): void {
    this.changeHandlers.clear();
    this.selectionHandlers.clear();
  }

  async loadDocument(doc: BrandOSDocument): Promise<void> {
    this.doc = doc;
    // loadDocument RESETS history, matching the Fabric adapter's contract.
    this.past = [];
    this.future = [];
  }

  getDocument(): BrandOSDocument {
    if (!this.doc) throw new Error('TemplateInstanceAdapter: no document loaded');
    return this.doc;
  }

  async replaceDocument(doc: BrandOSDocument): Promise<void> {
    this.commit(doc);
  }

  getBody(): DesignBody | undefined {
    return this.doc?.body;
  }

  updateBody(next: DesignBody, _label: string): void {
    this.commit({ ...this.getDocument(), body: next });
  }

  // A template instance has exactly one page. Page navigation is
  // satisfied rather than implemented.
  setActivePage(): void {}
  getActivePageId(): string {
    return this.getDocument().pages[0].id;
  }

  undo(): void {
    const previous = this.past.pop();
    if (!previous) return;
    if (this.doc) this.future.push(this.doc);
    this.doc = previous;
    this.emitChange();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    if (this.doc) this.past.push(this.doc);
    this.doc = next;
    this.emitChange();
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }
  canRedo(): boolean {
    return this.future.length > 0;
  }

  batch(_label: string, fn: () => void): void {
    if (this.batchDepth === 0) this.batchBaseline = this.doc;
    this.batchDepth += 1;
    try {
      fn();
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0) {
        // One entry for the whole batch: everything the callback did
        // collapses to a single step back to the baseline.
        if (this.batchBaseline && this.batchBaseline !== this.doc) {
          this.pushHistory(this.batchBaseline);
        }
        this.batchBaseline = null;
        this.emitChange();
      }
    }
  }

  setBrand(brand: Brand | undefined): void {
    this.brand = brand;
  }
  getBrand(): Brand | undefined {
    return this.brand;
  }

  async exportAs(_options: ExportOptions): Promise<Blob> {
    // Rasterisation happens against the LIVE DOM the canvas component
    // rendered — the artwork only exists once React has painted it — so
    // the canvas registers a snapshot function here. Wired in Task 7.
    if (!this.snapshot) {
      throw new Error('TemplateInstanceAdapter: no canvas is mounted to export');
    }
    return this.snapshot();
  }

  /** Set by TemplateInstanceCanvas while it is mounted. */
  snapshot: (() => Promise<Blob>) | null = null;

  /* ── Selection ──────────────────────────────────────────────────
   * Which bound content path is selected on the artwork. It lives here
   * because the canvas and the properties panel are siblings that only
   * share this object — and it is NOT part of the document, so it is
   * never saved and never recorded in history.
   */
  private selectedPath: string | null = null;
  private selectionHandlers = new Set<(path: string | null) => void>();

  getSelectedPath(): string | null {
    return this.selectedPath;
  }

  setSelectedPath(path: string | null): void {
    if (this.selectedPath === path) return;
    this.selectedPath = path;
    for (const handler of this.selectionHandlers) handler(path);
  }

  onSelectedPathChange(fn: (path: string | null) => void): Unsubscribe {
    this.selectionHandlers.add(fn);
    return () => this.selectionHandlers.delete(fn);
  }

  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe {
    // 'selection' is part of the shared event union but a layerless
    // renderer has no layer to select, so it is accepted and never fired.
    if (event !== 'change') return () => {};
    const fn = handler as (doc: BrandOSDocument) => void;
    this.changeHandlers.add(fn);
    return () => this.changeHandlers.delete(fn);
  }

  private commit(next: BrandOSDocument): void {
    const previous = this.doc;
    this.doc = next;
    if (this.batchDepth === 0 && previous) this.pushHistory(previous);
    if (this.batchDepth === 0) this.emitChange();
  }

  private pushHistory(entry: BrandOSDocument): void {
    this.past.push(entry);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    // Any new edit invalidates the redo branch.
    this.future = [];
  }

  private emitChange(): void {
    const doc = this.doc;
    if (!doc) return;
    for (const handler of this.changeHandlers) handler(doc);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/features/editor/renderers/template-instance/`
Expected: PASS, all five cases.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/editor/renderers/template-instance/
git commit -m "feat(editor): an adapter for documents that are a template and its content"
```

---

### Task 7: `TemplateInstanceCanvas` — the artwork as the editing surface

**Files:**
- Create: `src/features/editor/renderers/template-instance/templateArtwork.ts`
- Create: `src/features/editor/renderers/template-instance/TemplateInstanceCanvas.tsx`
- Create: `src/features/editor/renderers/template-instance/index.ts`
- Modify: `src/features/editor/renderers/index.ts` (register it)
- Test: `src/features/editor/renderers/template-instance/templateArtwork.test.ts` (create)

**Interfaces:**
- Consumes: Task 6's `TemplateInstanceAdapter`; Task 4's `DesignBody`.
- Produces:
  - `resolveTemplate(templateId: string): BrandKitTemplate | null`
  - `renderArtwork(template: BrandKitTemplate, brand: Brand, mockBrand: MockBrand, content: DeliverableContent): ReactNode`
  - `templateInstanceRenderer: DesignRenderer`

- [ ] **Step 1: Write the failing test for the artwork seam**

Create `src/features/editor/renderers/template-instance/templateArtwork.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTemplate } from './templateArtwork';

describe('resolveTemplate', () => {
  it('finds an invoice design by id', () => {
    const t = resolveTemplate('invoices-ext-4');
    expect(t?.id).toBe('invoices-ext-4');
    expect(t?.type).toBe('invoices');
  });

  it('returns null for an id nothing defines', () => {
    expect(resolveTemplate('invoices-ext-99999')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/editor/renderers/template-instance/templateArtwork.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `templateArtwork.ts`**

```ts
/**
 * The ONE place the Design editor reaches into Brand Kit's artwork.
 *
 * Those renderers (~6,400 lines of hand-tuned, absolutely-positioned
 * designs) are the reason this renderer exists at all: converting them
 * into Fabric layers would be lossy, enormous, and would throw away the
 * quality that makes them worth keeping.
 *
 * Confining the import to this file means the artwork can move to a
 * shared domain layer later — when a second family proves the need —
 * by editing one module rather than thirty.
 */
import type { ReactNode } from 'react';
import { renderCosmosTemplate } from '@/features/brand-kit/renderers';
import { variantsForCard } from '@/features/brand-kit/data/legacy-mapping';
import { DELIVERABLES } from '@/features/brand-kit/kit/registry';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { DeliverableContent } from '@/features/brandkit/content';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { Brand } from '@/shared/types/brand';

/**
 * A template id back to the design it names.
 *
 * Ids are globally unique across the library (`invoices-ext-4`,
 * `letterhead-ext-69`), so a scan across deliverables is unambiguous.
 * Brand-asset cards are skipped: they need a brand to enumerate and are
 * not deliverables.
 */
export function resolveTemplate(templateId: string): BrandKitTemplate | null {
  for (const deliverable of DELIVERABLES) {
    const variants = variantsForCard(deliverable.sectionKey, deliverable.label);
    const hit = variants.find((t) => t.id === templateId);
    if (hit) return hit;
  }
  return null;
}

export function renderArtwork(
  template: BrandKitTemplate,
  brand: Brand,
  mockBrand: MockBrand,
  content: DeliverableContent,
): ReactNode {
  return renderCosmosTemplate(template, brand, mockBrand, content);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/features/editor/renderers/template-instance/templateArtwork.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `TemplateInstanceCanvas.tsx`**

Reuses `ScalingStage` (`@/shared/brand/ScalingStage`) and `snapshotElementPng` — the same rasterisation Brand Kit's export already uses. Do NOT route export through the frozen `vectorize/*` pipeline.

```tsx
/**
 * The artifact IS the canvas.
 *
 * `<BindProvider>` is what turns the artwork editable: each renderer
 * already declares which content its text is via `<Bind path=… >`, and
 * with a provider above it those regions accept a caret. With no
 * provider — Brand Kit's preview grid, an offscreen export — the very
 * same component renders a plain span. One artwork, two hosts, no fork.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BindProvider, hydrateContent, setAtPath } from '@/features/brandkit/content';
import { ScalingStage } from '@/shared/brand/ScalingStage';
import { snapshotElementPng } from '@/features/brand-kit/data/templateSnapshot';
import { aspectForType } from '@/features/brand-kit/kit/registry';
import { brandToMockBrand } from '@/features/setup/data/mockBrand';
import type { DesignCanvasProps } from '../types';
import type { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { renderArtwork, resolveTemplate } from './templateArtwork';

export function TemplateInstanceCanvas({ adapter, initialDocument }: DesignCanvasProps) {
  const instance = adapter as TemplateInstanceAdapter;
  const hostRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState(initialDocument);
  // Selection is read from the adapter, not held here — the properties
  // panel is a sibling and must see the same answer.
  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    instance.getSelectedPath(),
  );

  useEffect(() => {
    void instance.loadDocument(initialDocument);
    setDoc(initialDocument);
    return instance.on('change', setDoc);
  }, [instance, initialDocument]);

  useEffect(
    () => instance.onSelectedPathChange(setSelectedPath),
    [instance],
  );

  // Export needs the LIVE DOM, which only exists once React has painted.
  useEffect(() => {
    instance.snapshot = async () => {
      const host = hostRef.current;
      if (!host) throw new Error('Nothing to export — the artwork is not mounted');
      const blob = await snapshotElementPng(host, 4);
      if (!blob) throw new Error('Rasterization produced no image');
      return blob;
    };
    return () => {
      instance.snapshot = null;
    };
  }, [instance]);

  const body = doc.body?.kind === 'template-instance' ? doc.body : null;
  const template = useMemo(
    () => (body ? resolveTemplate(body.templateId) : null),
    [body?.templateId],
  );
  const brand = instance.getBrand();
  const mockBrand = useMemo(() => (brand ? brandToMockBrand(brand) : null), [brand]);

  const commitBoundValue = useCallback(
    (path: string, text: string) => {
      const current = instance.getBody();
      if (current?.kind !== 'template-instance') return;
      instance.updateBody(
        { ...current, content: setAtPath(current.content, path, text) },
        `Edit ${path}`,
      );
    },
    [instance],
  );

  if (!body || !template || !mockBrand || !brand) {
    return (
      <div className="ti-canvas-empty" role="status">
        {template ? 'Attach a brand to open this design.' : 'This design is no longer available.'}
      </div>
    );
  }

  // A stored body may predate a field; hydrate before painting so a
  // missing key renders its default rather than a blank.
  const content = hydrateContent(body.content.kind, mockBrand, body.content);

  return (
    <div
      ref={hostRef}
      className="bk-editor-preview-frame ti-canvas"
      onClick={() => instance.setSelectedPath(null)}
    >
      <BindProvider
        value={{
          selectedPath,
          onSelect: (path) => instance.setSelectedPath(path),
          onCommit: commitBoundValue,
        }}
      >
        <ScalingStage aspect={aspectForType(template.type)} fontFamily={null} hideLogo={body.design.showLogo === false}>
          {renderArtwork(template, brand, mockBrand, content)}
        </ScalingStage>
      </BindProvider>
    </div>
  );
}
```

Confirm the exact export names before writing the imports — run
`grep -n "export" src/shared/brand/ScalingStage.tsx src/features/brand-kit/data/templateSnapshot.tsx src/features/setup/data/mockBrand.ts`
and adjust if `snapshotElementPng` or `brandToMockBrand` live elsewhere.

- [ ] **Step 6: Register the renderer**

Create `src/features/editor/renderers/template-instance/index.ts`:

```ts
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceCanvas } from './TemplateInstanceCanvas';
import { TemplateInstanceProperties } from './TemplateInstanceProperties';
import type { DesignRenderer } from '../types';

export const templateInstanceRenderer: DesignRenderer = {
  id: 'template-instance',
  createAdapter: () => new TemplateInstanceAdapter(),
  Canvas: TemplateInstanceCanvas,
  Properties: TemplateInstanceProperties,
  supportsLayerEditing: false,
};
```

In `src/features/editor/renderers/index.ts`, import it and add to `RENDERERS`:

```ts
import { templateInstanceRenderer } from './template-instance';

const RENDERERS: Record<string, DesignRenderer> = {
  fabric: fabricRenderer,
  'template-instance': templateInstanceRenderer,
};
```

`TemplateInstanceProperties` does not exist until Task 8. To keep this task independently green, create it now as a placeholder that renders nothing, and replace it wholesale in Task 8:

```tsx
// src/features/editor/renderers/template-instance/TemplateInstanceProperties.tsx
import type { DesignPropertiesProps } from '../types';
export function TemplateInstanceProperties(_props: DesignPropertiesProps) {
  return null;
}
```

- [ ] **Step 7: Extend the registry test**

Append to `src/features/editor/renderers/registry.test.ts`:

```ts
it('resolves invoice to the template-instance renderer', () => {
  const r = getDesignRenderer('invoice');
  expect(r.id).toBe('template-instance');
  expect(r.supportsLayerEditing).toBe(false);
  expect(r.Properties).not.toBeNull();
});
```

- [ ] **Step 8: Run the suites**

Run: `npx vitest run --project unit src/features/editor/renderers/`
Expected: PASS.

- [ ] **Step 9: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/editor/renderers/
git commit -m "feat(editor): paint a Brand Kit design as a Design canvas"
```

---

### Task 8: `TemplateInstanceProperties` — the contextual panel, as Design's properties body

**Files:**
- Modify: `src/features/editor/renderers/template-instance/TemplateInstanceProperties.tsx` (replace the placeholder)
- Move: `src/features/brand-kit/components/quick-edit/ContentPanel.tsx` → `src/features/brandkit/content/ContentPanel.tsx`
- Modify: `src/features/editor/shell/Editor.tsx` (mount `renderer.Properties` in the secondary panel)
- Test: `src/features/editor/renderers/template-instance/properties.browser.test.tsx` (create)

**Interfaces:**
- Consumes: Task 7's `templateInstanceRenderer`; Task 6's `updateBody`/`getBody`.
- Produces: `TemplateInstanceProperties(props: DesignPropertiesProps): JSX.Element`

- [ ] **Step 1: Move the panel to the shared content layer**

```bash
git mv src/features/brand-kit/components/quick-edit/ContentPanel.tsx src/features/brandkit/content/ContentPanel.tsx
```

Update its imports from `'../../content'` to `'./index'`, and export it from `src/features/brandkit/content/index.ts`:

```ts
export { ContentPanel } from './ContentPanel';
```

Update the importer in `src/features/brand-kit/components/BrandKitCardEditor.tsx` (line 27) to `@/features/brandkit/content`. Remove the now-empty `quick-edit/` directory.

- [ ] **Step 2: Write the failing browser test**

Create `src/features/editor/renderers/template-instance/properties.browser.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateInstanceAdapter } from './TemplateInstanceAdapter';
import { TemplateInstanceProperties } from './TemplateInstanceProperties';
import { defaultContentFor } from '@/features/brandkit/content';
import type { BrandOSDocument } from '@/features/editor/schema';

function doc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '22222222-2222-4222-8222-222222222222',
    contentType: 'invoice',
    brandId: 'skam',
    masterPages: [],
    pages: [{
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Page 1', width: 1240, height: 1754,
      background: '#ffffff', masterPageId: null, layers: [],
    }],
    metadata: {},
    body: {
      kind: 'template-instance',
      templateId: 'invoices-ext-4',
      content: defaultContentFor('invoice', { name: 'SKAM' }),
      design: {},
    },
  } as BrandOSDocument;
}

describe('TemplateInstanceProperties', () => {
  let adapter: TemplateInstanceAdapter;

  beforeEach(async () => {
    adapter = new TemplateInstanceAdapter();
    await adapter.loadDocument(doc());
  });

  it('renders the content groups for the document kind', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.getByText('Bill from · Bill to')).toBeTruthy();
    expect(screen.getByText('Line items')).toBeTruthy();
  });

  it('writes an edit back through the adapter', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    const input = screen.getByDisplayValue('Acme Co.') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Northwind Ltd' } });

    const body = adapter.getBody();
    if (body?.kind !== 'template-instance' || body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }
    expect(body.content.clientName).toBe('Northwind Ltd');
  });

  it('shows totals computed from the line items, with no input to type one', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    // 2400 + 3800 + 1200 + 900 = 8300, +5% default tax = 8715.
    // `formatMoney` drops decimals on whole amounts — "$8,715", not
    // "$8,715.00". See compute.ts.
    expect(screen.getByText('$8,715')).toBeTruthy();
  });

  it('opens the control for whatever the artwork selected', () => {
    render(<TemplateInstanceProperties adapter={adapter} />);
    expect(screen.queryByText('Selected')).toBeNull();

    // What clicking `Acme Co.` on the artifact does.
    adapter.setSelectedPath('clientName');
    expect(screen.getByText('Selected')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run --project browser src/features/editor/renderers/template-instance/properties.browser.test.tsx`
Expected: FAIL — the placeholder renders `null`, so no text is found.

- [ ] **Step 4: Implement the panel**

```tsx
/**
 * The Design properties panel for a template instance.
 *
 * This is `ContentPanel` — the schema-driven panel the content layer
 * already owns — given an adapter to write through. Nothing here knows
 * what an invoice is; `fieldGroupsFor(kind)` declares the controls, so a
 * new content kind is a declaration rather than another component.
 */
import { useEffect, useState } from 'react';
import { ContentPanel, defaultContentFor } from '@/features/brandkit/content';
import type { DeliverableContent } from '@/features/brandkit/content';
import type { DesignPropertiesProps } from '../types';
import type { TemplateInstanceAdapter } from './TemplateInstanceAdapter';

export function TemplateInstanceProperties({ adapter, brand }: DesignPropertiesProps) {
  const instance = adapter as TemplateInstanceAdapter;
  const [body, setBody] = useState(() => instance.getBody());
  // The same selection the artwork shows. Clicking a region on the
  // artifact opens its control here; focusing a control here highlights
  // the region there. One value, held by the adapter both share.
  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    instance.getSelectedPath(),
  );

  useEffect(
    () => instance.on('change', (doc) => setBody(doc.body)),
    [instance],
  );
  useEffect(
    () => instance.onSelectedPathChange(setSelectedPath),
    [instance],
  );

  if (body?.kind !== 'template-instance') return null;
  const content = body.content;

  const write = (next: DeliverableContent, label: string) =>
    instance.updateBody({ ...body, content: next }, label);

  return (
    <ContentPanel
      kind={content.kind}
      content={content}
      onChange={(next) => write(next, 'Edit content')}
      selectedPath={selectedPath}
      onSelect={(path) => instance.setSelectedPath(path)}
      onResetContent={() => {
        instance.setSelectedPath(null);
        write(defaultContentFor(content.kind, { name: brand?.name ?? 'Brand' }), 'Reset content');
      }}
    />
  );
}
```

- [ ] **Step 5: Mount it in the shell's secondary panel**

In `src/features/editor/shell/Editor.tsx`, inside the `<EditorSecondaryPanel>` region (~line 695), render the renderer's properties body when it has one. Follow the panel's existing prop shape — read `EditorSecondaryPanel.tsx` first — and add a branch that renders:

```tsx
{renderer.Properties ? <renderer.Properties adapter={adapter} brand={brand} /> : null}
```

For a layerless renderer this panel should be open by default, since it is the only place to edit. Gate the app rail's Insert entry on `renderer.supportsLayerEditing`.

- [ ] **Step 6: Run the browser test to verify it passes**

Run: `npx vitest run --project browser src/features/editor/renderers/template-instance/`
Expected: PASS, all three cases.

- [ ] **Step 7: Run the full editor + brand-kit suites**

Run: `npx vitest run --project unit src/features/editor/ src/features/brand-kit/ src/features/brandkit/`
Expected: PASS (except the known `recolorLogo.test.ts` failure).

- [ ] **Step 8: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add -A src/features/editor src/features/brandkit src/features/brand-kit
git commit -m "feat(editor): the content panel becomes Design's properties body"
```

---

### Task 9: Brand Kit — `Use Template` creates an independent snapshot

**Files:**
- Create: `src/features/editor/renderers/template-instance/createDocument.ts`
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx`
- Test: `src/features/editor/renderers/template-instance/createDocument.test.ts` (create)

**Interfaces:**
- Consumes: Task 4's `DesignBody`; Task 7's `resolveTemplate`.
- Produces:
  - `createTemplateInstanceDocument(args: { designId: string; brandId: string; contentType: string; templateId: string; content: DeliverableContent; design: TemplateDesignPicks; sourceTemplateId?: string }): BrandOSDocument`
  - `instantiateFromMaster(master: BrandOSDocument, designId: string): BrandOSDocument`

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/renderers/template-instance/createDocument.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTemplateInstanceDocument, instantiateFromMaster } from './createDocument';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import { defaultContentFor } from '@/features/brandkit/content';

const args = {
  designId: '22222222-2222-4222-8222-222222222222',
  brandId: 'skam',
  contentType: 'invoice',
  templateId: 'invoices-ext-4',
  content: defaultContentFor('invoice', { name: 'SKAM' }),
  design: {},
};

describe('createTemplateInstanceDocument', () => {
  it('produces a document the schema accepts', () => {
    expect(() => BrandOSDocumentSchema.parse(createTemplateInstanceDocument(args))).not.toThrow();
  });

  it('carries exactly one page with no layers, sized from the content type', () => {
    const doc = createTemplateInstanceDocument(args);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].layers).toEqual([]);
    expect(doc.pages[0].width).toBe(1080);
    expect(doc.pages[0].height).toBe(1920);
  });
});

describe('instantiateFromMaster', () => {
  it('deep-copies the body — later master edits cannot reach the instance', () => {
    const master = createTemplateInstanceDocument(args);
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');

    if (master.body?.kind !== 'template-instance' || instance.body?.kind !== 'template-instance') {
      throw new Error('narrowing failed');
    }
    if (master.body.content.kind !== 'invoice' || instance.body.content.kind !== 'invoice') {
      throw new Error('narrowing failed');
    }

    master.body.content.clientName = 'Changed On The Master';
    master.body.content.lineItems[0].label = 'Changed Too';

    expect(instance.body.content.clientName).toBe('Acme Co.');
    expect(instance.body.content.lineItems[0].label).toBe('Brand Strategy');
  });

  it('records provenance and its own identity', () => {
    const master = createTemplateInstanceDocument(args);
    const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
    expect(instance.id).toBe('33333333-3333-4333-8333-333333333333');
    expect(instance.metadata.sourceTemplateId).toBe(master.id);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/editor/renderers/template-instance/createDocument.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

```ts
/**
 * Building a template-instance document, and instantiating one from a
 * master.
 *
 * The rule this file exists to enforce (spec §7.2): USE TEMPLATE COPIES.
 * `sourceTemplateId` is provenance — which master this came from — and
 * nothing resolves through it at load time. A user's filled-in invoice
 * must not be reshaped because someone tuned the master a month later.
 */
import { getContentTypeConfig } from '@/features/editor/content-types';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { DeliverableContent, TemplateDesignPicks } from '@/features/brandkit/content';

export function createTemplateInstanceDocument(args: {
  designId: string;
  brandId: string;
  contentType: string;
  templateId: string;
  content: DeliverableContent;
  design: TemplateDesignPicks;
  sourceTemplateId?: string;
}): BrandOSDocument {
  const config = getContentTypeConfig(args.contentType);
  const { width, height } = config.defaultDimensions;
  return {
    schemaVersion: 1,
    id: args.designId,
    contentType: args.contentType,
    brandId: args.brandId,
    masterPages: [],
    // One page, no layers. It is not a formality — the shell reads its
    // dimensions for zoom-to-fit, thumbnails and export sizing.
    pages: [
      {
        id: crypto.randomUUID(),
        name: config.label,
        width,
        height,
        background: '#ffffff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: args.sourceTemplateId ? { sourceTemplateId: args.sourceTemplateId } : {},
    body: {
      kind: 'template-instance',
      templateId: args.templateId,
      content: args.content,
      design: args.design,
    },
  } as BrandOSDocument;
}

/**
 * A working Design from a master.
 *
 * `structuredClone` rather than a spread: an invoice's line items are an
 * array of objects, and a shallow copy would leave the instance sharing
 * rows with the master — the exact live-sync this design forbids.
 */
export function instantiateFromMaster(
  master: BrandOSDocument,
  designId: string,
): BrandOSDocument {
  if (master.body?.kind !== 'template-instance') {
    throw new Error('instantiateFromMaster: the master has no template-instance body');
  }
  return {
    ...structuredClone(master),
    id: designId,
    familyId: undefined,
    sourceDesignId: undefined,
    metadata: { ...structuredClone(master.metadata), sourceTemplateId: master.id },
  } as BrandOSDocument;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/features/editor/renderers/template-instance/createDocument.test.ts`
Expected: PASS — the deep-copy test is the one that matters.

- [ ] **Step 5: Add `Use Template` to the Brand Kit variant tile**

In `src/features/brand-kit/BrandKitCosmosPage.tsx`, the variant tile currently opens `BrandKitCardEditor`. Add a `Use Template` action that instead:

```ts
const handleUseTemplate = async (template: BrandKitTemplate, deliverable: DeliverableDef) => {
  const designId = crypto.randomUUID();
  const kind = contentKindForTemplateType(template.type);
  if (!kind) {
    toast.error('This deliverable cannot be used yet');
    return;
  }
  const doc = createTemplateInstanceDocument({
    designId,
    brandId: brand.id,
    contentType: deliverable.contentTypeId,
    templateId: template.id,
    content: defaultContentFor(kind, effectiveBrand),
    design: {},
  });
  await designStorage.saveDesign(brand.id, designId, doc, {
    name: `${deliverable.label} — ${template.name}`,
    contentType: deliverable.contentTypeId,
    isTemplate: false,
    sourceTemplateId: template.id,
  });
  navigate(`/b/${brand.slug}/design/${designId}`);
};
```

`DeliverableDef` has no `contentTypeId` yet. Add it to `src/features/brand-kit/kit/registry.ts` — one optional field on the type, set to `'invoice'` on the Invoice entry only, and treat its absence as "not usable yet" so no other family changes behaviour:

```ts
  /** The Design content type this deliverable instantiates as. Absent
   *  until the family has been promoted to a real Design type. */
  contentTypeId?: string;
```

- [ ] **Step 6: Verify in the running app**

Run `npm run dev`, open `/b/skam/brand-kit` → Invoice → a variant → **Use Template**.
Expected: navigates to `/b/skam/design/<uuid>`, the invoice artwork paints, the properties panel shows Bill from · Bill to, and clicking `Acme Co.` on the artwork puts a caret in it.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/editor/renderers/template-instance src/features/brand-kit
git commit -m "feat(brand-kit): Use Template hands a snapshot to Design"
```

---

### Task 10: Brand Kit — `Edit Template` and lazy master seeding

**Files:**
- Create: `src/features/brand-kit/kit/masterTemplates.ts`
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx`
- Test: `src/features/brand-kit/kit/masterTemplates.test.ts` (create)

**Interfaces:**
- Consumes: Task 9's `createTemplateInstanceDocument`.
- Produces: `ensureMasterDesign(args: { storage: IDesignStorage; brandId: string; contentType: string; templateId: string; label: string; seedContent: DeliverableContent }): Promise<string>` — returns the master's design id, creating it on first call.

- [ ] **Step 1: Write the failing test**

Create `src/features/brand-kit/kit/masterTemplates.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ensureMasterDesign } from './masterTemplates';
import { defaultContentFor } from '@/features/brandkit/content';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

function fakeStorage(existing: DesignSummary[] = []) {
  const saved: Array<{ id: string; meta?: Partial<DesignSummary> }> = [];
  const storage: IDesignStorage = {
    listDesigns: vi.fn(async () => existing),
    saveDesign: vi.fn(async (_b, id, _d, meta) => { saved.push({ id, meta }); }),
    loadDesign: vi.fn(async () => null),
    deleteDesign: vi.fn(async () => {}),
  };
  return { storage, saved };
}

const args = (storage: IDesignStorage) => ({
  storage,
  brandId: 'skam',
  contentType: 'invoice',
  templateId: 'invoices-ext-4',
  label: 'Invoice — Editorial Header',
  seedContent: defaultContentFor('invoice', { name: 'SKAM' }),
});

describe('ensureMasterDesign', () => {
  it('creates a master flagged isTemplate on first use', async () => {
    const { storage, saved } = fakeStorage();
    const id = await ensureMasterDesign(args(storage));
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(id);
    expect(saved[0].meta?.isTemplate).toBe(true);
    expect(saved[0].meta?.sourceTemplateId).toBe('invoices-ext-4');
  });

  it('reuses the existing master instead of seeding a second one', async () => {
    const { storage, saved } = fakeStorage([
      { id: 'master-1', isTemplate: true, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).toBe('master-1');
    expect(saved).toHaveLength(0);
  });

  it('does not mistake a working design for a master', async () => {
    const { storage, saved } = fakeStorage([
      { id: 'instance-1', isTemplate: false, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' },
    ]);
    const id = await ensureMasterDesign(args(storage));
    expect(id).not.toBe('instance-1');
    expect(saved).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/brand-kit/kit/masterTemplates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

```ts
/**
 * Which Design object is the canonical master for a deliverable variant.
 *
 * Masters are seeded LAZILY — on the first Edit Template, never for all
 * deliverables up front. A brand that never tunes its invoice never
 * accumulates a master for it.
 *
 * The master is identified by (contentType, sourceTemplateId, isTemplate)
 * rather than a separate index, so there is one storage model and nothing
 * to keep in sync.
 */
import type { DeliverableContent } from '@/features/brandkit/content';
import { createTemplateInstanceDocument } from '@/features/editor/renderers/template-instance/createDocument';
import type { IDesignStorage } from '@/core/types/services';

export async function ensureMasterDesign(args: {
  storage: IDesignStorage;
  brandId: string;
  contentType: string;
  templateId: string;
  label: string;
  seedContent: DeliverableContent;
}): Promise<string> {
  const existing = await args.storage.listDesigns(args.brandId);
  const master = existing.find(
    (d) =>
      d.isTemplate === true &&
      d.contentType === args.contentType &&
      d.sourceTemplateId === args.templateId,
  );
  if (master) return master.id;

  const designId = crypto.randomUUID();
  const doc = createTemplateInstanceDocument({
    designId,
    brandId: args.brandId,
    contentType: args.contentType,
    templateId: args.templateId,
    content: args.seedContent,
    design: {},
  });
  await args.storage.saveDesign(args.brandId, designId, doc, {
    name: args.label,
    contentType: args.contentType,
    isTemplate: true,
    sourceTemplateId: args.templateId,
  });
  return designId;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/features/brand-kit/kit/masterTemplates.test.ts`
Expected: PASS, all three cases.

- [ ] **Step 5: Wire `Edit Template` on the variant tile**

In `BrandKitCosmosPage.tsx`, beside `Use Template`:

```ts
const handleEditTemplate = async (template: BrandKitTemplate, deliverable: DeliverableDef) => {
  const kind = contentKindForTemplateType(template.type);
  if (!kind || !deliverable.contentTypeId) return;
  const masterId = await ensureMasterDesign({
    storage: designStorage,
    brandId: brand.id,
    contentType: deliverable.contentTypeId,
    templateId: template.id,
    label: `${deliverable.label} — ${template.name}`,
    seedContent: defaultContentFor(kind, effectiveBrand),
  });
  navigate(`/b/${brand.slug}/design/${masterId}`);
};
```

- [ ] **Step 6: Verify in the running app**

Open `/b/skam/brand-kit` → Invoice → a variant → **Edit Template** twice.
Expected: both navigations land on the SAME design id — the second call reuses the seeded master.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/brand-kit
git commit -m "feat(brand-kit): Edit Template opens the canonical master in Design"
```

---

### Task 11: Template Designs stay out of the working-file surfaces

**Files:**
- Modify: `src/features/editor/shell/v2/panels/TemplatesPanel.tsx` (My Designs list)
- Modify: `src/features/design-alt/DesignRecentRow.tsx`
- Modify: `src/features/editor/shell/v2/EditorDuplicateDesignButton.tsx`
- Test: `src/features/brand-kit/kit/masterTemplates.test.ts` (append)
- Test: `src/features/editor/shell/v2/EditorDuplicateDesignButton.test.tsx` (append)

**Interfaces:**
- Consumes: Task 10's master concept.
- Produces: `excludeTemplates(designs: DesignSummary[]): DesignSummary[]` exported from `src/features/brand-kit/kit/masterTemplates.ts`.

- [ ] **Step 1: Write the failing test**

Append to `src/features/brand-kit/kit/masterTemplates.test.ts`:

```ts
import { excludeTemplates } from './masterTemplates';

describe('excludeTemplates', () => {
  it('drops masters and keeps working designs', () => {
    const rows = [
      { id: 'a', isTemplate: true },
      { id: 'b', isTemplate: false },
      { id: 'c' },
    ] as DesignSummary[];
    expect(excludeTemplates(rows).map((r) => r.id)).toEqual(['b', 'c']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/features/brand-kit/kit/masterTemplates.test.ts`
Expected: FAIL — `excludeTemplates` is not exported.

- [ ] **Step 3: Implement and apply it**

Add to `masterTemplates.ts`:

```ts
/**
 * Masters share a store with working files, so every surface built for a
 * user's WORK must filter them out. A master belongs in Brand Kit, not
 * amongst someone's designs.
 *
 * A row with no `isTemplate` is a working design — the flag postdates
 * existing rows and its absence must not hide them.
 */
export function excludeTemplates(designs: DesignSummary[]): DesignSummary[] {
  return designs.filter((d) => d.isTemplate !== true);
}
```

Apply it at both listing call sites — in `TemplatesPanel.tsx`'s My Designs fetch and in `DesignRecentRow.tsx` — wrapping the `listDesigns` result.

- [ ] **Step 4: Make Duplicate on a master produce an instance**

In `EditorDuplicateDesignButton.tsx`, when the loaded document is a master (`isTemplate`), the copy must be a working design, not a second master: pass `isTemplate: false` and `sourceTemplateId: <masterId>` in the save meta, and label the action "Use template" rather than "Duplicate". Append a test asserting the duplicate's meta carries `isTemplate: false`.

- [ ] **Step 5: Protect the master from ordinary deletion**

Wherever design deletion is offered, refuse when `isTemplate` is true unless an explicit confirmation naming the template was accepted — the same rule the Guideline builder follows for brand writes. If no delete affordance reaches masters today (they are now filtered out of both listings), record that in a comment on `excludeTemplates` rather than adding a dialog nothing can reach.

- [ ] **Step 6: Run the suites**

Run: `npx vitest run --project unit src/features/brand-kit/ src/features/editor/shell/v2/`
Expected: PASS.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/brand-kit src/features/editor src/features/design-alt
git commit -m "feat(design): a master template is not a working file"
```

---

### Task 12: Brand Kit's deliverable modal becomes preview + variant switcher

**Files:**
- Modify: `src/features/brand-kit/BrandKitCosmosPage.tsx`
- Modify: `src/features/brand-kit/components/BrandKitCardEditor.tsx`
- Modify: `src/features/brand-kit/__tests__/quickEdit.browser.test.tsx`

**Interfaces:**
- Consumes: Tasks 9 and 10's two actions.
- Produces: no new exports. `BrandKitCardEditor` keeps its brand-asset behaviour and loses deliverable content editing.

- [ ] **Step 1: Establish what must NOT break**

Run: `npx vitest run --project browser src/features/brand-kit/`
Expected: PASS. Note which assertions cover brand-asset editing (icon weight, colour shades, font scale) — those must still pass at the end of this task.

- [ ] **Step 2: Remove deliverable content editing from the modal**

In `BrandKitCardEditor.tsx`:
- Delete the `ContentPanel` branch (~line 1124) and the `content` / `selectedPath` state that only served it, plus `commitBoundValue`.
- Keep the `livePreview` branch, but render it WITHOUT `BindProvider` — no provider means every `<Bind>` is a plain span, which is exactly the preview behaviour wanted here.
- Keep every brand-asset branch untouched: icon weight + colour, colour shades + download, font scale.
- In the footer, replace `Save` for deliverable targets with the two actions; keep `Save` for brand-asset targets, which still persist real brand edits.

- [ ] **Step 3: Add the variant switcher**

Beside the preview, render the deliverable's other variants as tiles (`variantsForCard(sectionKey, label, brand)`), each switching the previewed template. This is Brand Kit's job — choosing which master layout — and it is a preview switch, not an edit.

Run the mandatory UI pre-flight first (`CLAUDE.md`), and reuse `@/shared/ds` primitives. The existing `.bk-variant-tile` markup on the drilldown grid is the pattern to follow — check whether it can be reused before writing new tiles.

- [ ] **Step 4: Re-point the Quick Edit browser test**

`src/features/brand-kit/__tests__/quickEdit.browser.test.tsx` asserts inline editing inside the Brand Kit modal, which no longer exists there. Do NOT delete its assertions — move them to a new
`src/features/editor/renderers/template-instance/canvas.browser.test.tsx`
that mounts `TemplateInstanceCanvas` and makes the same claims about the same artwork: hovering a bound region outlines it, clicking places a caret, committing writes through the adapter, Escape reverts. What remains in the Brand Kit file should assert the opposite for the preview: a bound region there is NOT editable.

- [ ] **Step 5: Run both suites**

Run: `npx vitest run --project browser src/features/brand-kit/ src/features/editor/renderers/`
Expected: PASS — the editing claims now hold in Design, and the non-editing claim holds in Brand Kit.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck:ci && npm run lint
git add src/features/brand-kit src/features/editor
git commit -m "refactor(brand-kit): the kit previews its templates and hands editing to Design"
```

---

### Task 13: End-to-end proof, and the architectural criterion

**Files:**
- Create: `src/features/brand-kit/__tests__/brandKitToDesign.browser.test.tsx`
- Modify: `docs/superpowers/specs/2026-08-20-brand-kit-to-global-design-design.md` (record the outcome)

**Interfaces:**
- Consumes: everything above.
- Produces: no exports.

- [ ] **Step 1: Write the end-to-end browser test**

Create `src/features/brand-kit/__tests__/brandKitToDesign.browser.test.tsx` asserting the whole path, with the design storage stubbed:

The third case needs no component mounting — it is the spec's §7.2 invariant and
is written out in full here because it is the assertion this whole design exists
to guarantee:

```tsx
import { describe, it, expect } from 'vitest';
import { createTemplateInstanceDocument, instantiateFromMaster }
  from '@/features/editor/renderers/template-instance/createDocument';
import { defaultContentFor } from '@/features/brandkit/content';
import { BrandOSDocumentSchema } from '@/features/editor/schema';

it('editing a master leaves an existing instance untouched', () => {
  const master = createTemplateInstanceDocument({
    designId: '22222222-2222-4222-8222-222222222222',
    brandId: 'skam',
    contentType: 'invoice',
    templateId: 'invoices-ext-4',
    content: defaultContentFor('invoice', { name: 'SKAM' }),
    design: {},
  });

  // The user takes a copy and fills in a real client.
  const instance = instantiateFromMaster(master, '33333333-3333-4333-8333-333333333333');
  if (instance.body?.kind !== 'template-instance' || instance.body.content.kind !== 'invoice') {
    throw new Error('narrowing failed');
  }
  instance.body.content.clientName = 'Northwind Ltd';
  instance.body.content.lineItems.push({ id: 'li-5', label: 'Retainer', qty: 3, unitPrice: 500 });

  // A month later the brand tunes the master.
  if (master.body?.kind !== 'template-instance' || master.body.content.kind !== 'invoice') {
    throw new Error('narrowing failed');
  }
  master.body.content.issuerAddress = 'New HQ · Berlin';
  master.body.content.lineItems.length = 0;
  master.body.templateId = 'invoices-ext-8';

  // Round-trip the instance through storage, as a reload would.
  const reloaded = BrandOSDocumentSchema.parse(JSON.parse(JSON.stringify(instance)));
  if (reloaded.body?.kind !== 'template-instance' || reloaded.body.content.kind !== 'invoice') {
    throw new Error('narrowing failed');
  }

  expect(reloaded.body.content.clientName).toBe('Northwind Ltd');
  expect(reloaded.body.content.issuerAddress).toBe('1234 Studio · NY');
  expect(reloaded.body.content.lineItems).toHaveLength(5);
  expect(reloaded.body.templateId).toBe('invoices-ext-4');
});
```

The other two cases mount the Brand Kit page with a stubbed `IDesignStorage` and a
spied `navigate`. Write them against the real components:

- **`Use Template` saves a working design and routes to it** — click Invoice → a
  variant → Use Template. Assert `saveDesign` was called once with meta
  `{ isTemplate: false, contentType: 'invoice', sourceTemplateId: 'invoices-ext-4' }`,
  that the saved document's `body.kind` is `'template-instance'`, and that
  `navigate` was called with `/b/skam/design/${savedId}` using the id from that
  same `saveDesign` call — not a hardcoded string.
- **`Edit Template` routes to the same master twice** — have the stub's
  `listDesigns` return what `saveDesign` recorded. Click Edit Template, then
  again. Assert exactly one `saveDesign` call and two `navigate` calls carrying an
  identical id.

Stub `IDesignStorage` the way `src/test/imageGenerationStubs.ts` stubs the image
services, and follow `src/features/design-alt/__tests__/generationEntryPoints.browser.test.tsx`
for the navigate-assertion pattern.

- [ ] **Step 2: Run it**

Run: `npx vitest run --project browser src/features/brand-kit/__tests__/brandKitToDesign.browser.test.tsx`
Expected: PASS. The third case is the spec's §7.2 invariant — if it fails, stop and fix `instantiateFromMaster` rather than the test.

- [ ] **Step 3: Run the whole gate**

```bash
npm run lint
npm run typecheck:ci
npx vitest run --project unit
npx vitest run --project browser
```
Expected: 0 lint errors; no new type errors; all suites green except the known `recolorLogo.test.ts` failure.

- [ ] **Step 4: Check the architectural criterion honestly**

Write down, without implementing it, exactly what adding **Business Card** would require. It must be only: a `renderer` field on `business-card.config.ts`, `contentTypeId` on its registry entry, and its renderers' existing `<Bind>` calls (already present in `BusinessCardsExtended.tsx` and `BusinessCardsExtended2.tsx`).

If it would ALSO require touching `Editor.tsx`, the adapter split, routing, the document schema, or a second editing surface — the design failed its own test. Say so plainly in the report rather than proceeding to a third family.

- [ ] **Step 5: Record the outcome in the spec and commit**

Append a short "Outcome" section to the spec: what shipped, what the Business Card check found, and any deviation from the plan with its reason.

```bash
git add docs/superpowers/specs src/features/brand-kit/__tests__
git commit -m "test(brand-kit): prove the hand-off, and that a master cannot reshape a working design"
```

---

## Deferred, and deliberately so

Recorded here so a later session reads these as decisions rather than oversights. All are from spec §8.

- The `mailing`, `social`, `deck` and `web` content kinds, and `<Bind>` in ~14 more renderers. Each family arrives when it is promoted to a real Design type.
- Moving `src/features/brand-kit/renderers/*` to a shared domain layer. Confined to `templateArtwork.ts` for now; promote when a second family proves the need.
- "Refresh from template" on an instance. It must be explicit, user-invoked and previewable if it is ever built — never an implicit resolve (spec §7.2).
- Recent Designs surfaced inside Brand Kit.
- Any deletion of Web, Animation, Social, Presentation or Mockup renderers. Hidden is not dead.
