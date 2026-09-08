import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { importSvg } from '../svgImport';
import { componentBounds, ringArea, pointInComponent } from '../../engine/geom/polygon';

const FIXTURE = readFileSync('src/features/tools/3d-logo-studio/__fixtures__/logomark-3d.svg', 'utf8');

const wrap = (body: string, attrs = 'viewBox="0 0 100 100"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

const codes = (r: { diagnostics: { code: string }[] }) => r.diagnostics.map((d) => d.code);

describe('importSvg — the supplied fixture', () => {
  it('yields exactly nine components', async () => {
    const r = await importSvg(FIXTURE);
    expect(r.components).toHaveLength(9);
  });

  it('reads the viewBox', async () => {
    const r = await importSvg(FIXTURE);
    expect(r.viewBox).toEqual({ x: 0, y: 0, width: 113, height: 113 });
  });

  it('has nothing to complain about', async () => {
    const r = await importSvg(FIXTURE);
    expect(r.diagnostics).toEqual([]);
  });

  it('keeps each dot at its own place and size', async () => {
    const r = await importSvg(FIXTURE);
    const centres = r.components.map((c) => {
      const b = componentBounds(c);
      return { w: b.maxX - b.minX, h: b.maxY - b.minY, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 };
    });
    for (const c of centres) {
      expect(c.w).toBeCloseTo(22.2, 0);
      expect(c.h).toBeCloseTo(22.2, 0);
    }
    expect(new Set(centres.map((c) => `${c.cx.toFixed(1)},${c.cy.toFixed(1)}`)).size).toBe(9);
  });

  it('gives every component a distinct stable id', async () => {
    const r = await importSvg(FIXTURE);
    expect(new Set(r.components.map((c) => c.id)).size).toBe(9);
    const again = await importSvg(FIXTURE);
    expect(again.components.map((c) => c.id)).toEqual(r.components.map((c) => c.id));
  });

  it('hands back the original source untouched', async () => {
    const r = await importSvg(FIXTURE);
    expect(r.source).toBe(FIXTURE);
  });

  it('closes every ring implicitly — the final point is not the first repeated', async () => {
    const r = await importSvg(FIXTURE);
    for (const c of r.components) {
      for (const ring of c.rings) {
        const sameX = Math.abs(ring[0] - ring[ring.length - 2]) < 1e-9;
        const sameY = Math.abs(ring[1] - ring[ring.length - 1]) < 1e-9;
        expect(sameX && sameY).toBe(false);
      }
    }
  });

  it('flags a genuinely remote reference but not the xmlns declaration', async () => {
    const r = await importSvg(FIXTURE);
    expect(r.diagnostics.filter((d) => d.code === 'external-reference')).toEqual([]);
  });
});

describe('importSvg — shapes and structure', () => {
  it('converts the basic shapes to paths', async () => {
    const r = await importSvg(wrap(
      '<rect x="5" y="5" width="20" height="20"/><circle cx="60" cy="20" r="10"/>' +
      '<ellipse cx="20" cy="60" rx="12" ry="6"/><polygon points="50,50 80,50 65,80"/>',
    ));
    expect(r.components).toHaveLength(4);
    for (const c of r.components) expect(Math.abs(ringArea(c.rings[0]))).toBeGreaterThan(1);
  });

  it('applies nested group transforms', async () => {
    const r = await importSvg(wrap('<g transform="translate(50,0)"><g transform="scale(2)"><rect width="10" height="10"/></g></g>'));
    const b = componentBounds(r.components[0]);
    expect(b.minX).toBeCloseTo(50, 3);
    expect(b.maxX).toBeCloseTo(70, 3);
    expect(b.maxY).toBeCloseTo(20, 3);
  });

  it('keeps a compound path as one component with its hole', async () => {
    const r = await importSvg(wrap('<path d="M10,10 H90 V90 H10 Z M30,30 V70 H70 V30 Z" fill-rule="evenodd"/>'));
    expect(r.components).toHaveLength(1);
    expect(r.components[0].rings).toHaveLength(2);
    expect(r.components[0].fillRule).toBe('evenodd');
    expect(pointInComponent(r.components[0], 50, 50)).toBe(false); // the hole
    expect(pointInComponent(r.components[0], 20, 50)).toBe(true);  // the frame
  });

  it('defaults to the nonzero fill rule', async () => {
    const r = await importSvg(wrap('<path d="M10,10 H90 V90 H10 Z"/>'));
    expect(r.components[0].fillRule).toBe('nonzero');
  });

  it('normalizes a short hex fill', async () => {
    const r = await importSvg(wrap('<rect width="10" height="10" fill="#F36"/>'));
    expect(r.components[0].color).toBe('#ff3366');
  });

  it('drops a fill="none" path and says the stroke was not outlined', async () => {
    const r = await importSvg(wrap('<path d="M10,10 H90" fill="none" stroke="black" stroke-width="4"/>'));
    expect(r.components).toHaveLength(0);
    expect(codes(r)).toContain('stroke-not-outlined');
    expect(codes(r)).toContain('no-fillable-geometry');
  });
});

describe('importSvg — diagnostics', () => {
  it('reports live text instead of dropping it silently', async () => {
    const r = await importSvg(wrap('<text x="10" y="50">BrandingOS</text><rect width="10" height="10"/>'));
    expect(r.diagnostics).toContainEqual({ code: 'live-text', count: 1 });
    expect(r.components).toHaveLength(1);
  });

  it('reports an embedded raster', async () => {
    const r = await importSvg(wrap('<image href="data:image/png;base64,iVBOR" width="10" height="10"/><rect width="9" height="9"/>'));
    expect(r.diagnostics).toContainEqual({ code: 'raster-image', count: 1 });
  });

  it('reports masks, filters, patterns and clip paths by kind', async () => {
    const r = await importSvg(wrap(
      '<defs><mask id="m"/><filter id="f"/><pattern id="p"/><clipPath id="c"/></defs><rect width="10" height="10"/>',
    ));
    const kinds = r.diagnostics.filter((d) => d.code === 'unsupported-paint').map((d) => (d as { kind: string }).kind);
    expect(kinds.sort()).toEqual(['clip-path', 'filter', 'mask', 'pattern']);
  });

  it('reports an external reference and never fetches it', async () => {
    const r = await importSvg(wrap('<image href="https://example.com/x.png" width="10" height="10"/><rect width="10" height="10"/>'));
    const d = r.diagnostics.find((x) => x.code === 'external-reference') as { count: number; samples: string[] };
    expect(d.count).toBeGreaterThan(0);
    expect(d.samples[0]).toContain('https://example.com/x.png');
  });

  it('strips a script and says so', async () => {
    const r = await importSvg(wrap('<script>window.x=1</script><rect width="10" height="10"/>'));
    expect(r.diagnostics).toContainEqual({ code: 'script-removed', count: 1 });
    expect(r.components).toHaveLength(1);
  });

  it('strips event handlers and says so', async () => {
    const r = await importSvg(wrap('<rect width="10" height="10" onload="alert(1)" onclick="x()"/>'));
    expect(r.diagnostics).toContainEqual({ code: 'event-handler-removed', count: 2 });
    expect(r.components).toHaveLength(1);
  });

  it('skips a full-artboard background rectangle, and says it did', async () => {
    const r = await importSvg(wrap('<rect width="100" height="100" fill="#fff"/><circle cx="50" cy="50" r="20"/>'));
    expect(codes(r)).toContain('background-rect-skipped');
    expect(r.components).toHaveLength(1);
  });

  it('keeps the background rectangle when asked to', async () => {
    const r = await importSvg(wrap('<rect width="100" height="100" fill="#fff"/><circle cx="50" cy="50" r="20"/>'), {
      skipBackgroundRect: false,
    });
    expect(r.components).toHaveLength(2);
  });

  it('refuses a file past the complexity limit rather than hanging', async () => {
    const many = Array.from({ length: 200 }, (_, i) => `<circle cx="${i % 10}" cy="${i / 10}" r="4"/>`).join('');
    const r = await importSvg(wrap(many), { maxPoints: 500 });
    expect(codes(r)).toContain('too-complex');
    expect(r.components).toHaveLength(0);
  });

  it('fails gracefully on markup that is not SVG', async () => {
    const r = await importSvg('<html><body>nope</body></html>');
    expect(codes(r)).toContain('parse-failed');
    expect(r.components).toHaveLength(0);
  });

  it('fails gracefully on a truncated file', async () => {
    const r = await importSvg('<svg viewBox="0 0 10 10"><path d="M0,0 L');
    expect(r.components).toHaveLength(0);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });

  it('reports an SVG with nothing fillable in it', async () => {
    const r = await importSvg(wrap('<defs><rect width="10" height="10"/></defs>'));
    expect(codes(r)).toContain('no-fillable-geometry');
  });
});
