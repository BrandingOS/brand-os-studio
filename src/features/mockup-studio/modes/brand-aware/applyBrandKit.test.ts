/**
 * applyBrandKit — unit tests.
 *
 * Exercises the mapping from BrandingOS's richer `Brand` type onto the
 * generic template-level tokens. Relies on no PixiJS — the engine is
 * not mounted here.
 */

import { describe, expect, it } from 'vitest';

import type { Brand } from '@/shared/types/brand';

import type { TemplateMeta } from '../../engine/types';
import { applyBrandKit } from './applyBrandKit';

const baseBrand: Brand = {
  id: 'b1',
  slug: 'acme',
  name: 'Acme Corp',
  primaryColor: '#1d4ed8',
  secondaryColor: '#64748b',
  accentColor: '#f97316',
  neutrals: ['#ffffff', '#f4f4f5', '#d4d4d8', '#71717a', '#27272a', '#0a0a0a'],
  fonts: { primary: 'Inter', secondary: 'Source Serif' },
  tone: 'confident',
  audience: 'b2b',
  strategy: 'We help teams move faster. Focus on speed.',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  logo: 'https://cdn.example.com/acme/logo.png',
  logoAssets: {
    full: 'https://cdn.example.com/acme/logo.png',
    icon: 'https://cdn.example.com/acme/icon.svg',
    wordmark: 'https://cdn.example.com/acme/wordmark.svg',
  },
};

function tshirtTemplate(): TemplateMeta {
  return {
    id: 'tee',
    name: 'Tee',
    category: 'apparel',
    canvas: { width: 1000, height: 1000 },
    assets: { base: 'data:,', mask: 'data:,' },
    zones: [
      {
        id: 'chest',
        label: 'Chest',
        defaultTransform: { x: 500, y: 500, width: 300, height: 300, rotation: 0 },
        brandKitHints: {
          preferredAsset: 'logo_primary',
          fallbackAssets: ['logo_iconmark'],
        },
      },
    ],
    tintableRegions: [
      {
        id: 'shirt',
        label: 'Shirt',
        mask: 'data:,',
        defaultColor: '#ffffff',
        brandKitHints: { preferredColorRole: 'primary' },
      },
    ],
  };
}

describe('applyBrandKit', () => {
  it('places the brand logo into the primary zone', () => {
    const state = applyBrandKit(tshirtTemplate(), baseBrand);
    expect(state.zones.chest.designUrl).toBe(
      'https://cdn.example.com/acme/logo.png',
    );
  });

  it('falls back to iconmark when primary logo is absent', () => {
    const brand: Brand = {
      ...baseBrand,
      logo: undefined,
      logoAssets: { icon: 'https://cdn.example.com/acme/icon.svg' },
    };
    const state = applyBrandKit(tshirtTemplate(), brand);
    expect(state.zones.chest.designUrl).toBe(
      'https://cdn.example.com/acme/icon.svg',
    );
  });

  it('tints the shirt with the brand primary color', () => {
    const state = applyBrandKit(tshirtTemplate(), baseBrand);
    expect(state.tints.shirt.color).toBe('#1d4ed8');
  });

  it('leaves design null when brand has no usable logo', () => {
    const brand: Brand = {
      ...baseBrand,
      logo: undefined,
      logoAssets: undefined,
    };
    const state = applyBrandKit(tshirtTemplate(), brand);
    expect(state.zones.chest.designUrl).toBeNull();
  });

  it('realizes default text slots using brand name', () => {
    const template: TemplateMeta = {
      ...tshirtTemplate(),
      defaultTextSlots: [
        {
          id: 'name',
          label: 'Name',
          x: 500,
          y: 900,
          fontSize: 48,
          brandKitHints: {
            preferredField: 'brand_name',
            preferredFontRole: 'heading',
          },
        },
      ],
    };
    const state = applyBrandKit(template, baseBrand);
    expect(state.textLayers).toHaveLength(1);
    expect(state.textLayers[0].text).toBe('Acme Corp');
    expect(state.textLayers[0].fontFamily).toBe('Inter');
  });

  it('prefers v3 logoSystem assets over legacy fields', () => {
    const brand: Brand = {
      ...baseBrand,
      brandAssets: [
        {
          id: 'asset-v3',
          kind: 'logo',
          name: 'v3 logo',
          formats: {
            svg: { url: 'https://cdn.example.com/acme/v3.svg', size: 1 },
          },
          metadata: { createdAt: '2024-01-01', version: 1 },
        },
      ],
      logoSystem: {
        primary: { assetId: 'asset-v3' },
      },
    };
    const state = applyBrandKit(tshirtTemplate(), brand);
    expect(state.zones.chest.designUrl).toBe('https://cdn.example.com/acme/v3.svg');
  });
});
