// Memoization test for the `useBrandKit` hook.
//
// Without this, every selection change in the editor re-runs the full
// priority resolution. The hook must return the SAME reference across
// renders when the brand reference identity is stable.

import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrandKit } from '../useBrandKit';
import type { Brand } from '@/shared/types/brand';

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'b1',
    name: 'B',
    primaryColor: '#3366ff',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    ...overrides,
  };
}

describe('useBrandKit', () => {
  it('returns null for null brand', () => {
    const { result } = renderHook(() => useBrandKit(null));
    expect(result.current).toBe(null);
  });

  it('returns the SAME BrandKit reference across re-renders when brand reference is stable', () => {
    const brand = makeBrand();
    const { result, rerender } = renderHook(({ b }: { b: Brand }) => useBrandKit(b), {
      initialProps: { b: brand },
    });
    const first = result.current;
    rerender({ b: brand });
    rerender({ b: brand });
    expect(result.current).toBe(first);
  });

  it('returns a NEW BrandKit when the brand reference changes', () => {
    const brand1 = makeBrand({ id: 'b1' });
    const brand2 = makeBrand({ id: 'b2' });
    const { result, rerender } = renderHook(({ b }: { b: Brand }) => useBrandKit(b), {
      initialProps: { b: brand1 },
    });
    const first = result.current;
    rerender({ b: brand2 });
    expect(result.current).not.toBe(first);
    expect(result.current?.id).toBe('b2');
  });

  it('returns a NEW BrandKit when brand.updatedAt changes (in-place mutation case)', () => {
    // Simulating an in-place mutation: same reference, fresh updatedAt.
    // The hook's deps include `brand.updatedAt` so this should re-derive.
    const brand = makeBrand({ updatedAt: new Date('2026-04-01') });
    const { result, rerender } = renderHook(({ b }: { b: Brand }) => useBrandKit(b), {
      initialProps: { b: brand },
    });
    const first = result.current;
    brand.updatedAt = new Date('2026-04-02');
    rerender({ b: brand });
    expect(result.current).not.toBe(first);
  });
});
