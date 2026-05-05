// Phase 6.6 — brandMemoryBlock tests.
import { describe, expect, it } from 'vitest';
import { buildBrandMemoryBlock } from './brandMemoryBlock';

describe('buildBrandMemoryBlock', () => {
  it('returns empty string for null snapshot', () => {
    expect(buildBrandMemoryBlock(null)).toBe('');
    expect(buildBrandMemoryBlock(undefined)).toBe('');
  });

  it('returns empty string when both colors and fonts are empty', () => {
    expect(
      buildBrandMemoryBlock({
        computedAt: 'x',
        colors: [],
        fonts: [],
      }),
    ).toBe('');
  });

  it('renders colors section when only colors present', () => {
    const out = buildBrandMemoryBlock({
      computedAt: 'x',
      colors: [
        { hex: '#ff0000', count: 5 },
        { hex: '#00ff00', count: 2 },
      ],
      fonts: [],
    });
    expect(out).toContain('<brand_memory>');
    expect(out).toContain('colors_used:');
    expect(out).toContain('- #ff0000 (×5)');
    expect(out).toContain('- #00ff00 (×2)');
    expect(out).not.toContain('fonts_used:');
    expect(out).toContain('</brand_memory>');
  });

  it('renders fonts section when only fonts present', () => {
    const out = buildBrandMemoryBlock({
      computedAt: 'x',
      colors: [],
      fonts: [
        { family: 'Inter', count: 5 },
        { family: 'Roboto', count: 2 },
      ],
    });
    expect(out).toContain('fonts_used:');
    expect(out).toContain('- Inter (×5)');
    expect(out).toContain('- Roboto (×2)');
    expect(out).not.toContain('colors_used:');
  });

  it('renders both sections when both present', () => {
    const out = buildBrandMemoryBlock({
      computedAt: 'x',
      colors: [{ hex: '#ff0000', count: 5 }],
      fonts: [{ family: 'Inter', count: 3 }],
    });
    expect(out).toContain('colors_used:');
    expect(out).toContain('fonts_used:');
  });

  it('honors colorLimit and fontLimit', () => {
    const out = buildBrandMemoryBlock(
      {
        computedAt: 'x',
        colors: [
          { hex: '#a', count: 1 },
          { hex: '#b', count: 1 },
          { hex: '#c', count: 1 },
        ],
        fonts: [
          { family: 'A', count: 1 },
          { family: 'B', count: 1 },
          { family: 'C', count: 1 },
        ],
      },
      { colorLimit: 2, fontLimit: 1 },
    );
    expect((out.match(/- #/g) ?? []).length).toBe(2);
    // Account for the rule message "tiebreaker" containing "A"; count
    // only the bullet lines under fonts_used.
    const fontBulletLines = out
      .split('\n')
      .filter((l) => l.match(/^\s+- [A-Za-z]/));
    expect(fontBulletLines.length).toBe(1);
  });

  it('includes the SlotRef-tiebreaker rule message', () => {
    const out = buildBrandMemoryBlock({
      computedAt: 'x',
      colors: [{ hex: '#ff0000', count: 1 }],
      fonts: [],
    });
    expect(out.toLowerCase()).toContain('tiebreaker');
    expect(out).toContain('Rule 3');
  });
});
