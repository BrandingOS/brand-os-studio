/**
 * Setup shows, and can change, everything the onboarding review collected.
 *
 * The two surfaces read the same brand and had drifted apart badly: Setup
 * carried five free-form About cards and nothing else, so a user who answered
 * eleven questions during onboarding opened their brand and found none of the
 * answers. Worse, the answers were still on the record — Setup was reading
 * `guidelines.strategy`, a mirror nothing has written since the canonical ops
 * took over.
 *
 * These tests pin the parity in both directions: everything the review holds
 * comes OUT of `brandToMockBrand`, and everything Setup changes goes back IN
 * through `mockBrandToPatch` + the store's canonical routing.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { fromLegacyBrand, toLegacyBrandPatch } from '@/domain/brand';
import { applyCorePatch, splitCorePatch } from '@/shared/store/routeCoreWrite';
import type { BrandRepository } from '@/domain/brand/repository';
import type { CanonicalBrand } from '@/domain/brand';
import { brandToMockBrand } from '../brandToMockBrand';
import { mockBrandToPatch } from '../mockBrandToPatch';
import { STRATEGY_CARDS, contentOf } from '../strategyCards';
import type { MockBrand } from '../mockBrand';

class Repo implements BrandRepository {
  constructor(public row: Brand) {}
  async getById() {
    return fromLegacyBrand(JSON.parse(JSON.stringify(this.row)) as Brand);
  }
  async getBySlug() {
    return null;
  }
  async save(b: CanonicalBrand) {
    this.row = { ...this.row, ...toLegacyBrandPatch(b) };
    return (await this.getById())!;
  }
}

/** A brand as onboarding leaves it: every answer given, all of them canonical. */
function onboardedBrand(): Brand {
  return {
    id: 'b1',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: '#FFCC00',
    secondaryColor: '#111111',
    neutrals: ['#F5F5F0'],
    fonts: { primary: 'Fraunces', secondary: 'Inter' },
    tone: 'warm',
    publicUrl: 'https://meridian.studio',
    assets: [],
    createdAt: new Date('2026-08-16T00:00:00Z'),
    updatedAt: new Date('2026-08-16T00:00:00Z'),
    logoSystem: { primary: { assetId: 'a1' }, mono: { white: { assetId: 'a2' } } },
    brandAssets: [
      { id: 'a1', kind: 'logo', name: 'primary', formats: { svg: { url: 'data:image/svg+xml,A', size: 1 } }, metadata: {} },
      { id: 'a2', kind: 'logo', name: 'on dark', formats: { svg: { url: 'data:image/svg+xml,B', size: 1 } }, metadata: {} },
    ],
    businessInfo: {
      // Not a vocabulary member — the user's own wording, kept verbatim.
      industry: 'Design',
      tagline: 'Made with intent',
      description: 'Brand identity, packaging design',
      audienceSummary: 'Independent makers',
      contact: { website: 'https://meridian.studio' },
      links: [
        { kind: 'website', url: 'https://meridian.studio' },
        { kind: 'linkedin', url: 'https://linkedin.com/company/meridian', label: 'meridian' },
      ],
    },
    identity: {
      colors: { primary: { hex: '#FFCC00' } },
      logos: {},
      typography: { primary: { family: 'Fraunces' } },
      voice: { tone: 'warm', personality: [], doList: [], dontList: [], examples: [] },
      visualStyle: { descriptors: ['minimal', 'modern'] },
      strategy: {
        summary: 'A studio for independent makers.',
        mission: 'Make good work reachable',
        vision: 'Every maker looks considered',
        positioning: 'The considered alternative',
        targetAudience: 'Independent makers',
        personality: ['warm', 'confident'],
        values: ['craftsmanship', 'transparency'],
        aboutSections: [{ id: 's1', title: 'Origin', content: 'Started in a garage.' }],
      },
    },
  } as unknown as Brand;
}

describe('the review’s answers reach Setup', () => {
  const mock = brandToMockBrand(onboardedBrand());

  it('shows all eleven strategy fields', () => {
    const answered = STRATEGY_CARDS.map((c) => [c.name, contentOf(c, mock.strategy)] as const);
    expect(Object.fromEntries(answered)).toEqual({
      'Brand summary': 'A studio for independent makers.',
      Industry: 'Design',
      'Products / Services': 'Brand identity, packaging design',
      Audience: 'Independent makers',
      Positioning: 'The considered alternative',
      Mission: 'Make good work reachable',
      Personality: 'Warm · Confident',
      Tone: 'Warm',
      'Visual style': 'Minimal · Modern',
      'Core values': 'Craftsmanship · Transparency',
      Slogan: 'Made with intent',
    });
  });

  it('keeps the free-form sections, and only those', () => {
    // Mission used to arrive here AND as a strategy field, each editing a
    // different place. Only headings the eleven cannot hold live here now.
    expect(mock.about).toEqual([{ id: 'origin', title: 'Origin', content: 'Started in a garage.' }]);
  });

  it('shows the website and the other links', () => {
    expect(mock.websites.map((w) => w.url)).toEqual(['https://meridian.studio']);
    expect(mock.links).toEqual([
      { id: 'link-0', kind: 'linkedin', url: 'https://linkedin.com/company/meridian', label: 'meridian' },
    ]);
  });

  it('carries every logo tile with the role it holds', () => {
    expect(mock.logos.map((l) => [l.id, l.role, l.variant])).toEqual([
      ['primary', 'primary', 'light'],
      ['on-dark', 'mono.white', 'dark'],
    ]);
  });

  it('shows the On-dark artwork as uploaded, on a dark ground', () => {
    const onDark = mock.logos.find((l) => l.id === 'on-dark')!;
    // The tile paints a dark rect and embeds the artwork untouched. Nothing
    // here — and nothing in the stylesheet — may recolour the drawing.
    expect(onDark.svg).toContain('fill="#111113"');
    expect(onDark.svg).toContain('data:image/svg+xml,B');
    expect(onDark.svg).not.toContain('invert');
  });
});

describe('what Setup changes goes back to the brand', () => {
  async function save(edit: (m: MockBrand) => MockBrand) {
    const repo = new Repo(onboardedBrand());
    const next = edit(brandToMockBrand(repo.row));
    const patch = mockBrandToPatch(next, repo.row);
    // Exactly what `brandStore.update` does: split, route the Core half through
    // the canonical ops, apply the rest.
    const { core, rest, routedKeys } = splitCorePatch(patch);
    if (routedKeys.length) await applyCorePatch(repo, 'b1', core);
    repo.row = { ...repo.row, ...rest };
    return { repo, back: await repo.getById() };
  }

  it('saves a prose answer', async () => {
    const { back } = await save((m) => ({
      ...m,
      strategy: { ...m.strategy, mission: 'Make good work ordinary' },
    }));
    expect(back!.identity.strategy.mission).toBe('Make good work ordinary');
  });

  it('saves the summary, which has no legacy home at all', async () => {
    const { back } = await save((m) => ({
      ...m,
      strategy: { ...m.strategy, summary: 'A different studio.' },
    }));
    expect(back!.identity.strategy.summary).toBe('A different studio.');
  });

  it('saves a vocabulary answer', async () => {
    const { back } = await save((m) => ({
      ...m,
      strategy: { ...m.strategy, values: ['quality', 'integrity'], tone: 'direct' },
    }));
    expect(back!.identity.strategy.values).toEqual(['quality', 'integrity']);
    expect(back!.identity.voice.tone).toBe('direct');
  });

  it('saves the style words', async () => {
    const { back } = await save((m) => ({
      ...m,
      strategy: { ...m.strategy, style: ['bold', 'geometric'] },
    }));
    expect(back!.identity.visualStyle?.descriptors).toEqual(['bold', 'geometric']);
  });

  it('saves the business facts without deleting the rest of Business Info', async () => {
    const { back } = await save((m) => ({
      ...m,
      strategy: { ...m.strategy, slogan: 'Considered work', industry: 'retail' },
    }));
    expect(back!.businessInfo?.tagline).toBe('Considered work');
    expect(back!.businessInfo?.industry).toBe('retail');
    // `businessInfo` is one stored value, so a patch replaces it — these are
    // what a careless assign would have deleted.
    expect(back!.businessInfo?.description).toBe('Brand identity, packaging design');
    expect(back!.businessInfo?.audienceSummary).toBe('Independent makers');
    expect(back!.businessInfo?.contact?.website).toBe('https://meridian.studio');
    expect(back!.businessInfo?.links).toHaveLength(2);
  });

  it('saves a free-form section', async () => {
    const { back } = await save((m) => ({
      ...m,
      about: [...m.about, { id: 'promise', title: 'Promise', content: 'We answer in a day.' }],
    }));
    expect(back!.identity.strategy.aboutSections?.map((s) => s.title)).toEqual([
      'Origin',
      'Promise',
    ]);
  });

  it('never writes the generated neutral ladder back as brand colours', async () => {
    const brand = onboardedBrand();
    const mock = brandToMockBrand(brand);
    // The ladder is 32 pure greys the page draws for every brand.
    expect(mock.colors.grey).toHaveLength(32);
    const patch = mockBrandToPatch(mock, brand);
    // A no-op save must not touch neutrals at all…
    expect(patch.neutrals).toBeUndefined();
    // …and a real edit sends only what the brand owns.
    const edited = mockBrandToPatch(
      { ...mock, colors: { ...mock.colors, core: [...mock.colors.core, { hex: '#E9E4D8', name: 'Sand' }] } },
      brand,
    );
    expect(edited.neutrals).toEqual(['#F5F5F0', '#E9E4D8']);
  });

  it('changes nothing when nothing was edited', async () => {
    const brand = onboardedBrand();
    const patch = mockBrandToPatch(brandToMockBrand(brand), brand);
    // A no-op save must not restate values as freshly decided — that would
    // stamp every field's authority on every visit to the page.
    expect(patch.guidelines).toBeUndefined();
    expect(patch.businessInfo).toBeUndefined();
    expect(patch.tone).toBeUndefined();
    expect(patch.visualStyle).toBeUndefined();
  });

  it('moves exactly the slot a swap points at', async () => {
    const { repo } = await save((m) => ({
      ...m,
      logos: m.logos.map((l) =>
        l.id === 'on-dark'
          ? { ...l, id: 'wordmark', label: 'Wordmark', variant: 'light', role: 'wordmark' }
          : l,
      ),
    }));
    const logos = repo.row.logoSystem!;
    expect(logos.wordmark?.assetId).toBeTruthy();
    // The tile moved; it did not also stay where it was, and it did not leave
    // copies in the slots the label heuristics used to guess at either.
    expect(logos.mono?.white).toBeUndefined();
    expect(logos.iconmark).toBeUndefined();
    expect(logos.secondary).toBeUndefined();
    expect(repo.row.logoAssets?.light).toBeUndefined();
  });
});
