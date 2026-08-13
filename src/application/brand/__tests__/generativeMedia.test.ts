/**
 * Generative media provenance.
 *
 * The point of recording why an image exists is that the answer is still there
 * months later — so the tests care that provenance is complete at creation,
 * that nothing later rewrites it, and that a deleted relationship degrades to a
 * tombstone rather than a dangling id.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAssetsService } from '@/core/adapters/database/LocalAssetsService';
import { buildProvenance, recordPlacement, saveGeneratedMedia } from '../generativeMedia';
import type { CreationContext } from '../buildCreationContext';

const BRAND = 'brand_a';
let assets: LocalAssetsService;

beforeEach(() => {
  localStorage.clear();
  assets = new LocalAssetsService();
});

const context: CreationContext = {
  brandId: BRAND,
  brandName: 'Acme',
  core: [
    { path: 'colors.primary', value: { hex: '#111' }, authority: 'provisional', provenance: 'ai-suggested' },
    { path: 'voice.tone', value: 'warm', authority: 'confirmed', provenance: 'user-entered' },
  ],
  businessInfo: { legalName: 'Acme Ltd' },
  references: [],
  preferences: { density: 'airy' },
  provisionalPaths: ['colors.primary'],
};

describe('provenance is complete at creation (INV-10)', () => {
  it('records the prompt, model, inputs and the context the generation saw', () => {
    const p = buildProvenance(
      {
        brandId: BRAND, name: 'x', url: 'data:,x',
        prompt: 'a calm mark', model: 'img-v1', inputRefs: ['ref_1'], context,
      },
      '2026-08-13T00:00:00.000Z',
    );

    expect(p).toMatchObject({
      kind: 'generated',
      generatedAt: '2026-08-13T00:00:00.000Z',
      prompt: 'a calm mark',
      model: 'img-v1',
      inputRefs: ['ref_1'],
    });
    expect(p.contextUsed).toEqual({
      core: ['colors.primary', 'voice.tone'],
      businessInfo: true,
      contextSignals: 1,
    });
  });

  it('omits what it does not know rather than inventing it', () => {
    const p = buildProvenance({ brandId: BRAND, name: 'x', url: 'data:,x' });
    expect(p.prompt).toBeUndefined();
    expect(p.model).toBeUndefined();
    expect(p.contextUsed).toBeUndefined();
    expect(p.kind).toBe('generated');
  });

  it('does not alias its input arrays', () => {
    const inputRefs = ['a'];
    const p = buildProvenance({ brandId: BRAND, name: 'x', url: 'data:,x', inputRefs });
    inputRefs.push('b');
    expect(p.inputRefs).toEqual(['a']);
  });
});

describe('saving generated media', () => {
  it('creates a Library item marked generated, with provenance attached', async () => {
    const asset = await saveGeneratedMedia(assets, {
      brandId: BRAND, name: 'hero.png', url: 'data:image/png;base64,X',
      prompt: 'a hero', model: 'img-v1',
    });

    expect(asset.origin).toBe('generated');
    expect(asset.provenance?.prompt).toBe('a hero');
    expect(asset.tags).toContain('generated');
    // Saving IS the registration — it appears in the Library, not beside it.
    expect((await assets.listLibrary(BRAND)).map((a) => a.id)).toEqual([asset.id]);
  });

  it('generated media is NOT official just because it exists', async () => {
    const asset = await saveGeneratedMedia(assets, {
      brandId: BRAND, name: 'hero.png', url: 'data:,X',
    });
    // Origin says where it came from; nothing here adopts it.
    expect(asset.origin).toBe('generated');
    expect(asset.isFavorite).toBe(false);
    expect(asset.useAsReference).toBe(false);
  });
});

describe('relations accrue; everything else is immutable', () => {
  it('records a placement', async () => {
    const asset = await saveGeneratedMedia(assets, {
      brandId: BRAND, name: 'hero.png', url: 'data:,X', prompt: 'p',
    });

    const updated = await recordPlacement(assets, asset.id, 'design_1');
    expect(updated?.provenance?.relations?.placedInDesignIds).toEqual(['design_1']);
  });

  it('is idempotent — the same design is not recorded twice', async () => {
    const asset = await saveGeneratedMedia(assets, { brandId: BRAND, name: 'h', url: 'data:,X' });
    await recordPlacement(assets, asset.id, 'design_1');
    await recordPlacement(assets, asset.id, 'design_1');
    const after = await assets.getById(asset.id);
    expect(after?.provenance?.relations?.placedInDesignIds).toEqual(['design_1']);
  });

  it('accrues across several designs', async () => {
    const asset = await saveGeneratedMedia(assets, { brandId: BRAND, name: 'h', url: 'data:,X' });
    await recordPlacement(assets, asset.id, 'design_1');
    await recordPlacement(assets, asset.id, 'design_2');
    expect((await assets.getById(asset.id))?.provenance?.relations?.placedInDesignIds).toEqual([
      'design_1',
      'design_2',
    ]);
  });

  it('never rewrites the circumstances of the generation', async () => {
    const asset = await saveGeneratedMedia(assets, {
      brandId: BRAND, name: 'h', url: 'data:,X', prompt: 'original', model: 'img-v1',
    });
    const before = asset.provenance!;

    await recordPlacement(assets, asset.id, 'design_1');

    const after = (await assets.getById(asset.id))!.provenance!;
    expect(after.prompt).toBe(before.prompt);
    expect(after.model).toBe(before.model);
    expect(after.generatedAt).toBe(before.generatedAt);
  });

  it('leaves a non-generated asset alone', async () => {
    const plain = await assets.create({
      brandId: BRAND, name: 'upload.png', type: 'image', category: 'photo', url: 'data:,U',
    });
    const result = await recordPlacement(assets, plain.id, 'design_1');
    expect(result?.provenance).toBeUndefined();
  });
});

describe('lineage survives deletion (INV-11)', () => {
  it('a placed asset cannot be silently deleted, and its work keeps its link', async () => {
    const asset = await saveGeneratedMedia(assets, { brandId: BRAND, name: 'h', url: 'data:,X' });
    await recordPlacement(assets, asset.id, 'design_1');

    // The design that uses it is exactly what blocks a silent delete.
    const outcome = await assets.softDelete(asset.id);
    expect(outcome).toMatchObject({ ok: false, reason: 'referenced', workItemIds: ['design_1'] });
  });

  it('once nothing references it, deletion tombstones but keeps the identity', async () => {
    const asset = await saveGeneratedMedia(assets, { brandId: BRAND, name: 'h.png', url: 'data:,X' });
    expect(await assets.softDelete(asset.id)).toEqual({ ok: true });

    const tomb = await assets.getById(asset.id);
    expect(tomb?.name).toBe('h.png');
    expect(tomb?.origin).toBe('generated');
    expect(tomb?.deletedAt).toBeTruthy();
  });
});
