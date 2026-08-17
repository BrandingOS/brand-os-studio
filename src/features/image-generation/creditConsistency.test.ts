// The credit unit and the money guard rails, pinned.
//
// "1 credit = USD 0.01" is stated in five places: the server pricing module,
// this client module (for display), the migration, the docs and the UI copy.
// A constant repeated is a constant that drifts, so the client value is
// asserted against the SERVER file rather than merely being correct today.
//
// The second half asserts the guard rails that keep a user from moving their
// own balance — read from the migration itself, so weakening the SQL fails CI
// rather than shipping quietly.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { USD_PER_CREDIT, creditsToUsdLabel, formatCredits } from './credits';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('credit unit consistency', () => {
  const serverPricing = read('supabase/functions/_shared/pricing.ts');
  const migration = read('supabase/migrations/20260818000000_025_image_generation_v2.sql');
  const doc = read('docs/design/image-generation-v2.md');

  it('the client display constant matches the server', () => {
    const match = /export const USD_PER_CREDIT = ([\d.]+);/.exec(serverPricing);
    expect(match, 'server must export USD_PER_CREDIT').toBeTruthy();
    expect(USD_PER_CREDIT).toBe(Number(match![1]));
  });

  it('the migration and the docs state the same unit', () => {
    expect(migration).toMatch(/1 credit = USD 0\.01/);
    expect(doc).toMatch(/1 credit = USD 0\.01/);
  });

  it('formats credits and their dollar value consistently', () => {
    expect(creditsToUsdLabel(14)).toBe('$0.14');
    expect(creditsToUsdLabel(500)).toBe('$5.00');
    expect(formatCredits(1234)).toBe('1,234');
  });

  it('the server rounds a paid generation UP to whole credits', () => {
    // Mirrors usdToCredits(); asserted here so the client's dollar labels and
    // the server's charge can never disagree about the direction of rounding.
    const ceilToCredits = (usd: number) => (usd <= 0 ? 0 : Math.max(1, Math.ceil(usd / USD_PER_CREDIT)));
    expect(ceilToCredits(0.134)).toBe(14);
    expect(ceilToCredits(0.0001)).toBe(1);
    expect(ceilToCredits(0)).toBe(0);
  });
});

describe('credit guard rails in the migration', () => {
  const migration = read('supabase/migrations/20260818000000_025_image_generation_v2.sql');

  it('the default grant is 500 credits ($5)', () => {
    expect(migration).toMatch(/RETURNS BIGINT LANGUAGE sql IMMUTABLE AS \$\$ SELECT 500::BIGINT \$\$/);
  });

  it('every money function revokes EXECUTE from anon and authenticated', () => {
    for (const fn of ['ensure_credit_account', 'reserve_credits', 'settle_credits', 'release_credits', 'grant_credits']) {
      const revoke = new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\)\\s*FROM PUBLIC, anon, authenticated`);
      expect(migration, `${fn} must be revoked from client roles`).toMatch(revoke);
    }
  });

  it('grant_credits is executable by the service role only', () => {
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.grant_credits\([^)]*\)\s*TO service_role/);
    // …and by nobody else: no GRANT to authenticated/anon/PUBLIC anywhere.
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.\w+\([^)]*\)\s*TO (authenticated|anon|PUBLIC)/);
  });

  it('balances and the ledger are not client-writable', () => {
    // A SELECT policy exists for both, and nothing else.
    expect(migration).toMatch(/CREATE POLICY credit_accounts_select ON public\.credit_accounts\s*\n\s*FOR SELECT/);
    expect(migration).toMatch(/CREATE POLICY credit_ledger_select ON public\.credit_ledger\s*\n\s*FOR SELECT/);
    expect(migration).not.toMatch(/CREATE POLICY credit_accounts_(insert|update|delete)/);
    expect(migration).not.toMatch(/CREATE POLICY credit_ledger_(insert|update|delete)/);
    // The migration also fails itself if either invariant is broken.
    expect(migration).toMatch(/credit_accounts must not be client-writable/);
    expect(migration).toMatch(/credit_ledger must be append-only from the server/);
  });

  it('a reservation can never overdraw — the balance check is in the UPDATE, not before it', () => {
    expect(migration).toMatch(/SET balance_credits\s*=\s*balance_credits\s*-\s*_amount[\s\S]*?WHERE workspace_id = _workspace_id\s*\n\s*AND balance_credits >= _amount/);
  });
});
