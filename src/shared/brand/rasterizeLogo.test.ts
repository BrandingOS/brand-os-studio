import { describe, expect, it, vi } from 'vitest';
import { rasterizeLogo } from './rasterizeLogo';

function fakeCanvas() {
  const ctx = {
    fillStyle: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,AAAA',
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

describe('rasterizeLogo', () => {
  it('contains the image inside a padded square and returns a PNG data url', async () => {
    const { canvas, ctx } = fakeCanvas();
    const img = { naturalWidth: 400, naturalHeight: 100 } as HTMLImageElement;
    const out = await rasterizeLogo('data:image/svg+xml;utf8,<svg/>', {
      size: 1000, padding: 0.1, createCanvas: () => canvas, loadImage: async () => img,
    });
    expect(out).toBe('data:image/png;base64,AAAA');
    expect(canvas.width).toBe(1000);
    // inner = 800; scale = min(800/400, 800/100) = 2 → 800×200 centered
    expect(ctx.drawImage).toHaveBeenCalledWith(img, 100, 400, 800, 200);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('paints a ground when a background is given', async () => {
    const { canvas, ctx } = fakeCanvas();
    await rasterizeLogo('x', {
      background: '#ffffff', createCanvas: () => canvas,
      loadImage: async () => ({ naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement),
    });
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('assumes 300×150 for an SVG with no intrinsic size', async () => {
    const { canvas, ctx } = fakeCanvas();
    const img = { naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 } as HTMLImageElement;
    await rasterizeLogo('x', { size: 100, padding: 0, createCanvas: () => canvas, loadImage: async () => img });
    expect(ctx.drawImage).toHaveBeenCalledWith(img, 0, 25, 100, 50);
  });

  it('resolves null instead of throwing when the image fails', async () => {
    const out = await rasterizeLogo('nope', { loadImage: async () => { throw new Error('x'); } });
    expect(out).toBeNull();
  });
});
