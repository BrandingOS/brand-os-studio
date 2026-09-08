/**
 * Architectural boundaries, enforced rather than documented.
 *
 * Every rule here is one the PRD or the Tools platform states, and every one is
 * the kind that decays silently: an `import` added in a hurry does not fail a
 * type check, does not fail a render test, and shows up months later as three
 * megabytes on an unrelated route or as an engine that can no longer run in a
 * Worker.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src/features/tools/3d-logo-studio';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === '__fixtures__') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(ROOT);
const read = (f: string) => readFileSync(f, 'utf8');

/**
 * Source with comments and string bodies removed.
 *
 * Scanning raw text for `document` matched the *word* in every doc comment on
 * `Studio3dDocument`, which is a module that could not be more DOM-free. A
 * boundary test that cries wolf gets deleted, so it reads code only.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** Comments *and* string bodies gone — for scanning identifiers, where a
 *  specifier inside quotes is not a use of the DOM either. */
function code(source: string): string {
  return stripComments(source)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/**
 * Static *value* import specifiers.
 *
 * `import type` is excluded deliberately: it is erased at build time, so it
 * pulls nothing into a chunk and cannot break a lazy boundary. Counting it
 * flagged the editor for importing `ImportResult` — a type — from the module it
 * is careful to load dynamically.
 */
function staticImports(source: string): string[] {
  const out: string[] = [];
  const re = /^\s*import\s+(?!type\s)[^;]*?from\s+['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(m[1]);
  const bare = /^\s*import\s+['"]([^'"]+)['"]/gm;
  while ((m = bare.exec(source))) out.push(m[1]);
  // `export … from` is an import too, and it is the one a barrel file is made
  // of. Missing it let index.ts look like it reached nothing at all, so the
  // lazy-boundary check below passed while 588 KB of Three.js sat in the page
  // chunk — pulled in by the properties panel reading its lighting presets from
  // the module that owns the WebGL scene.
  const reExport = /^\s*export\s+(?!type\s)[^;]*?from\s+['"]([^'"]+)['"]/gm;
  while ((m = reExport.exec(source))) out.push(m[1]);
  return out;
}

function dynamicImports(source: string): string[] {
  const out: string[] = [];
  const re = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push(m[1]);
  return out;
}

describe('the feature exists in the shape the PRD specifies', () => {
  it('found source files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('uses the proposed subfolders', () => {
    const dirs = new Set(files.map((f) => relative(ROOT, f).split('/')[0]));
    for (const expected of ['engine', 'render', 'materials', 'export', 'components']) {
      expect(dirs.has(expected), `${expected}/ is missing`).toBe(true);
    }
  });
});

describe('the engine is pure TypeScript', () => {
  const engineFiles = files.filter((f) => f.includes(`${ROOT}/engine/`));

  it('has engine files to check', () => {
    expect(engineFiles.length).toBeGreaterThan(5);
  });

  it.each([['react'], ['react-dom'], ['zustand'], ['three']])(
    'never imports %s',
    (pkg) => {
      for (const f of engineFiles) {
        const imports = [...staticImports(read(f)), ...dynamicImports(stripComments(read(f)))];
        const offending = imports.filter((i) => i === pkg || i.startsWith(`${pkg}/`));
        expect(offending, `${f} imports ${pkg}`).toEqual([]);
      }
    },
  );

  it('never touches the DOM', () => {
    // `document`, `window` and `DOMParser` are what make a module unusable in a
    // Worker and untestable in Node — which is exactly why SVG parsing lives in
    // render/ instead.
    for (const f of engineFiles) {
      const hits = code(read(f)).match(/\b(document|window|DOMParser|HTMLCanvasElement|navigator)\b/g) ?? [];
      expect(hits, `${f} reaches the DOM`).toEqual([]);
    }
  });

  it('imports nothing from outside the feature except its own modules', () => {
    for (const f of engineFiles) {
      for (const spec of staticImports(read(f))) {
        if (spec.startsWith('.')) continue;
        // Only leaf, dependency-free geometry libraries are allowed through.
        expect(['delaunator', 'earcut'], `${f} imports ${spec}`).toContain(spec);
      }
    }
  });
});

describe('frozen and legacy layers are left alone', () => {
  it('never imports the frozen export pipeline or EditorWorkspace', () => {
    for (const f of files) {
      const source = read(f);
      expect(source).not.toMatch(/shared\/services\/export\/vectorize/);
      expect(source).not.toMatch(/EditorWorkspace/);
    }
  });

  it('never imports the frozen shadcn UI kit', () => {
    for (const f of files) {
      for (const spec of staticImports(read(f))) {
        expect(spec.startsWith('@/components/ui/'), `${f} imports ${spec}`).toBe(false);
        expect(spec.startsWith('@/shared/design-system/'), `${f} imports ${spec}`).toBe(false);
      }
    }
  });

  it('never imports the frozen shared wrappers', () => {
    const frozen = /@\/shared\/(ui|components)\/(Button|Card|Input|Badge|Section|Container)$/;
    for (const f of files) {
      for (const spec of staticImports(read(f))) {
        expect(frozen.test(spec), `${f} imports ${spec}`).toBe(false);
      }
    }
  });
});

describe('the heavy renderer stays behind a lazy boundary', () => {
  const eager = (start: string): Set<string> => {
    // Follow static imports only. Anything reachable this way is in the same
    // chunk as the entry point.
    const seen = new Set<string>();
    const queue = [start];
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const spec of staticImports(read(file))) {
        if (!spec.startsWith('.')) continue;
        for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
          const candidate = join(file, '..', spec + ext);
          try {
            statSync(candidate);
            queue.push(candidate);
            break;
          } catch { /* try the next extension */ }
        }
      }
    }
    return seen;
  };

  it('the walker actually leaves the barrel file', () => {
    // Guards the guard: if `eager` stops at index.ts, every assertion below
    // passes vacuously. That is exactly how the first version of this file
    // missed Three.js in the page chunk.
    const reachable = eager(`${ROOT}/index.ts`);
    expect(reachable.size).toBeGreaterThan(6);
    expect([...reachable].some((f) => f.includes('Studio3dEditor'))).toBe(true);
    expect([...reachable].some((f) => f.includes('PropertiesPanel'))).toBe(true);
  });

  it('the public entry point does not statically reach three', () => {
    const reachable = eager(`${ROOT}/index.ts`);
    for (const f of reachable) {
      for (const spec of staticImports(read(f))) {
        expect(spec === 'three' || spec.startsWith('three/'), `${f} statically imports ${spec}`).toBe(false);
      }
    }
  });

  it('the public entry point does not statically reach render/ or export/', () => {
    // `materials/` is deliberately *not* on this list. The properties panel has
    // to list the material and lighting presets before anything is rendered,
    // and they are plain data — a few kilobytes, no Three.js. What must stay
    // behind the lazy boundary is the code that draws.
    const reachable = [...eager(`${ROOT}/index.ts`)].map((f) => relative(ROOT, f));
    for (const f of reachable) {
      expect(f.startsWith('render/'), `${f} is eagerly reachable`).toBe(false);
      expect(f.startsWith('export/'), `${f} is eagerly reachable`).toBe(false);
    }
  });

  it('the material and lighting data carry no renderer with them', () => {
    for (const f of files.filter((x) => x.includes(`${ROOT}/materials/`))) {
      for (const spec of staticImports(read(f))) {
        expect(spec === 'three' || spec.startsWith('three/'), `${f} imports ${spec}`).toBe(false);
        expect(spec.includes('/render/'), `${f} imports ${spec}`).toBe(false);
      }
    }
  });

  it('the editor reaches the viewport and the importer only dynamically', () => {
    const source = read(`${ROOT}/components/Studio3dEditor.tsx`);
    expect(dynamicImports(stripComments(source))).toEqual(expect.arrayContaining(['./Viewport', '../render/svgImport']));
    expect(staticImports(source)).not.toContain('./Viewport');
    expect(staticImports(source)).not.toContain('../render/svgImport');
  });
});

describe('styling follows the design system', () => {
  const css = read(`${ROOT}/studio3d.css`);

  it('the stylesheet has no bare colour values', () => {
    // Every colour must be a --ds-* token so a theme switch reaches this page.
    const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hex).toEqual([]);
    const fn = css.match(/\b(rgb|rgba|hsl|hsla)\(/g) ?? [];
    expect(fn).toEqual([]);
  });

  it('scopes its rules to the workspace', () => {
    const selectors = css.match(/^\s*\.l3d-[a-z-]+/gm) ?? [];
    expect(selectors, 'a rule is missing its [data-workspace] scope').toEqual([]);
  });

  it('the components use DS primitives rather than raw controls', () => {
    for (const f of files.filter((x) => x.includes(`${ROOT}/components/`))) {
      const source = read(f);
      // A bare <button>/<select> means a DS primitive was bypassed. <input
      // type=file> is allowed: it is hidden, and the DS has no file picker.
      expect(source, `${f} uses a raw <button>`).not.toMatch(/<button[\s>]/);
      expect(source, `${f} uses a raw <select>`).not.toMatch(/<select[\s>]/);
    }
  });
});
