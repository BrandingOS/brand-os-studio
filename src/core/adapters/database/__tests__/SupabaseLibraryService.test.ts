/**
 * SupabaseAssetsService — the Library mapping and its pre-017 tolerance.
 *
 * Two things are worth locking down. First, the snake_case↔camelCase mapping:
 * a silently dropped `deleted_at` would make tombstones invisible and let the
 * Library show material that is gone. Second, the degradation path — shipping
 * this code before migration 017 deploys must not lose an upload, which is the
 * same promise migrations 014 and 015 already make.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A scriptable Supabase double. `nextResult` is what the awaited builder
 * resolves to, so a test can put the adapter in a post-017 world (rows) or a
 * pre-017 one (42703) without touching the adapter.
 */
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };
let resultQueue: Array<{ data: unknown; error: unknown }> = [];
const calls: Array<{ table: string; op: string; payload?: unknown }> = [];

vi.mock('@/integrations/supabase/client', () => {
  const makeChain = (table: string): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            const result = resultQueue.length ? resultQueue.shift()! : nextResult;
            return (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
          }
          return (payload?: unknown) => {
            calls.push({ table, op: String(prop), payload });
            return makeChain(table);
          };
        },
      },
    );
  return {
    supabase: {
      from: (table: string) => makeChain(table),
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    },
  };
});

import { SupabaseAssetsService } from '../SupabaseAssetsService';

const ROW = {
  id: 'a1',
  brand_id: 'b1',
  name: 'logo.svg',
  type: 'image',
  category: 'logo',
  source: 'upload',
  url: 'https://example.test/logo.svg',
  size: 12,
  tags: ['brand'],
  metadata: {},
  created_at: '2026-08-13T00:00:00.000Z',
  origin: 'generated',
  folder_id: 'f1',
  is_favorite: true,
  is_disliked: false,
  use_as_reference: true,
  archived_at: '2026-08-13T01:00:00.000Z',
  deleted_at: null,
  provenance: { kind: 'generated', generatedAt: '2026-08-13T00:00:00.000Z' },
  legacy_ref_id: 'old_1',
};

const MISSING_COLUMN = {
  data: null,
  error: { code: '42703', message: 'column "origin" does not exist' },
};

beforeEach(() => {
  nextResult = { data: null, error: null };
  resultQueue = [];
  calls.length = 0;
});

describe('row mapping', () => {
  it('maps every Library column onto the Asset shape', async () => {
    nextResult = { data: ROW, error: null };
    const asset = await new SupabaseAssetsService().getById('a1');

    expect(asset).toMatchObject({
      id: 'a1',
      name: 'logo.svg',
      origin: 'generated',
      folderId: 'f1',
      isFavorite: true,
      isDisliked: false,
      useAsReference: true,
      legacyRefId: 'old_1',
    });
    expect(asset?.archivedAt).toBeInstanceOf(Date);
    expect(asset?.deletedAt).toBeNull();
    expect(asset?.provenance?.kind).toBe('generated');
  });

  it('defaults Library fields for a pre-017 row rather than returning undefined', async () => {
    const { origin, folder_id, is_favorite, deleted_at, ...legacyRow } = ROW;
    nextResult = { data: legacyRow, error: null };
    const asset = await new SupabaseAssetsService().getById('a1');

    expect(asset).toMatchObject({
      origin: 'uploaded',
      folderId: null,
      isFavorite: false,
      deletedAt: null,
    });
  });
});

describe('tombstones are lineage, not content', () => {
  it('listForBrand filters out tombstoned rows', async () => {
    nextResult = {
      data: [ROW, { ...ROW, id: 'a2', deleted_at: '2026-08-13T02:00:00.000Z' }],
      error: null,
    };
    const list = await new SupabaseAssetsService().listForBrand('b1');
    expect(list.map((a) => a.id)).toEqual(['a1']);
  });

  it('getById still resolves a tombstone so saved work never dangles', async () => {
    nextResult = { data: { ...ROW, deleted_at: '2026-08-13T02:00:00.000Z', url: '' }, error: null };
    const asset = await new SupabaseAssetsService().getById('a1');
    expect(asset).not.toBeNull();
    expect(asset?.name).toBe('logo.svg');
    expect(asset?.deletedAt).toBeInstanceOf(Date);
  });
});

describe('pre-017 tolerance', () => {
  it('create retries without Library fields rather than losing the upload', async () => {
    resultQueue = [MISSING_COLUMN, { data: ROW, error: null }];
    const asset = await new SupabaseAssetsService().create({
      brandId: 'b1',
      name: 'logo.svg',
      type: 'image',
      category: 'logo',
      url: 'https://example.test/logo.svg',
      origin: 'generated',
    });

    expect(asset.id).toBe('a1');
    const inserts = calls.filter((c) => c.op === 'insert');
    expect(inserts).toHaveLength(2);
    // First attempt carried the 017 columns; the retry did not.
    expect(inserts[0].payload).toHaveProperty('origin');
    expect(inserts[1].payload).not.toHaveProperty('origin');
  });

  it('listLibrary falls back to the plain listing', async () => {
    resultQueue = [MISSING_COLUMN, { data: [ROW], error: null }];
    const list = await new SupabaseAssetsService().listLibrary('b1', { favorite: true });
    expect(list.map((a) => a.id)).toEqual(['a1']);
  });

  it('listFolders returns empty when the table is missing, instead of throwing', async () => {
    nextResult = { data: null, error: { code: '42P01', message: 'relation does not exist' } };
    expect(await new SupabaseAssetsService().listFolders('b1')).toEqual([]);
  });

  it('a real error is NOT swallowed', async () => {
    nextResult = { data: null, error: { code: '23505', message: 'duplicate key' } };
    await expect(new SupabaseAssetsService().listFolders('b1')).rejects.toMatchObject({
      code: '23505',
    });
  });
});

describe('flag reconciliation reaches the write', () => {
  it('favouriting a disliked item clears the dislike', async () => {
    resultQueue = [
      { data: { ...ROW, is_favorite: false, is_disliked: true }, error: null }, // getById
      { data: { ...ROW, is_favorite: true, is_disliked: false }, error: null }, // update
    ];
    await new SupabaseAssetsService().setFlags('a1', { isFavorite: true });

    const update = calls.find((c) => c.op === 'update');
    expect(update?.payload).toMatchObject({ is_favorite: true, is_disliked: false });
  });
});

describe('softDelete', () => {
  it('tombstones rather than deleting the row', async () => {
    resultQueue = [
      { data: ROW, error: null },               // getById
      { data: { storage_path: null }, error: null }, // storage lookup
      { data: { ...ROW, deleted_at: 'x' }, error: null }, // patch
    ];
    const outcome = await new SupabaseAssetsService().softDelete('a1');

    expect(outcome).toEqual({ ok: true });
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
    const update = calls.find((c) => c.op === 'update');
    expect(update?.payload).toMatchObject({ url: '', storage_path: null });
    expect((update?.payload as Record<string, unknown>).deleted_at).toBeTruthy();
  });

  it('is blocked by saved work that references the item', async () => {
    resultQueue = [
      {
        data: {
          ...ROW,
          provenance: {
            kind: 'generated',
            generatedAt: '2026-08-13T00:00:00.000Z',
            relations: { placedInDesignIds: ['d1'] },
          },
        },
        error: null,
      },
    ];
    const outcome = await new SupabaseAssetsService().softDelete('a1');
    expect(outcome).toMatchObject({ ok: false, reason: 'referenced', workItemIds: ['d1'] });
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });
});

describe('CodeRabbit C1 — a tombstone must precede storage removal', () => {
  it('does NOT remove the stored object when the tombstone write fails', async () => {
    // Pre-017: patchRow's tolerance would strip deleted_at. Removing the file
    // first and reporting ok:true would be unrecoverable loss dressed as success.
    resultQueue = [
      { data: ROW, error: null },                    // getById
      { data: { storage_path: 'b1/logo.svg' }, error: null }, // path lookup
      MISSING_COLUMN,                                // tombstone write fails
    ];
    await expect(new SupabaseAssetsService().softDelete('a1')).rejects.toThrow(
      /migration 017 is not deployed|Refusing to report success/i,
    );
    expect(calls.some((c) => c.op === 'remove')).toBe(false);
  });

  it('archive fails loudly rather than returning an unchanged row', async () => {
    resultQueue = [MISSING_COLUMN];
    await expect(new SupabaseAssetsService().archive('a1')).rejects.toThrow(
      /Refusing to report success/i,
    );
  });

  it('ordinary updates still degrade gracefully — tolerance is not removed', async () => {
    resultQueue = [MISSING_COLUMN, { data: ROW, error: null }];
    const updated = await new SupabaseAssetsService().update('a1', { name: 'renamed' });
    expect(updated.id).toBe('a1');
  });
});
