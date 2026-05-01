// Unit tests for Mode 5 — the validation gate that all real modes
// route through. Phase 3.5 commit 3.
//
// Negative-path coverage is explicit per the discipline rule:
// schema-invalid emits, Mode 4 scope violations, brand-rebinding
// attempts, and hallucinated page/layer ids ARE the failure modes
// this layer catches in production. Each one gets a test.

import { describe, expect, it } from 'vitest';
import { validateAICommandResult } from './modeFive';
import type { AICommandContext } from './types';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';

// ─── Fixtures ───────────────────────────────────────────────────────────

const PAGE_ID = '00000000-0000-0000-0000-000000000aa1';
const LAYER_ID_A = '00000000-0000-0000-0000-000000000bb1';
const LAYER_ID_B = '00000000-0000-0000-0000-000000000bb2';
const DOC_ID = '00000000-0000-0000-0000-000000000cc1';

function fixtureBrand(): Brand {
  return {
    id: 'brand-test',
    slug: 'test',
    name: 'Test Brand',
    primaryColor: '#1A1A2E',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fixtureDoc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: DOC_ID,
    contentType: 'social-post',
    brandId: 'brand-test',
    masterPages: [],
    pages: [
      {
        id: PAGE_ID,
        name: 'Page 1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers: [
          {
            id: LAYER_ID_A,
            kind: 'text',
            name: 'A',
            text: 'A',
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            direction: 'ltr',
            color: '#000000',
            transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1,
            visible: true,
            locked: false,
            brandLocked: false,
          },
          {
            id: LAYER_ID_B,
            kind: 'text',
            name: 'B',
            text: 'B',
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            direction: 'ltr',
            color: '#000000',
            transform: { x: 0, y: 100, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1,
            visible: true,
            locked: false,
            brandLocked: false,
          },
        ],
      },
    ],
    metadata: {},
  };
}

function ctx(overrides: Partial<AICommandContext> = {}): AICommandContext {
  return {
    activePageId: PAGE_ID,
    selection: [],
    brand: fixtureBrand(),
    ...overrides,
  };
}

// ─── Guard 1 — top-level schema parse ───────────────────────────────────

describe('Guard 1 — top-level schema validation', () => {
  it('rejects garbage / null / non-JSON shapes', () => {
    for (const garbage of [null, 'a string', 42, [], { random: 'object' }]) {
      const result = validateAICommandResult(garbage, fixtureDoc(), ctx());
      expect(result.kind).toBe('rejected');
      if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
    }
  });

  it('rejects unknown discriminator (kind not in delta|replace|rejected)', () => {
    const result = validateAICommandResult(
      { kind: 'mutate', label: 'AI: x', ops: [], message: 'OK' },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
  });

  it('rejects replace without justification (Q2 enforcement)', () => {
    const result = validateAICommandResult(
      {
        kind: 'replace',
        label: 'AI: redo',
        nextDoc: fixtureDoc(),
        message: 'OK',
        // justification missing
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
  });
});

// ─── Pass-through — rejected from the AI ────────────────────────────────

describe('Pass-through — AI-emitted rejection', () => {
  it('returns a valid AI rejection unchanged', () => {
    const result = validateAICommandResult(
      {
        kind: 'rejected',
        reason: 'no_selection',
        message: 'Pick something first',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toBe('no_selection');
      expect(result.message).toBe('Pick something first');
    }
  });
});

// ─── Guard 2 — per-op layer/page schema validation ──────────────────────

describe('Guard 2 — per-op validation for add-layer / add-page', () => {
  it('accepts add-layer with layer.id OMITTED — assigns a UUID', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: add text',
        ops: [
          {
            op: 'add-layer',
            pageId: PAGE_ID,
            layer: {
              kind: 'text',
              name: 'New text',
              text: 'Hi',
              fontFamily: 'Inter',
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: 0,
              textAlign: 'left',
              direction: 'ltr',
              color: '#000000',
              transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1,
              visible: true,
              locked: false,
              brandLocked: false,
            },
          },
        ],
        message: 'Added text.',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('delta');
    if (result.kind === 'delta') {
      const op = result.ops[0];
      expect(op.op).toBe('add-layer');
      if (op.op === 'add-layer') {
        expect(op.layer.id).toMatch(/^[0-9a-f-]{36}$/i); // assigned UUID
      }
    }
  });

  it('rejects add-layer that produces a schema-invalid layer (e.g. unknown kind)', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: weird',
        ops: [
          {
            op: 'add-layer',
            pageId: PAGE_ID,
            layer: { kind: 'rectangle' /* not a real kind */, name: 'Bad' },
          },
        ],
        message: 'OK',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
  });
});

// ─── Guard 3 — Mode 4 scope clamp ───────────────────────────────────────

describe('Guard 3 — Mode 4 scope clamp', () => {
  it('rejects update-layer touching a layer outside the selection', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: update b',
        ops: [
          // Selection holds A; AI tries to update B.
          {
            op: 'update-layer',
            pageId: PAGE_ID,
            layerId: LAYER_ID_B,
            patch: { color: '#ff0000' },
          },
        ],
        message: 'OK',
      },
      fixtureDoc(),
      ctx({ selection: [LAYER_ID_A] }),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('out_of_selection_scope');
  });

  it('rejects remove-layer touching a layer outside the selection', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: rm b',
        ops: [{ op: 'remove-layer', pageId: PAGE_ID, layerId: LAYER_ID_B }],
        message: 'OK',
      },
      fixtureDoc(),
      ctx({ selection: [LAYER_ID_A] }),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('out_of_selection_scope');
  });

  it('PASSES update-layer touching layer A when selection holds A', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: update a',
        ops: [
          {
            op: 'update-layer',
            pageId: PAGE_ID,
            layerId: LAYER_ID_A,
            patch: { color: '#ff0000' },
          },
        ],
        message: 'OK',
      },
      fixtureDoc(),
      ctx({ selection: [LAYER_ID_A] }),
    );
    expect(result.kind).toBe('delta');
  });

  it('does NOT scope-clamp when selection is empty (Mode 2 / 3 paths)', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: update b without selection',
        ops: [
          {
            op: 'update-layer',
            pageId: PAGE_ID,
            layerId: LAYER_ID_B,
            patch: { color: '#ff0000' },
          },
        ],
        message: 'OK',
      },
      fixtureDoc(),
      ctx({ selection: [] }),
    );
    expect(result.kind).toBe('delta');
  });
});

// ─── Guard 4 — brand-rebinding ──────────────────────────────────────────

describe('Guard 4 — brand-rebinding via replace', () => {
  it('rejects a replace whose nextDoc.brandId differs from context.brand.id', () => {
    const docWithDifferentBrand = { ...fixtureDoc(), brandId: 'some-other-brand' };
    const result = validateAICommandResult(
      {
        kind: 'replace',
        label: 'AI: rebind',
        justification: 'A long justification string that passes the min-length check.',
        nextDoc: docWithDifferentBrand,
        message: 'OK',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
  });

  it('accepts a replace whose nextDoc.brandId matches', () => {
    const result = validateAICommandResult(
      {
        kind: 'replace',
        label: 'AI: redo',
        justification: 'Cross-content-type conversion needs full doc rewrite.',
        nextDoc: fixtureDoc(),
        message: 'OK',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('replace');
  });

  it('exempts standalone-editor docs (brandId null) from the rebinding check', () => {
    const standaloneDoc = { ...fixtureDoc(), brandId: null };
    const result = validateAICommandResult(
      {
        kind: 'replace',
        label: 'AI: redo',
        justification: 'Cross-content-type conversion needs full doc rewrite.',
        nextDoc: standaloneDoc,
        message: 'OK',
      },
      standaloneDoc,
      ctx(),
    );
    expect(result.kind).toBe('replace');
  });
});

// ─── Guard 5 — hallucinated page/layer ids ──────────────────────────────

describe('Guard 5 — hallucinated id detection', () => {
  it('rejects an op referencing a page id not in the document', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: hallucinate',
        ops: [
          {
            op: 'update-layer',
            pageId: '00000000-0000-0000-0000-000000000999',
            layerId: LAYER_ID_A,
            patch: { color: '#ff0000' },
          },
        ],
        message: 'OK',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
  });

  it('rejects an op referencing a layer id not on the addressed page', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: hallucinate',
        ops: [
          {
            op: 'remove-layer',
            pageId: PAGE_ID,
            layerId: '00000000-0000-0000-0000-000000000999',
          },
        ],
        message: 'OK',
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.reason).toBe('schema_invalid');
  });
});

// ─── Pass-through — happy path ──────────────────────────────────────────

describe('Pass-through — happy paths', () => {
  it('returns a valid delta with disambiguation preserved', () => {
    const result = validateAICommandResult(
      {
        kind: 'delta',
        label: 'AI: change all',
        ops: [
          {
            op: 'update-layer',
            pageId: PAGE_ID,
            layerId: LAYER_ID_A,
            patch: { color: { type: 'brand.color.neutral', neutralIndex: 0 } },
          },
        ],
        message: 'Changed.',
        disambiguation: { mode4_alternative: 'Just this one?' },
      },
      fixtureDoc(),
      ctx(),
    );
    expect(result.kind).toBe('delta');
    if (result.kind === 'delta') {
      expect(result.disambiguation).toEqual({ mode4_alternative: 'Just this one?' });
    }
  });
});
