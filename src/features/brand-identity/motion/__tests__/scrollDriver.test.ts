/**
 * The scroll driver.
 *
 * One listener and one frame for the whole page, writing a custom property the
 * compositor animates from. The things worth pinning are the ones that would
 * fail silently: a progress value that never reaches its ends, a frame that
 * repaints for a change nobody can see, and a listener left attached after the
 * last element unmounts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { observeScroll, _scrollTargetCount } from '../scrollDriver';

/** An element that reports whatever rect the test wants. */
function elementAt(top: number, height: number): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  return el;
}

/*
 * A synchronous frame.
 *
 * The driver measures inside `requestAnimationFrame`, and waiting on a real one
 * makes every assertion here a race. Running the callback inline turns
 * "register an element" into "the element now has its value", which is the only
 * part these tests are about.
 */
beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('progress across a pinned stage', () => {
  it('is 0 before the stage has moved and 1 once it is spent', () => {
    const stage = elementAt(0, 1400); // 800 viewport ⇒ 600px of travel
    const stop = observeScroll(stage, 'pin');
    expect(stage.style.getPropertyValue('--bi-p')).toBe('0.0000');
    stop();

    const spent = elementAt(-600, 1400);
    const stop2 = observeScroll(spent, 'pin');
    expect(spent.style.getPropertyValue('--bi-p')).toBe('1.0000');
    stop2();
  });

  it('never leaves the 0–1 range when scrolled past', () => {
    const past = elementAt(-4000, 1400);
    const stop = observeScroll(past, 'pin');
    // Unclamped this reads 6.7, and every `calc()` downstream flies off screen.
    expect(Number(past.style.getPropertyValue('--bi-p'))).toBe(1);
    stop();
  });

  it('answers for a stage shorter than the viewport rather than dividing by zero', () => {
    const short = elementAt(0, 400);
    const stop = observeScroll(short, 'pin');
    expect(Number(short.style.getPropertyValue('--bi-p'))).toBe(0);
    stop();
  });
});

describe('progress across a travelling element', () => {
  it('reads a quarter a quarter of the way through the journey', () => {
    // Height 800, top at 400: (800 − 400) / (800 + 800).
    const el = elementAt(400, 800);
    const stop = observeScroll(el, 'travel');
    expect(Number(el.style.getPropertyValue('--bi-p'))).toBeCloseTo(0.25, 2);
    stop();
  });
});

describe('housekeeping', () => {
  it('drops the listener when the last element goes', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const before = _scrollTargetCount();
    const a = elementAt(0, 1400);
    const b = elementAt(0, 1400);
    const stopA = observeScroll(a, 'pin');
    const stopB = observeScroll(b, 'pin');
    expect(_scrollTargetCount()).toBe(before + 2);
    stopA();
    // Still one element on the page — the listener has to stay.
    expect(remove).not.toHaveBeenCalled();
    stopB();
    expect(_scrollTargetCount()).toBe(before);
    expect(remove).toHaveBeenCalled();
  });

  it('takes its variable back, so nothing is left mid-animation', () => {
    const el = elementAt(-300, 1400);
    const stop = observeScroll(el, 'pin');
    expect(el.style.getPropertyValue('--bi-p')).not.toBe('');
    stop();
    expect(el.style.getPropertyValue('--bi-p')).toBe('');
  });
});
