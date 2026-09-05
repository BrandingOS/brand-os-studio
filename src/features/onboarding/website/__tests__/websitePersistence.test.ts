/**
 * The website pass through the REAL local service stack: what lands on the
 * canonical brand, under which agent, at which authority — and what a rescan
 * may and may not change.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { bootServices } from '@/core/boot';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { coreValueMeta } from '@/domain/brand';
import { useBrandStore } from '@/shared/store/brandStore';
import { understand, WEBSITE_SCAN } from '../../bridge/v4Bridge';
import { buildCreateInput } from '../../understanding/createBrand';
import { acceptProposal, editValue } from '../../understanding/acceptance';
import { enrichmentCandidates, type EnrichmentResult } from '../enrich';
import { EVIDENCE } from './fromWebsite.test';
import type { Brand } from '@/shared/types/brand';

const HUMAN = { kind: 'human' as const, userId: 'u1' };

const inference: EnrichmentResult = {
  fields: {
    summary: { value: 'A Copenhagen architecture practice.', basis: 'extracted', quote: 'an architecture practice in Copenhagen' },
    tone: { value: 'Calm', basis: 'inferred' },
    mission: { value: 'Homes that age well.', basis: 'generated' },
  },
  unclear: [], routing: { tier: 'haiku', reason: 'default', thin: false, skip: false }, calls: 1, ms: 5,
};

async function freshBrand() {
  const brands = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
  const created = (await brands.create(buildCreateInput({ name: 'Northwind Studio', website: 'https://northwind.studio' }) as never)) as Brand;
  return { brands, repo: new BrandServiceRepository(brands), brand: created };
}

const update = async (id: string, patch: unknown) => {
  const brands = container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
  await brands.update(id, patch as never);
};

beforeEach(() => {
  localStorage.clear();
  bootServices();
  useBrandStore.setState({ list: [] } as never);
});

describe('what the website pass writes', () => {
  it('lands website values at suggested, under the website-scan agent, with the right provenance', async () => {
    const { repo, brand } = await freshBrand();
    const websiteInference = enrichmentCandidates(inference, 'northwind.studio');
    const result = await understand(brand, [], update, '', undefined, { websiteEvidence: EVIDENCE, websiteInference });
    expect(result.notSaved).toEqual([]);

    const c = (await repo.getById(brand.id))!;
    expect(c.identity.colors.primary.hex.toUpperCase()).toBe('#1F3A2E');
    expect(c.identity.typography.primary.family).toBe('Playfair Display');
    const colour = coreValueMeta(c.identityMeta, 'colors.primary');
    expect(colour).toMatchObject({ authority: 'suggested', provenance: 'imported', setBy: WEBSITE_SCAN.agent });
    expect(coreValueMeta(c.identityMeta, 'strategy.summary')).toMatchObject({ authority: 'suggested', provenance: 'imported', setBy: WEBSITE_SCAN.agent });
    expect(coreValueMeta(c.identityMeta, 'voice.tone')).toMatchObject({ authority: 'suggested', provenance: 'inferred', setBy: WEBSITE_SCAN.agent });
    expect(coreValueMeta(c.identityMeta, 'strategy.mission')).toMatchObject({ authority: 'suggested', provenance: 'ai-suggested' });
    expect(c.businessInfo?.tagline).toBe('Spaces that feel like they were always there.');
    expect(c.businessInfo?.description).toBe('Residential architecture, Interior design');
    expect(c.businessInfo?.contact?.email).toBe('hello@northwind.studio');
    expect(c.businessInfo?.contact?.website).toBe('https://northwind.studio');
    expect(result.understanding.websiteOrigins['business.description']).toBe('northwind.studio/services');
  });
});

describe('rescanning', () => {
  it('never overwrites a confirmed value and never lowers an authority', async () => {
    const { repo, brand } = await freshBrand();
    await understand(brand, [], update, '', undefined, { websiteEvidence: EVIDENCE });
    await acceptProposal(repo, brand.id, 'colors.primary', HUMAN);
    await editValue(repo, brand.id, 'strategy.summary', 'My own words.', HUMAN);
    const before = (await repo.getById(brand.id))!;
    expect(coreValueMeta(before.identityMeta, 'colors.primary').authority).toBe('confirmed');

    const changed = { ...EVIDENCE, colors: [{ hex: '#FF0000', source: 'css' as const, count: 99 }] };
    const second = await understand(brand, [], update, '', undefined, { websiteEvidence: changed, websiteInference: enrichmentCandidates(inference, 'x') });
    expect(second.decided).toEqual(expect.arrayContaining(['colors.primary', 'strategy.summary']));

    const after = (await repo.getById(brand.id))!;
    expect(after.identity.colors.primary.hex.toUpperCase()).toBe('#1F3A2E');
    expect(coreValueMeta(after.identityMeta, 'colors.primary').authority).toBe('confirmed');
    expect(after.identity.strategy.summary).toBe('My own words.');
    expect(coreValueMeta(after.identityMeta, 'strategy.summary').authority).toBe('confirmed');
    // A value nobody decided may follow the site.
    expect(after.identity.colors.secondary?.hex.toUpperCase()).toBe('#E4D9C3');
  });

  it('a business fact the user edited survives a rescan; one the site wrote follows the site', async () => {
    const { repo, brand } = await freshBrand();
    const first = await understand(brand, [], update, '', undefined, { websiteEvidence: EVIDENCE });
    expect(first.businessWritten.tagline).toBe('Spaces that feel like they were always there.');
    // The user rewrites the tagline on the review.
    const { applyBusinessFacts } = await import('../../understanding/applyProposals');
    await applyBusinessFacts(repo, brand.id, { tagline: 'My own tagline.' });

    const changed = { ...EVIDENCE, business: { ...EVIDENCE.business, tagline: { value: 'A newer site tagline.', page: 'https://northwind.studio/', source: 'page title' }, products: [{ value: 'Interior design', page: 'https://northwind.studio/services' }] } };
    await understand(brand, [], update, '', undefined, { websiteEvidence: changed }, first.businessWritten);
    const after = (await repo.getById(brand.id))!;
    expect(after.businessInfo?.tagline).toBe('My own tagline.');
    expect(after.businessInfo?.description).toBe('Interior design');
  });

  it('the latest evidence may legitimately differ when the site changed', async () => {
    const { repo, brand } = await freshBrand();
    await understand(brand, [], update, '', undefined, { websiteEvidence: EVIDENCE });
    const changed = { ...EVIDENCE, typography: [{ family: 'Fraunces', source: 'google-fonts' as const, weights: [], role: 'heading' as const }] };
    await understand(brand, [], update, '', undefined, { websiteEvidence: changed });
    const after = (await repo.getById(brand.id))!;
    expect(after.identity.typography.primary.family).toBe('Fraunces');
    expect(coreValueMeta(after.identityMeta, 'typography.primary').authority).toBe('suggested');
  });
});
