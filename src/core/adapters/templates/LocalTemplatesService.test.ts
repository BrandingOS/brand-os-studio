// Phase 5 — bootstrap version-bump behavior. When the seed inventory
// or thumbnail format changes (the reason VERSION exists), the
// service re-seeds curated templates but MUST preserve any
// user-uploaded ones (community submissions from Phase 4.4).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalTemplatesService } from './LocalTemplatesService';
import type { Template } from '@/features/templates/types';

const KEY_BOOTSTRAPPED = 'brandos:templates:bootstrapped-v1';
const KEY_TEMPLATES = 'brandos:templates:templates';
const KEY_CATEGORIES = 'brandos:templates:categories';

beforeEach(() => {
  localStorage.removeItem(KEY_BOOTSTRAPPED);
  localStorage.removeItem(KEY_TEMPLATES);
  localStorage.removeItem(KEY_CATEGORIES);
});
afterEach(() => {
  localStorage.removeItem(KEY_BOOTSTRAPPED);
  localStorage.removeItem(KEY_TEMPLATES);
  localStorage.removeItem(KEY_CATEGORIES);
});

function fakeUserTemplate(slug: string): Template {
  return {
    id: `tpl-user-${slug}`,
    slug: `user-${slug}`,
    name: `User template ${slug}`,
    description: null,
    source: 'user_uploaded',
    categoryId: 'cat-social-posts',
    document: null,
    thumbnailUrl: 'data:image/svg+xml;utf8,<svg/>',
    previewImageUrl: null,
    width: 1080, height: 1080,
    tags: [], mood: 'modern',
    promptText: null, promptSystemHints: null, rasterImageUrl: null,
    uploadedByUserId: null, uploadStatus: 'approved',
    uploadedAt: '2026-05-04T00:00:00Z',
    approvedAt: '2026-05-04T00:00:00Z',
    approvedByUserId: null, rejectionReason: null,
    visibility: 'private', isPremium: false, requiredPlan: null,
    useCount: 0,
  };
}

describe('LocalTemplatesService — bootstrap version bump', () => {
  it('a stale-version cache containing curated + user-uploaded templates re-seeds curated and keeps user-uploaded', async () => {
    // Simulate an old cache: bootstrapped marker is the prior
    // version (`1`), templates blob has a couple of stale entries
    // plus one user-uploaded one we expect to survive.
    const stalePayload = {
      items: [
        // Stale curated entry that should NOT survive — it has
        // a different slug than any current seed, so its presence
        // after re-seed would prove the bootstrap kept stale data.
        {
          ...fakeUserTemplate('stale'),
          slug: 'curated-stale-only',
          source: 'curated' as const,
          name: 'Stale curated',
        },
        fakeUserTemplate('survivor'),
      ],
      version: 1,
    };
    localStorage.setItem(KEY_TEMPLATES, JSON.stringify(stalePayload));
    localStorage.setItem(KEY_BOOTSTRAPPED, '1'); // prior VERSION

    const svc = new LocalTemplatesService();
    const list = await svc.listTemplates({ limit: 1000 });

    // User-uploaded survivor is still there.
    const survivor = list.find((t) => t.slug === 'user-survivor');
    expect(survivor).toBeTruthy();
    expect(survivor!.source).toBe('user_uploaded');

    // Stale curated entry was wiped.
    const stale = list.find((t) => t.slug === 'curated-stale-only');
    expect(stale).toBeFalsy();

    // Real curated seeds are present (e.g. social-hero-bold).
    const realSeed = list.find((t) => t.slug === 'social-hero-bold');
    expect(realSeed).toBeTruthy();

    // Bootstrapped marker now reflects the new VERSION.
    expect(localStorage.getItem(KEY_BOOTSTRAPPED)).toBe('2');
  });

  it('a fresh cache (no bootstrapped marker) seeds the curated set with no carry-over needed', async () => {
    const svc = new LocalTemplatesService();
    const list = await svc.listTemplates({ limit: 1000 });
    expect(list.length).toBeGreaterThan(50);
    expect(list.some((t) => t.source === 'curated')).toBe(true);
    expect(localStorage.getItem(KEY_BOOTSTRAPPED)).toBe('2');
  });
});

describe('LocalTemplatesService — seed/system isolation (BB5)', () => {
  it('lets the user update + delete their own (user_uploaded) template', async () => {
    const svc = new LocalTemplatesService();
    const { id, ...input } = fakeUserTemplate('mine');
    const created = await svc.createTemplate(input as never);

    const renamed = await svc.updateTemplate(created.id, { name: 'Renamed' });
    expect(renamed.name).toBe('Renamed');
    expect(renamed.source).toBe('user_uploaded');

    await svc.deleteTemplate(created.id);
    const after = await svc.listTemplates({ limit: 1000 });
    expect(after.find((t) => t.id === created.id)).toBeFalsy();
  });

  it('refuses to update or delete a seed/system (curated) template', async () => {
    const svc = new LocalTemplatesService();
    const list = await svc.listTemplates({ limit: 1000 });
    const seed = list.find((t) => t.source === 'curated');
    expect(seed).toBeTruthy();

    await expect(svc.updateTemplate(seed!.id, { name: 'hijack' })).rejects.toThrow(/system template/i);
    await expect(svc.deleteTemplate(seed!.id)).rejects.toThrow(/system template/i);

    // The seed is untouched + still present.
    const after = await svc.listTemplates({ limit: 1000 });
    expect(after.find((t) => t.id === seed!.id)?.name).toBe(seed!.name);
  });
});
