import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MANIFEST, cellsFor } from './figma.manifest';

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, 'figma.manifest.tsx'),
  'utf8',
);

/**
 * Strip comments and imports before scanning. The prose explains WHY there are
 * no values here and would otherwise trip every check; the imports name real
 * component modules.
 */
const CODE = SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^import .*$/gm, '');

describe('the manifest declares semantics only', () => {
  it('contains no colour literals', () => {
    const hex = CODE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const fns = CODE.match(/\b(rgba?|hsla?)\s*\(/g) ?? [];
    expect({ hex, fns }).toEqual({ hex: [], fns: [] });
  });

  it('contains no length literals', () => {
    // A length is a number followed by a CSS unit. Bare numbers are fine —
    // ordinals and array indices are not visual truth.
    const lengths = CODE.match(/\b\d+(\.\d+)?(px|rem|em|vh|vw|pt)\b/g) ?? [];
    expect(lengths).toEqual([]);
  });

  it('names no font families', () => {
    const fonts = CODE.match(/\b(Plus Jakarta Sans|Inter|SFMono|Menlo|ui-sans-serif|ui-monospace|sans-serif|monospace)\b/g) ?? [];
    expect(fonts).toEqual([]);
  });

  it('declares no theme axis — themes are variable modes, not variants', () => {
    for (const c of MANIFEST) {
      expect(Object.keys(c.axes)).not.toContain('theme');
    }
  });
});

describe('cell generation is deterministic and honest', () => {
  it('produces a stable order regardless of axis insertion order', () => {
    const button = MANIFEST.find((c) => c.key === 'DsButton')!;
    const a = cellsFor(button).map((c) => JSON.stringify(c));
    const b = cellsFor({ ...button, axes: Object.fromEntries(Object.entries(button.axes).reverse()) })
      .map((c) => JSON.stringify(c));
    expect(a).toEqual(b);
  });

  it('sparse prunes the tertiary:active cell that has no CSS rule behind it', () => {
    const button = MANIFEST.find((c) => c.key === 'DsButton')!;
    const cells = cellsFor(button);
    expect(cells.some((c) => c.tone === 'tertiary' && c.state === 'active')).toBe(false);
    // ...but keeps tertiary in every other state.
    expect(cells.some((c) => c.tone === 'tertiary' && c.state === 'hover')).toBe(true);
  });

  it('every declared cell is a full assignment of every axis', () => {
    for (const component of MANIFEST) {
      const keys = Object.keys(component.axes).sort();
      for (const cell of cellsFor(component)) {
        expect(Object.keys(cell).sort()).toEqual(keys);
      }
    }
  });

  it('every axis value in a cell is one the component declared', () => {
    for (const component of MANIFEST) {
      for (const cell of cellsFor(component)) {
        for (const [axis, value] of Object.entries(cell)) {
          expect(component.axes[axis]).toContain(value);
        }
      }
    }
  });
});

describe('every component is addressable', () => {
  it('has a unique key and a unique sid root', () => {
    expect(new Set(MANIFEST.map((c) => c.key)).size).toBe(MANIFEST.length);
    expect(new Set(MANIFEST.map((c) => c.sid)).size).toBe(MANIFEST.length);
  });

  it('uses sid roots that satisfy the sid grammar', () => {
    for (const c of MANIFEST) {
      expect(c.sid).toMatch(/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/);
    }
  });

  it('declares a pseudo state that the state axis can actually supply', () => {
    for (const c of MANIFEST) {
      if (!c.pseudo) continue;
      for (const cell of cellsFor(c)) {
        expect(typeof c.pseudo(cell)).toBe('string');
      }
    }
  });
});
