import { beforeEach, describe, expect, it } from 'vitest';
import type { UserPreferences } from '@/core/types/services';
import {
  LEGACY_KEYS,
  MIRROR_KEY,
  mergePreferences,
  readMirror,
  seedFromLegacyKeys,
  writeMirror,
} from '../preferencesShape';

describe('mergePreferences', () => {
  it('overwrites scalars', () => {
    expect(mergePreferences({ theme: 'light' }, { theme: 'dark' }).theme).toBe('dark');
  });

  it('leaves a key the patch does not mention', () => {
    const out = mergePreferences({ theme: 'dark', uiPreference: 'classic' }, { theme: 'light' });
    expect(out.uiPreference).toBe('classic');
  });

  it('treats null as a value, not an absence', () => {
    // `lastWorkspaceId: null` means "cleared" and must survive; a truthiness
    // test here would silently keep the old workspace forever.
    const out = mergePreferences({ lastWorkspaceId: 'ws-1' }, { lastWorkspaceId: null });
    expect(out.lastWorkspaceId).toBeNull();
  });

  it('treats false as a value', () => {
    const out = mergePreferences({ innerNavOpen: true }, { innerNavOpen: false });
    expect(out.innerNavOpen).toBe(false);
  });

  it('merges aiGenerate key-by-key rather than replacing the bag', () => {
    const out = mergePreferences(
      { aiGenerate: { brandAware: true, model: 'a', count: 4 } },
      { aiGenerate: { count: 2 } },
    );
    expect(out.aiGenerate).toEqual({ brandAware: true, model: 'a', count: 2 });
  });

  it('merges dismissed maps key-by-key', () => {
    // Dismissing one hint must not forget every hint dismissed before it.
    const out = mergePreferences(
      { dismissed: { featuresSeen: { a: '2026-01-01' } } },
      { dismissed: { featuresSeen: { b: '2026-02-02' } } },
    );
    expect(out.dismissed?.featuresSeen).toEqual({ a: '2026-01-01', b: '2026-02-02' });
  });

  it('keeps an untouched dismissed map when another one changes', () => {
    const out = mergePreferences(
      { dismissed: { featuresSeen: { a: '1' }, tours: { t: '2' } } },
      { dismissed: { hints: { h: '3' } } },
    );
    expect(out.dismissed).toEqual({
      featuresSeen: { a: '1' },
      tours: { t: '2' },
      hints: { h: '3' },
    });
  });

  it('does not mutate its inputs', () => {
    const base: UserPreferences = { aiGenerate: { count: 1 } };
    mergePreferences(base, { aiGenerate: { count: 9 } });
    expect(base.aiGenerate).toEqual({ count: 1 });
  });
});

describe('the mirror', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips', () => {
    writeMirror({ theme: 'dark' });
    expect(readMirror()).toEqual({ theme: 'dark' });
  });

  it('returns an empty object when nothing is stored', () => {
    expect(readMirror()).toEqual({});
  });

  it('survives a corrupt payload', () => {
    window.localStorage.setItem(MIRROR_KEY, '{not json');
    expect(readMirror()).toEqual({});
  });

  it('rejects a non-object payload', () => {
    window.localStorage.setItem(MIRROR_KEY, '"a string"');
    expect(readMirror()).toEqual({});
  });
});

describe('seedFromLegacyKeys', () => {
  beforeEach(() => window.localStorage.clear());

  it('reads nothing when the user has no history', () => {
    expect(seedFromLegacyKeys()).toEqual({});
  });

  it('unwraps the zustand persist envelope', () => {
    window.localStorage.setItem(
      LEGACY_KEYS.uiPreference,
      JSON.stringify({ state: { preference: 'classic' }, version: 1 }),
    );
    expect(seedFromLegacyKeys().uiPreference).toBe('classic');
  });

  it('reads the theme, which is a bare string not JSON', () => {
    window.localStorage.setItem(LEGACY_KEYS.theme, 'dark');
    expect(seedFromLegacyKeys().theme).toBe('dark');
  });

  it('reads the inner-nav flag, which is "1"/"0"', () => {
    window.localStorage.setItem(LEGACY_KEYS.innerNavOpen, '0');
    expect(seedFromLegacyKeys().innerNavOpen).toBe(false);
  });

  it('reads the AI generate defaults', () => {
    window.localStorage.setItem(
      LEGACY_KEYS.aiGenerate,
      JSON.stringify({ state: { brandAware: false, model: 'flux', count: 3 } }),
    );
    expect(seedFromLegacyKeys().aiGenerate).toEqual({
      brandAware: false,
      model: 'flux',
      count: 3,
    });
  });

  it('reads the last workspace id out of its nested envelope', () => {
    window.localStorage.setItem(
      LEGACY_KEYS.lastWorkspace,
      JSON.stringify({ state: { current: { id: 'ws-7' } } }),
    );
    expect(seedFromLegacyKeys().lastWorkspaceId).toBe('ws-7');
  });

  it('omits anything absent rather than defaulting it', () => {
    // The first server row must record real choices, not this device's
    // defaults — otherwise signing in on a new laptop publishes its blanks.
    window.localStorage.setItem(LEGACY_KEYS.theme, 'dark');
    expect(seedFromLegacyKeys()).toEqual({ theme: 'dark' });
  });

  it('ignores a corrupt legacy value instead of throwing', () => {
    window.localStorage.setItem(LEGACY_KEYS.uiPreference, '{broken');
    expect(seedFromLegacyKeys()).toEqual({});
  });
});
