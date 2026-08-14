/**
 * The marker's home of last resort.
 *
 * Read together with `missingColumn.test.ts`: that one proves we notice the
 * column is absent, this one proves noticing is worth something.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { forgetMarker, rememberedMarker, rememberMarker } from '../onboardingMarkerFallback';
import { completedState, isUnfinished, startedState } from '@/shared/onboarding/onboardingState';

beforeEach(() => localStorage.clear());

describe('a marker the database could not take', () => {
  it('comes back for the brand it belongs to', () => {
    const marker = startedState(['colors.primary']);
    rememberMarker('b1', marker);
    expect(rememberedMarker('b1')).toEqual(marker);
    expect(rememberedMarker('b2')).toBeUndefined();
  });

  it('keeps the brand reading as unfinished — the whole point', () => {
    rememberMarker('b1', startedState());
    expect(isUnfinished({ onboarding: rememberedMarker('b1') as never })).toBe(true);
  });

  it('is not written for a finished brand — silence already says that', () => {
    rememberMarker('b1', completedState(startedState()));
    expect(rememberedMarker('b1')).toBeUndefined();
  });

  it('is cleared when the brand finishes', () => {
    rememberMarker('b1', startedState());
    rememberMarker('b1', completedState(startedState()));
    expect(rememberedMarker('b1')).toBeUndefined();
  });

  it('is cleared when the brand is discarded', () => {
    rememberMarker('b1', startedState());
    forgetMarker('b1');
    expect(rememberedMarker('b1')).toBeUndefined();
  });

  it('survives corrupted storage rather than throwing', () => {
    localStorage.setItem('brandos:onboarding-markers', 'not json');
    expect(rememberedMarker('b1')).toBeUndefined();
    rememberMarker('b1', startedState());
    expect(rememberedMarker('b1')).toBeTruthy();
  });
});
