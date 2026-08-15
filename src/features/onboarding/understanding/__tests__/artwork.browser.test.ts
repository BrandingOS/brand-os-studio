/**
 * Reading a logo, in a real browser.
 *
 * This is the one module that cannot be tested anywhere else: it renders to a
 * canvas and measures pixels, and jsdom has no canvas to render to. Everything
 * below is drawn here rather than loaded from a fixture, so each case states
 * plainly what it IS — a ring of dots, a row of letter-shaped bars, one above
 * the other or side by side — and the assertion says what a person would say
 * looking at it.
 */
import { describe, it, expect } from 'vitest';
import { readArtwork, sameArtwork } from '../artwork';

/** An SVG as a data URL, so nothing has to be served. */
const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  )}`;

/** A row of letter-shaped bars — a word, as far as any of this is concerned. */
const word = (x: number, y: number, fill: string, letters = 7) =>
  Array.from(
    { length: letters },
    (_, i) => `<rect x="${x + i * 13}" y="${y}" width="9" height="22" fill="${fill}"/>`,
  ).join('');

/** A ring of dots — a symbol. */
const symbol = (cx: number, cy: number, fill: string) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<circle cx="${cx + Math.cos(a) * 16}" cy="${cy + Math.sin(a) * 16}" r="5" fill="${fill}"/>`;
  }).join('');

const ICON = (fill = '#000') => svg(symbol(30, 30, fill), 60, 60);
const WORDMARK = (fill = '#000') => svg(word(6, 9, fill), 105, 40);
const BESIDE = (fill = '#000') => svg(symbol(30, 30, fill) + word(62, 19, fill), 170, 60);
const STACKED = (fill = '#000') => svg(symbol(60, 32, fill) + word(15, 78, fill), 120, 110);

describe('what the artwork is made of', () => {
  it('a symbol on its own is a shape', async () => {
    const a = await readArtwork(ICON());
    expect(a?.parts).toBe('shape');
  });

  it('a row of letters is text', async () => {
    const a = await readArtwork(WORDMARK());
    expect(a?.parts).toBe('text');
    expect(a?.arrangement).toBeNull();
  });

  it('a symbol beside a name is both, side by side', async () => {
    const a = await readArtwork(BESIDE());
    expect(a?.parts).toBe('both');
    expect(a?.arrangement).toBe('beside');
  });

  it('a symbol above a name is both, stacked', async () => {
    const a = await readArtwork(STACKED());
    expect(a?.parts).toBe('both');
    expect(a?.arrangement).toBe('stacked');
  });

  it('does not tear an evenly spaced wordmark in half', async () => {
    // Every gap between letters is identical, so the "widest" is whichever won
    // by a pixel. Cutting there took the first letter for a symbol and called
    // the result a lockup.
    const a = await readArtwork(svg(word(6, 9, '#000', 9), 130, 40));
    expect(a?.parts).toBe('text');
  });

  it('reads two words as one line of words', async () => {
    const a = await readArtwork(svg(word(6, 9, '#000', 4) + word(72, 9, '#000', 3), 130, 40));
    expect(a?.parts).toBe('text');
  });
});

describe('what the artwork is FOR', () => {
  it('dark artwork is ordinary', async () => {
    expect((await readArtwork(BESIDE('#000')))?.tone).toBe('dark');
  });

  it('light artwork was made to sit on dark', async () => {
    // Invisible against a white composite, which is why the whole white export
    // folder used to read as unreadable. Coverage sees it.
    expect((await readArtwork(BESIDE('#fff')))?.tone).toBe('light');
    expect((await readArtwork(WORDMARK('#fff')))?.tone).toBe('light');
  });

  it('reads the same composition whatever colour it is drawn in', async () => {
    const dark = await readArtwork(STACKED('#000'));
    const light = await readArtwork(STACKED('#fff'));
    expect(light?.parts).toBe(dark?.parts);
    expect(light?.arrangement).toBe(dark?.arrangement);
  });
});

describe('the same drawing, and different ones', () => {
  it('is the same at any size', async () => {
    const small = await readArtwork(svg(symbol(30, 30, '#000'), 60, 60));
    // The same drawing, ten times bigger.
    const large = await readArtwork(
      svg(`<g transform="scale(10)">${symbol(30, 30, '#000')}</g>`, 600, 600),
    );
    expect(sameArtwork(small, large)).toBe(true);
  });

  it('is not the same as a different mark', async () => {
    expect(sameArtwork(await readArtwork(ICON()), await readArtwork(WORDMARK()))).toBe(false);
  });

  it('separates a mark from its light twin, so both get a slot', async () => {
    // Coverage ignores colour on purpose — it is what makes an SVG and its
    // flattened export match. The tone is what keeps the pair apart.
    expect(sameArtwork(await readArtwork(BESIDE('#000')), await readArtwork(BESIDE('#fff')))).toBe(false);
  });

  it('has nothing to say about a blank image', async () => {
    expect(await readArtwork(svg('', 40, 40))).toBeNull();
  });

  it('has nothing to say about an image that will not load', async () => {
    expect(await readArtwork('data:image/png;base64,not-an-image')).toBeNull();
  });
});
