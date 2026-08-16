/**
 * What the Brand Identity page knows — and what it refuses to claim.
 *
 * Two rules carry this file. A section a brand has nothing for must not exist,
 * so the page has no gaps and the nav has no dead entries. And a PLACEHOLDER is
 * absence: the mid-grey and the system font stack that satisfy a NOT NULL
 * column are not brand decisions, and presenting them as such would be the page
 * inventing an identity for someone.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { CORE_PLACEHOLDERS, startedState } from '@/shared/onboarding/onboardingState';
import { buildIdentityModel, presentSections } from '../identityModel';

const asset = (id: string, url: string) => ({
  id,
  kind: 'logo' as const,
  name: id,
  formats: { svg: { url, size: 1 } },
  metadata: {},
});

/** A brand that has decided nothing — a name and two stand-ins. */
function nameOnly(): Brand {
  return {
    id: 'b1',
    slug: 'thin',
    name: 'Thin',
    primaryColor: CORE_PLACEHOLDERS['colors.primary'],
    fonts: { primary: CORE_PLACEHOLDERS['typography.primary'] },
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    onboarding: startedState(['colors.primary', 'typography.primary']),
  } as unknown as Brand;
}

/** A brand that has answered everything. */
function rich(): Brand {
  return {
    id: 'b2',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: '#FFCC00',
    secondaryColor: '#111111',
    neutrals: ['#F5F5F0'],
    fonts: { primary: 'Fraunces', secondary: 'Inter' },
    tone: 'warm',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    logoSystem: {
      primary: { assetId: 'a1' },
      iconmark: { assetId: 'a2' },
      clearSpace: '1× cap height on all sides',
      minSize: '80px digital / 25mm print',
      usage: [{ do: 'Use the primary on light grounds', dont: 'Never recolour the mark' }],
    },
    brandAssets: [asset('a1', 'primary.svg'), asset('a2', 'icon.svg')],
    businessInfo: {
      industry: 'technology',
      tagline: 'Made with intent',
      audienceSummary: 'Independent makers',
    },
    identity: {
      colors: { primary: { hex: '#FFCC00' }, secondary: { hex: '#111111' } },
      logos: {},
      typography: { primary: { family: 'Fraunces' }, secondary: { family: 'Inter' } },
      voice: {
        tone: 'warm',
        personality: [],
        doList: ['Say the useful thing first'],
        dontList: ['Never pad a sentence'],
        examples: [{ context: 'Launch', text: 'MADE WITH INTENT.' }],
      },
      visualStyle: { descriptors: ['minimal', 'modern'] },
      strategy: {
        summary: 'A studio for independent makers.',
        mission: 'Make good work reachable',
        positioning: 'The considered alternative',
        targetAudience: 'Independent makers',
        personality: ['warm', 'confident'],
        values: ['craftsmanship'],
        aboutSections: [],
      },
    },
  } as unknown as Brand;
}

describe('a placeholder is absence, not a value', () => {
  const model = buildIdentityModel({ brand: nameOnly() });

  it('never presents the stand-in colour as the brand’s', () => {
    // `#8A877E` exists to satisfy a NOT NULL column. Nobody chose it.
    expect(model.colour.present).toBe(false);
    expect(model.colour.colours).toEqual([]);
  });

  it('never presents the system font stack as a typeface decision', () => {
    expect(model.typography.present).toBe(false);
    expect(model.typography.fonts).toEqual([]);
  });

  it('takes the same value seriously once it is genuinely chosen', () => {
    // The identical hex, on a brand with no placeholder marker, IS a decision.
    const chosen = { ...nameOnly(), onboarding: startedState() } as Brand;
    const m = buildIdentityModel({ brand: chosen });
    expect(m.colour.present).toBe(true);
    expect(m.colour.colours[0].hex).toBe('#8A877E');
  });
});

describe('a section a brand has nothing for does not exist', () => {
  it('reduces a name-only brand to the sections that are always true', () => {
    const sections = presentSections(buildIdentityModel({ brand: nameOnly() }));
    // Hero, downloads and closing can always be built from a name alone.
    expect(sections).toEqual(['hero', 'downloads', 'closing']);
  });

  it('invents nothing to fill them', () => {
    const m = buildIdentityModel({ brand: nameOnly() });
    expect(m.tagline).toBeUndefined();
    expect(m.introduction.summary).toBeUndefined();
    expect(m.purpose.mission).toBeUndefined();
    expect(m.personality.traits).toEqual([]);
    expect(m.hero.logo).toBeUndefined();
    expect(m.closing.statement).toBeUndefined();
  });

  it('builds every section for a brand that answered', () => {
    const sections = presentSections(buildIdentityModel({ brand: rich() }));
    expect(sections).toEqual([
      'hero',
      'introduction',
      'purpose',
      'personality',
      'logo',
      'logoUsage',
      'colour',
      'typography',
      'voice',
      'social',
      'downloads',
      'closing',
    ]);
    // Photography and assets need the Library, which was not supplied here.
    expect(sections).not.toContain('photography');
    expect(sections).not.toContain('assets');
  });

  it('adds photography and assets only when the Library brought something', () => {
    const withMedia = buildIdentityModel({
      brand: rich(),
      images: [{ id: 'p1', url: 'shot.jpg', name: 'shot.jpg' }],
      assetGroups: [
        { name: 'Patterns', items: [{ id: 'x1', url: 'p.svg', name: 'p.svg' }] },
        { name: 'Empty', items: [] },
      ],
    });
    expect(withMedia.photography.present).toBe(true);
    expect(withMedia.assets.present).toBe(true);
    // A group with nothing in it is not a group.
    expect(withMedia.assets.groups.map((g) => g.name)).toEqual(['Patterns']);
  });
});

describe('what the sections say', () => {
  const model = buildIdentityModel({ brand: rich() });

  it('reads stored ids back as the words a person wrote', () => {
    expect(model.introduction.industry).toBe('Technology');
    expect(model.introduction.descriptors).toEqual(['Minimal', 'Modern']);
    expect(model.personality.traits).toEqual(['Warm', 'Confident']);
    expect(model.personality.values).toEqual(['Craftsmanship']);
    expect(model.voice.tone).toBe('Warm');
  });

  it('keeps a word the vocabulary never had, exactly as it was written', () => {
    // "Other" answers persist verbatim. Falling back to the raw id is what
    // stops a brand's own wording being silently replaced by a near-match.
    const base = rich();
    const own = {
      ...base,
      businessInfo: { ...base.businessInfo, industry: 'Independent design studio' },
    } as Brand;
    expect(buildIdentityModel({ brand: own }).introduction.industry).toBe(
      'Independent design studio',
    );
  });

  it('leads with the primary colour and derives its own metadata', () => {
    const [first] = model.colour.colours;
    expect(first).toMatchObject({ hex: '#FFCC00', role: 'Primary', lead: true });
    // DERIVED from the hex, never stored beside it — the reference site's
    // hand-typed swatch data drifted until "Water blue" rendered gold.
    expect(first.rgb).toBe('255, 204, 0');
    expect(first.cmyk).toBe('0, 20, 100, 0');
  });

  it('resolves logo variants through the canonical refs', () => {
    expect(model.logo.variants.map((v) => v.def.label)).toEqual(['Primary', 'Brand Icon']);
    expect(model.hero.logo?.url).toBe('primary.svg');
  });

  it('carries the usage rules the brand actually recorded', () => {
    expect(model.logoUsage.clearSpace).toBe('1× cap height on all sides');
    expect(model.logoUsage.rules).toHaveLength(1);
  });

  it('closes on the brand’s own words', () => {
    expect(model.closing.statement).toBe('Made with intent');
  });
});
