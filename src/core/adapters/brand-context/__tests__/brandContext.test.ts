/**
 * Brand Context v1.
 *
 * The two properties that matter more than the storage: capture is SILENT (a
 * signal must never interrupt the user), and context can NEVER write Brand
 * Core. The third test block enforces the second structurally, by reading the
 * source — a comment promising it would not survive a refactor.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LocalBrandContextService,
  LOCAL_SIGNAL_CAP,
  summarizeSignals,
} from '../LocalBrandContextService';
import { LocalAssetsService } from '@/core/adapters/database/LocalAssetsService';
import type { ContextSignal } from '@/core/services/IBrandContextService';

const BRAND = 'brand_a';
const OTHER = 'brand_b';

let svc: LocalBrandContextService;
beforeEach(() => {
  localStorage.clear();
  svc = new LocalBrandContextService();
});

describe('capture is silent (INV-15)', () => {
  it('record never throws, even on a broken store', async () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('quota');
    };
    await expect(
      svc.record({ brandId: BRAND, kind: 'favorite', source: 'user-action' }),
    ).resolves.toBeUndefined();
    localStorage.setItem = original;
  });

  it('a corrupt store degrades to empty rather than failing a read', async () => {
    localStorage.setItem(`brandos:brand-context:${BRAND}`, 'not json');
    expect(await svc.list(BRAND)).toEqual([]);
  });
});

describe('signals', () => {
  it('records, lists newest-first, and scopes per brand', async () => {
    await svc.record({ brandId: BRAND, kind: 'favorite', targetRef: 'a1', source: 'user-action' });
    await svc.record({ brandId: BRAND, kind: 'dislike', targetRef: 'a2', source: 'user-action' });
    await svc.record({ brandId: OTHER, kind: 'favorite', targetRef: 'z', source: 'user-action' });

    const rows = await svc.list(BRAND);
    expect(rows).toHaveLength(2);
    expect(await svc.list(OTHER)).toHaveLength(1);
  });

  it('filters by kind and limit', async () => {
    await svc.record({ brandId: BRAND, kind: 'favorite', targetRef: 'a1', source: 'user-action' });
    await svc.record({ brandId: BRAND, kind: 'dislike', targetRef: 'a2', source: 'user-action' });

    expect(await svc.list(BRAND, { kind: ['dislike'] })).toHaveLength(1);
    expect(await svc.list(BRAND, { limit: 1 })).toHaveLength(1);
  });

  it('is correctable — a user can remove what the brand learned (FR-013)', async () => {
    await svc.record({ brandId: BRAND, kind: 'favorite', targetRef: 'a1', source: 'user-action' });
    const [row] = await svc.list(BRAND);

    await svc.remove(row.id);
    expect(await svc.list(BRAND)).toEqual([]);
  });

  it('caps locally, because quota has broken this product before', async () => {
    for (let i = 0; i < LOCAL_SIGNAL_CAP + 25; i += 1) {
      await svc.record({ brandId: BRAND, kind: 'usage', targetRef: `a${i}`, source: 'derived' });
    }
    expect(await svc.list(BRAND)).toHaveLength(LOCAL_SIGNAL_CAP);
  });
});

describe('summarize is derived, never stored', () => {
  it('the latest opinion per target wins', async () => {
    await svc.record({ brandId: BRAND, kind: 'favorite', targetRef: 'a1', source: 'user-action' });
    await svc.record({ brandId: BRAND, kind: 'dislike', targetRef: 'a1', source: 'user-action' });

    const summary = await svc.summarize(BRAND);
    expect(summary.dislikedRefs).toEqual(['a1']);
    expect(summary.likedRefs).toEqual([]);
  });

  it('collects references and preferences', async () => {
    await svc.record({ brandId: BRAND, kind: 'reference', targetRef: 'r1', source: 'user-action' });
    await svc.record({ brandId: BRAND, kind: 'preference', value: { density: 'airy' }, source: 'derived' });

    const summary = await svc.summarize(BRAND);
    expect(summary.referenceIds).toEqual(['r1']);
    expect(summary.preferences).toEqual({ density: 'airy' });
    expect(summary.signalCount).toBe(2);
  });

  it('is a pure function of its signals', () => {
    const signals = [
      { id: '1', brandId: BRAND, kind: 'favorite' as const, targetRef: 'a', source: 'user-action' as const, createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    expect(summarizeSignals(signals)).toEqual(summarizeSignals(signals));
  });
});

describe('Library actions emit signals without any new UI (FR-011)', () => {
  it('favouriting and marking-as-reference record what the user expressed', async () => {
    const assets = new LocalAssetsService({ context: svc });
    const item = await assets.create({
      brandId: BRAND, name: 'x.png', type: 'image', category: 'photo', url: 'data:,x',
    });

    await assets.setFlags(item.id, { isFavorite: true });
    await assets.setFlags(item.id, { useAsReference: true });

    const kinds = (await svc.list(BRAND)).map((s) => s.kind).sort();
    expect(kinds).toEqual(['favorite', 'reference']);
  });

  it('records TRANSITIONS only — re-setting a flag is not a new opinion', async () => {
    const assets = new LocalAssetsService({ context: svc });
    const item = await assets.create({
      brandId: BRAND, name: 'x.png', type: 'image', category: 'photo', url: 'data:,x',
    });

    await assets.setFlags(item.id, { isFavorite: true });
    await assets.setFlags(item.id, { isFavorite: true });

    expect(await svc.list(BRAND)).toHaveLength(1);
  });

  it('the flag still works when no context service is wired', async () => {
    const assets = new LocalAssetsService();
    const item = await assets.create({
      brandId: BRAND, name: 'x.png', type: 'image', category: 'photo', url: 'data:,x',
    });
    expect((await assets.setFlags(item.id, { isFavorite: true })).isFavorite).toBe(true);
  });
});

describe('context can NEVER write Brand Core (INV-13)', () => {
  const files = [
    'src/core/adapters/brand-context/LocalBrandContextService.ts',
    'src/core/adapters/brand-context/SupabaseBrandContextService.ts',
    'src/core/services/IBrandContextService.ts',
  ];

  it('no context module imports the brand repository or a Core write op', () => {
    for (const rel of files) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      const imports = src.match(/^import .*$/gm) ?? [];
      const offending = imports.filter((l) =>
        /brand\/repository|application\/brand\/|BrandRepository|promoteCoreValue|changeBrand/.test(l),
      );
      expect(offending, `${rel} must not reach Brand Core`).toEqual([]);
    }
  });
});

/** Newest-first, matching what `list` returns. */
function sig(over: Partial<ContextSignal> & Pick<ContextSignal, 'kind'>): ContextSignal {
  return {
    id: Math.random().toString(36).slice(2),
    brandId: BRAND,
    source: 'user-action',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as ContextSignal;
}

describe('CodeRabbit Round 5 — a removal must reach the summary', () => {
  it('un-favouriting drops the item from likedRefs', () => {
    // Only false→true was recorded, and the summary takes the latest signal per
    // target — so an un-favourited item stayed liked forever. The user's
    // correction had no way to reach the thing it was correcting.
    const summary = summarizeSignals([
      sig({ kind: 'favorite', targetRef: 'a1', value: { on: false } }), // newest
      sig({ kind: 'favorite', targetRef: 'a1', value: { on: true } }),
    ]);
    expect(summary.likedRefs).toEqual([]);
  });

  it('de-referencing stops the item feeding AI creation context', () => {
    const summary = summarizeSignals([
      sig({ kind: 'reference', targetRef: 'a1', value: { on: false } }),
      sig({ kind: 'reference', targetRef: 'a1', value: { on: true } }),
    ]);
    expect(summary.referenceIds).toEqual([]);
  });

  it('re-favouriting after a removal counts again', () => {
    const summary = summarizeSignals([
      sig({ kind: 'favorite', targetRef: 'a1', value: { on: true } }),
      sig({ kind: 'favorite', targetRef: 'a1', value: { on: false } }),
      sig({ kind: 'favorite', targetRef: 'a1', value: { on: true } }),
    ]);
    expect(summary.likedRefs).toEqual(['a1']);
  });

  it('un-favouriting through the SERVICE clears it, end to end', async () => {
    const ctx = new LocalBrandContextService();
    const assets = new LocalAssetsService({ context: ctx });
    const a = await assets.create({
      brandId: BRAND, name: 'x.svg', type: 'image', category: 'logo', url: 'u',
    });

    await assets.setFlags(a.id, { isFavorite: true });
    expect((await ctx.summarize(BRAND)).likedRefs).toEqual([a.id]);

    await assets.setFlags(a.id, { isFavorite: false });
    expect((await ctx.summarize(BRAND)).likedRefs).toEqual([]);
  });

  it('a signal written before removals were expressible still means "set"', () => {
    // Back-compat: no `value` at all is the old shape, and it recorded an
    // addition. Reading its absence as a removal would silently wipe every
    // preference captured before this change.
    const summary = summarizeSignals([sig({ kind: 'favorite', targetRef: 'a1' })]);
    expect(summary.likedRefs).toEqual(['a1']);
  });
});
