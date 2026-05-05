// Phase A — UI preference store unit tests.
//
// Covers default, set, persist round-trip, and the `getBrandHomeUrl`
// helper that brand-entry sites consult when picking the namespace
// for a freshly-opened brand.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  useUiPreferenceStore,
  getCurrentUiPreference,
  getBrandHomeUrl,
} from './useUiPreference';

beforeEach(() => {
  // Reset the persisted store between tests so each starts at the default.
  localStorage.clear();
  useUiPreferenceStore.setState({ preference: 'studio' });
});

afterEach(() => {
  localStorage.clear();
});

describe('useUiPreferenceStore', () => {
  it('defaults to studio', () => {
    expect(getCurrentUiPreference()).toBe('studio');
  });

  it('setPreference flips to classic', () => {
    useUiPreferenceStore.getState().setPreference('classic');
    expect(getCurrentUiPreference()).toBe('classic');
  });

  it('setPreference flips back to studio', () => {
    useUiPreferenceStore.getState().setPreference('classic');
    useUiPreferenceStore.getState().setPreference('studio');
    expect(getCurrentUiPreference()).toBe('studio');
  });

  it('persists choice across reads (localStorage round-trip)', () => {
    useUiPreferenceStore.getState().setPreference('classic');
    // The persist middleware writes synchronously; reading back should match.
    const stored = localStorage.getItem('brandos:ui-preference');
    expect(stored).toBeTruthy();
    expect(stored).toContain('classic');
  });
});

describe('getBrandHomeUrl', () => {
  it('returns /b/:slug/setup for Studio default', () => {
    expect(getBrandHomeUrl('raqm')).toBe('/b/raqm/setup');
  });

  it('returns /a/:slug/setup for Classic preference (harmonized path)', () => {
    useUiPreferenceStore.getState().setPreference('classic');
    expect(getBrandHomeUrl('raqm')).toBe('/a/raqm/setup');
  });

  it('returns /b/:slug/setup again when toggled back to Studio', () => {
    useUiPreferenceStore.getState().setPreference('classic');
    useUiPreferenceStore.getState().setPreference('studio');
    expect(getBrandHomeUrl('skam')).toBe('/b/skam/setup');
  });

  it('canonical path is the same shape across namespaces (<ns>/:slug/setup)', () => {
    expect(getBrandHomeUrl('raqm')).toBe('/b/raqm/setup');
    useUiPreferenceStore.getState().setPreference('classic');
    expect(getBrandHomeUrl('raqm')).toBe('/a/raqm/setup');
  });
});
