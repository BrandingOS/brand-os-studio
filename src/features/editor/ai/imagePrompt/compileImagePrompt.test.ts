import { describe, expect, it, vi } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { buildBrandImageContext, describeBrandForPrompt } from './brandImageContext';
import { compileImagePrompt, deterministicCompile, heuristics } from './compileImagePrompt';

vi.mock('@/shared/ai/anthropicProxy', () => ({
  callAnthropic: vi.fn(),
  firstText: (res: { content?: Array<{ type: string; text?: string }> }) =>
    res.content?.find((b) => b.type === 'text')?.text ?? '',
}));

function fixtureBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'brand-1',
    slug: 'raqm',
    name: 'Raqm',
    primaryColor: '#6B46FF',
    secondaryColor: '#0B0B12',
    fonts: { primary: 'Inter' },
    tone: 'bold, direct',
    audience: 'Gen-Z creators',
    assets: [],
    logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
    visualStyle: { descriptors: ['Minimal', 'Bold'] },
    guidelines: {
      strategy: { mission: '', vision: '', values: [], positioning: 'The creator OS', personality: ['confident', 'playful'], targetAudience: '' },
    } as Brand['guidelines'],
    businessInfo: { industry: 'Creator tools' },
    ...overrides,
  } as unknown as Brand;
}

const claudeJson = (obj: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] });

describe('buildBrandImageContext', () => {
  it('extracts palette, style words, personality, industry and logo roles', () => {
    const ctx = buildBrandImageContext(fixtureBrand())!;
    expect(ctx.name).toBe('Raqm');
    expect(ctx.palette.map((p) => p.role)).toEqual(expect.arrayContaining(['primary', 'secondary']));
    expect(ctx.palette[0].hex).toBe('#6B46FF');
    expect(ctx.styleDescriptors).toEqual(['minimal', 'bold']);
    expect(ctx.personality).toEqual(['confident', 'playful']);
    expect(ctx.industry).toBe('Creator tools');
    expect(ctx.hasLogo).toBe(true);
    expect(ctx.logoRoles).toContain('primary');
    expect(describeBrandForPrompt(ctx)).toMatch(/Brand: Raqm; industry: Creator tools/);
  });

  it('returns null without a brand', () => {
    expect(buildBrandImageContext(null)).toBeNull();
  });
});

describe('heuristics', () => {
  const ctx = buildBrandImageContext(fixtureBrand());
  it('does not want a logo for an ordinary scene', () => {
    expect(heuristics('a cat sleeping on a sofa', ctx).useLogo).toBe(false);
  });
  it('wants a logo when the user asks for it', () => {
    expect(heuristics('our logo on a billboard at night', ctx).useLogo).toBe(true);
  });
  it('wants a logo for clearly branded subjects (packaging)', () => {
    expect(heuristics('coffee bag packaging on a marble table', ctx).useLogo).toBe(true);
  });
  it('never wants a logo when the brand has none', () => {
    const noLogo = buildBrandImageContext(fixtureBrand({ logo: undefined } as Partial<Brand>));
    expect(heuristics('our logo on a billboard', noLogo).useLogo).toBe(false);
  });
  it('detects an explicit color direction', () => {
    expect(heuristics('portrait, black and white', ctx).colorOverride).toBe(true);
    expect(heuristics('portrait at dusk', ctx).colorOverride).toBe(false);
  });
});

describe('deterministicCompile', () => {
  it('keeps the original prompt first and adds only accents + style, no logo', () => {
    const out = deterministicCompile({ userPrompt: 'a cat sleeping on a sofa', brand: fixtureBrand() });
    expect(out.prompt.startsWith('a cat sleeping on a sofa')).toBe(true);
    expect(out.prompt).toMatch(/#6B46FF/);
    expect(out.prompt).not.toMatch(/logo/i);
    expect(out.useLogo).toBe(false);
    expect(out.paletteHexes).toEqual(['#6B46FF', '#0B0B12']);
    expect(out.source).toBe('deterministic');
    expect(out.original).toBe('a cat sleeping on a sofa');
  });
  it('drops brand colors when the user gave a color direction', () => {
    const out = deterministicCompile({ userPrompt: 'a portrait, black and white', brand: fixtureBrand() });
    expect(out.paletteHexes).toEqual([]);
    expect(out.prompt).not.toMatch(/#6B46FF/);
  });
  it('mentions the logo when asked', () => {
    const out = deterministicCompile({ userPrompt: 'our logo on a tote bag', brand: fixtureBrand() });
    expect(out.useLogo).toBe(true);
    expect(out.prompt).toMatch(/Raqm logo/);
  });
  it('passes the prompt through untouched without a brand', () => {
    const out = deterministicCompile({ userPrompt: 'hello', brand: null });
    expect(out.prompt).toBe('hello');
  });
});

describe('compileImagePrompt (claude engine)', () => {
  it('uses the model JSON and keeps only known brand hexes', async () => {
    const call = vi.fn(async () => claudeJson({
      prompt: 'A cat asleep on a velvet sofa, soft window light, subtle violet accents',
      negativePrompt: 'text, watermark',
      useLogo: false,
      paletteHexes: ['#6b46ff', '#FF0000'],
      notes: 'Used the primary violet as an accent; no logo — not requested.',
    }));
    const out = await compileImagePrompt({ userPrompt: 'a cat on a sofa', brand: fixtureBrand() }, { call: call as never });
    expect(out.source).toBe('claude');
    expect(out.prompt).toMatch(/velvet sofa/);
    expect(out.negativePrompt).toBe('text, watermark');
    expect(out.paletteHexes).toEqual(['#6B46FF']);
    expect(out.useLogo).toBe(false);
    const req = (call.mock.calls[0] as unknown[])[0] as { model: string; system: string; messages: Array<{ content: string }> };
    expect(req.model).toBe('haiku');
    expect(req.system).toMatch(/Preserve the user's original creative intent/);
    expect(req.messages[0].content).toMatch(/USER REQUEST: a cat on a sofa/);
    expect(req.messages[0].content).toMatch(/BRAND: Brand: Raqm/);
  });

  it('never keeps a logo when the brand has no logo file', async () => {
    const call = vi.fn(async () => claudeJson({ prompt: 'x', useLogo: true, paletteHexes: [], notes: '' }));
    const out = await compileImagePrompt(
      { userPrompt: 'our logo on a billboard', brand: fixtureBrand({ logo: undefined } as Partial<Brand>) },
      { call: call as never },
    );
    expect(out.useLogo).toBe(false);
  });

  it('empties the palette when the user gave a color direction, even if the model listed hexes', async () => {
    const call = vi.fn(async () => claudeJson({ prompt: 'x', useLogo: false, paletteHexes: ['#6B46FF'], notes: '' }));
    const out = await compileImagePrompt({ userPrompt: 'a portrait in black and white', brand: fixtureBrand() }, { call: call as never });
    expect(out.paletteHexes).toEqual([]);
  });

  it('falls back to deterministic on empty (mock) proxy answers', async () => {
    const call = vi.fn(async () => ({ content: [] }));
    const out = await compileImagePrompt({ userPrompt: 'a cat', brand: fixtureBrand() }, { call: call as never });
    expect(out.source).toBe('deterministic');
    expect(out.prompt.startsWith('a cat')).toBe(true);
  });

  it('falls back on malformed JSON and on errors', async () => {
    const bad = vi.fn(async () => ({ content: [{ type: 'text', text: 'not json at all' }] }));
    expect((await compileImagePrompt({ userPrompt: 'a cat', brand: fixtureBrand() }, { call: bad as never })).source).toBe('deterministic');
    const boom = vi.fn(async () => { throw new Error('boom'); });
    expect((await compileImagePrompt({ userPrompt: 'a cat', brand: fixtureBrand() }, { call: boom as never })).source).toBe('deterministic');
  });

  it('accepts fenced JSON', async () => {
    const call = vi.fn(async () => ({ content: [{ type: 'text', text: '```json\n{"prompt":"fenced ok","useLogo":false,"paletteHexes":[],"notes":"n"}\n```' }] }));
    const out = await compileImagePrompt({ userPrompt: 'a cat', brand: fixtureBrand() }, { call: call as never });
    expect(out.prompt).toBe('fenced ok');
  });

  it('honours the timeout', async () => {
    const slow = vi.fn(() => new Promise(() => { /* never */ }));
    const out = await compileImagePrompt({ userPrompt: 'a cat', brand: fixtureBrand() }, { call: slow as never, timeoutMs: 10 });
    expect(out.source).toBe('deterministic');
  });

  it('deterministicOnly skips the model', async () => {
    const call = vi.fn();
    const out = await compileImagePrompt({ userPrompt: 'a cat', brand: fixtureBrand() }, { call: call as never, deterministicOnly: true });
    expect(call).not.toHaveBeenCalled();
    expect(out.source).toBe('deterministic');
  });
});
