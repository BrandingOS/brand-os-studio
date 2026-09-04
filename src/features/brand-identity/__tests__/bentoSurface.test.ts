/**
 * Bento inside the identity document.
 *
 * Two things are being defended here, and both are things the page got wrong
 * before:
 *
 *   Bento is NOT part of the navigation. It was a launcher in the nav card,
 *   which put a tool in the table of contents of a document. The nav lists
 *   `presentSections`, so the guard is that no section id is ever a bento.
 *
 *   The wall does not INVENT. The maker's content roll falls back to sample
 *   copy — "12k+ Customers", "Design is intelligence made visible." — which is
 *   right in a maker and is the one thing `Applied.tsx` says this page will
 *   never do. A client cannot tell invented copy from the brand's own.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { buildIdentityModel, presentSections, SECTION_LABEL } from '../identityModel';
import { buildRegister } from '../identityRegister';
import { buildIdentityBento } from '../sections/BentoSurface';
import { getTemplate } from '@/features/bento/templates';

const SVG = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E';

const asset = (id: string) => ({
  id,
  kind: 'logo' as const,
  name: id,
  formats: { svg: { url: SVG, size: 1 } },
  metadata: {},
});

function brand(over: Partial<Brand> = {}): Brand {
  return {
    id: 'b-kaafex',
    slug: 'kaafex',
    name: 'Kaafex',
    primaryColor: '#1934EE',
    secondaryColor: '#F36123',
    fonts: { primary: 'Fraunces' },
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    logoSystem: { primary: { assetId: 'a1' } },
    brandAssets: [asset('a1')],
    identity: {
      colors: {
        primary: { hex: '#1934EE' },
        secondary: { hex: '#F36123' },
        neutrals: [{ hex: '#111111' }, { hex: '#EFEFEF' }],
      },
      logos: {},
      typography: { primary: { family: 'Fraunces' } },
      voice: { personality: [], doList: [], dontList: [], examples: [] },
      strategy: { values: [], personality: [], aboutSections: [] },
    },
    ...over,
  } as unknown as Brand;
}

function bentoFor(b: Brand) {
  const model = buildIdentityModel({ brand: b });
  const register = buildRegister(model, presentSections(model));
  return { model, design: buildIdentityBento(model, register) };
}

describe('bento is not a navigation entry', () => {
  it('is not one of the sections the nav lists', () => {
    const { model } = bentoFor(brand());
    // `presentSections` IS the nav's list — see `IdentityNav`.
    for (const id of presentSections(model)) {
      expect(id).not.toMatch(/bento/i);
      expect(SECTION_LABEL[id]).not.toMatch(/bento/i);
    }
  });

  it('has no label in the section vocabulary at all', () => {
    // Stronger than the above: a bento section id could not be added without
    // this failing, even before any brand happens to have one.
    expect(Object.keys(SECTION_LABEL).join(' ')).not.toMatch(/bento/i);
  });
});

describe('the wall the identity page draws', () => {
  it('is the maker’s own design — a real template, at its real size', () => {
    const { design } = bentoFor(brand());
    const template = getTemplate(design.templateId);
    // `getTemplate` falls back to TEMPLATES[0] for an unknown id, so an id it
    // does not know would silently pass — compare the geometry too.
    expect(template.id).toBe(design.templateId);
    expect(design.tiles).toHaveLength(template.tiles.length);
    expect(design.cols).toBe(template.cols);
    expect(design.rows).toBe(template.rows);
  });

  it('only ever draws landscape layouts', () => {
    // A 9:16 story template in a wide page band is a column of stamps.
    for (const id of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8']) {
      const { design } = bentoFor(brand({ id }));
      expect(getTemplate(design.templateId).preferredAspect).toBe('landscape');
    }
  });

  it('is the same wall every time — a document does not reshuffle as you read it', () => {
    const a = bentoFor(brand()).design;
    const b = bentoFor(brand()).design;
    expect(b.tiles).toEqual(a.tiles);
  });

  it('gives two brands two different walls', () => {
    const a = bentoFor(brand({ id: 'b-one', name: 'One' })).design;
    const b = bentoFor(brand({ id: 'b-two', name: 'Two' })).design;
    expect([a.templateId, JSON.stringify(a.tiles)]).not.toEqual([
      b.templateId,
      JSON.stringify(b.tiles),
    ]);
  });

  it('never asks for a tile kind that invents its own content', () => {
    // `stat` is ALWAYS SAMPLE_STATS and `text` is always SAMPLE_TEXT — neither
    // reads the brand at all.
    for (const id of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8']) {
      const { design } = bentoFor(brand({ id }));
      for (const tile of design.tiles) {
        expect(tile.kind).not.toBe('stat');
        expect(tile.kind).not.toBe('text');
      }
    }
  });

  it('stands a voice tile down when the brand has no recorded voice', () => {
    // Otherwise `resolveContent` hands it a line out of SAMPLE_QUOTES and the
    // page presents it as something this brand said.
    const { design } = bentoFor(brand());
    expect(design.tiles.some((t) => t.kind === 'voice-quote')).toBe(false);
  });

  it('lets a voice tile through when the words are the brand’s own', () => {
    // Recorded the way the maker's own roll reads voice — the legacy path.
    // Recording it canonically instead is the case the next test covers.
    const speaking = brand({
      id: 'b-voice',
      guidelines: {
        voiceAndTone: { brandVoice: 'Built for the long way round.', examples: [] },
      },
    } as unknown as Partial<Brand>);
    const { design } = bentoFor(speaking);
    for (const t of design.tiles.filter((x) => x.kind === 'voice-quote')) {
      expect(t.content.text).toBe('Built for the long way round.');
    }
  });

  it('never quotes a brand whose voice the roll cannot see', () => {
    // The roll reads `guidelines.voiceAndTone`; the identity model reads
    // `identity.voice`. A brand recorded canonically therefore has a voice the
    // page knows about and the roll does not — and used to be given one of
    // SAMPLE_QUOTES to say. This is that brand.
    const canonical = brand({
      id: 'b-canonical',
      identity: {
        ...((brand().identity ?? {}) as Record<string, unknown>),
        voice: {
          personality: [],
          doList: [],
          dontList: [],
          examples: [{ good: 'Built for the long way round.' }],
        },
      },
    } as unknown as Partial<Brand>);
    const { design } = bentoFor(canonical);
    for (const t of design.tiles.filter((x) => x.kind === 'voice-quote')) {
      expect(t.content.text).not.toMatch(/Design is intelligence|Clarity over cleverness|Every detail, on purpose|Make it simple|Bold, warm|Built for the curious/);
    }
  });

  it('stands the wall on the page’s own paper, not on white', () => {
    const { design } = bentoFor(brand());
    expect(design.backgroundColor.toLowerCase()).not.toBe('#ffffff');
  });
});
