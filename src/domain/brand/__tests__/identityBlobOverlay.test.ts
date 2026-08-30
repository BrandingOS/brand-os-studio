/**
 * Brand System finalization — the canonical `identity` blob (migration 013).
 *
 * `toLegacyBrandPatch` emits the blob; `fromLegacyBrand` overlays ONLY the
 * fields with no legacy column (accent/neutrals, numeric weights, rich voice).
 * Fields with a live legacy home (primary/secondary/logos/fonts/tone/strategy)
 * must keep reading from the always-current legacy shape so a lagging blob can
 * never revert an un-migrated writer.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { fromLegacyBrand, toLegacyBrandPatch } from '@/domain/brand';

function makeLegacy(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: 'friendly',
    audience: 'builders',
    assets: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  } as Brand;
}

describe('toLegacyBrandPatch emits the canonical identity blob', () => {
  it('carries the full identity + schema version for durable persistence', () => {
    const c = fromLegacyBrand(makeLegacy({ accentColor: '#00ff00', neutrals: ['#eee', '#333'] }));
    const patch = toLegacyBrandPatch(c);
    expect(patch.identity).toBeTruthy();
    expect(patch.identity!.colors.accent?.hex).toBe('#00ff00');
    expect(patch.identity!.colors.neutrals?.map((n) => n.hex)).toEqual(['#eee', '#333']);
    expect(patch.identitySchemaVersion).toBe(c.identitySchemaVersion);
  });
});

describe('fromLegacyBrand overlays blob-only fields from the stored identity', () => {
  it('recovers accent/neutrals that have no legacy column', () => {
    // Simulate an authed reload: the scalar columns lost accent/neutrals, but
    // the stored identity blob still carries them.
    const stored = fromLegacyBrand(
      makeLegacy({ accentColor: '#00ff00', neutrals: ['#eeeeee', '#333333'] }),
    );
    const reloaded = fromLegacyBrand(
      makeLegacy({ identity: stored.identity, identitySchemaVersion: stored.identitySchemaVersion }),
    );
    expect(reloaded.identity.colors.accent?.hex).toBe('#00ff00');
    expect(reloaded.identity.colors.neutrals?.map((n) => n.hex)).toEqual(['#eeeeee', '#333333']);
  });

  it('recovers numeric font weights + rich voice from the blob', () => {
    const stored = fromLegacyBrand(
      makeLegacy({
        typography: {
          primary: { family: 'Inter', weights: [400, 700] },
        } as Brand['typography'],
        guidelines: {
          voiceAndTone: {
            brandVoice: 'confident',
            toneAttributes: ['warm', 'direct'],
            communicationStyle: '',
            doAndDonts: { do: ['be clear'], dont: ['be vague'] },
            examples: [{ context: 'email', good: 'Hi', bad: 'Greetings' }],
          },
        },
      }),
    );
    const reloaded = fromLegacyBrand(
      makeLegacy({ identity: stored.identity, identitySchemaVersion: 1 }),
    );
    expect(reloaded.identity.typography.primary.weights).toEqual([400, 700]);
    expect(reloaded.identity.voice.personality).toEqual(['warm', 'direct']);
    expect(reloaded.identity.voice.doList).toEqual(['be clear']);
    expect(reloaded.identity.voice.examples[0]).toEqual({ context: 'email', text: 'Hi' });
  });

  /**
   * QA Q5, on the read side.
   *
   * The overlay built `typography` from two named keys instead of spreading
   * what it was handed, so every read of every brand deleted `scale` — the
   * Brand Kit's Typography editor wrote a new base size correctly and the very
   * next read threw it away. The confirmation was honest; the round trip was
   * not.
   */
  it('keeps the type scale through a read — it is not one of two named keys', () => {
    const stored = fromLegacyBrand(
      makeLegacy({
        typography: {
          primary: { family: 'Inter' },
          scale: { body: '18px', h1: '68px' },
        } as Brand['typography'],
      }),
    );
    expect(stored.identity.typography.scale?.body).toBe('18px');

    const reloaded = fromLegacyBrand(
      makeLegacy({
        typography: {
          primary: { family: 'Inter' },
          scale: { body: '18px', h1: '68px' },
        } as Brand['typography'],
        identity: stored.identity,
        identitySchemaVersion: stored.identitySchemaVersion,
      }),
    );
    expect(reloaded.identity.typography.scale?.body).toBe('18px');
    expect(reloaded.identity.typography.scale?.h1).toBe('68px');
  });

  it('recovers a scale the transport dropped, from the blob', () => {
    const stored = fromLegacyBrand(
      makeLegacy({
        typography: { primary: { family: 'Inter' }, scale: { body: '18px' } } as Brand['typography'],
      }),
    );
    // The legacy `typography` column is gone; only the blob survived.
    const reloaded = fromLegacyBrand(
      makeLegacy({ identity: stored.identity, identitySchemaVersion: stored.identitySchemaVersion }),
    );
    expect(reloaded.identity.typography.scale?.body).toBe('18px');
  });

  it('does NOT let the blob override live legacy-homed fields (no revert)', () => {
    // Blob carries an OLD primary/logo/tone; the fresh legacy scalars must win.
    const stale = fromLegacyBrand(
      makeLegacy({
        primaryColor: '#000000',
        tone: 'old tone',
        logoAssets: { full: 'old-url' },
      }),
    );
    const fresh = fromLegacyBrand(
      makeLegacy({
        primaryColor: '#ffffff', // fresh legacy edit
        tone: 'fresh tone',
        logoAssets: { full: 'new-url' },
        identity: stale.identity, // lagging blob
        identitySchemaVersion: 1,
      }),
    );
    expect(fresh.identity.colors.primary.hex).toBe('#ffffff'); // legacy wins
    expect(fresh.identity.voice.tone).toBe('fresh tone'); // legacy wins
    expect(fresh.identity.logos.primary?.assetId).toBe('legacy-url:new-url'); // legacy wins
  });

  it('a fresh legacy accent/neutrals scalar beats a stale blob (Brand Board no-revert)', () => {
    // Brand Board writes accentColor/neutrals scalars directly; a lagging blob
    // must never revert that fresh edit — legacy-first backfill.
    const stale = fromLegacyBrand(makeLegacy({ accentColor: '#000000', neutrals: ['#000'] }));
    const fresh = fromLegacyBrand(
      makeLegacy({
        accentColor: '#ff0000', // fresh Brand Board edit
        neutrals: ['#ff0000'],
        identity: stale.identity, // lagging blob has #000000
        identitySchemaVersion: 1,
      }),
    );
    expect(fresh.identity.colors.accent?.hex).toBe('#ff0000'); // legacy scalar wins
    expect(fresh.identity.colors.neutrals?.map((n) => n.hex)).toEqual(['#ff0000']);
  });

  it('is a no-op when no blob is present (unmigrated brands unchanged)', () => {
    const withBlob = fromLegacyBrand(makeLegacy({ accentColor: '#abcabc' }));
    const noBlob = fromLegacyBrand(makeLegacy({ accentColor: '#abcabc' }));
    expect(withBlob.identity.colors.accent?.hex).toBe('#abcabc');
    // Same input without a blob field behaves identically (deterministic).
    expect(noBlob).toEqual(withBlob);
  });
});
