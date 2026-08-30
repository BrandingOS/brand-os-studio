/**
 * The developer handoff, read back.
 *
 * Every builder here is a pure string/Blob producer, so every assertion
 * PARSES what it produced rather than matching a substring: the JSON
 * forms are `JSON.parse`d, the ASE is decoded byte for byte, and the
 * shade ladders are checked against the brand hex they were drawn from.
 * A token file that "contains #7231FF somewhere" is not a token file a
 * build can consume.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAseBlob,
  buildColorsReadme,
  buildCssVariables,
  buildDesignTokensJson,
  buildFigmaTokensJson,
  buildScssVariables,
  buildSwatchSvg,
  buildTailwindConfig,
  buildTokenFiles,
  tokenNames,
} from './tokensExport';
import { buildShadeRows, normalizeHex, type PaletteColor } from './colorPaletteExport';
import { NEUTRAL_RAMP } from '@/features/setup/data/neutralRamp';

const RAQM: PaletteColor[] = [
  { hex: '#7231FF', name: 'Iris', role: 'Primary' },
  { hex: '#00D4AA', name: 'Turquoise', role: 'Secondary' },
  { hex: '#FAFAFA', name: 'White', role: 'Background' },
  { hex: '#F59E0B', name: 'Orange', role: 'Accent' },
];

/** jsdom's Blob has no `arrayBuffer()`, so read the bytes the long way. */
async function bytesOf(blob: Blob): Promise<DataView> {
  const buf = await new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
  return new DataView(buf);
}

describe('tokenNames', () => {
  it('slugs each name and never emits the same token twice', () => {
    const names = tokenNames([
      { hex: '#111111', name: 'Rose', role: 'Primary' },
      { hex: '#222222', name: 'Rose', role: 'Accent' },
      { hex: '#333333', name: 'Deep Sea Blue', role: 'Accent' },
    ]);
    expect(names).toEqual(['rose', 'rose-2', 'deep-sea-blue']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('falls back to a usable token when a name has no word characters', () => {
    expect(tokenNames([{ hex: '#000000', name: '···', role: 'Neutral' }])).toEqual(['color']);
  });
});

describe('buildCssVariables', () => {
  const css = buildCssVariables(RAQM, 'Raqm');

  it('declares every colour and every rung of its ladder inside :root', () => {
    expect(css.startsWith('/* Raqm')).toBe(true);
    expect(css).toContain(':root {');
    expect(css.trimEnd().endsWith('}')).toBe(true);
    for (const c of RAQM) {
      const token = tokenNames(RAQM)[RAQM.indexOf(c)];
      expect(css).toContain(`--brand-${token}: ${normalizeHex(c.hex)};`);
      for (const row of buildShadeRows(c.hex, c.name)) {
        expect(css).toContain(`--brand-${token}-${row.step}: ${normalizeHex(row.hex)};`);
      }
    }
  });

  it('emits a role alias per role, owned by the first colour holding it', () => {
    expect(css).toContain('--brand-primary: var(--brand-iris);');
    expect(css).toContain('--brand-secondary: var(--brand-turquoise);');
    expect(css).toContain('--brand-background: var(--brand-white);');
    expect(css).toContain('--brand-accent: var(--brand-orange);');
    // One alias per role, never two.
    expect(css.match(/--brand-accent:/g)).toHaveLength(1);
  });

  it('is balanced and declares nothing outside the block', () => {
    expect((css.match(/{/g) ?? []).length).toBe(1);
    expect((css.match(/}/g) ?? []).length).toBe(1);
    const decls = css
      .split('\n')
      .filter((l) => l.trim().startsWith('--'))
      .map((l) => l.trim());
    expect(decls.length).toBeGreaterThan(RAQM.length * 10);
    for (const d of decls) expect(d.endsWith(';')).toBe(true);
  });
});

describe('buildScssVariables', () => {
  const scss = buildScssVariables(RAQM, 'Raqm');

  it('declares a variable per colour and per rung', () => {
    expect(scss).toContain('$brand-iris: #7231FF;');
    expect(scss).toContain('$brand-turquoise: #00D4AA;');
    for (const row of buildShadeRows('#7231FF', 'Iris')) {
      expect(scss).toContain(`$brand-iris-${row.step}: ${normalizeHex(row.hex)};`);
    }
  });

  it('closes the $brand-colors map over exactly the palette', () => {
    const map = scss.slice(scss.indexOf('$brand-colors: ('));
    expect(map.trimEnd().endsWith(');')).toBe(true);
    for (const token of tokenNames(RAQM)) {
      expect(map).toContain(`"${token}": $brand-${token},`);
    }
    expect(map.match(/": \$brand-/g)).toHaveLength(RAQM.length);
  });
});

describe('buildTailwindConfig', () => {
  const js = buildTailwindConfig(RAQM, 'Raqm');

  it('is a module.exports snippet with balanced braces', () => {
    expect(js).toContain('module.exports = {');
    expect((js.match(/{/g) ?? []).length).toBe((js.match(/}/g) ?? []).length);
    expect(js.trimEnd().endsWith('};')).toBe(true);
  });

  it('gives every colour a DEFAULT equal to the brand hex plus its ladder', () => {
    for (const c of RAQM) {
      const token = tokenNames(RAQM)[RAQM.indexOf(c)];
      expect(js).toContain(`'${token}': {`);
      expect(js).toContain(`DEFAULT: '${normalizeHex(c.hex)}',`);
      const rows = buildShadeRows(c.hex, c.name);
      for (const row of rows) expect(js).toContain(`${row.step}: '${normalizeHex(row.hex)}',`);
    }
  });
});

describe('buildDesignTokensJson — W3C DTCG', () => {
  const parsed = JSON.parse(buildDesignTokensJson(RAQM, 'Raqm')) as Record<string, any>;

  it('parses, names the brand, and groups every colour under `color`', () => {
    expect(parsed.$description).toContain('Raqm');
    expect(Object.keys(parsed.color)).toEqual(tokenNames(RAQM));
  });

  it('types every value as a colour and carries the brand hex at the group root', () => {
    for (const c of RAQM) {
      const node = parsed.color[tokenNames(RAQM)[RAQM.indexOf(c)]];
      expect(node.$type).toBe('color');
      expect(node.$value).toBe(normalizeHex(c.hex));
      expect(node.$description).toBe(`${c.name} — ${c.role}`);
      for (const row of buildShadeRows(c.hex, c.name)) {
        expect(node[String(row.step)]).toMatchObject({
          $type: 'color',
          $value: normalizeHex(row.hex),
        });
      }
    }
  });

  it('marks exactly one rung per colour as the brand colour itself', () => {
    for (const c of RAQM) {
      const node = parsed.color[tokenNames(RAQM)[RAQM.indexOf(c)]];
      const described = Object.keys(node).filter(
        (k) => /^\d+$/.test(k) && node[k].$description,
      );
      expect(described).toHaveLength(1);
      expect(node[described[0]].$value).toBe(normalizeHex(c.hex));
    }
  });
});

describe('buildFigmaTokensJson — Tokens Studio', () => {
  const parsed = JSON.parse(buildFigmaTokensJson(RAQM, 'Raqm')) as Record<string, any>;

  it('parses into the global/brand shape Tokens Studio imports', () => {
    expect(Object.keys(parsed).sort()).toEqual(['$metadata', '$themes', 'global']);
    expect(parsed.$themes).toEqual([]);
    expect(parsed.$metadata.source).toContain('Raqm');
    expect(Object.keys(parsed.global.brand)).toEqual(tokenNames(RAQM));
  });

  it('gives every node a value + type and nests the ladder under it', () => {
    const iris = parsed.global.brand.iris;
    expect(iris).toMatchObject({ value: '#7231FF', type: 'color' });
    for (const row of buildShadeRows('#7231FF', 'Iris')) {
      expect(iris[String(row.step)]).toEqual({ value: normalizeHex(row.hex), type: 'color' });
    }
  });
});

describe('buildAseBlob — the bytes Illustrator reads', () => {
  it('returns null for an empty palette', () => {
    expect(buildAseBlob([])).toBeNull();
  });

  it('round-trips: signature, version, block count, and every name + RGB', async () => {
    const blob = buildAseBlob(RAQM)!;
    expect(blob).toBeTruthy();
    const view = await bytesOf(blob);
    let o = 0;
    const sig = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    expect(sig).toBe('ASEF');
    o = 4;
    expect(view.getUint16(o, false)).toBe(1); // major
    expect(view.getUint16(o + 2, false)).toBe(0); // minor
    o += 4;
    expect(view.getUint32(o, false)).toBe(RAQM.length);
    o += 4;

    for (const expected of RAQM) {
      expect(view.getUint16(o, false)).toBe(0x0001); // colour block
      o += 2;
      const len = view.getUint32(o, false);
      o += 4;
      const blockStart = o;
      const nameLen = view.getUint16(o, false);
      o += 2;
      // The terminating NUL is COUNTED — the detail Illustrator refuses
      // the file over.
      expect(nameLen).toBe(expected.name.length + 1);
      let name = '';
      for (let i = 0; i < nameLen - 1; i += 1) {
        name += String.fromCharCode(view.getUint16(o, false));
        o += 2;
      }
      expect(name).toBe(expected.name);
      expect(view.getUint16(o, false)).toBe(0); // NUL terminator
      o += 2;
      const model = String.fromCharCode(
        view.getUint8(o),
        view.getUint8(o + 1),
        view.getUint8(o + 2),
        view.getUint8(o + 3),
      );
      expect(model).toBe('RGB ');
      o += 4;
      const channels = [0, 1, 2].map((i) => view.getFloat32(o + i * 4, false));
      o += 12;
      const hex = `#${channels
        .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}`;
      expect(hex).toBe(normalizeHex(expected.hex));
      expect(view.getUint16(o, false)).toBe(2); // normal colour
      o += 2;
      expect(o - blockStart).toBe(len);
    }
    expect(o).toBe(view.byteLength);
  });

  it('writes a name for a colour whose own name is empty', async () => {
    const blob = buildAseBlob([{ hex: '#7231FF', name: '', role: 'Primary' }])!;
    const view = await bytesOf(blob);
    const nameLen = view.getUint16(18, false);
    expect(nameLen).toBeGreaterThan(1);
  });
});

describe('shade ladders', () => {
  const CASES = [
    ...RAQM,
    { hex: '#EF4444', name: 'Rose', role: 'Primary' },
    { hex: '#000000', name: 'Black', role: 'Neutral' },
    { hex: '#FFFFFF', name: 'White', role: 'Background' },
  ];

  it('carries the brand hex on exactly one rung, VERBATIM', () => {
    for (const c of CASES) {
      const rows = buildShadeRows(c.hex, c.name);
      const base = rows.filter((r) => r.isBase);
      expect(base).toHaveLength(1);
      // Not "close to" — the same colour. Raqm's Iris came back #7A3DFF
      // before this rule (D39).
      expect(base[0].hex).toBe(normalizeHex(c.hex));
      expect(rows.map((r) => r.step)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
    }
  });

  it('never names a rung after a neutral — every name carries its step', () => {
    const neutralNames = new Set(NEUTRAL_RAMP.map((n) => n.name));
    // The dictionary really does hold the words that used to collide.
    expect(neutralNames.has('Jet')).toBe(true);
    expect(neutralNames.has('Pearl')).toBe(true);
    for (const c of CASES) {
      for (const row of buildShadeRows(c.hex, c.name)) {
        expect(neutralNames.has(row.name)).toBe(false);
        expect(row.name).toBe(`${c.name} ${row.step}`);
      }
    }
  });

  it('names a rung even when the caller passes no name', () => {
    for (const row of buildShadeRows('#7231FF')) {
      expect(row.name.trim()).not.toBe('');
      expect(row.name.endsWith(String(row.step))) .toBe(true);
    }
  });
});

describe('buildTokenFiles + README', () => {
  it('emits the five text forms under stable paths', () => {
    expect(buildTokenFiles(RAQM, 'Raqm').map((f) => f.path)).toEqual([
      'tokens.css',
      'tokens.scss',
      'tailwind.colors.js',
      'tokens.json',
      'figma.tokens.json',
    ]);
    for (const f of buildTokenFiles(RAQM, 'Raqm')) expect(f.text.length).toBeGreaterThan(0);
  });

  it('the README tabulates every colour and says the greys are not in the bundle', () => {
    const md = buildColorsReadme(RAQM, 'Raqm');
    expect(md).toContain('# Raqm — colour');
    expect(md).toContain('grey ladder is NOT part of this bundle');
    for (const c of RAQM) {
      expect(md).toContain(`| ${c.name} | ${c.role} | \`${normalizeHex(c.hex)}\` |`);
    }
    // One header row, one divider, one row per colour.
    expect(md.split('\n').filter((l) => l.startsWith('| ')).length).toBe(RAQM.length + 2);
    expect(md).toContain('Suggested usage split:');
    expect(buildColorsReadme(RAQM, 'Raqm', 'full')).toContain('FULL bundle');
  });
});

describe('buildSwatchSvg', () => {
  it('is well-formed SVG carrying the colour, its specs and its ratios', () => {
    const svg = buildSwatchSvg(RAQM[0]);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 800 800');
    expect(doc.querySelector('rect')?.getAttribute('fill')).toBe('#7231FF');
    const text = Array.from(doc.querySelectorAll('text')).map((t) => t.textContent);
    expect(text).toContain('PRIMARY');
    expect(text).toContain('Iris');
    expect(text).toContain('#7231FF');
    expect(text.join(' ')).toMatch(/on white \d+\.\d\d:1/);
  });

  it('escapes a name that would otherwise break the markup', () => {
    const svg = buildSwatchSvg({ hex: '#000000', name: 'A & <B>', role: 'Accent' });
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(Array.from(doc.querySelectorAll('text')).map((t) => t.textContent)).toContain('A & <B>');
  });
});

/* ─── Read back by a real reader ───────────────────────────────────── */

/**
 * The three text formats above are asserted by substring, which proves
 * the bytes are present and nothing about whether a build can consume
 * them. These read them back the way their consumer does:
 *
 *  • the CSS through **postcss**, the parser the app's own pipeline uses;
 *  • the Tailwind snippet by **evaluating it as a CommonJS module**, which
 *    is exactly what `tailwind.config.js` does with it;
 *  • the SCSS by resolving `$brand-colors` against the variables the file
 *    itself declares — a map pointing at an undeclared variable is a
 *    compile error, and a substring match cannot see one.
 */
describe('the token files, parsed back', () => {
  const names = tokenNames(RAQM);

  it('postcss parses the CSS into one :root block whose every value is a colour', async () => {
    const { default: postcss } = await import('postcss');
    const root = postcss.parse(buildCssVariables(RAQM, 'Raqm'));
    const rules = root.nodes.filter((n) => n.type === 'rule');
    expect(rules).toHaveLength(1);
    const rule = rules[0] as import('postcss').Rule;
    expect(rule.selector).toBe(':root');

    const decls = new Map<string, string>();
    rule.walkDecls((d) => {
      decls.set(d.prop, d.value);
    });
    // Every declaration is a custom property — nothing leaks into the
    // consumer's own cascade.
    for (const prop of decls.keys()) expect(prop.startsWith('--brand-')).toBe(true);

    for (const [i, c] of RAQM.entries()) {
      expect(decls.get(`--brand-${names[i]}`)).toBe(normalizeHex(c.hex));
      expect(decls.get(`--brand-${names[i]}-rgb`)).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/);
      for (const row of buildShadeRows(c.hex, c.name)) {
        expect(decls.get(`--brand-${names[i]}-${row.step}`)).toBe(normalizeHex(row.hex));
      }
    }

    // Every alias RESOLVES: it points at a property this same file declares,
    // and that property holds the colour the alias claims.
    const aliases = [...decls].filter(([, v]) => v.startsWith('var('));
    expect(aliases.length).toBeGreaterThan(0);
    for (const [prop, value] of aliases) {
      const target = /^var\((--[a-z0-9-]+)\)$/.exec(value)?.[1];
      expect(target).toBeTruthy();
      expect(decls.has(target!)).toBe(true);
      expect(decls.get(target!)).toMatch(/^#[0-9A-F]{6}$/);
      const role = prop.replace('--brand-', '');
      const owner = RAQM.find((c) => slugifyRole(c.role) === role);
      expect(owner).toBeTruthy();
      expect(decls.get(target!)).toBe(normalizeHex(owner!.hex));
    }
  });

  it('the Tailwind snippet evaluates to a real theme.extend.colors object', () => {
    const mod: { exports: Record<string, any> } = { exports: {} };
    new Function('module', 'exports', buildTailwindConfig(RAQM, 'Raqm'))(mod, mod.exports);
    const colors = mod.exports.theme.extend.colors as Record<string, Record<string, string>>;
    expect(Object.keys(colors)).toEqual(names);
    for (const [i, c] of RAQM.entries()) {
      const entry = colors[names[i]];
      expect(entry.DEFAULT).toBe(normalizeHex(c.hex));
      const rows = buildShadeRows(c.hex, c.name);
      expect(Object.keys(entry).filter((k) => k !== 'DEFAULT')).toEqual(
        rows.map((r) => String(r.step)),
      );
      for (const row of rows) expect(entry[String(row.step)]).toBe(normalizeHex(row.hex));
      // The rung that IS the brand colour agrees with DEFAULT — a
      // Tailwind user reaching for `bg-iris-500` and `bg-iris` must not
      // get two different violets.
      const base = rows.find((r) => r.isBase)!;
      expect(entry[String(base.step)]).toBe(entry.DEFAULT);
    }
  });

  it('every $brand-colors entry resolves to a variable the SCSS declares', () => {
    const scss = buildScssVariables(RAQM, 'Raqm');
    const body = scss
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    const declared = new Map<string, string>();
    for (const m of body.matchAll(/^\$([a-z0-9-]+):\s*([^;]+);$/gm)) {
      declared.set(m[1], m[2].trim());
    }
    for (const [i, c] of RAQM.entries()) {
      expect(declared.get(`brand-${names[i]}`)).toBe(normalizeHex(c.hex));
    }

    const map = /\$brand-colors:\s*\(([\s\S]*?)\);/.exec(body)?.[1];
    expect(map).toBeTruthy();
    const pairs = [...map!.matchAll(/"([^"]+)":\s*\$([a-z0-9-]+),/g)].map((m) => [m[1], m[2]]);
    expect(pairs.map(([k]) => k)).toEqual(names);
    for (const [key, ref] of pairs) {
      // The reference must exist — an unresolved `$brand-x` is a sass
      // compile error, not a cosmetic one.
      expect(declared.has(ref)).toBe(true);
      const owner = RAQM[names.indexOf(key)];
      expect(declared.get(ref)).toBe(normalizeHex(owner.hex));
    }
  });
});

/** The same slug the builder gives a role, for the alias assertions. */
function slugifyRole(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
