/**
 * The colours a brand actually chose.
 *
 * A real browser, because this reads pixels off a canvas. Every case below is
 * drawn here rather than loaded, so what is being claimed is visible in the
 * test: a yellow symbol and black type on a white canvas is a yellow-and-black
 * brand, and no amount of white behind it changes that.
 *
 * The case that shipped: that exact logo came back as white plus the greys its
 * edges blended into, and the brand's own two colours were nowhere.
 */
import { describe, it, expect } from 'vitest';
import { extractDominantColors } from '../utils/assetUpload';

const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  )}`;

/** A row of letter-shaped bars — type, as far as a pixel reader is concerned. */
const type = (x: number, fill: string, letters = 7) =>
  Array.from(
    { length: letters },
    (_, i) => `<rect x="${x + i * 13}" y="19" width="9" height="22" fill="${fill}"/>`,
  ).join('');

const symbol = (fill: string) => `<circle cx="26" cy="30" r="16" fill="${fill}"/>`;
const canvas = (fill: string) => `<rect width="200" height="60" fill="${fill}"/>`;

const YELLOW = '#F5C518';
const INK = '#111111';

describe('the ground is not a colour', () => {
  it('reads a yellow-and-black logo on white as yellow and black', async () => {
    const out = await extractDominantColors(svg(canvas('#ffffff') + symbol(YELLOW) + type(56, INK), 200, 60), 5);
    expect(out).toEqual([YELLOW, INK]);
  });

  it('gets the same answer with no canvas at all', async () => {
    const out = await extractDominantColors(svg(symbol(YELLOW) + type(56, INK), 200, 60), 5);
    expect(out).toEqual([YELLOW, INK]);
  });

  it('keeps a white logo when the ground was the dark one', async () => {
    // The mirror case, and the one a rule about "white is background" gets
    // wrong: here white IS the artwork.
    const out = await extractDominantColors(
      svg(canvas('#000000') + symbol('#ffffff') + type(56, '#ffffff'), 200, 60),
      5,
    );
    expect(out).toEqual(['#FFFFFF']);
  });

  it('keeps every brand colour, in prominence order', async () => {
    const out = await extractDominantColors(
      svg(
        canvas('#ffffff') +
          symbol(YELLOW) +
          '<rect x="52" y="19" width="40" height="22" fill="#1B5E9C"/>' +
          type(100, INK, 5),
        200,
        60,
      ),
      5,
    );
    expect(out).toContain(YELLOW);
    expect(out).toContain(INK);
    expect(out).toContain('#1B5E9C');
    expect(out).not.toContain('#FFFFFF');
  });

  it('does not mistake a soft edge for a colour', async () => {
    // Every antialiased pixel is part ink, part ground. There are thousands of
    // them and they arrive as a ramp of greys — enough to crowd two real
    // colours off a four-swatch palette.
    const out = await extractDominantColors(svg(canvas('#ffffff') + symbol(YELLOW) + type(56, INK), 200, 60), 5);
    const greys = out.filter((hex) => {
      const n = parseInt(hex.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      return Math.max(r, g, b) - Math.min(r, g, b) < 14 && r > 40 && r < 220;
    });
    expect(greys).toEqual([]);
  });

  it('has nothing to say about an image it cannot read', async () => {
    expect(await extractDominantColors('data:image/png;base64,nope', 4)).toEqual([]);
  });
});
