/**
 * Creating a brand must not ask Postgres to hand the row back.
 *
 * `INSERT ... RETURNING` makes Postgres apply the table's SELECT policy to the
 * returned row. `brands_select` resolves visibility through
 * `brands_with_capability('brand.view')` — a STABLE set-returning function that
 * reads `public.brands` — so from its snapshot the row being inserted does not
 * exist, cannot be in the set, and cannot be returned:
 *
 *     new row violates row-level security policy for table "brands"
 *
 * The INSERT policy itself passes. Only a super_admin escaped it, through the
 * separate `admin_brands_all` policy, which is exactly why this was invisible to
 * the owner's own account and broke every other one.
 *
 * Verified directly against production by probing the insert as a real
 * non-admin user: without RETURNING it succeeds, with RETURNING it is refused,
 * and a follow-up select in a second statement sees the row.
 *
 * These tests pin the *shape* of the call, which is the part RLS cares about.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const authUser = { id: 'user-1' };

interface Recorded { table: string; op: string; payload?: unknown; selected?: boolean }
const calls: Recorded[] = [];
let insertError: unknown = null;
let selectRow: Record<string, unknown> | null = null;

vi.mock('@/integrations/supabase/client', () => {
  const makeInsert = (table: string) => (payload: unknown) => {
    const record: Recorded = { table, op: 'insert', payload, selected: false };
    calls.push(record);
    // A thenable, so `await table.insert(x)` resolves without `.select()`.
    const result = {
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: insertError }),
      select: () => {
        record.selected = true;
        return { single: async () => ({ data: selectRow, error: insertError }) };
      },
    };
    return result;
  };
  const from = (table: string) => ({
    insert: makeInsert(table),
    select: () => ({
      eq: () => ({
        single: async () => {
          calls.push({ table, op: 'select-by-id' });
          return { data: selectRow, error: null };
        },
      }),
    }),
  });
  return {
    supabase: {
      from,
      auth: { getUser: async () => ({ data: { user: authUser } }) },
    },
  };
});

const load = async () => (await import('../brands.supabase')).SupabaseBrandsService;

beforeEach(() => {
  calls.length = 0;
  insertError = null;
  selectRow = {
    id: 'generated-by-client',
    user_id: 'user-1',
    name: 'Acme',
    slug: 'acme',
    primary_color: '#000000',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  vi.resetModules();
});

describe('brand creation and the SELECT policy', () => {
  it('does not chain .select() onto the insert', async () => {
    const Service = await load();
    await new Service().create({ name: 'Acme', primaryColor: '#000000' } as never);
    const insert = calls.find((c) => c.op === 'insert' && c.table === 'brands');
    expect(insert, 'no insert was issued').toBeTruthy();
    // The whole bug in one assertion.
    expect(insert!.selected, 'insert asked for the row back — RLS will refuse it').toBe(false);
  });

  it('sends an id it generated, so the row can be found again', async () => {
    const Service = await load();
    await new Service().create({ name: 'Acme', primaryColor: '#000000' } as never);
    const insert = calls.find((c) => c.op === 'insert');
    const payload = insert!.payload as Record<string, unknown>;
    expect(typeof payload.id).toBe('string');
    expect((payload.id as string).length).toBeGreaterThan(20);
  });

  it('reads the row back in a separate statement', async () => {
    // A second statement takes a new snapshot, in which the row exists.
    const Service = await load();
    await new Service().create({ name: 'Acme', primaryColor: '#000000' } as never);
    const order = calls.map((c) => c.op);
    expect(order).toContain('select-by-id');
    expect(order.indexOf('insert')).toBeLessThan(order.indexOf('select-by-id'));
  });

  it('gives every brand a different id', async () => {
    const Service = await load();
    const service = new Service();
    await service.create({ name: 'A', primaryColor: '#000000' } as never);
    await service.create({ name: 'B', primaryColor: '#000000' } as never);
    const ids = calls.filter((c) => c.op === 'insert')
      .map((c) => (c.payload as Record<string, unknown>).id);
    expect(new Set(ids).size).toBe(2);
  });

  it('still surfaces a real insert failure rather than swallowing it', async () => {
    insertError = { message: 'brands_limit_reached', code: '42501' };
    const Service = await load();
    await expect(new Service().create({ name: 'Acme', primaryColor: '#000000' } as never))
      .rejects.toMatchObject({ message: 'brands_limit_reached' });
  });
});
