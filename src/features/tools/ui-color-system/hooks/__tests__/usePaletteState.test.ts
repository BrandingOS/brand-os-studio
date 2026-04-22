import { describe, it, expect } from 'vitest';
import { createPaletteStore } from '../usePaletteState';
import { SHADE_STOPS } from '@/lib/color-engine';

describe('usePaletteState (createPaletteStore)', () => {
  it('seeds primary and neutral scales by default', () => {
    const store = createPaletteStore('#0ea5e9');
    const s = store.getState();
    expect(s.roles.primary.inputHex).toBe('#0ea5e9');
    expect(s.roles.neutral.inputHex).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.semanticTokens.buttonPrimaryBg).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('recomputes semantic tokens when the seed changes', () => {
    const store = createPaletteStore('#0ea5e9');
    const before = store.getState().semanticTokens.buttonPrimaryBg;
    store.getState().setSeed('#f97316');
    const after = store.getState().semanticTokens.buttonPrimaryBg;
    expect(after).not.toBe(before);
  });

  it('edits a single shade without wiping the rest', () => {
    const store = createPaletteStore('#0ea5e9');
    const originals = SHADE_STOPS.map((stop) => store.getState().roles.primary.shades[stop].hex);
    store.getState().editShade('primary', 500, '#123456');
    const s = store.getState();
    expect(s.roles.primary.shades[500].hex).toBe('#123456');
    expect(s.roles.primary.shades[500].edited).toBe(true);
    // The other shades should be unchanged (curve regenerated with the same seed).
    expect(s.roles.primary.shades[50].hex).toBe(originals[0]);
    expect(s.roles.primary.shades[950].hex).toBe(originals[originals.length - 1]);
  });

  it('locks and unlocks a shade', () => {
    const store = createPaletteStore('#0ea5e9');
    store.getState().lockShade('primary', 600, true);
    expect(store.getState().roles.primary.shades[600].locked).toBe(true);
    store.getState().lockShade('primary', 600, false);
    expect(store.getState().roles.primary.shades[600].locked).toBe(false);
  });

  it('adds and removes optional roles', () => {
    const store = createPaletteStore('#0ea5e9');
    store.getState().addRole('secondary');
    expect(store.getState().roles.secondary).not.toBeNull();
    store.getState().removeRole('secondary');
    expect(store.getState().roles.secondary).toBeNull();
  });

  it('applyHarmony populates secondary + tertiary', () => {
    const store = createPaletteStore('#0ea5e9');
    store.getState().applyHarmony('triadic');
    const s = store.getState();
    expect(s.roles.secondary).not.toBeNull();
    expect(s.roles.tertiary).not.toBeNull();
  });

  it('toggling theme changes canvas/surface tokens', () => {
    const store = createPaletteStore('#0ea5e9');
    const lightCanvas = store.getState().semanticTokens.canvas;
    store.getState().setTheme('dark');
    const darkCanvas = store.getState().semanticTokens.canvas;
    expect(darkCanvas).not.toBe(lightCanvas);
  });
});
