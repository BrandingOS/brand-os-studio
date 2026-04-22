import { describe, it, expect } from 'vitest';
import { encodePalette, decodePalette } from '../usePaletteShareUrl';

describe('usePaletteShareUrl encoding', () => {
  const payload = {
    seed: '#0ea5e9',
    mode: 'auto' as const,
    locked: null,
    theme: 'light' as const,
    name: 'Sky',
    roles: {
      primary: '#0ea5e9',
      neutral: '#6b7280',
      success: '#10b981',
    },
  };

  it('round-trips a payload', () => {
    const encoded = encodePalette(payload);
    expect(encoded).not.toMatch(/[+/=]/); // url-safe
    const decoded = decodePalette(encoded);
    expect(decoded).toEqual(payload);
  });

  it('returns null for garbage input', () => {
    expect(decodePalette('not-base64-at-all!!!')).toBeNull();
  });

  it('handles unicode names', () => {
    const p = { ...payload, name: 'Palette 🌈 éé' };
    const encoded = encodePalette(p);
    const decoded = decodePalette(encoded);
    expect(decoded?.name).toBe('Palette 🌈 éé');
  });
});
