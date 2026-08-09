/**
 * Batch A3/A7 — Voice-tone slice, real chain: a tone edit must survive reload even
 * when a stale guidelines.voiceAndTone.brandVoice mirror exists (the A7 defect #1).
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { changeBrandVoiceTone } from '../changeBrandVoice';

function svc(seed: Brand): IBrandsService {
  let stored = seed;
  return {
    list: async () => [stored],
    getById: async () => migrateBrandToCurrent(stored),
    getBySlug: async () => migrateBrandToCurrent(stored),
    create: async () => stored,
    update: async (_id, patch) => { stored = { ...stored, ...patch }; return migrateBrandToCurrent(stored); },
    delete: async () => {},
  };
}

it('voice tone edit survives reload; stale voiceAndTone mirror cannot resurrect', async () => {
  const seed = {
    id: 'b1', slug: 'acme', name: 'Acme', schemaVersion: 3,
    primaryColor: '#111', fonts: { primary: 'Inter' }, tone: 'old tone', audience: 'a', assets: [],
    guidelines: { voiceAndTone: { brandVoice: 'STALE MIRROR VOICE', toneAttributes: [], communicationStyle: '', doAndDonts: { do: [], dont: [] }, examples: [] } },
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
  } as Brand;
  const service = svc(seed);
  const repo = new BrandServiceRepository(service);

  await changeBrandVoiceTone(repo, 'b1', 'brand new tone');

  const reloaded = await service.getById('b1');
  expect(reloaded!.tone).toBe('brand new tone'); // NOT the stale mirror
  // read back through the canonical mapper too
  const canonical = await repo.getById('b1');
  expect(canonical!.identity.voice.tone).toBe('brand new tone');
});
