import { beforeEach, describe, expect, it } from 'vitest';
import { quarantineAuthErrorParams, takeAuthCallbackError, describeAuthCallbackError } from './callbackError';

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('quarantineAuthErrorParams', () => {
  it('moves Supabase error params out of the query into sessionStorage', () => {
    window.history.replaceState(null, '', '/auth/callback?next=%2Fdashboard&error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid');
    quarantineAuthErrorParams();
    expect(window.location.search).toBe('?next=%2Fdashboard');
    const e = takeAuthCallbackError();
    expect(e?.error_code).toBe('otp_expired');
    expect(describeAuthCallbackError(e!)).toMatch(/expired/);
    // consumed
    expect(takeAuthCallbackError()).toBeNull();
  });

  it('handles the hash form and keeps other hash params', () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_description=User+cancelled&foo=1');
    quarantineAuthErrorParams();
    expect(window.location.hash).toBe('#foo=1');
    expect(describeAuthCallbackError(takeAuthCallbackError()!)).toBe('User cancelled');
  });

  it('ignores an unrelated ?error= that is not Supabase-shaped', () => {
    window.history.replaceState(null, '', '/some/page?error=oops');
    quarantineAuthErrorParams();
    expect(window.location.search).toBe('?error=oops');
    expect(takeAuthCallbackError()).toBeNull();
  });
});
