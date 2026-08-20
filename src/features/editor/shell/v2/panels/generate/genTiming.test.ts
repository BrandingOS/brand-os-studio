import { beforeEach, describe, expect, it } from 'vitest';
import { clearTimings, estimateDuration, recordDuration } from './genTiming';

beforeEach(() => clearTimings());

describe('genTiming', () => {
  it('offers no estimate until it has actually seen this run', () => {
    expect(estimateDuration('google:nano-banana', 1)).toBeNull();
    recordDuration('google:nano-banana', 1, 12_000);
    expect(estimateDuration('google:nano-banana', 1)).toBe(12_000);
  });

  it('keeps models and batch sizes apart — four images is not one', () => {
    recordDuration('google:nano-banana', 1, 10_000);
    expect(estimateDuration('google:nano-banana', 4)).toBeNull();
    expect(estimateDuration('openai:gpt-image', 1)).toBeNull();
  });

  it('takes the median, so one slow run cannot move the number', () => {
    for (const ms of [9_000, 10_000, 11_000, 90_000]) recordDuration('m', 1, ms);
    expect(estimateDuration('m', 1)).toBe(10_500);
  });

  it('refuses nonsense rather than remembering it', () => {
    recordDuration('m', 1, 0);
    recordDuration('m', 1, -5);
    recordDuration('m', 1, 60 * 60_000);
    recordDuration('m', 1, Number.NaN);
    expect(estimateDuration('m', 1)).toBeNull();
  });

  it('remembers only the recent runs, so a model that got faster is not held to its past', () => {
    for (let i = 0; i < 12; i++) recordDuration('m', 1, 60_000);
    for (let i = 0; i < 8; i++) recordDuration('m', 1, 5_000);
    expect(estimateDuration('m', 1)).toBe(5_000);
  });
});
