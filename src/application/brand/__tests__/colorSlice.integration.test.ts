/**
 * Stage 2D — Color slice REAL-chain integration.
 *
 * Proves the migrated color path end-to-end through the ACTUAL production
 * machinery: the BrandServiceRepository facade over a real IBrandsService, the
 * canonical changeBrandColors use-case, the real `migrateBrandToCurrent` reload
 * derivation, and a real downstream consumer (`buildBrandPalette`). It exercises
 * both the guest-like service (colorSystem persists) and the authed-like Supabase
 * whitelist (colorSystem dropped on write → reload must re-derive from the fresh
 * scalar), which is where the 05/11 revert bug lived.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { buildBrandPalette } from '@/shared/brand/brandPalette';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { changeBrandColors } from '../changeBrandColor';

function seedBrand(): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    schemaVersion: 3,
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: 'friendly',
    audience: 'builders',
    assets: [],
    colorSystem: { primary: { hex: '#111111', name: 'Ink' } },
    // A STALE guidelines mirror that must never resurrect the old color.
    guidelines: {
      colorPalette: {
        primary: { hex: '#111111', rgb: '', cmyk: '', name: 'Ink', usage: '' },
        neutral: [],
        semantic: {
          success: { hex: '#0f0', rgb: '', cmyk: '', name: '', usage: '' },
          warning: { hex: '#ff0', rgb: '', cmyk: '', name: '', usage: '' },
          error: { hex: '#f00', rgb: '', cmyk: '', name: '', usage: '' },
          info: { hex: '#00f', rgb: '', cmyk: '', name: '', usage: '' },
        },
      },
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  } as Brand;
}

/** Guest-like service: stores the full brand (colorSystem survives). */
function guestService(seed: Brand): IBrandsService {
  let stored = seed;
  return {
    list: async () => [stored],
    getById: async () => migrateBrandToCurrent(stored),
    getBySlug: async () => migrateBrandToCurrent(stored),
    create: async () => stored,
    update: async (_id, patch) => {
      stored = { ...stored, ...patch };
      return migrateBrandToCurrent(stored);
    },
    delete: async () => {},
  };
}

/** Authed-like service: mimics the Supabase whitelist DROPPING colorSystem +
 *  schemaVersion on write, so reload must re-derive from the persisted scalar. */
function authedService(seed: Brand): IBrandsService {
  let stored = seed;
  return {
    list: async () => [stored],
    getById: async () => migrateBrandToCurrent(stored),
    getBySlug: async () => migrateBrandToCurrent(stored),
    create: async () => stored,
    update: async (_id, patch) => {
      // Whitelist: keep scalar + guidelines, DROP colorSystem + schemaVersion.
      const { colorSystem: _cs, schemaVersion: _sv, ...rest } = { ...stored, ...patch } as Brand;
      stored = rest as Brand;
      return migrateBrandToCurrent(stored);
    },
    delete: async () => {},
  };
}

describe('Color slice — real chain, guest-like persistence', () => {
  it('edit → persist → reload keeps the new color; stale mirror cannot resurrect it', async () => {
    const svc = guestService(seedBrand());
    const repo = new BrandServiceRepository(svc);

    await changeBrandColors(repo, 'b1', { primary: { hex: '#ff0000' } });

    // Reload via the service (the real getById → migrateBrandToCurrent path).
    const reloaded = await svc.getById('b1');
    expect(reloaded!.colorSystem?.primary?.hex).toBe('#ff0000');
    expect(reloaded!.primaryColor).toBe('#ff0000');
  });
});

describe('Color slice — real chain, authed-like Supabase whitelist (the 05/11 case)', () => {
  it('colorSystem dropped on write → reload re-derives the NEW color from the fresh scalar', async () => {
    const svc = authedService(seedBrand());
    const repo = new BrandServiceRepository(svc);

    await changeBrandColors(repo, 'b1', { primary: { hex: '#00ff00' } });

    const reloaded = await svc.getById('b1');
    // colorSystem was dropped + re-derived; the fresh scalar (#00ff00) wins over
    // the stale guidelines mirror (#111111).
    expect(reloaded!.primaryColor).toBe('#00ff00');
    expect(reloaded!.colorSystem?.primary?.hex).toBe('#00ff00');
  });

  it('a real downstream consumer (buildBrandPalette) receives the canonical value', async () => {
    const svc = authedService(seedBrand());
    const repo = new BrandServiceRepository(svc);
    await changeBrandColors(repo, 'b1', { primary: { hex: '#123abc' } });

    const reloaded = await svc.getById('b1');
    const palette = buildBrandPalette(reloaded!);
    expect(palette.brand.primary.toLowerCase()).toContain('123abc');
  });
});
