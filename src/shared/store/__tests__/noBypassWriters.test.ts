/**
 * Structural guard: one write authority for Brand Core.
 *
 * Convergence is easy to do once and easy to lose. Every future change that
 * reaches for the old shortcuts — the legacy `services.brands` write channel,
 * or hand-projecting canonical state with `toLegacyBrandPatch` in a component —
 * fails here with the reason, rather than quietly re-creating a second path
 * that only shows up as a stale value months later.
 *
 * This is a source scan rather than a lint rule so the allowance list is
 * reviewable in one place with its justification attached.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = join(process.cwd(), 'src');

/**
 * `toLegacyBrandPatch` projects canonical state into the legacy shape. That is
 * a boundary concern, not an application one — these three own it.
 */
const TO_LEGACY_ALLOWED = new Set([
  'domain/brand/toLegacy.ts',
  'domain/brand/index.ts',
  // The canonical facade — this is literally its job.
  'platform/brand/BrandServiceRepository.ts',
  // Merges the canonical result into store state after a routed write.
  'shared/store/brandStore.ts',
]);

/** The legacy compatibility bridge itself, plus the doc that warns about it. */
const REGISTRY_WRITE_ALLOWED = new Set([
  'shared/services/registry.ts',
  'shared/hooks/useBrandUpdate.ts',
]);

/**
 * Strip comments before scanning. Without this the guard flags its own
 * explanatory prose — several of these files legitimately *describe* the old
 * shortcuts in a comment while not using them.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__screenshots__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.(test|spec|browser\.test)\.(ts|tsx)$/.test(entry)) continue;
    acc.push(full);
  }
  return acc;
}

const FILES = sourceFiles(SRC).map((full) => ({
  rel: relative(SRC, full).split(sep).join('/'),
  text: stripComments(readFileSync(full, 'utf8')),
}));

describe('Brand Core has one write authority', () => {
  it('nothing writes brands through the legacy `services.brands` channel', () => {
    const offenders = FILES.filter(
      (f) =>
        !REGISTRY_WRITE_ALLOWED.has(f.rel) &&
        /services\.brands\.(update|create|delete)\s*\(/.test(f.text),
    ).map((f) => f.rel);

    expect(
      offenders,
      'Use useBrandStore.update (React) or the container-resolved IBrandsService ' +
        '(non-React). The registry singleton bypasses the store, so other mounted ' +
        'surfaces do not see the change until a reload.',
    ).toEqual([]);
  });

  it('only the canonical boundary projects canonical state with toLegacyBrandPatch', () => {
    const offenders = FILES.filter(
      (f) => !TO_LEGACY_ALLOWED.has(f.rel) && /\btoLegacyBrandPatch\b/.test(f.text),
    ).map((f) => f.rel);

    expect(
      offenders,
      'Hand-projecting canonical state into a component or page re-creates the ' +
        'second write path this feature removed. Go through brandStore.update, ' +
        'which routes Core fields to their canonical ops.',
    ).toEqual([]);
  });

  it('no page or feature bypasses persistence with useBrandStore.setState', () => {
    // Setting store state directly makes the UI show a value that was never
    // saved — the failure mode is invisible until reload.
    const offenders = FILES.filter(
      (f) =>
        f.rel !== 'shared/store/brandStore.ts' &&
        /useBrandStore\.setState\s*\(/.test(f.text),
    ).map((f) => f.rel);

    expect(offenders).toEqual([]);
  });

  it('the Setup page delegates its whole patch instead of routing Core itself', () => {
    const setup = FILES.find((f) => f.rel === 'pages/b/[slug]/setup.tsx');
    expect(setup).toBeDefined();
    // It used to import four canonical ops and hand-merge the result.
    expect(setup!.text).not.toMatch(/changeBrand(Colors|Typography|VoiceTone|Strategy)/);
    expect(setup!.text).toMatch(/updateBrand\(brand\.id, patch\)/);
  });
});
