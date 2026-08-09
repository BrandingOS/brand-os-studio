/**
 * Brand System finalization — Strategy slice, real chain through the canonical
 * repository. A strategy edit must survive reload; accent/neutrals written by a
 * color edit must survive reload via the identity blob (the fields that have NO
 * legacy column — the authed data-loss this closes).
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { changeBrandStrategy } from '../changeBrandStrategy';
import { changeBrandColors } from '../changeBrandColor';

function svc(seed: Brand): { service: IBrandsService; peek: () => Brand } {
  let stored = seed;
  return {
    service: {
      list: async () => [stored],
      getById: async () => migrateBrandToCurrent(stored),
      getBySlug: async () => migrateBrandToCurrent(stored),
      create: async () => stored,
      update: async (_id, patch) => {
        stored = { ...stored, ...patch };
        return migrateBrandToCurrent(stored);
      },
      delete: async () => {},
    },
    peek: () => stored,
  };
}

function seed(): Brand {
  return {
    id: 'b1', slug: 'acme', name: 'Acme', schemaVersion: 3,
    primaryColor: '#111111', fonts: { primary: 'Inter' }, tone: 't', audience: 'a', assets: [],
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
  } as Brand;
}

it('strategy vision/values survive reload (canonical read + guidelines home)', async () => {
  const { service } = svc(seed());
  const repo = new BrandServiceRepository(service);

  await changeBrandStrategy(repo, 'b1', {
    mission: 'Empower makers',
    vision: 'A brand OS for everyone',
    values: ['clarity', 'speed'],
    positioning: 'premium',
  });
  // No manual guidelines write — post-flip the blob is the authority and
  // `migrateBrandToCurrent` (inside the svc mock's getById) hydrates
  // `guidelines.strategy` from the blob, which `fromLegacyBrand` reads back.
  const canonical = await repo.getById('b1');
  expect(canonical!.identity.strategy.vision).toBe('A brand OS for everyone');
  expect(canonical!.identity.strategy.values).toEqual(['clarity', 'speed']);
  expect(canonical!.identity.strategy.positioning).toBe('premium');
});

it('accent + neutrals survive reload via the identity blob (no legacy column)', async () => {
  const { service } = svc(seed());
  const repo = new BrandServiceRepository(service);

  await changeBrandColors(repo, 'b1', {
    primary: { hex: '#222222' },
    accent: { hex: '#00ff88' },
    neutrals: [{ hex: '#eeeeee' }, { hex: '#333333' }],
  });

  // Reload strictly through the service → canonical mapper.
  const reloaded = await repo.getById('b1');
  expect(reloaded!.identity.colors.primary.hex).toBe('#222222');
  expect(reloaded!.identity.colors.accent?.hex).toBe('#00ff88');
  expect(reloaded!.identity.colors.neutrals?.map((n) => n.hex)).toEqual(['#eeeeee', '#333333']);
});
