// Unit tests for generateFromPrompt — Phase 4.3 Mode 1 wiring.

import { describe, expect, it, vi } from 'vitest';
import { generateFromPrompt } from './generateFromPrompt';
import type { AIAgent, AICommandResult } from '@/features/editor/ai/types';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';

function brand(): Brand {
  return {
    id: 'b', slug: 'b', name: 'B',
    primaryColor: '#000', fonts: { primary: 'Inter' },
    tone: '', audience: '', assets: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function stubAgent(result: AICommandResult): AIAgent {
  return { applyCommand: vi.fn(async () => result) };
}

function fakeReplaceDoc(): BrandOSDocument {
  return {
    schemaVersion: 1, id: '00000000-0000-0000-0000-000000000999',
    contentType: 'social-post', brandId: 'b',
    masterPages: [], pages: [{
      id: '00000000-0000-0000-0000-000000000888',
      name: 'Page 1', width: 1080, height: 1080,
      background: '#ffffff', masterPageId: null, layers: [],
    }], metadata: {},
  };
}

describe('generateFromPrompt — Mode 1 zero-state', () => {
  it('returns ok=true with the AI replace doc when agent emits replace', async () => {
    const result = await generateFromPrompt({
      agent: stubAgent({
        kind: 'replace', label: 'AI: gen', justification: 'Mode 1 zero-state generation, full doc.',
        nextDoc: fakeReplaceDoc(), message: 'Generated.',
      }),
      brand: brand(), brandKit: null,
      prompt: 'Create an Instagram post', contentTypeId: 'social-post',
    });
    expect(result.ok).toBe(true);
    expect(result.doc?.contentType).toBe('social-post');
    expect(result.message).toBe('Generated.');
  });

  it('returns ok=false on rejected agent response', async () => {
    const result = await generateFromPrompt({
      agent: stubAgent({
        kind: 'rejected', reason: 'unsupported',
        message: 'Cannot do this in Phase 3.5.',
      }),
      brand: brand(), brandKit: null,
      prompt: 'X', contentTypeId: 'social-post',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Phase 3.5');
  });

  it('falls back to in-memory delta application when agent emits delta against the blank scaffold', async () => {
    // Agent might respond with a delta of add-layer ops instead of
    // replace. The wrapper handles both.
    const captured = { pageId: '' };
    const agent: AIAgent = {
      applyCommand: vi.fn(async (doc) => {
        captured.pageId = doc.pages[0].id;
        return {
          kind: 'delta', label: 'AI: add', message: 'Added.',
          ops: [{
            op: 'add-layer', pageId: doc.pages[0].id,
            layer: {
              id: '00000000-0000-0000-0000-000000000777',
              kind: 'shape', shape: 'rectangle', name: 'R',
              transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
              opacity: 1, visible: true, locked: false, brandLocked: false,
              fill: '#ff0000', stroke: null, strokeWidth: 0, cornerRadius: 0,
            },
          }],
        };
      }),
    };
    const result = await generateFromPrompt({
      agent, brand: brand(), brandKit: null,
      prompt: 'Add a rect', contentTypeId: 'social-post',
    });
    expect(result.ok).toBe(true);
    expect(result.doc?.pages[0].layers.length).toBe(1);
  });

  it('rejects unknown content-type id', async () => {
    const agent = stubAgent({ kind: 'rejected', reason: 'unsupported', message: 'x' });
    const result = await generateFromPrompt({
      agent, brand: brand(), brandKit: null,
      prompt: 'X', contentTypeId: 'not-a-real-content-type',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Unknown content type/);
  });
});
