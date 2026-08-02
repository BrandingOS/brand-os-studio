import { beforeEach, describe, expect, it } from 'vitest';

import {
  describeStorageUsage,
  freeDisposableStorage,
  isStorageFullError,
  measureLocalStorage,
} from './storageCleanup';

describe('isStorageFullError', () => {
  it('recognizes the DOMException browsers throw', () => {
    const err = new DOMException('exceeded', 'QuotaExceededError');
    expect(isStorageFullError(err)).toBe(true);
  });

  it('recognizes the wrapped message our storage helper produces', () => {
    expect(isStorageFullError(new Error('Storage full — your browser storage is at capacity.'))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isStorageFullError(new Error('duplicate key value'))).toBe(false);
    expect(isStorageFullError(null)).toBe(false);
  });
});

describe('freeDisposableStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drops caches and drafts but never user content', () => {
    localStorage.setItem('brandos:brands', 'x'.repeat(2048));
    localStorage.setItem('design_acme', 'y'.repeat(1024));
    localStorage.setItem('brandos:seed-brand-overrides', 'z'.repeat(512));
    localStorage.setItem('cmdk:recent', 'a'.repeat(1024));
    localStorage.setItem('template-builder-draft', 'b'.repeat(1024));
    localStorage.setItem('editor-tutorial-canvas', 'c'.repeat(512));

    const freedKB = freeDisposableStorage();

    expect(localStorage.getItem('brandos:brands')).not.toBeNull();
    expect(localStorage.getItem('design_acme')).not.toBeNull();
    expect(localStorage.getItem('brandos:seed-brand-overrides')).not.toBeNull();
    expect(localStorage.getItem('cmdk:recent')).toBeNull();
    expect(localStorage.getItem('template-builder-draft')).toBeNull();
    expect(localStorage.getItem('editor-tutorial-canvas')).toBeNull();
    expect(freedKB).toBeGreaterThan(0);
  });
});

describe('measure / describe', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('names the biggest consumer in plain words', () => {
    localStorage.setItem('brandos:brands', 'x'.repeat(120 * 1024));
    expect(measureLocalStorage().top[0].key).toBe('brandos:brands');
    expect(describeStorageUsage()).toContain('saved brands');
  });
});
