// Phase 5.1b — LocalFormatPresetsService tests.
import { describe, expect, it } from 'vitest';
import { LocalFormatPresetsService } from './LocalFormatPresetsService';

describe('LocalFormatPresetsService', () => {
  const svc = new LocalFormatPresetsService();

  it('returns presets for social-post (Square / Portrait / Story)', async () => {
    const out = await svc.listForContentType('social-post');
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.map((p) => p.label)).toContain('Square 1:1');
    expect(out.map((p) => p.label)).toContain('Story 9:16');
    // Each entry has the contentTypeId set + a stable deterministic id.
    expect(out[0].contentTypeId).toBe('social-post');
    expect(out[0].id).toBe('social-post:0');
  });

  it('returns [] for an unknown content type (no throw)', async () => {
    const out = await svc.listForContentType('not-a-real-type');
    expect(out).toEqual([]);
  });

  it('preserves displayOrder = array index', async () => {
    const out = await svc.listForContentType('social-post');
    out.forEach((p, i) => {
      expect(p.displayOrder).toBe(i);
    });
  });

  it('listAll returns presets across multiple content types', async () => {
    const all = await svc.listAll();
    const contentTypes = new Set(all.map((p) => p.contentTypeId));
    // Should include at least the four common ones.
    expect(contentTypes.has('social-post')).toBe(true);
    expect(contentTypes.has('presentation')).toBe(true);
    expect(contentTypes.has('business-card')).toBe(true);
    expect(contentTypes.has('banner')).toBe(true);
  });
});
