// Phase 5.2 — aiReflow integration tests.
//
// The agent surface is mocked. Real AI quality is a downstream
// tuning phase — these tests cover the integration plumbing
// (success, failure, schema mismatch all route correctly) that
// would catch a regression in the dispatch layer.
import { describe, expect, it, vi } from 'vitest';
import { createAiReflowFn, buildReflowCommand } from './aiReflow';
import type { BrandOSDocument } from '../schema';
import type { AIAgent, AICommandResult } from '../ai/types';

function squareSource(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '11111111-1111-1111-1111-111111111111',
    contentType: 'social-post',
    brandId: 'brand-raqm',
    masterPages: [],
    metadata: {},
    pages: [{
      id: '22222222-2222-2222-2222-222222222222', name: 'P', width: 1000, height: 1000,
      background: '#ffffff',
      layers: [{
        id: '33333333-3333-3333-3333-333333333333', kind: 'text', name: 'Headline',
        transform: { x: 100, y: 100, width: 800, height: 200, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, visible: true, locked: false, brandLocked: false,
        text: 'Hello',
        fontFamily: 'Inter', fontSize: 48, color: '#000',
        fontWeight: 700, textAlign: 'left', lineHeight: 1.2,
      }],
    }],
  } as BrandOSDocument;
}

function makeAgent(impl: AIAgent['applyCommand']): AIAgent {
  return { applyCommand: impl };
}

describe('createAiReflowFn — happy path', () => {
  it('returns the AI nextDoc when the agent emits a valid replace', async () => {
    const source = squareSource();
    const aiReflowed: BrandOSDocument = {
      ...source,
      pages: [{
        ...source.pages[0],
        width: 1080, height: 1920,
        layers: [{
          ...source.pages[0].layers[0],
          // AI reorganized the layer position semantically.
          transform: { x: 60, y: 800, width: 960, height: 280, rotation: 0, scaleX: 1, scaleY: 1 },
        }],
      }],
    };
    const agent = makeAgent(async () => ({
      kind: 'replace' as const,
      label: 'Reflow',
      justification: 'Resize to portrait',
      nextDoc: aiReflowed,
      message: 'ok',
    }));
    const reflow = createAiReflowFn({ agent });
    const out = await reflow(source, 1080, 1920);
    // AI's chosen transform survives.
    expect(out.pages[0].layers[0].transform.x).toBe(60);
    expect(out.pages[0].layers[0].transform.y).toBe(800);
    // Page dimensions are forced to target (defensive re-stamp).
    expect(out.pages[0].width).toBe(1080);
    expect(out.pages[0].height).toBe(1920);
  });
});

describe('createAiReflowFn — fallbacks', () => {
  it('falls back to dumb-clone when the agent throws', async () => {
    const source = squareSource();
    const onFallback = vi.fn();
    const agent = makeAgent(async () => {
      throw new Error('network down');
    });
    const reflow = createAiReflowFn({ agent, onFallback });
    const out = await reflow(source, 1080, 1920);
    expect(onFallback).toHaveBeenCalledWith('agent_threw', expect.any(Error));
    // Dumb-clone scaled the layer proportionally.
    // Source x=100 with scaleX 1.08 → 108
    expect(out.pages[0].layers[0].transform.x).toBeCloseTo(108, 5);
    expect(out.pages[0].width).toBe(1080);
  });

  it('falls back when agent returns rejected', async () => {
    const source = squareSource();
    const onFallback = vi.fn();
    const agent = makeAgent(async () => ({
      kind: 'rejected' as const,
      reason: 'no_selection' as const,
      message: 'Nothing to act on',
    }));
    const reflow = createAiReflowFn({ agent, onFallback });
    const out = await reflow(source, 1080, 1920);
    expect(onFallback).toHaveBeenCalledWith('unexpected_kind_rejected');
    expect(out.pages[0].width).toBe(1080);
  });

  it('falls back when agent returns delta (not replace)', async () => {
    const source = squareSource();
    const onFallback = vi.fn();
    const agent = makeAgent(async () => ({
      kind: 'delta' as const,
      label: 'Tweak',
      ops: [],
      message: 'ok',
    }));
    const reflow = createAiReflowFn({ agent, onFallback });
    const out = await reflow(source, 1080, 1920);
    expect(onFallback).toHaveBeenCalledWith('unexpected_kind_delta');
    expect(out.pages[0].width).toBe(1080);
  });

  it('falls back when AI nextDoc fails schema parse', async () => {
    const source = squareSource();
    const onFallback = vi.fn();
    // Return malformed doc — missing required fields.
    const agent = makeAgent(async () => ({
      kind: 'replace' as const,
      label: 'Reflow',
      justification: 'fine',
      nextDoc: { schemaVersion: 1, id: 'not-a-uuid' } as never,
      message: 'ok',
    } as AICommandResult));
    const reflow = createAiReflowFn({ agent, onFallback });
    const out = await reflow(source, 1080, 1920);
    expect(onFallback).toHaveBeenCalledWith('schema_invalid', expect.anything());
    expect(out.pages[0].width).toBe(1080);
  });
});

describe('buildReflowCommand', () => {
  it('encodes source and target dimensions, aspect ratios, and orientation', () => {
    const source = squareSource();
    const command = buildReflowCommand(source, 1080, 1920);
    expect(command).toContain('1000×1000');
    expect(command).toContain('1080×1920');
    expect(command).toContain('portrait');
    // Asks for a 'replace' result so the dispatch routes to the
    // semantic reflow path.
    expect(command).toMatch(/'replace'/);
  });
});
