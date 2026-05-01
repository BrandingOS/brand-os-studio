// Unit tests for the AI contract Zod schemas — Phase 3.5 commit 2.
//
// These verify the runtime validation surface that Mode 5 (commit 3)
// builds on. Every shape the AI can return is exercised here, plus
// the negative cases (missing fields, wrong types, unjustified
// replace) — the negative cases are what the contract layer actually
// catches in production.

import { describe, expect, it } from 'vitest';
import { AICommandResultSchema } from './types';

const VALID_PAGE_ID = '00000000-0000-0000-0000-000000000aa1';
const VALID_LAYER_ID = '00000000-0000-0000-0000-000000000bb1';
const VALID_DOC_ID = '00000000-0000-0000-0000-000000000cc1';

describe('AICommandResultSchema — delta variant', () => {
  it('accepts a minimal valid delta with one update-layer op', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: 'AI: change color',
      ops: [
        {
          op: 'update-layer',
          pageId: VALID_PAGE_ID,
          layerId: VALID_LAYER_ID,
          patch: { color: '#ff0000' },
        },
      ],
      message: 'Changed color.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an add-layer op with layer.id OMITTED (contract assigns it)', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: 'AI: add text',
      ops: [
        {
          op: 'add-layer',
          pageId: VALID_PAGE_ID,
          layer: { kind: 'text', name: 'New text', text: 'Hi' },
        },
      ],
      message: 'Added text.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a delta with zero ops (must include ≥1)', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: 'AI: empty delta',
      ops: [],
      message: 'Did nothing.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a delta with empty label (label is load-bearing for undo entry)', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: '',
      ops: [{ op: 'remove-layer', pageId: VALID_PAGE_ID, layerId: VALID_LAYER_ID }],
      message: 'OK',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a delta with empty message (message is required for the toast)', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: 'AI: ok',
      ops: [{ op: 'remove-layer', pageId: VALID_PAGE_ID, layerId: VALID_LAYER_ID }],
      message: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an op with a non-UUID pageId', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: 'AI: bad page id',
      ops: [{ op: 'remove-layer', pageId: 'not-a-uuid', layerId: VALID_LAYER_ID }],
      message: 'OK',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a delta with optional disambiguation populated', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'delta',
      label: 'AI: change all',
      ops: [
        {
          op: 'update-layer',
          pageId: VALID_PAGE_ID,
          layerId: VALID_LAYER_ID,
          patch: { color: '#ffffff' },
        },
      ],
      message: 'Done.',
      disambiguation: { mode4_alternative: 'Just this layer?' },
    });
    expect(result.success).toBe(true);
  });
});

describe('AICommandResultSchema — replace variant', () => {
  const validDoc = {
    schemaVersion: 1,
    id: VALID_DOC_ID,
    contentType: 'social-post',
    brandId: 'raqm',
    masterPages: [],
    pages: [
      {
        id: VALID_PAGE_ID,
        name: 'Page 1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: {},
  };

  it('accepts a valid replace with justification + full nextDoc', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'replace',
      label: 'AI: convert',
      justification: 'Cross-content-type conversion requires full doc rewrite.',
      nextDoc: validDoc,
      message: 'Converted.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a replace with NO justification (Q2 enforcement at contract layer)', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'replace',
      label: 'AI: redesign',
      // justification missing
      nextDoc: validDoc,
      message: 'Redesigned.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a replace with too-short justification (≥10 chars discourages "x")', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'replace',
      label: 'AI: ok',
      justification: 'because',
      nextDoc: validDoc,
      message: 'OK.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a replace whose nextDoc is schema-invalid', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'replace',
      label: 'AI: convert',
      justification: 'A real long justification string here.',
      nextDoc: { schemaVersion: 1, id: 'not-uuid' /* missing many fields */ },
      message: 'OK',
    });
    expect(result.success).toBe(false);
  });
});

describe('AICommandResultSchema — rejected variant', () => {
  it('accepts a rejected with each allowed reason code', () => {
    const codes = [
      'no_selection',
      'out_of_selection_scope',
      'replace_unjustified',
      'schema_invalid',
      'empty_prompt',
      'unsupported',
      'agent_error',
    ];
    for (const reason of codes) {
      const result = AICommandResultSchema.safeParse({
        kind: 'rejected',
        reason,
        message: 'helpful message',
      });
      expect(result.success, `reason ${reason} should be valid`).toBe(true);
    }
  });

  it('rejects a rejected with an unknown reason code', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'rejected',
      reason: 'made_up_reason',
      message: 'OK',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a rejected with optional suggestions', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'rejected',
      reason: 'no_selection',
      message: 'Pick something first',
      suggestions: ['Make the title bigger', 'Make the logo bigger'],
    });
    expect(result.success).toBe(true);
  });
});

describe('AICommandResultSchema — discriminated union safety', () => {
  it('rejects unknown kind', () => {
    const result = AICommandResultSchema.safeParse({
      kind: 'mutate',
      label: 'AI: ok',
      ops: [],
      message: 'OK',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed top-level shape', () => {
    expect(AICommandResultSchema.safeParse(null).success).toBe(false);
    expect(AICommandResultSchema.safeParse('a string').success).toBe(false);
    expect(AICommandResultSchema.safeParse(42).success).toBe(false);
    expect(AICommandResultSchema.safeParse({}).success).toBe(false);
  });
});
