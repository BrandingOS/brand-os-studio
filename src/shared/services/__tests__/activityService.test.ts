import { describe, it, expect, beforeEach } from 'vitest';
import { activityService } from '../activityService';

const STORAGE_KEY = 'brandos-activity-log';

describe('activityService (localStorage fallback)', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('log creates event with ID and timestamp', async () => {
    await activityService.log({
      brandId: 'brand-1',
      eventType: 'brand_created',
      title: 'Test brand created',
    });
    const events = await activityService.list();
    expect(events.length).toBeGreaterThanOrEqual(1);
    const ev = events.find((e) => e.title === 'Test brand created');
    expect(ev).toBeDefined();
    expect(ev!.id).toBeDefined();
    expect(ev!.createdAt).toBeGreaterThan(0);
  });

  it('list returns events sorted newest first', async () => {
    await activityService.log({ brandId: 'b1', eventType: 'brand_created', title: 'First' });
    await activityService.log({ brandId: 'b1', eventType: 'brand_updated', title: 'Second' });
    const events = await activityService.list();
    expect(events[0].title).toBe('Second');
    expect(events[1].title).toBe('First');
  });

  it('list filters by brandId', async () => {
    await activityService.log({ brandId: 'b1', eventType: 'brand_created', title: 'Brand 1' });
    await activityService.log({ brandId: 'b2', eventType: 'brand_created', title: 'Brand 2' });
    const filtered = await activityService.list({ brandId: 'b1' });
    expect(filtered.every((e) => e.brandId === 'b1')).toBe(true);
  });

  it('list respects limit', async () => {
    for (let i = 0; i < 10; i++) {
      await activityService.log({ brandId: 'b1', eventType: 'brand_updated', title: `Event ${i}` });
    }
    const limited = await activityService.list({ limit: 3 });
    expect(limited).toHaveLength(3);
  });

  // `log()` is awaited, and the assertion is made directly rather than inside a
  // setTimeout: a callback scheduled after the test body never runs before the
  // test ends, so it asserted nothing — and the un-awaited promise landed after
  // the environment was torn down, which surfaced as an unhandled
  // "localStorage is not defined" rejection attributed to whichever file
  // happened to be running.
  it('trims events beyond 200 in localStorage', async () => {
    const events = Array.from({ length: 210 }, (_, i) => ({
      id: `e${i}`, brandId: 'b1', eventType: 'brand_updated', title: `E${i}`, createdAt: Date.now() - i,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length).toBe(210);

    await activityService.log({ brandId: 'b1', eventType: 'brand_updated', title: 'New' });

    const after = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(after.length).toBe(200);
    expect(after[0].title).toBe('New');
  });
});
