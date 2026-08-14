/**
 * Recognising "this database does not have that column yet".
 *
 * The pre-migration tolerance in `brands.supabase.ts` is what lets an
 * environment carrying the code but not the migration keep working, and it is
 * only as good as this predicate. It was written for one of the two shapes
 * PostgREST reports, and the one it missed is the one an INSERT or UPDATE
 * actually produces — so on a project without migration 022, creating a brand
 * failed outright and the onboarding marker never persisted. A brand left
 * mid-flow then read as finished and sat in the dashboard among the completed
 * ones.
 */
import { describe, it, expect } from 'vitest';
import { missingColumnName } from '../brands.supabase';

describe('missingColumnName', () => {
  it('names the column PostgREST could not find in its schema cache', () => {
    expect(
      missingColumnName({
        code: 'PGRST204',
        message: "Could not find the 'onboarding' column of 'brands' in the schema cache",
      }),
    ).toBe('onboarding');
  });

  it('names the column Postgres itself rejected', () => {
    expect(
      missingColumnName({ code: '42703', message: 'column "business_info" does not exist' }),
    ).toBe('business_info');
  });

  it('reads the code even when the message does not name a column', () => {
    // Still a missing column, just an unnamed one — the caller falls back to
    // dropping the single field it is allowed to drop.
    expect(missingColumnName({ code: 'PGRST204', message: 'schema cache miss' })).toBe('');
  });

  it('is null for every other failure', () => {
    expect(missingColumnName({ code: '23505', message: 'duplicate key value' })).toBeNull();
    expect(missingColumnName({ code: '42501', message: 'permission denied' })).toBeNull();
    expect(missingColumnName(null)).toBeNull();
    expect(missingColumnName(undefined)).toBeNull();
  });

  it('does not mistake a constraint message that happens to say column', () => {
    expect(missingColumnName({ code: '23502', message: 'null value in column "name"' })).toBeNull();
  });
});
