import { describe, expect, it } from 'vitest';
import { brandToMockBrand } from '../brandToMockBrand';
import { mockBrandToPatch } from '../mockBrandToPatch';
import type { Brand } from '@/shared/types/brand';

const base = (): Brand =>
  ({
    id: 'b1',
    slug: 'raqm',
    name: 'Raqm',
    primaryColor: '#7231FF',
    fonts: { primary: 'Fraunces', secondary: 'Inter' },
    assets: [],
    createdAt: new Date('2026-08-16T00:00:00Z'),
    updatedAt: new Date('2026-08-16T00:00:00Z'),
    logoSystem: { primary: { assetId: 'a1' }, wordmark: { assetId: 'a2' } },
    brandAssets: [
      { id: 'a1', kind: 'logo', name: 'primary', formats: { svg: { url: 'data:image/svg+xml,A', size: 1 } }, metadata: {} },
      { id: 'a2', kind: 'logo', name: 'wordmark', formats: { svg: { url: 'data:image/svg+xml,B', size: 1 } }, metadata: {} },
    ],
    identity: { colors: { primary: { hex: '#7231FF' } }, logos: {}, typography: { primary: { family: 'Fraunces' } } },
  }) as unknown as Brand;

describe('a variant name the user gave survives the round trip', () => {
  it('writes the name to the logo ref and reads it back as the tile label', () => {
    const brand = base();
    const mock = brandToMockBrand(brand);
    const wordmark = mock.logos.find((l) => l.role === 'wordmark')!;
    expect(wordmark.label).toBe('Wordmark');

    const renamed = { ...mock, logos: mock.logos.map((l) => (l.id === wordmark.id ? { ...l, label: 'RAQM-LOGO-AR' } : l)) };
    const patch = mockBrandToPatch(renamed, brand);
    expect(patch.logoSystem?.wordmark?.description).toBe('RAQM-LOGO-AR');
    // The default label is NOT written as a name.
    expect(patch.logoSystem?.primary?.description).toBeUndefined();

    const back = brandToMockBrand({ ...brand, ...patch } as Brand);
    expect(back.logos.find((l) => l.role === 'wordmark')!.label).toBe('RAQM-LOGO-AR');
    expect(back.logos.find((l) => l.role === 'primary')!.label).toBe('Primary');
  });
});
