/**
 * Onboarding persists. Everything, to its canonical home, as it happens.
 *
 * This file exists because it once did not. A user completed every stage,
 * pressed "Open my brand", and arrived at a brand that held its name and very
 * little else. Four separate causes, each pinned below:
 *
 *   1. A canonical strategy write did not survive being read back — the value
 *      was durable in the identity blob and the reader never looked there.
 *   2. Finishing patched `businessInfo`, which is one stored value, so the last
 *      act of onboarding deleted the industry, slogan, products and audience
 *      the understanding pass had already saved.
 *   3. The review's own edits — colours, typefaces, logo slots, links, files,
 *      strategy sections — lived only in a transient store that Finish resets.
 *   4. Material reached the Library holding an object URL, which resolves to
 *      nothing the moment the page it was minted on goes away.
 *
 * The last test is the whole flow end to end, through a repository that stores
 * what the real one stores: the LEGACY shape. That round trip is what made
 * cause 1 invisible to every test that held a canonical brand in memory.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import { fromLegacyBrand, toLegacyBrandPatch } from '@/domain/brand';
import type { BrandRepository } from '@/domain/brand/repository';
import type { Brand } from '@/shared/types/brand';
import type { Asset } from '@/shared/types/brand';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core/types/services';
import { CORE_PLACEHOLDERS, startedState } from '@/shared/onboarding/onboardingState';

import { finishOnboarding } from '../understanding/finish';
import { applyBusinessFacts, applyProposals } from '../understanding/applyProposals';
import { roleForSlot, logoSystemPatch } from '../understanding/material';
import {
  createReviewWriter,
  linkKindOf,
  linksOf,
  materialOf,
  paletteOf,
  websiteOf,
} from '../bridge/reviewWriteThrough';

// ── A repository that stores what the real one stores ────────────────────
//
// `BrandServiceRepository` projects the canonical brand THROUGH the legacy
// shape on every save and reads it back the same way. A test repo that keeps
// the canonical object in memory proves nothing about persistence, because the
// projection is exactly where values were being dropped.
class LegacyRoundTripRepo implements BrandRepository {
  rows = new Map<string, Brand>();

  seed(brand: Brand) {
    this.rows.set(brand.id, brand);
  }

  async getById(id: string): Promise<CanonicalBrand | null> {
    const row = this.rows.get(id);
    return row ? fromLegacyBrand(JSON.parse(JSON.stringify(row)) as Brand) : null;
  }

  async getBySlug(): Promise<CanonicalBrand | null> {
    return null;
  }

  async save(brand: CanonicalBrand): Promise<CanonicalBrand> {
    const current = this.rows.get(brand.id);
    // Shallow merge — precisely what `IBrandsService.update` does.
    this.rows.set(brand.id, { ...(current as Brand), ...toLegacyBrandPatch(brand) });
    return (await this.getById(brand.id))!;
  }
}

/** A Library that behaves like the real one: it stores the url it is given. */
class FakeLibrary {
  items: Asset[] = [];
  async listLibrary() {
    return this.items;
  }
  async create(input: Record<string, unknown>) {
    const item = { ...input, id: (input.id as string) ?? `lib-${this.items.length + 1}` } as Asset;
    this.items.push(item);
    return item;
  }
  async update(id: string, patch: Record<string, unknown>) {
    const idx = this.items.findIndex((a) => a.id === id);
    this.items[idx] = { ...this.items[idx], ...patch } as Asset;
    return this.items[idx];
  }
}

/**
 * A brand as it exists a moment after the name was typed.
 *
 * The two sentinels are the real thing: `primary_color` is NOT NULL and the
 * canonical schema demands a family, so a brand that has decided nothing still
 * carries a stand-in in both places, and the marker says which.
 */
function legacyBrand(): Brand {
  return {
    id: 'b1',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: CORE_PLACEHOLDERS['colors.primary'],
    fonts: { primary: CORE_PLACEHOLDERS['typography.primary'] },
    assets: [],
    createdAt: new Date('2026-08-16T00:00:00Z'),
    updatedAt: new Date('2026-08-16T00:00:00Z'),
    onboarding: startedState(['colors.primary', 'typography.primary']),
  } as unknown as Brand;
}

function file(name: string, body = name, type = 'image/svg+xml'): File {
  return new File([`<svg xmlns="http://www.w3.org/2000/svg"><title>${body}</title></svg>`], name, {
    type,
  });
}

// ── 1 — the round trip ───────────────────────────────────────────────────

describe('a canonical write survives being read back', () => {
  it('keeps the whole strategy, not just the mission', async () => {
    const repo = new LegacyRoundTripRepo();
    repo.seed(legacyBrand());

    await applyProposals(repo, 'b1', [
      { corePath: 'strategy.summary', value: 'A studio for small makers', provenance: 'ai-suggested', evidence: 'your brand profile' },
      { corePath: 'strategy.mission', value: 'Make good work reachable', provenance: 'ai-suggested', evidence: 'your brand profile' },
      { corePath: 'strategy.positioning', value: 'The considered alternative', provenance: 'ai-suggested', evidence: 'your brand profile' },
      { corePath: 'strategy.targetAudience', value: 'Independent makers', provenance: 'ai-suggested', evidence: 'your brand profile' },
      { corePath: 'strategy.values', value: ['craft', 'clarity'], provenance: 'ai-suggested', evidence: 'your brand profile' },
      { corePath: 'strategy.personality', value: ['warm'], provenance: 'ai-suggested', evidence: 'your brand profile' },
    ]);

    const back = await repo.getById('b1');
    const s = back!.identity.strategy;
    // Before the fix, only `mission` was here — it has a legacy scalar and the
    // others do not.
    expect(s.summary).toBe('A studio for small makers');
    expect(s.mission).toBe('Make good work reachable');
    expect(s.positioning).toBe('The considered alternative');
    expect(s.targetAudience).toBe('Independent makers');
    expect(s.values).toEqual(['craft', 'clarity']);
    expect(s.personality).toEqual(['warm']);
  });

  it('lets a legacy writer keep precedence over the blob', async () => {
    const repo = new LegacyRoundTripRepo();
    repo.seed(legacyBrand());
    await applyProposals(repo, 'b1', [
      { corePath: 'strategy.mission', value: 'From the blob', provenance: 'inferred', evidence: 'x' },
    ]);
    // Setup and Classic write `guidelines.strategy` directly. That is still the
    // read-home, so it wins — the backfill can only recover, never revert.
    const row = repo.rows.get('b1')!;
    repo.rows.set('b1', {
      ...row,
      guidelines: { strategy: { mission: 'From Setup' } },
    } as Brand);

    expect((await repo.getById('b1'))!.identity.strategy.mission).toBe('From Setup');
  });

  it('keeps colours and typefaces through the same trip', async () => {
    const repo = new LegacyRoundTripRepo();
    repo.seed(legacyBrand());
    await applyProposals(repo, 'b1', [
      { corePath: 'colors.primary', value: { hex: '#FFCC00' }, provenance: 'inferred', evidence: 'your artwork' },
      { corePath: 'colors.secondary', value: { hex: '#111111' }, provenance: 'inferred', evidence: 'your artwork' },
      { corePath: 'colors.neutrals', value: [{ hex: '#EEEEEE' }], provenance: 'inferred', evidence: 'your artwork' },
      { corePath: 'typography.primary', value: { family: 'Söhne' }, provenance: 'inferred', evidence: 'your files' },
      { corePath: 'typography.secondary', value: { family: 'Lyon' }, provenance: 'inferred', evidence: 'your files' },
    ]);

    const back = (await repo.getById('b1'))!;
    expect(back.identity.colors.primary.hex).toBe('#FFCC00');
    expect(back.identity.colors.secondary?.hex).toBe('#111111');
    expect(back.identity.colors.neutrals?.map((n) => n.hex)).toEqual(['#EEEEEE']);
    expect(back.identity.typography.primary.family).toBe('Söhne');
    expect(back.identity.typography.secondary?.family).toBe('Lyon');
  });
});

// ── 2 — finishing writes nothing but the marker ──────────────────────────

describe('finishing is not a commit pass', () => {
  it('touches only the onboarding marker', async () => {
    const patches: Array<Record<string, unknown>> = [];
    await finishOnboarding({
      brand: legacyBrand(),
      updateBrand: async (_id, patch) => {
        patches.push(patch as Record<string, unknown>);
      },
    });

    expect(patches).toHaveLength(1);
    // Anything else here would be a value saved in the wrong place — and
    // `businessInfo` in particular REPLACES what the understanding pass wrote.
    expect(Object.keys(patches[0])).toEqual(['onboarding']);
  });

  it('cannot be handed business info to write', () => {
    // A compile-time guarantee, asserted at runtime so it is visible: the
    // field is gone from the contract, so no caller can reintroduce the clobber.
    const input: Record<string, unknown> = { brand: legacyBrand(), updateBrand: async () => {} };
    expect('businessInfo' in input).toBe(false);
  });
});

// ── 3 — reading the review back out ──────────────────────────────────────

describe('what the review says the brand is', () => {
  const items = [
    { id: 'c1', kind: 'color', value: '#ffcc00', name: '#ffcc00' },
    { id: 'c2', kind: 'color', value: '#111111', name: '#111111' },
    { id: 'l1', kind: 'link', sourceUrl: 'https://meridian.studio', socialPlatform: 'website', handle: 'meridian.studio', name: 'x' },
    { id: 'l2', kind: 'link', sourceUrl: 'https://behance.net/meridian', socialPlatform: 'behance', handle: '@meridian', name: 'y' },
    { id: 'i1', kind: 'image', name: 'logo.svg', isLogo: true, previewUrl: 'blob:x' },
    { id: 'f1', kind: 'font', name: 'Söhne-Regular.otf', _file: file('Söhne-Regular.otf') },
    // A Google font is a NAME the user picked. There are no bytes to store.
    { id: 'f2', kind: 'font', name: 'Inter', fontSource: 'google' },
  ] as unknown as OnboardingAsset[];

  it('reads the palette in Core order, capped at five', () => {
    expect(paletteOf(items)).toEqual(['#FFCC00', '#111111']);
  });

  it('puts the swatch the user marked primary first', () => {
    // "Set primary" marks a swatch beside the list rather than moving it. A
    // reader that went by array order saw a button that did nothing.
    expect(paletteOf(items, 'c2')).toEqual(['#111111', '#FFCC00']);
  });

  it('keeps a platform Business Info does not name, as other', () => {
    const links = linksOf(items)!;
    expect(links).toEqual([
      { kind: 'website', url: 'https://meridian.studio', label: 'meridian.studio' },
      { kind: 'other', url: 'https://behance.net/meridian', label: '@meridian' },
    ]);
  });

  it('recognises the brand\'s own address from the url alone', () => {
    // The dropzone's URL pill records no platform. Every reader that asked for
    // one found nothing, so the website the user typed on the second screen
    // never became `publicUrl` and never reached Business Info.
    const unmarked = (url: string) =>
      ({ id: 'x', kind: 'link', sourceUrl: url, name: url }) as unknown as OnboardingAsset;

    expect(linkKindOf(unmarked('https://meridian.studio'))).toBe('website');
    expect(linkKindOf(unmarked('https://www.linkedin.com/company/meridian'))).toBe('linkedin');
    expect(linkKindOf(unmarked('https://x.com/meridian'))).toBe('x');
    expect(linkKindOf(unmarked('https://twitter.com/meridian'))).toBe('x');
    expect(linkKindOf(unmarked('https://behance.net/meridian'))).toBe('other');
    expect(websiteOf([unmarked('https://behance.net/m'), unmarked('https://meridian.studio')])).toBe(
      'https://meridian.studio',
    );
  });

  it('sends files to the Library and leaves colours and links out of it', () => {
    expect(materialOf(items).map((a) => a.id)).toEqual(['i1', 'f1']);
  });

  it('maps a slot to the role that names the same artwork', () => {
    expect(roleForSlot('primary')).toBe('primary');
    expect(roleForSlot('mark')).toBe('iconmark');
    expect(roleForSlot('wordmark')).toBe('wordmark');
    expect(roleForSlot('vertical')).toBe('stacked');
    // "the logo for dark grounds" IS the light artwork.
    expect(roleForSlot('dark')).toBe('mono.white');
    // A name the user invented has no canonical slot to claim.
    expect(roleForSlot('custom:seasonal')).toBeUndefined();
  });

  it('writes refs, never a url, onto the brand record', () => {
    const patch = logoSystemPatch(legacyBrand(), [
      { role: 'primary', assetId: 'lib-1' },
      { role: 'iconmark', assetId: 'lib-2' },
    ]);
    expect(patch.logoSystem?.primary).toEqual({ assetId: 'lib-1' });
    expect(patch.logoSystem?.iconmark).toEqual({ assetId: 'lib-2' });
    expect(JSON.stringify(patch)).not.toContain('data:');
    expect(JSON.stringify(patch)).not.toContain('blob:');
  });
});

// ── 4 — the whole review, written through ────────────────────────────────

describe('every review edit reaches the brand', () => {
  let repo: LegacyRoundTripRepo;
  let lib: FakeLibrary;

  beforeEach(() => {
    repo = new LegacyRoundTripRepo();
    repo.seed(legacyBrand());
    lib = new FakeLibrary();
    container.register(SERVICE_KEYS.BRAND_REPOSITORY, () => repo);
    container.register(SERVICE_KEYS.ASSETS, () => lib);
  });

  it('stores material, places logos, and saves colours, fonts, links and sections', async () => {
    const updates: Array<Partial<Brand>> = [];
    const writer = createReviewWriter({
      brandId: 'b1',
      brand: () => repo.rows.get('b1'),
      updateBrand: async (id, patch) => {
        updates.push(patch);
        repo.rows.set(id, { ...(repo.rows.get(id) as Brand), ...patch });
      },
      actor: { kind: 'human', userId: 'u1' },
    });

    const items = [
      {
        id: 'i1',
        kind: 'image',
        name: 'meridian-primary.svg',
        isLogo: true,
        logoSlot: 'primary',
        uploadStatus: 'done',
        previewUrl: 'blob:whatever',
        _file: file('meridian-primary.svg'),
      },
      {
        id: 'i2',
        kind: 'image',
        name: 'meridian-mark.svg',
        isLogo: true,
        logoSlot: 'mark',
        uploadStatus: 'done',
        previewUrl: 'blob:whatever',
        _file: file('meridian-mark.svg'),
      },
      { id: 'c1', kind: 'color', value: '#FFCC00', name: '#FFCC00', uploadStatus: 'done' },
      { id: 'c2', kind: 'color', value: '#111111', name: '#111111', uploadStatus: 'done' },
      { id: 'c3', kind: 'color', value: '#F5F5F0', name: '#F5F5F0', uploadStatus: 'done' },
      // An uploaded typeface: bytes, so the Library holds it.
      { id: 'f1', kind: 'font', name: 'Söhne', uploadStatus: 'done', _file: file('Sohne.otf', 'sohne', 'font/otf') },
      // A Google font: a name the user picked, with nothing to store.
      { id: 'f2', kind: 'font', name: 'Lyon', fontSource: 'google', uploadStatus: 'done' },
      {
        id: 'l1',
        kind: 'link',
        sourceUrl: 'https://meridian.studio',
        socialPlatform: 'website',
        handle: 'meridian.studio',
        name: 'meridian.studio',
        uploadStatus: 'done',
      },
    ] as unknown as OnboardingAsset[];

    const notSaved = await writer.persist({
      items,
      aboutSections: [{ id: 's1', name: 'Origin', content: 'Started in a garage.' }],
    });
    expect(notSaved).toEqual([]);

    // Material is in the Library, and holds bytes rather than a page-lifetime
    // handle to them.
    expect(lib.items).toHaveLength(3);
    for (const a of lib.items) {
      expect(a.url.startsWith('blob:')).toBe(false);
      expect(a.url.length).toBeGreaterThan(0);
    }

    const back = (await repo.getById('b1'))!;

    // Logos — references into the Library, in the roles the slots name.
    expect(back.identity.logos.primary?.assetId).toBe(writer.assetIdFor('i1'));
    expect(back.identity.logos.iconmark?.assetId).toBe(writer.assetIdFor('i2'));

    // Colours and typefaces — the user's, so confirmed.
    expect(back.identity.colors.primary.hex).toBe('#FFCC00');
    expect(back.identity.colors.secondary?.hex).toBe('#111111');
    expect(back.identity.colors.neutrals?.map((n) => n.hex)).toEqual(['#F5F5F0']);
    expect(back.identity.typography.primary.family).toBe('Söhne');
    expect(back.identity.typography.secondary?.family).toBe('Lyon');
    expect(back.identityMeta?.['colors.primary']?.authority).toBe('confirmed');
    expect(back.identityMeta?.['typography.primary']?.authority).toBe('confirmed');

    // Links and the free-form sections.
    expect(back.businessInfo?.links?.[0]?.url).toBe('https://meridian.studio');
    expect(back.businessInfo?.contact?.website).toBe('https://meridian.studio');
    expect(back.identity.strategy.aboutSections).toEqual([
      { id: 's1', title: 'Origin', content: 'Started in a garage.' },
    ]);
  });

  it('keeps a typeface the product merely suggested at suggested', async () => {
    const writer = createReviewWriter({
      brandId: 'b1',
      brand: () => repo.rows.get('b1'),
      updateBrand: async () => {},
      actor: { kind: 'human', userId: 'u1' },
    });

    await writer.persist({
      items: [
        { id: 'f1', kind: 'font', name: 'Fraunces', uploadStatus: 'done' },
        { id: 'f2', kind: 'font', name: 'Inter', uploadStatus: 'done' },
      ] as unknown as OnboardingAsset[],
      aboutSections: [],
      suggestedFonts: ['Fraunces', 'Inter'],
    });

    const back = (await repo.getById('b1'))!;
    // It PERSISTS — the review showed it, so it has to exist…
    expect(back.identity.typography.primary.family).toBe('Fraunces');
    // …and it is still only a suggestion.
    expect(back.identityMeta?.['typography.primary']?.authority).toBe('suggested');
  });

  it('writes nothing at all when nothing changed', async () => {
    const make = () =>
      createReviewWriter({
        brandId: 'b1',
        brand: () => repo.rows.get('b1'),
        updateBrand: async (id, patch) => {
          repo.rows.set(id, { ...(repo.rows.get(id) as Brand), ...patch });
        },
        actor: { kind: 'human', userId: 'u1' },
      });

    const items = [
      { id: 'c1', kind: 'color', value: '#FFCC00', name: '#FFCC00', uploadStatus: 'done' },
    ] as unknown as OnboardingAsset[];

    await make().persist({ items, aboutSections: [] });
    const afterFirst = JSON.stringify(repo.rows.get('b1'));

    const save = vi.spyOn(repo, 'save');
    await make().persist({ items, aboutSections: [] });
    expect(save).not.toHaveBeenCalled();
    expect(JSON.stringify(repo.rows.get('b1'))).toBe(afterFirst);
  });

  it('does not lose the business facts already saved', async () => {
    // The exact sequence that emptied the brand: understanding saves the facts,
    // then finishing runs.
    await applyBusinessFacts(repo, 'b1', {
      industry: 'design',
      tagline: 'Considered work',
      description: 'Identity, packaging',
      audienceSummary: 'Independent makers',
      website: 'https://meridian.studio',
    });

    await finishOnboarding({
      brand: repo.rows.get('b1')!,
      updateBrand: async (id, patch) => {
        repo.rows.set(id, { ...(repo.rows.get(id) as Brand), ...patch });
      },
    });

    const back = (await repo.getById('b1'))!;
    expect(back.businessInfo?.industry).toBe('design');
    expect(back.businessInfo?.tagline).toBe('Considered work');
    expect(back.businessInfo?.description).toBe('Identity, packaging');
    expect(back.businessInfo?.audienceSummary).toBe('Independent makers');
    expect(back.businessInfo?.contact?.website).toBe('https://meridian.studio');
  });
});
