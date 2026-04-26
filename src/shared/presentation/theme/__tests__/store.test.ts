// src/shared/presentation/theme/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDeckThemeStore } from '../store';
import { EMPTY_THEME } from '../types';

describe('useDeckThemeStore', () => {
  beforeEach(() => {
    useDeckThemeStore.setState({ byKey: {} });
  });

  it('returns EMPTY_THEME when nothing is set', () => {
    const t = useDeckThemeStore.getState().draftFor('b1', 'pitch-deck');
    expect(t).toEqual(EMPTY_THEME);
  });

  it('hydrates from a brand snapshot', () => {
    useDeckThemeStore.getState().hydrate('b1', 'pitch-deck', { ...EMPTY_THEME, density: 'spacious' });
    expect(useDeckThemeStore.getState().draftFor('b1', 'pitch-deck').density).toBe('spacious');
  });

  it('patchTheme deep-merges per-role typography overrides', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', {
      typography: { roles: { h1: { sizePx: 80 } } },
    });
    const t = useDeckThemeStore.getState().draftFor('b1', 'pitch-deck');
    expect(t.typography.roles.h1?.sizePx).toBe(80);
    // Patching another role preserves the first
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', {
      typography: { roles: { body: { font: 'Inter' } } },
    });
    const t2 = useDeckThemeStore.getState().draftFor('b1', 'pitch-deck');
    expect(t2.typography.roles.h1?.sizePx).toBe(80);
    expect(t2.typography.roles.body?.font).toBe('Inter');
  });

  it('reset clears the draft', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', { density: 'compact' });
    useDeckThemeStore.getState().reset('b1', 'pitch-deck');
    expect(useDeckThemeStore.getState().draftFor('b1', 'pitch-deck')).toEqual(EMPTY_THEME);
  });

  it('isolates per (brand, deckKind)', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', { density: 'compact' });
    expect(useDeckThemeStore.getState().draftFor('b1', 'case-study').density).toBe('comfortable');
    expect(useDeckThemeStore.getState().draftFor('b2', 'pitch-deck').density).toBe('comfortable');
  });
});
