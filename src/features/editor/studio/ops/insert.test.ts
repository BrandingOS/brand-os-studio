// Making a layer — the brand-awareness tests.
//
// The behaviour these pin is the product claim: a layer created inside a
// brand is made OF that brand. Before this, every shape was born
// `#6366f1` regardless of which brand you were in.

import { describe, expect, it } from 'vitest';
import type { Page } from '@/features/editor/schema';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import {
  brandFill,
  makeImage,
  makeShape,
  makeText,
  readableInk,
  TEXT_STYLES,
} from './insert';

function page(over: Partial<Page> = {}): Page {
  return {
    id: 'page-1',
    name: 'Page',
    width: 1000,
    height: 1000,
    background: '#ffffff',
    masterPageId: null,
    layers: [],
    ...over,
  } as Page;
}

function kit(over: Partial<BrandKit> = {}): BrandKit {
  return {
    id: 'kit',
    name: 'Test brand',
    colors: {
      primary: { hex: '#EF4444', name: 'Signal red' },
      secondary: { hex: '#1D4ED8', name: 'Deep blue' },
      neutrals: ['#ffffff', '#f2f2f2', '#cccccc', '#888888', '#333333', '#111111'],
    },
    typography: {
      heading: { family: 'GT Super' },
      body: { family: 'Bricolage Grotesque' },
    },
    logos: {},
    spacing: { unit: 8, cornerRadius: 12 },
    ...over,
  } as BrandKit;
}

const centre = { x: 500, y: 500 };

describe('brandFill', () => {
  it("is the brand's primary, not a hardcoded colour", () => {
    expect(brandFill(kit(), page())).toBe('#EF4444');
  });

  it('steps aside when the primary IS the page — an invisible shape is not a shape', () => {
    expect(brandFill(kit(), page({ background: '#ef4444' }))).toBe('#1D4ED8');
  });

  it('falls back to a neutral when the brand has only a primary and it matches the page', () => {
    const k = kit({
      colors: {
        primary: { hex: '#ffffff', name: 'White' },
        neutrals: ['#fff', '#eee', '#ccc', '#999', '#333', '#000'],
      } as BrandKit['colors'],
    });
    expect(brandFill(k, page({ background: '#FFFFFF' }))).toBe('#999');
  });

  it('has a neutral answer with no brand at all — the standalone editor', () => {
    expect(brandFill(null, page())).toMatch(/^#/);
  });
});

describe('readableInk', () => {
  it('picks a colour that can be READ on the page, not simply the primary', () => {
    // #EF4444 on white clears little; the dark neutral wins.
    expect(readableInk(kit(), page({ background: '#ffffff' }))).toBe('#111111');
  });

  it('flips for a dark page', () => {
    const ink = readableInk(kit(), page({ background: '#111111' }));
    expect(['#ffffff', '#ffffff'].includes(ink) || ink === '#ffffff').toBe(true);
  });
});

describe('makeShape', () => {
  it('is filled from the brand and carries the brand’s corner radius', () => {
    const shape = makeShape('rectangle', kit(), { centre, page: page() });
    expect(shape.fill).toBe('#EF4444');
    expect(shape.cornerRadius).toBe(12);
  });

  it('only rounds a rectangle', () => {
    expect(makeShape('ellipse', kit(), { centre, page: page() }).cornerRadius).toBe(0);
  });

  it('a line is a stroke, never a fill', () => {
    const line = makeShape('line', kit(), { centre, page: page() });
    expect(line.fill).toBeNull();
    expect(line.stroke).toBeTruthy();
    expect(line.strokeWidth).toBeGreaterThan(0);
  });

  it('lands where the user is LOOKING', () => {
    const shape = makeShape('rectangle', kit(), { centre: { x: 200, y: 800 }, page: page() });
    const box = shape.transform;
    expect(box.x + box.width / 2).toBeCloseTo(200, 0);
    expect(box.y + box.height / 2).toBeCloseTo(800, 0);
  });

  it('is pulled back onto the page when the user is looking off it', () => {
    // Panned far past the artboard — the layer must not land somewhere
    // the user then has to hunt for.
    const shape = makeShape('rectangle', kit(), { centre: { x: 9000, y: -4000 }, page: page() });
    expect(shape.transform.x).toBeLessThan(1000);
    expect(shape.transform.x).toBeGreaterThanOrEqual(0);
    expect(shape.transform.y).toBeGreaterThanOrEqual(0);
  });
});

describe('makeText', () => {
  it("is set in the brand's typefaces, heading and body separately", () => {
    expect(makeText('heading', kit(), { centre, page: page() }).fontFamily).toBe('GT Super');
    expect(makeText('body', kit(), { centre, page: page() }).fontFamily).toBe(
      'Bricolage Grotesque',
    );
  });

  it('SIZES ITSELF TO THE FORMAT, so one command suits every deliverable', () => {
    const post = makeText('heading', kit(), { centre, page: page({ width: 1080, height: 1080 }) });
    const card = makeText('heading', kit(), {
      centre: { x: 525, y: 300 },
      page: page({ width: 1050, height: 600 }),
    });
    // A fixed 48px heading is enormous on a business card and invisible
    // on a billboard; the size follows the page's short edge.
    expect(post.fontSize).toBeGreaterThan(card.fontSize);
    expect(card.fontSize).toBeGreaterThan(10);
  });

  it('always carries a fontStyle', () => {
    // Fabric lower-cases this to build its font-measurement cache key,
    // so an absent value throws inside the Textbox constructor.
    expect(makeText('body', kit(), { centre, page: page() }).fontStyle).toBe('normal');
  });

  it('is inked so it can be read on the page', () => {
    const onDark = makeText('heading', kit(), {
      centre,
      page: page({ background: '#0b0b0b' }),
    });
    expect(onDark.color).toBe('#ffffff');
  });

  it('accepts supplied copy over the sample', () => {
    const t = makeText('heading', kit(), { centre, page: page() }, 'Spring sale');
    expect(t.text).toBe('Spring sale');
    expect(TEXT_STYLES.heading.sample).not.toBe('Spring sale');
  });

  it('works without a brand', () => {
    const t = makeText('heading', null, { centre, page: page() });
    expect(typeof t.fontFamily).toBe('string');
    expect(t.fontFamily).toBeTruthy();
  });
});

describe('makeImage', () => {
  it('keeps the picture’s proportions when they are known', () => {
    const portrait = makeImage('https://x/y.png', { centre, page: page() }, {
      width: 100,
      height: 200,
    });
    expect(portrait.transform.height).toBeGreaterThan(portrait.transform.width);
  });

  it('defaults to cover, the fit a photo usually wants', () => {
    expect(makeImage('https://x/y.png', { centre, page: page() }).fit).toBe('cover');
  });
});
