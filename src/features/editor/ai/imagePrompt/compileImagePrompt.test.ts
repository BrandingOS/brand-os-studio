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

describe('deterministicCompile — the brief is assembled, not described', () => {
  it('states a FINISHED deliverable and forbids a background plate', () => {
    const out = deterministicCompile({ userPrompt: 'Instagram post for our launch', brand: fixtureBrand() });
    expect(out.kind).toBe('design');
    expect(out.deliverable).toBe('instagram post');
    expect(out.prompt).toMatch(/FINISHED INSTAGRAM POST/);
    expect(out.prompt).toMatch(/publication-ready/i);
    expect(out.prompt).toMatch(/must NOT be an empty background/i);
  });

  it('quotes the user\'s copy verbatim and bans every other word', () => {
    const out = deterministicCompile({
      userPrompt: 'Instagram post for our launch',
      brand: fixtureBrand(),
      copy: { headline: 'Same day. Every day.', cta: 'Book a pickup' },
    });
    expect(out.prompt).toContain('“Same day. Every day.”');
    expect(out.prompt).toContain('“Book a pickup”');
    expect(out.prompt).toMatch(/do not add any other word anywhere in the frame/i);
  });

  it('invents nothing when no copy is supplied — only words the brand owns', () => {
    const out = deterministicCompile({ userPrompt: 'A poster for our launch', brand: fixtureBrand() });
    expect(out.prompt).toMatch(/The ONLY words permitted are the brand name “Raqm”/);
    expect(out.prompt).toMatch(/Do not invent a headline, slogan, caption, price, percentage or label/i);
    // …and it must not quietly reserve a blank area for copy nobody will add.
    expect(out.prompt).toMatch(/do NOT reserve, mask or flatten any area as a/i);
  });

  it('always carries the exclusions, including the invented-discount trap', () => {
    const out = deterministicCompile({ userPrompt: 'An ad for our product', brand: fixtureBrand() });
    expect(out.prompt).toMatch(/DO NOT INCLUDE/);
    expect(out.prompt).toMatch(/discount badges, sale stickers, percentage offers/i);
    expect(out.prompt).toMatch(/invented slogans/i);
    expect(out.negativePrompt).toMatch(/discount badges/i);
  });

  it('a plain photograph stays a wordless image — no text, no logo', () => {
    const out = deterministicCompile({ userPrompt: 'a photo of a cat on a sofa', brand: fixtureBrand() });
    expect(out.kind).toBe('image');
    expect(out.useLogo).toBe(false);
    expect(out.prompt).toMatch(/TEXT — none/);
    expect(out.prompt).toMatch(/LOGO — none/);
    expect(out.prompt).toMatch(/any text, lettering, numerals or signage/i);
  });

  it('drops brand colours when the user gave a colour direction', () => {
    const out = deterministicCompile({ userPrompt: 'a poster in black and white', brand: fixtureBrand() });
    expect(out.paletteHexes).toEqual([]);
    expect(out.notes).toMatch(/colour direction/i);
  });

  it('a finished design carries the logo by default; "no logo" is obeyed', () => {
    expect(deterministicCompile({ userPrompt: 'Instagram post for our launch', brand: fixtureBrand() }).useLogo).toBe(true);
    expect(deterministicCompile({ userPrompt: 'Instagram post for our launch, no logo', brand: fixtureBrand() }).useLogo).toBe(false);
  });

  it('never claims a logo the brand does not have', () => {
    const out = deterministicCompile({ userPrompt: 'A poster for our launch', brand: fixtureBrand({ logo: undefined, logoSystem: undefined } as Partial<Brand>) });
    expect(out.useLogo).toBe(false);
    expect(out.prompt).toMatch(/LOGO — none/);
  });

  it('works with no brand at all', () => {
    const out = deterministicCompile({ userPrompt: 'a red bicycle', brand: null });
    expect(out.prompt).toContain('a red bicycle');
    expect(out.useLogo).toBe(false);
  });
});

describe('compileImagePrompt (assisted engine)', () => {
  it('uses the model FIELDS and keeps only known brand hexes', async () => {
    const call = vi.fn().mockResolvedValue(claudeJson({
      subject: 'A matte black cup on oak',
      composition: 'Cup low-left, headline upper right',
      style: 'Editorial daylight photography',
      paletteHexes: ['#6B46FF', '#FF0000'],
      useLogo: true,
      logoPlacement: 'bottom-right',
      negativePrompt: 'steam',
      notes: 'Used the primary only.',
    }));
    const out = await compileImagePrompt(
      { userPrompt: 'Instagram post with a coffee cup', brand: fixtureBrand(), copy: { headline: 'Brewed daily' } },
      { call },
    );
    expect(out.source).toBe('claude');
    // #FF0000 is not in the kit and must not survive.
    expect(out.paletteHexes).toEqual(['#6B46FF']);
    expect(out.prompt).toContain('A matte black cup on oak');
    expect(out.prompt).toContain('Cup low-left, headline upper right');
    expect(out.prompt).toContain('“Brewed daily”');
    expect(out.prompt).toMatch(/bottom right/);
    expect(out.negativePrompt).toMatch(/steam/);
  });

  it('the model cannot delete an invariant — exclusions and margin survive', async () => {
    const call = vi.fn().mockResolvedValue(claudeJson({
      subject: 'x', composition: 'y', style: 'z',
      paletteHexes: [], useLogo: false, logoPlacement: null, negativePrompt: null, notes: '',
    }));
    const out = await compileImagePrompt({ userPrompt: 'An ad for our product', brand: fixtureBrand() }, { call });
    expect(out.prompt).toMatch(/DO NOT INCLUDE/);
    expect(out.prompt).toMatch(/7% safe margin/);
    expect(out.prompt).toMatch(/discount badges/i);
  });

  it('a user colour direction empties the palette even if the model returned one', async () => {
    const call = vi.fn().mockResolvedValue(claudeJson({
      subject: 'x', composition: 'y', style: 'z',
      paletteHexes: ['#6B46FF'], useLogo: false, logoPlacement: null, negativePrompt: null, notes: '',
    }));
    const out = await compileImagePrompt({ userPrompt: 'a poster in black and white', brand: fixtureBrand() }, { call });
    expect(out.paletteHexes).toEqual([]);
  });

  it('falls back to deterministic on an empty (mock) proxy answer', async () => {
    const call = vi.fn().mockResolvedValue({ content: [] });
    const out = await compileImagePrompt({ userPrompt: 'a poster', brand: fixtureBrand() }, { call });
    expect(out.source).toBe('deterministic');
    expect(out.prompt).toMatch(/DO NOT INCLUDE/);
  });

  it('accepts fenced JSON', async () => {
    const call = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify({
        subject: 'fenced subject', composition: 'c', style: 's',
        paletteHexes: [], useLogo: false, logoPlacement: null, negativePrompt: null, notes: 'ok',
      }) + '\n```' }],
    });
    const out = await compileImagePrompt({ userPrompt: 'a poster', brand: fixtureBrand() }, { call });
    expect(out.source).toBe('claude');
    expect(out.prompt).toContain('fenced subject');
  });

  it('does not silently degrade on a slow model — the timeout is generous', async () => {
    // 12 s used to be the budget and sonnet lands at 10–14 s, so most real
    // requests fell back to the thin brief while the user paid full price.
    const call = vi.fn().mockImplementation(() => new Promise((r) => setTimeout(
      () => r(claudeJson({ subject: 'late', composition: 'c', style: 's', paletteHexes: [], useLogo: false, logoPlacement: null, negativePrompt: null, notes: '' })), 50)));
    const out = await compileImagePrompt({ userPrompt: 'a poster', brand: fixtureBrand() }, { call, timeoutMs: 5000 });
    expect(out.source).toBe('claude');
  });
});
