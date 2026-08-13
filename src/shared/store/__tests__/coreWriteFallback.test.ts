/**
 * The fallback must be observable, because a silent one would let Brand Core
 * convergence stall on some brand indefinitely with nobody the wiser. Its
 * zero-count is also the evidence that satisfies the removal criterion, so the
 * recorder needs to be trustworthy.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getCoreWriteFallbackReport,
  recordCoreWriteFallback,
  resetCoreWriteFallbackReport,
} from '../coreWriteFallback';

beforeEach(() => resetCoreWriteFallbackReport());
afterEach(() => vi.restoreAllMocks());

describe('recordCoreWriteFallback', () => {
  it('starts at zero — the state that means the fallback can be deleted', () => {
    expect(getCoreWriteFallbackReport()).toEqual({ count: 0, recent: [] });
  });

  it('records the brand, the fields, and why', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    recordCoreWriteFallback('b1', ['primaryColor', 'tone'], new Error('invalid hex'));

    const report = getCoreWriteFallbackReport();
    expect(report.count).toBe(1);
    expect(report.recent[0]).toMatchObject({
      brandId: 'b1',
      keys: ['primaryColor', 'tone'],
      message: 'invalid hex',
    });
    expect(report.recent[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('says so out loud, with the brand and the fields named', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    recordCoreWriteFallback('b1', ['primaryColor'], new Error('boom'));

    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('b1');
    expect(msg).toContain('primaryColor');
    // The edit succeeded — the message must not read as a failed save.
    expect(msg).toMatch(/edit was saved/i);
  });

  it('tolerates a non-Error throw', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    recordCoreWriteFallback('b1', [], 'a string was thrown');
    expect(getCoreWriteFallbackReport().recent[0].message).toBe('a string was thrown');
  });

  it('counts every occurrence but caps what it retains', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 40; i += 1) {
      recordCoreWriteFallback(`b${i}`, ['tone'], new Error(`e${i}`));
    }
    const report = getCoreWriteFallbackReport();
    expect(report.count).toBe(40);
    expect(report.recent).toHaveLength(25);
    // Keeps the MOST RECENT — the ones worth looking at.
    expect(report.recent.at(-1)?.brandId).toBe('b39');
  });

  it('hands back a copy — a caller cannot corrupt the record', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    recordCoreWriteFallback('b1', ['tone'], new Error('x'));
    getCoreWriteFallbackReport().recent.push({
      brandId: 'fake', keys: [], message: '', at: '',
    });
    expect(getCoreWriteFallbackReport().recent).toHaveLength(1);
  });
});
