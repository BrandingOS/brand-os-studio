/**
 * The brand's face, and what decides it.
 *
 * Every chrome surface in the product drew the first letter of the brand's
 * name — for every brand, including ones whose whole logo system had been
 * uploaded and confirmed. These pin the order that replaced it.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { resolveBrandFace } from '../BrandAvatar';

function brand(over: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'meridian',
    name: 'Meridian',
    primaryColor: '#FFCC00',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as unknown as Brand;
}

const asset = (id: string, url: string) => ({
  id,
  kind: 'logo' as const,
  name: id,
  formats: { svg: { url, size: 1 } },
  metadata: {},
});

describe('what the brand’s avatar shows', () => {
  it('prefers the Brand Icon — a mark drawn to work small', () => {
    const face = resolveBrandFace(
      brand({
        logoSystem: { primary: { assetId: 'p' }, iconmark: { assetId: 'i' } },
        brandAssets: [asset('p', 'primary.svg'), asset('i', 'icon.svg')],
      } as Partial<Brand>),
    );
    expect(face).toMatchObject({ kind: 'logo', url: 'icon.svg' });
  });

  it('falls back to the Primary logo when there is no icon', () => {
    const face = resolveBrandFace(
      brand({
        logoSystem: { primary: { assetId: 'p' } },
        brandAssets: [asset('p', 'primary.svg')],
      } as Partial<Brand>),
    );
    expect(face).toMatchObject({ kind: 'logo', url: 'primary.svg' });
  });

  it('shows the white version on a dark tile when that is all there is', () => {
    const face = resolveBrandFace(
      brand({
        logoSystem: { mono: { white: { assetId: 'w' } } },
        brandAssets: [asset('w', 'white.svg')],
      } as Partial<Brand>),
    );
    expect(face.kind).toBe('logo');
    expect(face.url).toBe('white.svg');
    // Light ink on a light tile is an empty tile.
    expect(face.background).toBe('#111113');
  });

  it('uses the letter only when the brand genuinely has no logo', () => {
    const face = resolveBrandFace(brand());
    expect(face).toMatchObject({ kind: 'letter', letter: 'M', background: '#FFCC00' });
  });

  it('never leaves a nameless brand blank', () => {
    expect(resolveBrandFace(undefined)).toMatchObject({ kind: 'letter', letter: 'B' });
  });
});
