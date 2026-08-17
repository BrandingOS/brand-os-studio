/**
 * The register: how a brand becomes a page that looks like that brand.
 *
 * Every case here is a specific way "put the brand colour everywhere" goes
 * wrong on real data — a white section where the crescendo should be, a grey
 * smear where the brand's colour should be, two identical grounds in a row, or
 * a whole page painted in a placeholder nobody chose.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { buildIdentityModel, presentSections } from '../identityModel';
import { buildRegister, rhythm } from '../identityRegister';

const asset = (id: string, url: string) => ({
  id,
  kind: 'logo' as const,
  name: id,
  formats: { svg: { url, size: 1 } },
  metadata: {},
});

const SVG = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E';

function brand(over: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: '#1934EE',
    // The white the "never a white ground" case turns on — a real and very
    // common recording, and not a colour a section can stand on.
    secondaryColor: '#FFFFFF',
    fonts: { primary: 'Fraunces' },
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    logoSystem: { primary: { assetId: 'a1' }, 'mono.white': { assetId: 'a2' } },
    brandAssets: [asset('a1', SVG), asset('a2', SVG)],
    identity: {
      colors: {
        primary: { hex: '#1934EE' },
        secondary: { hex: '#FFFFFF' },
        neutrals: [{ hex: '#111111' }],
      },
      logos: {},
      typography: { primary: { family: 'Fraunces' } },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
      strategy: { values: [], personality: [], aboutSections: [] },
    },
    ...over,
  } as unknown as Brand;
}

const registerFor = (b: Brand) => {
  const model = buildIdentityModel({ brand: b });
  return buildRegister(model, presentSections(model));
};

describe('the section rhythm', () => {
  it('never stands two neighbours on the same ground', () => {
    // Includes the pairs that collide by preference — hero and colour both want
    // `deep`, personality and closing both want `brand`.
    const grounds = rhythm(['hero', 'colour', 'personality', 'closing', 'downloads']);
    const order = Object.values(grounds);
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i]).not.toBe(order[i - 1]);
    }
  });

  it('holds for a brand with almost nothing', () => {
    const grounds = rhythm(['hero', 'downloads', 'closing']);
    expect(Object.values(grounds)).toHaveLength(3);
    expect(grounds.hero).toBe('deep');
  });

  it('gives the statements the brand’s own colour', () => {
    const grounds = rhythm(['hero', 'introduction', 'personality', 'logo', 'voice', 'closing']);
    // The three sections that are statements rather than specifications.
    expect(grounds.personality).toBe('brand');
    expect(grounds.voice).toBe('brand-2');
    expect(grounds.closing).toBe('brand');
  });
});

describe('the second brand ground', () => {
  it('is never the brand’s white', () => {
    // The failure this exists for: a brand whose recorded secondary is
    // `#FFFFFF` rendered its tone-of-voice section as a plain white page.
    const t = registerFor(brand()) as unknown as { tokens: Record<string, string> };
    expect(t.tokens['--bi-brand-2']).not.toBe('#FFFFFF');
    expect(t.tokens['--bi-brand-2'].toLowerCase()).not.toBe('#ffffff');
  });

  it('is the brand’s real second colour when it has one', () => {
    // `secondaryColor` rather than an `identity` blob: the model reads the
    // CANONICAL brand, and `fromLegacyBrand` builds that from the legacy
    // columns. A fixture that sets only the blob tests the fallback path and
    // quietly passes whatever the code does.
    const b = brand({ secondaryColor: '#3EBFF5' } as Partial<Brand>);
    const t = registerFor(b) as unknown as { tokens: Record<string, string> };
    expect(t.tokens['--bi-brand-2'].toUpperCase()).toBe('#3EBFF5');
  });

  it('carries ink that reads on it', () => {
    const reg = registerFor(brand());
    const tokens = reg.tokens as unknown as Record<string, string>;
    // Chosen against the ground actually used, not against the palette's own
    // secondary — those are frequently different colours.
    expect(['#FFFFFF', '#0B0B0C']).toContain(tokens['--bi-on-brand-2']);
  });
});

describe('the hero field', () => {
  it('is lit only by colours that can carry light', () => {
    const reg = registerFor(brand());
    expect(reg.blooms).toHaveLength(3);
    for (const hex of reg.blooms) {
      // A white bloom over a near-black ground is a grey smear, and black over
      // black is nothing at all.
      expect(hex.toUpperCase()).not.toBe('#FFFFFF');
      expect(hex.toUpperCase()).not.toBe('#000000');
    }
  });

  it('gives a one-colour brand three distinct lights', () => {
    const reg = registerFor(brand());
    expect(new Set(reg.blooms.map((h) => h.toLowerCase())).size).toBe(3);
  });
});

describe('the neutral grounds', () => {
  it('carry the brand’s hue rather than grey', () => {
    const tokens = registerFor(brand()).tokens as unknown as Record<string, string>;
    const panel = tokens['--bi-panel'].replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(panel.slice(i, i + 2), 16));
    // A blue brand's tinted panel must be measurably bluer than it is red —
    // `#FAFAFA` is what the chrome palette produces, and it is the same page
    // for every brand.
    expect(b).toBeGreaterThan(r);
  });
});

describe('a brand that has decided nothing', () => {
  it('gets no brand colour at all', () => {
    /*
     * `brands.primary_color` is NOT NULL, so an untouched brand still carries
     * the `#8A877E` placeholder. Painting a whole page in it is the loudest
     * possible way to present a value nobody chose.
     */
    const b = brand({
      primaryColor: '#8A877E',
      identity: {
        colors: { primary: { hex: '#8A877E' } },
        logos: {},
        typography: { primary: { family: 'system-ui' } },
        voice: { personality: [], doList: [], dontList: [], examples: [] },
        strategy: { values: [], personality: [], aboutSections: [] },
      },
      onboarding: { placeholders: ['colors.primary', 'typography.primary'] },
    } as unknown as Partial<Brand>);
    const reg = registerFor(b);
    expect(reg.branded).toBe(false);
    expect(reg.blooms).toEqual([]);
    expect(reg.wall).toEqual([]);
    const tokens = reg.tokens as unknown as Record<string, string>;
    expect(tokens['--bi-page']).toBe('#FFFFFF');
  });
});

describe('the logo wall', () => {
  it('shows a ground only when a mark actually reads on it', () => {
    const reg = registerFor(brand());
    expect(reg.wall.length).toBeGreaterThan(0);
    for (const cell of reg.wall) {
      expect(cell.url).toBeTruthy();
    }
  });

  it('never repeats a ground a viewer cannot tell from the last one', () => {
    // `#111111` (a palette neutral) and the derived deep ground are both
    // near-black — two cells that would show the same white mark.
    const reg = registerFor(brand());
    const hexes = reg.wall.map((c) => c.hex.toLowerCase());
    expect(new Set(hexes).size).toBe(hexes.length);
    expect(reg.wall.length).toBeLessThanOrEqual(6);
  });

  it('is empty when the brand has no mark', () => {
    const reg = registerFor(brand({ logoSystem: {}, brandAssets: [] } as Partial<Brand>));
    expect(reg.wall).toEqual([]);
  });
});
