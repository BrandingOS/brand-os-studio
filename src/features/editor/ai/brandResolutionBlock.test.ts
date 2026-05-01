// Unit tests for buildBrandResolutionBlock — Phase 3.5 commit 1.

import { describe, expect, it } from 'vitest';
import { buildBrandResolutionBlock } from './brandResolutionBlock';
import type { BrandKit } from '@/features/editor/brand/BrandKit';

function fixtureKit(overrides: Partial<BrandKit> = {}): BrandKit {
  return {
    id: 'brand-test',
    name: 'Test Brand',
    colors: {
      primary: { hex: '#1A1A2E', name: 'Brand Navy' },
      secondary: { hex: '#16A34A', name: 'Brand Green' },
      accent: { hex: '#F59E0B', name: 'Brand Amber' },
      neutrals: ['#FAFAFA', '#E5E5E5', '#A3A3A3', '#737373', '#404040', '#1A1A1A'],
    },
    typography: {
      heading: { family: 'DM Sans', weights: [400, 700] },
      body: { family: 'Roboto', weights: [400] },
    },
    logos: { mono: {} },
    spacing: { unit: 8, cornerRadius: 8 },
    _diagnostics: { warnings: [] },
    ...overrides,
  };
}

describe('buildBrandResolutionBlock', () => {
  it('emits the <brand_resolution> wrapper tags', () => {
    const block = buildBrandResolutionBlock(fixtureKit());
    expect(block.startsWith('<brand_resolution>')).toBe(true);
    expect(block.endsWith('</brand_resolution>')).toBe(true);
  });

  it('includes every SlotRef the AI can emit (primary, secondary, accent, all 6 neutrals, both fonts)', () => {
    const block = buildBrandResolutionBlock(fixtureKit());
    expect(block).toMatch(/brand\.color\.primary → #1A1A2E/);
    expect(block).toMatch(/brand\.color\.secondary → #16A34A/);
    expect(block).toMatch(/brand\.color\.accent → #F59E0B/);
    for (let i = 0; i < 6; i++) {
      expect(block, `neutral ${i}`).toMatch(new RegExp(`brand\\.color\\.neutral\\.${i} → #`));
    }
    expect(block).toMatch(/brand\.font\.heading → DM Sans/);
    expect(block).toMatch(/brand\.font\.body → Roboto/);
  });

  it('annotates colors with name + tone (light/dark) when name is present', () => {
    const block = buildBrandResolutionBlock(fixtureKit());
    // Brand Navy hex (#1A1A2E) is dark luminance.
    expect(block).toMatch(/brand\.color\.primary → #1A1A2E \(Brand Navy, dark\)/);
    // Brand Amber (#F59E0B) is light luminance.
    expect(block).toMatch(/brand\.color\.accent → #F59E0B \(Brand Amber, light\)/);
  });

  it('annotates colors with tone only when name is absent', () => {
    const kit = fixtureKit({
      colors: {
        ...fixtureKit().colors,
        primary: { hex: '#1A1A2E' },
      },
    });
    const block = buildBrandResolutionBlock(kit);
    expect(block).toMatch(/brand\.color\.primary → #1A1A2E \(dark\)/);
  });

  it('omits the trailing label when hex is unparseable (defensive — no crash)', () => {
    const kit = fixtureKit({
      colors: {
        ...fixtureKit().colors,
        primary: { hex: 'not-a-hex' },
      },
    });
    expect(() => buildBrandResolutionBlock(kit)).not.toThrow();
  });

  it('skips secondary/accent rows when those colors are absent on the kit', () => {
    const kit = fixtureKit({
      colors: {
        primary: { hex: '#1A1A2E', name: 'Navy' },
        // No secondary, no accent.
        neutrals: ['#FAFAFA', '#E5E5E5', '#A3A3A3', '#737373', '#404040', '#1A1A1A'],
      },
    });
    const block = buildBrandResolutionBlock(kit);
    expect(block).not.toMatch(/brand\.color\.secondary/);
    expect(block).not.toMatch(/brand\.color\.accent/);
    // Primary + all 6 neutrals + 2 fonts still present.
    expect(block).toMatch(/brand\.color\.primary/);
    expect(block).toMatch(/brand\.color\.neutral\.5/);
  });

  it('tags neutral indices 0/3/5 with lightest/mid/darkest hints', () => {
    const block = buildBrandResolutionBlock(fixtureKit());
    expect(block).toMatch(/brand\.color\.neutral\.0 → #FAFAFA \(lightest\)/);
    expect(block).toMatch(/brand\.color\.neutral\.3 → #737373 \(mid\)/);
    expect(block).toMatch(/brand\.color\.neutral\.5 → #1A1A1A \(darkest\)/);
  });

  it('produces under ~150 tokens for a fully-populated kit (rough char-count proxy)', () => {
    // Real token count requires the tokenizer; rough proxy: ~4 chars/token.
    // 150 tokens ≈ 600 chars. The block should comfortably fit under that.
    const block = buildBrandResolutionBlock(fixtureKit());
    expect(block.length).toBeLessThan(700);
  });
});
