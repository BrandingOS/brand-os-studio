import { describe, it, expect } from 'vitest';
import { buildVariableMap } from '../variableMap';
import type { Brand } from '@/shared/types/brand';

const baseBrand: Brand = {
  id: 'test', slug: 'test', name: 'Acme Corp',
  primaryColor: '#0066FF', secondaryColor: '#00CC88',
  fonts: { primary: 'Inter', secondary: 'Playfair Display' },
  tone: 'Professional', audience: 'Tech professionals',
  assets: [], createdAt: new Date(), updatedAt: new Date(),
};

describe('buildVariableMap', () => {
  it('maps brand identity fields', () => {
    const m = buildVariableMap(baseBrand);
    expect(m['brand.name']).toBe('Acme Corp');
    expect(m['brand.logo']).toBe('');
  });

  it('maps primary and secondary colors', () => {
    const m = buildVariableMap(baseBrand);
    expect(m['brand.colors.primary']).toBe('#0066FF');
    expect(m['brand.colors.secondary']).toBe('#00CC88');
  });

  it('computes lighten/darken derivatives', () => {
    const m = buildVariableMap(baseBrand);
    expect(m['brand.colors.primary.light']).toBeDefined();
    expect(m['brand.colors.primary.dark']).toBeDefined();
    // Lighter should have higher RGB values
    expect(m['brand.colors.primary.light']).not.toBe('#0066FF');
    expect(m['brand.colors.primary.dark']).not.toBe('#0066FF');
  });

  it('computes opacity variants as 8-char hex', () => {
    const m = buildVariableMap(baseBrand);
    // 10% opacity → hex "1a" at end
    expect(m['brand.colors.primary.10']).toMatch(/^#[0-9a-fA-F]{8}$/);
    expect(m['brand.colors.primary.20']).toMatch(/^#[0-9a-fA-F]{8}$/);
    expect(m['brand.colors.primary.50']).toMatch(/^#[0-9a-fA-F]{8}$/);
  });

  it('maps typography fonts', () => {
    const m = buildVariableMap(baseBrand);
    expect(m['brand.fonts.primary']).toBe('Inter');
    expect(m['brand.fonts.secondary']).toBe('Playfair Display');
  });

  it('maps tone and audience', () => {
    const m = buildVariableMap(baseBrand);
    expect(m['brand.tone']).toBe('Professional');
    expect(m['brand.audience']).toBe('Tech professionals');
  });

  it('maps strategy values array', () => {
    const brand: Brand = {
      ...baseBrand,
      guidelines: {
        strategy: { mission: 'To innovate', values: ['Quality', 'Speed', 'Trust'] },
      },
    };
    const m = buildVariableMap(brand);
    expect(m['brand.strategy.mission']).toBe('To innovate');
    expect(m['brand.strategy.values.0']).toBe('Quality');
    expect(m['brand.strategy.values.1']).toBe('Speed');
    expect(m['brand.strategy.values.2']).toBe('Trust');
  });

  it('maps voice and tone attributes', () => {
    const brand: Brand = {
      ...baseBrand,
      guidelines: {
        voiceAndTone: { voice: 'Warm and clear', toneAttributes: ['Friendly', 'Direct'] },
      },
    };
    const m = buildVariableMap(brand);
    expect(m['brand.voice.style']).toBe('Warm and clear');
    expect(m['brand.voice.attributes.0']).toBe('Friendly');
    expect(m['brand.voice.attributes.1']).toBe('Direct');
  });

  it('handles missing optional fields gracefully', () => {
    const minimal: Brand = {
      id: 'x', slug: 'x', name: 'X',
      primaryColor: '#000', fonts: { primary: 'Inter' },
      tone: '', audience: '', assets: [],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const m = buildVariableMap(minimal);
    expect(m['brand.name']).toBe('X');
    expect(m['brand.colors.secondary']).toBe('#666666');
    expect(m['brand.fonts.secondary']).toBe('Inter'); // falls back to primary
    expect(m['brand.strategy.mission']).toBe('');
    expect(m['brand.voice.style']).toBe('');
  });

  it('maps logo assets when present', () => {
    const brand: Brand = {
      ...baseBrand,
      logo: 'https://example.com/logo.png',
      logoAssets: { full: 'https://example.com/full.png', icon: 'https://example.com/icon.png' },
    };
    const m = buildVariableMap(brand);
    expect(m['brand.logo']).toBe('https://example.com/logo.png');
    expect(m['brand.logo.full']).toBe('https://example.com/full.png');
    expect(m['brand.logo.icon']).toBe('https://example.com/icon.png');
  });
});
