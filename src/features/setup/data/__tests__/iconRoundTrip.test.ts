/**
 * The icon set survives a save.
 *
 * Before this, `brandToMockBrand` re-ran the suggester on every read and
 * `mockBrandToPatch` did not write icons at all — so a weight, a tint or an
 * added symbol lasted exactly until the next paint. The audit recorded it as
 * D11 ("Colour/weight change is applied live and Save closes the editor, but
 * nothing is persisted after reload"). Everything here is that bug.
 */
import { describe, expect, it } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { brandToMockBrand } from '../brandToMockBrand';
import { mockBrandToPatch } from '../mockBrandToPatch';
import { iconPack } from '@/features/brand-kit/data/iconPacks';

function brand(patch: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#FF0000',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...patch,
  } as Brand;
}

/** One save: mock → patch → the brand the next read would see. */
function save(before: Brand, mutate: (m: ReturnType<typeof brandToMockBrand>) => void): Brand {
  const mock = brandToMockBrand(before);
  mutate(mock);
  const patch = mockBrandToPatch(mock, before);
  return { ...before, ...patch } as Brand;
}

describe('the icon set round-trips through the brand', () => {
  it('an added icon is still there on the next read', () => {
    const after = save(brand(), (m) => {
      m.icons = [...m.icons, 'fi-rr-anchor'];
    });
    expect(after.guidelines?.iconography?.set).toContain('fi-rr-anchor');
    expect(brandToMockBrand(after).icons).toContain('fi-rr-anchor');
  });

  it('a removed icon stays removed — the suggester does not put it back', () => {
    const first = brandToMockBrand(brand());
    const dropped = first.icons[0]!;
    const after = save(brand(), (m) => {
      m.icons = m.icons.filter((c) => c !== dropped);
    });
    expect(brandToMockBrand(after).icons).not.toContain(dropped);
  });

  it('the weight is the prefix, so the whole set carries it', () => {
    const after = save(brand(), (m) => {
      m.icons = m.icons.map((c) => c.replace(/^fi-rr-/, 'fi-br-'));
    });
    const read = brandToMockBrand(after).icons;
    expect(read.length).toBeGreaterThan(0);
    for (const name of read) expect(name.startsWith('fi-br-')).toBe(true);
  });

  it('the tint is stored and read back', () => {
    const after = save(brand(), (m) => {
      m.iconTint = '#12AB34';
    });
    expect(after.guidelines?.iconography?.tint).toBe('#12ab34'.toUpperCase().replace('#12AB34', '#12AB34'));
    expect(brandToMockBrand(after).iconTint).toBe('#12AB34');
  });

  it('the chosen pack is stored and read back', () => {
    const after = save(brand(), (m) => {
      m.iconPack = 'creative';
      m.icons = iconPack('creative').icons.map((n) => `fi-rr-${n}`);
    });
    expect(brandToMockBrand(after).iconPack).toBe('creative');
  });

  it('the prose a guidelines page prints is not overwritten by a set change', () => {
    const before = brand({
      guidelines: {
        iconography: {
          style: 'Rounded outline icons',
          weight: '1.5px consistent stroke',
          cornerRadius: '2px rounded corners',
          usage: 'Use consistently throughout.',
          examples: [],
        },
      },
    } as Partial<Brand>);
    const after = save(before, (m) => {
      m.icons = [...m.icons, 'fi-rr-anchor'];
    });
    expect(after.guidelines?.iconography?.style).toBe('Rounded outline icons');
    expect(after.guidelines?.iconography?.usage).toBe('Use consistently throughout.');
  });

  it('a save that changes nothing about the icons writes no iconography', () => {
    const patch = mockBrandToPatch(brandToMockBrand(brand()), brand());
    expect(patch.guidelines?.iconography).toBeUndefined();
  });

  it('a stored set outranks the suggester even when the industry changes', () => {
    const stored = ['fi-rr-anchor', 'fi-rr-compass-alt'];
    const b = brand({
      businessInfo: { industry: 'finance' },
      guidelines: { iconography: { style: '', weight: '', cornerRadius: '', usage: '', examples: [], set: stored } },
    } as Partial<Brand>);
    expect(brandToMockBrand(b).icons).toEqual(stored);
  });

  it('a brand that owns nothing gets the pack its recorded industry names', () => {
    const b = brand({ businessInfo: { industry: 'food-beverage' } } as Partial<Brand>);
    const allowed = new Set(iconPack('food').icons.map((n) => `fi-rr-${n}`));
    const icons = brandToMockBrand(b).icons;
    expect(icons.length).toBeGreaterThan(0);
    for (const name of icons) expect(allowed.has(name), name).toBe(true);
  });
});
