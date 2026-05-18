// Regression coverage for the "template picker doesn't change the slide"
// bug: deck mutators that change rendered composition (style, master,
// shape, per-slide style/variant) must wipe the cached frozen HTML so
// EditableSlide re-renders the new React composition instead of pinning
// the stale snapshot via dangerouslySetInnerHTML.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { skamBrand } from '@/data/brands';
import { DECK_STORAGE_KEY } from '../constants';
import { useDeckPlan } from './useDeckPlan';
import { ALL_STYLES } from '../styles';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useDeckPlan — slideFrozenHtml cache invalidation', () => {
  it('setStyle wipes all frozen slide HTML so the new template renders', () => {
    const { result } = renderHook(() => useDeckPlan(skamBrand));
    expect(result.current).not.toBeNull();

    // Simulate previously-saved live-edit snapshots. Each setter reads
    // `state` from its own useCallback closure, so back-to-back calls
    // need separate act() blocks to land both updates.
    act(() => {
      result.current!.setSlideFrozenHtml(0, '<div>frozen-bold</div>');
    });
    act(() => {
      result.current!.setSlideFrozenHtml(2, '<div>frozen-bold-2</div>');
    });
    expect(result.current!.slideFrozenHtml).toEqual({
      0: '<div>frozen-bold</div>',
      2: '<div>frozen-bold-2</div>',
    });

    // Picking a different deck-wide template must invalidate the cache so
    // the React composition (with the new template) can re-render.
    const nextStyle = ALL_STYLES.find((s) => s.id !== result.current!.plan.style)!;
    act(() => {
      result.current!.setStyle(nextStyle.id);
    });

    expect(result.current!.plan.style).toBe(nextStyle.id);
    expect(result.current!.slideFrozenHtml).toEqual({});

    // And the persisted shape matches (the bug ALSO had stale frozenHtml
    // surviving in localStorage across reloads).
    const persisted = JSON.parse(localStorage.getItem(DECK_STORAGE_KEY) ?? '{}');
    expect(persisted[skamBrand.id]?.slideFrozenHtml ?? {}).toEqual({});
  });

  it('setMaster wipes all frozen slide HTML so master-token changes apply', () => {
    const { result } = renderHook(() => useDeckPlan(skamBrand));
    act(() => {
      result.current!.setSlideFrozenHtml(1, '<div>frozen-1</div>');
    });
    expect(result.current!.slideFrozenHtml).toEqual({ 1: '<div>frozen-1</div>' });

    act(() => {
      result.current!.setMaster({ headingScale: 1.1 } as never);
    });
    expect(result.current!.slideFrozenHtml).toEqual({});
  });

  it('resetMaster wipes all frozen slide HTML', () => {
    const { result } = renderHook(() => useDeckPlan(skamBrand));
    act(() => {
      result.current!.setSlideFrozenHtml(0, '<div>frozen-after-master</div>');
    });
    expect(result.current!.slideFrozenHtml).toEqual({ 0: '<div>frozen-after-master</div>' });

    act(() => {
      result.current!.resetMaster();
    });
    expect(result.current!.slideFrozenHtml).toEqual({});
  });

  it('setSlideStyle wipes only the affected slide', () => {
    const { result } = renderHook(() => useDeckPlan(skamBrand));
    act(() => {
      result.current!.setSlideFrozenHtml(0, '<div>frozen-0</div>');
    });
    act(() => {
      result.current!.setSlideFrozenHtml(1, '<div>frozen-1</div>');
    });

    const nextStyle = ALL_STYLES.find((s) => s.id !== result.current!.plan.style)!;
    act(() => {
      result.current!.setSlideStyle(1, nextStyle.id);
    });
    expect(result.current!.slideFrozenHtml).toEqual({ 0: '<div>frozen-0</div>' });
  });

  it('setSlideShape wipes only the affected slide', () => {
    const { result } = renderHook(() => useDeckPlan(skamBrand));
    act(() => {
      result.current!.setSlideFrozenHtml(0, '<div>frozen-0</div>');
    });
    act(() => {
      result.current!.setSlideFrozenHtml(2, '<div>frozen-2</div>');
    });

    act(() => {
      result.current!.setSlideShape(2, 'minimal-rule');
    });
    expect(result.current!.slideFrozenHtml).toEqual({ 0: '<div>frozen-0</div>' });
  });
});
