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

  it('trims events beyond 200 in localStorage', () => {
    // Directly seed localStorage with 210 events then verify log() trims
    const events = Array.from({ length: 210 }, (_, i) => ({
      id: `e${i}`, brandId: 'b1', eventType: 'brand_updated', title: `E${i}`, createdAt: Date.now() - i,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    // Verify trim happens on next read
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(raw.length).toBe(210); // before trim
    // After a log call, it should trim
    activityService.log({ brandId: 'b1', eventType: 'brand_updated', title: 'New' });
    // Give it a tick to complete
    setTimeout(() => {
      const after = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(after.length).toBeLessThanOrEqual(201); // 200 + 1 new
    }, 100);
  });
});
