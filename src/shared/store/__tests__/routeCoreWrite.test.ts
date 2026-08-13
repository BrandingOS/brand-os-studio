/**
 * The split that gives Brand Core one write path.
 *
 * `brandStore.update` stays useful for the many legitimate non-Core patches
 * (name, publicUrl, assets); what changes is that Core fields no longer travel
 * their own road. These tests pin both halves of that: what gets rerouted, and
 * — just as important — what must keep working exactly as before.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { coreValueMeta } from '@/domain/brand';
import {
  ROUTED_CORE_KEYS,
  UNROUTED_CORE_KEYS,
  applyCorePatch,
  splitCorePatch,
} from '../routeCoreWrite';

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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Brand;
}

function makeRepo() {
  let row = seedBrand();
  const writes: Partial<Brand>[] = [];
  const svc: Partial<IBrandsService> = {
    getById: async (id: string) => (id === row.id ? row : null),
    getBySlug: async (slug: string) => (slug === row.slug ? row : null),
    update: async (_id: string, patch: Partial<Brand>) => {
      writes.push(patch);
      row = { ...row, ...patch, updatedAt: new Date() };
      return row;
    },
  };
  return { repo: new BrandServiceRepository(svc as IBrandsService), writes, current: () => row };
}

describe('splitCorePatch', () => {
  it('routes Core fields and leaves everything else alone', () => {
    const { core, rest, routedKeys } = splitCorePatch({
      primaryColor: '#abcdef',
      tone: 'bold',
      name: 'New Name',
      publicUrl: 'https://x',
    } as Partial<Brand>);

    expect(core).toEqual({ primaryColor: '#abcdef', tone: 'bold' });
    expect(rest).toEqual({ name: 'New Name', publicUrl: 'https://x' });
    expect(routedKeys.sort()).toEqual(['primaryColor', 'tone']);
  });

  it('a purely non-Core patch is untouched — the common case must not change', () => {
    const patch = { name: 'Renamed', isPublic: true } as Partial<Brand>;
    const { core, rest, routedKeys } = splitCorePatch(patch);
    expect(core).toEqual({});
    expect(rest).toEqual(patch);
    expect(routedKeys).toEqual([]);
  });

  it('reports logo fields as Core-but-unroutable instead of silently rerouting them', () => {
    // There is no changeBrandLogos yet; intercepting these would break upload
    // for no gain, so they stay on the legacy path and say so.
    const { rest, unroutedCoreKeys } = splitCorePatch({
      logoSystem: { primary: { assetId: 'a1' } },
    } as Partial<Brand>);
    expect(unroutedCoreKeys).toEqual(['logoSystem']);
    expect(rest.logoSystem).toBeDefined();
  });

  it('ignores keys explicitly set to undefined', () => {
    const { core, rest } = splitCorePatch({ primaryColor: undefined, name: undefined } as Partial<Brand>);
    expect(core).toEqual({});
    expect(rest).toEqual({});
  });

  it('routed and unrouted key lists do not overlap', () => {
    const overlap = (ROUTED_CORE_KEYS as readonly string[]).filter((k) =>
      (UNROUTED_CORE_KEYS as readonly string[]).includes(k),
    );
    expect(overlap).toEqual([]);
  });
});

describe('applyCorePatch', () => {
  it('writes colours through the canonical op and records provenance', async () => {
    const { repo } = makeRepo();
    const out = await applyCorePatch(repo, 'b1', { primaryColor: '#abcdef' } as Partial<Brand>);

    expect(out?.identity.colors.primary.hex).toBe('#abcdef');
    expect(coreValueMeta(out?.identityMeta, 'colors.primary').authority).toBe('provisional');
  });

  it('prefers the v3 token over the scalar so token metadata is not dropped', async () => {
    const { repo } = makeRepo();
    const out = await applyCorePatch(repo, 'b1', {
      primaryColor: '#000000',
      colorSystem: { primary: { hex: '#abcdef', name: 'Sky' } },
    } as Partial<Brand>);

    expect(out?.identity.colors.primary).toMatchObject({ hex: '#abcdef', name: 'Sky' });
  });

  it('handles several subsystems in one patch', async () => {
    const { repo } = makeRepo();
    const out = await applyCorePatch(repo, 'b1', {
      primaryColor: '#abcdef',
      fonts: { primary: 'Georgia' },
      tone: 'bold',
      strategy: 'Make branding calm',
    } as Partial<Brand>);

    expect(out?.identity.colors.primary.hex).toBe('#abcdef');
    expect(out?.identity.typography.primary.family).toBe('Georgia');
    expect(out?.identity.voice.tone).toBe('bold');
    expect(out?.identity.strategy.mission).toBe('Make branding calm');
  });

  it('stamps every touched subsystem, and nothing else', async () => {
    const { repo } = makeRepo();
    const out = await applyCorePatch(repo, 'b1', {
      primaryColor: '#abcdef',
      tone: 'bold',
    } as Partial<Brand>);

    expect(out?.identityMeta?.['colors.primary']).toBeDefined();
    expect(out?.identityMeta?.['voice.tone']).toBeDefined();
    expect(out?.identityMeta?.['typography.primary']).toBeUndefined();
  });

  it('returns null when there is nothing Core to write', async () => {
    const { repo } = makeRepo();
    expect(await applyCorePatch(repo, 'b1', {})).toBeNull();
  });

  it('maps the legacy `strategy` scalar to the mission, matching toLegacyBrandPatch', async () => {
    const { repo } = makeRepo();
    const out = await applyCorePatch(repo, 'b1', { strategy: 'Our mission' } as Partial<Brand>);
    expect(out?.identity.strategy.mission).toBe('Our mission');
  });

  it('attributes the write to the supplied actor', async () => {
    const { repo } = makeRepo();
    const out = await applyCorePatch(
      repo,
      'b1',
      { tone: 'bold' } as Partial<Brand>,
      { actor: { kind: 'system', agent: 'ai' } },
    );
    expect(coreValueMeta(out?.identityMeta, 'voice.tone').provenance).toBe('ai-suggested');
    // Spec 002: a fresh system write opens at `suggested`, so a brand-new
    // machine proposal is distinguishable from a value a user set but never
    // confirmed. The claim under test — attribution follows the supplied actor
    // — is unchanged.
    expect(coreValueMeta(out?.identityMeta, 'voice.tone').authority).toBe('suggested');
    expect(coreValueMeta(out?.identityMeta, 'voice.tone').setBy).toBe('ai');
  });
});
