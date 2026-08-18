/**
 * The merge that keeps a guideline's choices out of the brand.
 */
import { describe, expect, it } from 'vitest';
import {
  applyGuidelineOverrides, brandPatchFor, brandValueFor, hasOverrides,
} from '../model/effectiveBrand';
import type { Brand } from '@/shared/types/brand';

const brand = {
  id: 'b1', slug: 'acme', name: 'Acme',
  primaryColor: '#123456', secondaryColor: '#654321',
  fonts: { primary: 'Inter', secondary: 'Georgia' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as Brand;

describe('applyGuidelineOverrides', () => {
  it('returns the very same object when there is nothing to override', () => {
    // Identity matters: the merged brand is a useMemo dependency for ~30 page
    // renderers, and a fresh object every render would repaint the document.
    expect(applyGuidelineOverrides(brand, {})).toBe(brand);
    expect(applyGuidelineOverrides(brand, { primaryColor: undefined })).toBe(brand);
  });

  it('replaces only what was overridden', () => {
    const merged = applyGuidelineOverrides(brand, { primaryColor: '#ff0000' });
    expect(merged.primaryColor).toBe('#ff0000');
    expect(merged.secondaryColor).toBe('#654321');
    expect(merged.fonts.primary).toBe('Inter');
  });

  it('maps the font keys onto the fields the renderers actually read', () => {
    const merged = applyGuidelineOverrides(brand, { headingFont: 'Playfair', bodyFont: 'Lato' });
    expect(merged.fonts.primary).toBe('Playfair');
    expect(merged.fonts.secondary).toBe('Lato');
  });

  it('leaves the brand record untouched', () => {
    applyGuidelineOverrides(brand, { primaryColor: '#ff0000', headingFont: 'Playfair' });
    expect(brand.primaryColor).toBe('#123456');
    expect(brand.fonts.primary).toBe('Inter');
  });
});

describe('hasOverrides', () => {
  it('treats empty and absent as nothing', () => {
    expect(hasOverrides(undefined)).toBe(false);
    expect(hasOverrides({})).toBe(false);
    expect(hasOverrides({ primaryColor: '' })).toBe(false);
    expect(hasOverrides({ primaryColor: '#000' })).toBe(true);
  });
});

describe('pushing a value onto the brand', () => {
  it('reads back what the brand currently holds', () => {
    expect(brandValueFor(brand, 'primaryColor')).toBe('#123456');
    expect(brandValueFor(brand, 'bodyFont')).toBe('Georgia');
  });

  it('patches fonts without dropping the sibling family', () => {
    // `fonts` is one stored object — assigning `{ primary }` would delete
    // `secondary`, which is the class of bug that costs a brand its typeface.
    const patch = brandPatchFor(brand, 'headingFont', 'Playfair');
    expect(patch.fonts).toEqual({ primary: 'Playfair', secondary: 'Georgia' });
  });

  it('patches a colour as a single field', () => {
    expect(brandPatchFor(brand, 'primaryColor', '#ff0000')).toEqual({ primaryColor: '#ff0000' });
  });
});
