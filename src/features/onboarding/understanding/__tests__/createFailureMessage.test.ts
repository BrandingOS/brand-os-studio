/**
 * What the user is told when creating a brand fails.
 *
 * On 2026-09-05 every brand creation on production failed with the generic
 * "Couldn't save that just now" while the database was answering, precisely,
 * `brands_limit_reached` — "42 of 2 used on the free plan". The sentence the
 * user sees must carry that reason when the database gives one.
 */
import { describe, it, expect } from 'vitest';
import { createFailureMessage } from '../createBrand';

/** The shape supabase-js hands back for a RAISE EXCEPTION … USING DETAIL. */
const pg = (message: string, details = '', code = '42501') => ({ code, message, details, hint: null });

describe('createFailureMessage', () => {
  it('names the plan limit, with the numbers Postgres put in DETAIL', () => {
    const m = createFailureMessage(pg('brands_limit_reached', '42 of 2 used on the free plan'));
    expect(m.title).toMatch(/2 brands/);
    expect(m.title).toMatch(/free plan/);
    expect(m.description).toMatch(/upgrade/i);
  });

  it('still names the limit when DETAIL is missing', () => {
    const m = createFailureMessage(pg('brands_limit_reached'));
    expect(m.title).toMatch(/brand/i);
    expect(m.title).not.toMatch(/undefined/);
    expect(m.title).not.toMatch(/Couldn't save/);
  });

  it('keeps the duplicate-name sentence', () => {
    const m = createFailureMessage(new Error('duplicate key value violates unique constraint "brands_slug_key"'));
    expect(m.title).toMatch(/already have a brand with that name/);
    expect(m.description).toBeUndefined();
  });

  it('falls back to the generic sentence, carrying the raw message as the detail', () => {
    const m = createFailureMessage(new Error('Failed to fetch'));
    expect(m.title).toMatch(/Couldn't save that just now/);
    expect(m.description).toBe('Failed to fetch');
  });

  it('never surfaces a bare machine token as the whole message', () => {
    const m = createFailureMessage(pg('workspace_limit_reached', '1 of 1 used on the free plan'));
    expect(m.title).not.toBe('workspace_limit_reached');
    expect(m.title).toMatch(/workspace/i);
  });

  it('handles a non-Error unknown', () => {
    const m = createFailureMessage('boom');
    expect(m.title).toMatch(/Couldn't save that just now/);
    expect(m.description).toBeUndefined();
  });
});
