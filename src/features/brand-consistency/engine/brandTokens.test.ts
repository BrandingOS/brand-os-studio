import { describe, it, expect } from 'vitest';
import { resolveBrandTokens, serializeTokens } from './brandTokens';
import type { Brand } from '@/shared/types/brand';

const baseBrand = (overrides: Partial<Brand> = {}): Brand => ({
  id: 'b1',
  slug: 'acme',
  name: 'Acme',
  primaryColor: '#0055FF',
  fonts: { primary: 'Inter' },
  tone: 'modern, confident',
  audience: 'tech founders',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('resolveBrandTokens', () => {
  it('maps brand → tokens with consistent shape', () => {
    const t = resolveBrandTokens(baseBrand());
    expect(t.brandId).toBe('b1');
    expect(t.colors.primary).toBe('#0055FF');
    expect(t.colors.onPrimary).toMatch(/^#/);
    expect(t.typography.headingFamily).toContain('Inter');
    expect(t.voice.audience).toBe('tech founders');
    expect(t.voice.descriptors.length).toBeGreaterThan(0);
  });

  it('derives a secondary + accent when none are set', () => {
    const t = resolveBrandTokens(baseBrand({ secondaryColor: undefined }));
    expect(t.colors.secondary).toMatch(/^#/);
    expect(t.colors.accent).toMatch(/^#/);
    expect(t.colors.secondary).not.toBe(t.colors.primary);
  });

  it('honors provided secondary color', () => {
    const t = resolveBrandTokens(baseBrand({ secondaryColor: '#FF6600' }));
    expect(t.colors.secondary).toBe('#FF6600');
  });

  it('uses defaults when fonts are missing', () => {
    const t = resolveBrandTokens(baseBrand({ fonts: { primary: '' as unknown as string } }));
    expect(t.typography.headingFamily).toBeTruthy();
    expect(t.typography.bodyFamily).toBeTruthy();
  });

  it('computes brand completeness score', () => {
    const minimal = resolveBrandTokens(baseBrand({ secondaryColor: undefined, fonts: { primary: '' as unknown as string }, audience: '', tone: '' }));
    const rich = resolveBrandTokens(baseBrand({
      secondaryColor: '#FF6600',
      fonts: { primary: 'Inter', secondary: 'Lora' },
      logo: 'data:image/png;base64,xxx',
      strategy: 'To make brand systems hold their shape.',
    }));
    expect(rich.completeness.score).toBeGreaterThan(minimal.completeness.score);
    expect(minimal.completeness.missing.length).toBeGreaterThan(0);
  });

  it('logo.pickFor switches by background luminance', () => {
    const t = resolveBrandTokens(baseBrand({ logoAssets: { full: 'F', dark: 'D', light: 'L' } }));
    expect(t.logo.pickFor('#FFFFFF')).toBe('D'); // dark logo on light bg
    expect(t.logo.pickFor('#000000')).toBe('L'); // light logo on dark bg
  });

  it('serializeTokens strips functions for JSON safety', () => {
    const t = resolveBrandTokens(baseBrand({ logoAssets: { full: 'F' } }));
    const s = serializeTokens(t);
    expect(() => JSON.stringify(s)).not.toThrow();
    // @ts-expect-error pickFor must not exist on serialized form
    expect(s.logo.pickFor).toBeUndefined();
  });

  it('produces same tokens for same input (deterministic)', () => {
    const a = resolveBrandTokens(baseBrand());
    const b = resolveBrandTokens(baseBrand());
    expect(a.colors).toEqual(b.colors);
    expect(a.typography).toEqual(b.typography);
    expect(a.voice.descriptors).toEqual(b.voice.descriptors);
  });
});
