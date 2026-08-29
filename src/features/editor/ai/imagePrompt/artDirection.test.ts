// The brief's contract. Everything here is a rule that cost a real defect to
// learn, so each test names the defect rather than the function.

import { describe, expect, it } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { deterministicCompile, decideLogo, isThin, defaultColourRoles } from './compileImagePrompt';
import { buildBrandImageContext } from './brandImageContext';
import { ALL_BRAND_INCLUDED, type BrandInclusions } from './artDirection';
import { contractFor, hasContract, GENERIC_CONTRACT } from './formatBriefs';
import { planVariants } from './variants';

function brand(): Brand {
  return {
    id: 'b1', name: 'Raqm', slug: 'raqm',
    primaryColor: '#6B46FF', secondaryColor: '#12B981',
    fonts: { primary: 'Inter' },
    assets: [],
    logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
    businessInfo: { industry: 'Logistics', tagline: 'Same day, every day' },
    visualStyle: { descriptors: ['bold', 'modern', 'clean'] },
  } as unknown as Brand;
}

const only = (patch: Partial<BrandInclusions>): BrandInclusions => ({ ...ALL_BRAND_INCLUDED, ...patch });

describe('format contracts — a billboard is not an Instagram post', () => {
  it('gives each deliverable its own conventions', () => {
    const post = deterministicCompile({ userPrompt: 'instagram post for our launch', brand: brand() }).prompt;
    const board = deterministicCompile({ userPrompt: 'billboard for our launch', brand: brand() }).prompt;

    expect(post).toMatch(/150 px in a scrolling feed/i);
    expect(post).toMatch(/At most 12 words/i);
    expect(board).toMatch(/30 to 150 metres/i);
    expect(board).toMatch(/At most 7 words/i);
    expect(board).toMatch(/no detail smaller than 3%/i);

    // The measured symptom that started this: the two briefs used to be 92.5%
    // character-identical. They must now genuinely differ.
    const shared = [...post].filter((c, i) => board[i] === c).length;
    expect(shared / Math.max(post.length, board.length)).toBeLessThan(0.75);
  });

  it('places the logo where the format actually puts it', () => {
    const board = deterministicCompile({ userPrompt: 'billboard for our launch', brand: brand() }).prompt;
    const card = deterministicCompile({ userPrompt: 'business card', brand: brand() }).prompt;
    expect(board).toMatch(/trailing edge in the reading direction/i);
    expect(board).toMatch(/7–10% of the frame width/);
    expect(card).toMatch(/18–28% of the frame width/);
  });

  it('falls back rather than imposing a poster’s grammar on an unknown thing', () => {
    expect(hasContract('poster')).toBe(true);
    expect(hasContract('interpretive dance')).toBe(false);
    expect(contractFor('interpretive dance')).toBe(GENERIC_CONTRACT);
  });
});

describe('brand inclusions — four decisions, not one switch', () => {
  const prompt = (include: BrandInclusions) =>
    deterministicCompile({ userPrompt: 'poster for our launch', brand: brand(), include }).prompt;

  it('logo off removes the logo and never attaches one', () => {
    const out = deterministicCompile({ userPrompt: 'poster for our launch', brand: brand(), include: only({ logo: false }) });
    expect(out.useLogo).toBe(false);
    expect(out.prompt).toMatch(/LOGO — none/);
  });

  it('text off makes it a wordless piece', () => {
    const p = prompt(only({ text: false }));
    expect(p).toMatch(/TEXT — none/);
    expect(p).toMatch(/wordless piece/i);
  });

  it('colours off says so, rather than silently using them', () => {
    const out = deterministicCompile({ userPrompt: 'poster for our launch', brand: brand(), include: only({ colours: false }) });
    expect(out.paletteHexes).toEqual([]);
    expect(out.prompt).toMatch(/deliberately NOT being used/i);
    expect(out.notes).toMatch(/left out by your choice/i);
  });

  it('identity off drops the visual language, and keeps everything else', () => {
    const p = prompt(only({ identity: false }));
    expect(p).not.toMatch(/Visual language/i);
    // Colour is a separate decision and must survive.
    expect(p).toMatch(/COLOUR —/);
  });

  it('everything on is the default', () => {
    const p = deterministicCompile({ userPrompt: 'poster for our launch', brand: brand() }).prompt;
    expect(p).toMatch(/Visual language/i);
    expect(p).toMatch(/COLOUR —/);
  });
});

describe('the logo is not attached to a picture that forbids one', () => {
  const ctx = buildBrandImageContext(brand());

  it('a wordless image with a branded noun does NOT get the logo', () => {
    // The defect: "product shot of our bottle" matched BRANDED_SUBJECTS, so the
    // logo PNG was attached to a request whose brief said "LOGO — none."
    expect(decideLogo('image', 'product shot of our bottle on marble', ctx, ALL_BRAND_INCLUDED)).toBe(false);
    const out = deterministicCompile({ userPrompt: 'product shot of our bottle on marble', brand: brand() });
    expect(out.kind).toBe('image');
    expect(out.useLogo).toBe(false);
    expect(out.prompt).toMatch(/LOGO — none/);
  });

  it('a picture DOES get it when the user actually asks', () => {
    expect(decideLogo('image', 'a photo of our logo on a wall', ctx, ALL_BRAND_INCLUDED)).toBe(true);
  });

  it('a finished design still carries it by default', () => {
    expect(decideLogo('design', 'poster for our launch', ctx, ALL_BRAND_INCLUDED)).toBe(true);
  });

  it('"no logo" always wins', () => {
    expect(decideLogo('design', 'poster for our launch, no logo', ctx, ALL_BRAND_INCLUDED)).toBe(false);
  });
});

describe('a wordless image gets no typography instruction', () => {
  it('does not tell an image with no lettering how to set type', () => {
    const p = deterministicCompile({ userPrompt: 'a photo of a cat on a sofa', brand: brand() }).prompt;
    expect(p).toMatch(/TEXT — none/);
    // The defect: `Typography: set real, legible type…` was emitted
    // unconditionally, directly contradicting the block above it.
    expect(p).not.toMatch(/set real, legible type/i);
  });
});

describe('references are named by PURPOSE', () => {
  it('tells the model what a subject reference is, and what a style one is not', () => {
    const p = deterministicCompile({
      userPrompt: 'poster for our launch', brand: brand(),
      userReferences: { subject: 1, style: 1 },
    }).prompt;
    expect(p).toMatch(/SUBJECT reference/);
    expect(p).toMatch(/may not[\s\S]*substitute a lookalike, redesign it or restyle it/i);
    expect(p).toMatch(/STYLE reference/);
    expect(p).toMatch(/Do NOT reproduce its subject/i);
  });

  it('counts every attached image, ours included', () => {
    // The defect: the sentence said "1 reference image(s)" while three were
    // actually sent, and the model was left to guess which was which.
    const p = deterministicCompile({
      userPrompt: 'poster for our launch', brand: brand(),
      userReferences: { subject: 1, style: 0 },
    }).prompt;
    expect(p).toMatch(/1\) the brand's real logo/);
    expect(p).toMatch(/2\) the brand palette/);
    expect(p).toMatch(/3\) SUBJECT reference/);
  });

  it('says nothing about references when none are attached', () => {
    const p = deterministicCompile({ userPrompt: 'a photo of a cat', brand: null }).prompt;
    expect(p).not.toMatch(/REFERENCE IMAGES/);
  });
});

describe('a batch is four ideas, not four samples', () => {
  it('produces one distinct brief per candidate', () => {
    const out = deterministicCompile({ userPrompt: 'poster for our launch', brand: brand(), count: 4 });
    expect(out.prompts).toHaveLength(4);
    expect(new Set(out.prompts).size).toBe(4);
    expect(out.prompt).toBe(out.prompts[0]);
    out.prompts.forEach((p, i) => expect(p).toContain(`exploration ${i + 1} of 4`));
  });

  it('keeps the copy, the margin and the exclusions identical across candidates', () => {
    const out = deterministicCompile({
      userPrompt: 'poster for our launch', brand: brand(), count: 3,
      copy: { headline: 'Same day. Every day.' },
    });
    for (const p of out.prompts) {
      expect(p).toContain('“Same day. Every day.”');
      expect(p).toMatch(/7% safe margin/);
      expect(p).toMatch(/AVOID —/);
    }
  });

  it('adds no variant framing to a single image', () => {
    const out = deterministicCompile({ userPrompt: 'poster for our launch', brand: brand(), count: 1 });
    expect(out.prompts).toHaveLength(1);
    expect(out.prompt).not.toMatch(/VARIANT/);
  });

  it('candidate 0 is the straight reading, and the plan is stable across runs', () => {
    const a = planVariants(4, contractFor('poster'), 'seed', 'design');
    const b = planVariants(4, contractFor('poster'), 'seed', 'design');
    expect(a).toEqual(b);
    expect(a[0].archetype).toBe(contractFor('poster').archetypes[0]);
    // Two identical archetypes in one batch is a wasted paid generation.
    expect(new Set(a.map((v) => v.archetype)).size).toBeGreaterThan(1);
  });

  it('never plans type treatment for a wordless image', () => {
    const v = planVariants(3, contractFor('poster'), 'seed', 'image');
    expect(v.every((x) => x.typeTreatment === '')).toBe(true);
  });
});

describe('colour arrives as ROLES, chosen per piece', () => {
  it('does not flood the ground with a dark primary', () => {
    const ctx = buildBrandImageContext(brand());
    // #6B46FF is darker than #12B981, so the lighter one takes the ground and
    // the darker carries the type — the readable arrangement.
    const roles = defaultColourRoles(ctx, ['#6B46FF', '#12B981']);
    expect(roles?.ground).toBe('#12B981');
    expect(roles?.type).toBe('#6B46FF');
  });

  it('names the slots in the brief', () => {
    const p = deterministicCompile({ userPrompt: 'poster for our launch', brand: brand() }).prompt;
    expect(p).toMatch(/Ground — the largest surface/);
    expect(p).toMatch(/Type and primary marks/);
  });
});

describe('a thin answer is a failed compile', () => {
  it('recognises an echo of the request', () => {
    expect(isThin('poster for orientation week', 'poster for orientation week')).toBe(true);
    expect(isThin('A poster for orientation week!', 'poster for orientation week')).toBe(true);
    expect(isThin('', 'anything')).toBe(true);
  });

  it('accepts a genuinely enriched answer', () => {
    expect(isThin(
      'A sunlit university quad at golden hour, students crossing long shadows on worn limestone',
      'poster for orientation week',
    )).toBe(false);
  });
});

describe('the deliverable line reads like English', () => {
  it('says "an instagram post", not "a instagram post"', () => {
    const out = deterministicCompile({ userPrompt: 'instagram post for our launch', brand: brand() });
    expect(out.kindReason).toBe('You asked for an instagram post.');
  });
});
