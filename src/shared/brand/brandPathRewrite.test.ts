// Phase A — brandPathRewrite unit tests.
//
// Covers the new /a/ (Classic sticky) branch added in Phase A, plus
// regression tests for the existing /b/ and /dashboard/brand/ paths.
import { describe, expect, it } from 'vitest';
import { rewriteBrandPath } from './brandPathRewrite';

describe('rewriteBrandPath — Studio (/b)', () => {
  it('rewrites /b/old/section → /b/new/section', () => {
    expect(rewriteBrandPath('/b/raqm/setup', 'raqm', 'skam')).toBe('/b/skam/setup');
  });

  it('preserves query string', () => {
    expect(rewriteBrandPath('/b/raqm/identity', 'raqm', 'skam', '?tab=colors')).toBe(
      '/b/skam/identity?tab=colors',
    );
  });

  it('handles bare /b/old → /b/new', () => {
    expect(rewriteBrandPath('/b/raqm', 'raqm', 'skam')).toBe('/b/skam');
  });

  it('handles deep paths /b/old/a/b/c → /b/new/a/b/c', () => {
    expect(rewriteBrandPath('/b/raqm/tools/variant-studio', 'raqm', 'skam')).toBe(
      '/b/skam/tools/variant-studio',
    );
  });
});

describe('rewriteBrandPath — Classic (/a) sticky', () => {
  it('rewrites /a/old/section → /a/new/section (does NOT bounce to /b)', () => {
    expect(rewriteBrandPath('/a/raqm/identity', 'raqm', 'skam')).toBe('/a/skam/identity');
  });

  it('preserves query string in Classic', () => {
    expect(rewriteBrandPath('/a/raqm/identity', 'raqm', 'skam', '?tab=logo')).toBe(
      '/a/skam/identity?tab=logo',
    );
  });

  it('bare /a/old → /a/new', () => {
    expect(rewriteBrandPath('/a/raqm', 'raqm', 'skam')).toBe('/a/skam');
  });

  it('deep classic paths stay in /a', () => {
    expect(rewriteBrandPath('/a/raqm/brandkit/colors', 'raqm', 'skam')).toBe(
      '/a/skam/brandkit/colors',
    );
  });
});

describe('rewriteBrandPath — legacy /dashboard/brand/', () => {
  it('normalizes /dashboard/brand/old/section → /b/new/section', () => {
    expect(rewriteBrandPath('/dashboard/brand/raqm/design', 'raqm', 'skam')).toBe(
      '/b/skam/design',
    );
  });

  it('bare /dashboard/brand/old → /b/new', () => {
    expect(rewriteBrandPath('/dashboard/brand/raqm', 'raqm', 'skam')).toBe('/b/skam');
  });
});

describe('rewriteBrandPath — no current brand (workspace switch)', () => {
  it('returns /b/:newSlug when no oldSlug given', () => {
    expect(rewriteBrandPath('/dashboard', undefined, 'skam')).toBe('/b/skam');
  });
});
