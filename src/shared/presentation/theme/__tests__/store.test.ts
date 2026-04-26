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

  it('patchTheme deep-merges typography', () => {
    useDeckThemeStore.getState().patchTheme('b1', 'pitch-deck', { typography: { scaleMultiplier: 1.15 } });
    const t = useDeckThemeStore.getState().draftFor('b1', 'pitch-deck');
    expect(t.typography.scaleMultiplier).toBe(1.15);
    expect(t.typography.leadingMultiplier).toBe(1);   // preserved from EMPTY_THEME
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
