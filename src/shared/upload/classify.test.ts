import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BrandVisionVerdict } from './classify';
import { classifyImage, verdictToPatch } from './classify';

// The classifier is opt-in (env-gated) — configure it for these tests so the
// fetch path actually runs.
// NOTE: the store-routing half of this suite moved with `classifyAndRoute`,
// which stays in the legacy flow. The equivalent guarantee for V3 — the model
// advises but never overrules a user's placement — is asserted in
// src/features/onboarding/__tests__/interpret.test.ts. stubEnv patches process.env, which the classifier's
// lazy env read falls back to (import.meta.env is per-module under Vitest).
beforeEach(() => {
  vi.stubEnv('VITE_CLASSIFIER_URL', 'http://localhost:8300');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

function verdict(patch: Partial<BrandVisionVerdict> = {}): BrandVisionVerdict {
  return {
    category: 'logo_mark',
    confidence: 0.95,
    placement: 'logos',
    is_logo: true,
    logo_slot: 'mark',
    reasoning: 'test',
    needs_review: false,
    ...patch,
  };
}

describe('verdictToPatch', () => {
  const current = { kind: 'image' as const, sub: 'PNG · 10 KB' };

  it('routes logos with an AI slot hint (never a hard slot)', () => {
    const patch = verdictToPatch(verdict(), current);
    expect(patch.isLogo).toBe(true);
    expect(patch.aiLogoSlot).toBe('mark');
    // A hard logoSlot would hide the tile from the dropzone list.
    expect(patch.logoSlot).toBeUndefined();
    expect(patch.kind).toBe('image');
    expect(patch.sub).toContain('✨ logo mark');
  });

  it('routes plain images out of the logo group', () => {
    const patch = verdictToPatch(verdict({ category: 'photo', placement: 'images', is_logo: false, logo_slot: null }), current);
    expect(patch.isLogo).toBe(false);
    expect(patch.logoSlot).toBeUndefined();
  });

  it('never strips "logo" from an upload the heuristics already flagged', () => {
    // A detailed mark can read as "pattern" to the model; losing the logo
    // flag here would drop it from the brand at save time.
    const knownLogo = { kind: 'image' as const, sub: 'PNG · 9 KB', isLogo: true };
    const patch = verdictToPatch(
      verdict({ category: 'pattern', placement: 'images', is_logo: false, logo_slot: null }),
      knownLogo,
    );
    expect(patch.isLogo).toBeUndefined(); // untouched — stays a logo
    expect(patch.kind).toBeUndefined();
    expect(patch.sub).toContain('✨ pattern');
  });

  it('still promotes an unrecognized image to a logo', () => {
    const plain = { kind: 'image' as const, sub: 'PNG · 9 KB', isLogo: false };
    const patch = verdictToPatch(verdict({ logo_slot: 'wordmark' }), plain);
    expect(patch.isLogo).toBe(true);
    expect(patch.aiLogoSlot).toBe('wordmark');
  });

  it('keeps palette images as image cards', () => {
    const patch = verdictToPatch(verdict({ category: 'palette', placement: 'colors', is_logo: false, logo_slot: null }), current);
    expect(patch.kind).toBe('image');
    expect(patch.isLogo).toBe(false);
  });

  it('moves document images to files', () => {
    const patch = verdictToPatch(verdict({ category: 'document', placement: 'files', is_logo: false, logo_slot: null }), current);
    expect(patch.kind).toBe('file');
  });

  it('does not duplicate the AI tag in sub', () => {
    const tagged = { kind: 'image' as const, sub: 'PNG · 10 KB · ✨ photo' };
    const patch = verdictToPatch(verdict(), tagged);
    expect(patch.sub?.match(/✨/g)?.length).toBe(1);
  });
});
