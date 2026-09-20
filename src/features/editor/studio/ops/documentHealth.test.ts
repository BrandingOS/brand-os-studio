import { describe, expect, it, vi } from 'vitest';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import {
  isExpiringUrl,
  isMasterTemplate,
  makeThumbnail,
  refreshExpiringImages,
  THUMBNAIL_EDGE,
} from './documentHealth';

const SIGNED =
  'https://x.supabase.co/storage/v1/object/sign/brand-assets/gen/a.png?token=abc';

function imageLayer(id: string, src: string): Layer {
  return {
    id,
    name: id,
    kind: 'image',
    src,
    fit: 'cover',
    transform: { x: 0, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
    opacity: 1,
    visible: true,
    locked: false,
    brandLocked: false,
  } as Layer;
}

function doc(over: Partial<BrandOSDocument> = {}): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'doc',
    contentType: 'social-post',
    brandId: null,
    masterPages: [],
    pages: [
      {
        id: 'p1',
        name: 'Page 1',
        width: 1080,
        height: 1350,
        background: '#fff',
        masterPageId: null,
        layers: [imageLayer('l1', SIGNED)],
      },
    ],
    metadata: {
      ai: {
        origin: 'ai-image',
        generations: [
          {
            id: 'g1',
            pageId: 'p1',
            original: 'a poster',
            compiled: 'a poster',
            model: 'auto',
            count: 1,
            batchId: 'b1',
            refs: [],
            kind: 'generate',
            createdAt: new Date().toISOString(),
            storagePath: 'gen/a.png',
          },
        ],
      },
    },
    ...over,
  } as BrandOSDocument;
}

describe('isExpiringUrl', () => {
  it('recognises a signed storage URL', () => {
    expect(isExpiringUrl(SIGNED)).toBe(true);
  });
  it('leaves a data URL, a public object and a third-party CDN alone', () => {
    expect(isExpiringUrl('data:image/png;base64,AAA')).toBe(false);
    expect(
      isExpiringUrl('https://x.supabase.co/storage/v1/object/public/a/b.png'),
    ).toBe(false);
    expect(isExpiringUrl('https://images.example.com/photo.jpg')).toBe(false);
  });
});

describe('refreshExpiringImages', () => {
  it('re-signs an expiring generated image', async () => {
    const resign = vi.fn(async () => 'https://x/fresh.png?token=new');
    const next = await refreshExpiringImages(doc(), resign);
    expect(resign).toHaveBeenCalledWith('gen/a.png');
    expect((next.pages[0].layers[0] as { src: string }).src).toBe(
      'https://x/fresh.png?token=new',
    );
  });

  it('returns the SAME object when nothing needs refreshing', async () => {
    // Identity is the signal a caller uses to decide whether to write
    // anything back: opening a design must not mark it dirty.
    const clean = doc({
      pages: [
        {
          id: 'p1',
          name: 'Page 1',
          width: 10,
          height: 10,
          background: '#fff',
          masterPageId: null,
          layers: [imageLayer('l1', 'data:image/png;base64,AAA')],
        },
      ],
    } as Partial<BrandOSDocument>);
    const resign = vi.fn();
    expect(await refreshExpiringImages(clean, resign)).toBe(clean);
    expect(resign).not.toHaveBeenCalled();
  });

  it('makes ONE call per distinct path, not one per layer', async () => {
    const resign = vi.fn(async () => 'https://x/fresh.png');
    const d = doc();
    d.pages[0].layers.push(imageLayer('l2', SIGNED));
    d.pages[0].layers.push(imageLayer('l3', SIGNED));
    await refreshExpiringImages(d, resign);
    expect(resign).toHaveBeenCalledTimes(1);
  });

  it('keeps the old URL when re-signing fails — stale beats broken', async () => {
    const next = await refreshExpiringImages(doc(), async () => null);
    expect((next.pages[0].layers[0] as { src: string }).src).toBe(SIGNED);
  });

  it('survives a rejected re-sign', async () => {
    const next = await refreshExpiringImages(doc(), async () => {
      throw new Error('network');
    });
    expect((next.pages[0].layers[0] as { src: string }).src).toBe(SIGNED);
  });

  it('leaves an image alone when its page has no generation record', async () => {
    const orphan = doc({ metadata: {} } as Partial<BrandOSDocument>);
    const resign = vi.fn();
    expect(await refreshExpiringImages(orphan, resign)).toBe(orphan);
  });
});

describe('makeThumbnail', () => {
  function adapterWith(exportAs: DocumentAdapter['exportAs']): DocumentAdapter {
    return { exportAs } as DocumentAdapter;
  }

  it('asks for a small JPEG scaled by the page’s LONG edge', async () => {
    const exportAs = vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' }));
    await makeThumbnail(adapterWith(exportAs), doc());
    const options = exportAs.mock.calls[0][0];
    expect(options.format).toBe('jpg');
    // 1080x1350 — the 1350 is what has to fit.
    expect(options.scale).toBeCloseTo(THUMBNAIL_EDGE / 1350, 5);
  });

  it('never magnifies a page smaller than the thumbnail', async () => {
    const exportAs = vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' }));
    const small = doc({
      pages: [
        {
          id: 'p1',
          name: 'P',
          width: 120,
          height: 80,
          background: '#fff',
          masterPageId: null,
          layers: [],
        },
      ],
    } as Partial<BrandOSDocument>);
    await makeThumbnail(adapterWith(exportAs), small);
    expect(exportAs.mock.calls[0][0].scale).toBe(1);
  });

  it('returns null rather than throwing when the canvas is tainted', async () => {
    // One cross-origin image without CORS headers makes toDataURL throw
    // for the whole surface. A design that cannot produce a thumbnail
    // must still save.
    const exportAs = vi.fn(async () => {
      throw new Error('SecurityError: tainted canvas');
    });
    await expect(makeThumbnail(adapterWith(exportAs), doc())).resolves.toBeNull();
  });

  it('returns null for an empty blob', async () => {
    const exportAs = vi.fn(async () => new Blob([], { type: 'image/jpeg' }));
    await expect(makeThumbnail(adapterWith(exportAs), doc())).resolves.toBeNull();
  });
});

describe('isMasterTemplate', () => {
  it('is true only for a document flagged as one', () => {
    expect(isMasterTemplate(doc())).toBe(false);
    expect(
      isMasterTemplate(doc({ metadata: { isTemplate: true } } as Partial<BrandOSDocument>)),
    ).toBe(true);
  });
});
