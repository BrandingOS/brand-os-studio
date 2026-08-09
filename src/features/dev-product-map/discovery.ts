/**
 * Route discovery — parses the REAL router source (App.tsx + logo-maker
 * routes.tsx) at runtime, so the Product Surface Explorer can cross-check its
 * metadata registry against actual route definitions and warn when either side
 * drifts. This is what keeps the tool from going stale.
 *
 * The parser is a small stack-based scanner over the raw JSX text:
 *  - `<Route …>` opens a nesting level (child paths compose under it),
 *    `<Route … />` is self-closing, `</Route>` pops.
 *  - Attribute regions are scanned brace-aware so `element={<X to="/y" />}`
 *    never terminates the tag early or leaks `path=`/`/>` matches.
 *  - `index` routes resolve to the parent path.
 */
import type { DiscoveredRoute } from './types';

/** Pure parser — exported for tests. */
export function parseRoutesFromSource(src: string, file: string): DiscoveredRoute[] {
  const out: DiscoveredRoute[] = [];
  const stack: string[] = [];
  let i = 0;

  const joinPath = (parent: string[], own: string | null): string => {
    const base = parent.length ? parent[parent.length - 1] : '';
    if (own === null) return base || '/'; // index route → parent path
    if (own.startsWith('/')) return own;  // absolute child
    const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${prefix}/${own}`;
  };

  while (i < src.length) {
    const close = src.indexOf('</Route>', i);
    const open = src.indexOf('<Route', i);

    if (open === -1 && close === -1) break;

    // Handle whichever comes first.
    if (close !== -1 && (open === -1 || close < open)) {
      stack.pop();
      i = close + '</Route>'.length;
      continue;
    }

    // `<Route` found — make sure it's the tag, not `<Routes`/`<RouteX`.
    const after = src[open + 6];
    if (after !== ' ' && after !== '\n' && after !== '\t' && after !== '>' && after !== '/') {
      i = open + 6;
      continue;
    }

    // Scan the attribute region brace-aware until `>` at brace depth 0.
    let j = open + 6;
    let braces = 0;
    let selfClosing = false;
    while (j < src.length) {
      const c = src[j];
      if (c === '{') braces++;
      else if (c === '}') braces--;
      else if (c === '>' && braces === 0) {
        // Self-closing iff the last non-space char before `>` is `/`.
        let k = j - 1;
        while (k > open && /\s/.test(src[k])) k--;
        selfClosing = src[k] === '/';
        break;
      }
      j++;
    }
    const attrs = src.slice(open + 6, j);

    // Extract path / index / element name from the attribute text.
    const pathMatch = attrs.match(/\bpath\s*=\s*"([^"]+)"/);
    const isIndex = !pathMatch && /(^|\s)index(\s|=|$)/.test(attrs.replace(/\{[\s\S]*?\}/g, ' '));
    const elementMatch = attrs.match(/element\s*=\s*\{\s*(?:\(\s*)?<\s*([A-Za-z0-9_.]+)/);
    const element = elementMatch ? elementMatch[1] : null;

    if (pathMatch || isIndex) {
      const own = pathMatch ? pathMatch[1] : null;
      const full = joinPath(stack, own);
      out.push({
        path: normalizeRoute(full),
        element,
        looksLikeRedirect: Boolean(element && /Redirect|Navigate|Fallback/i.test(element)),
        file,
      });
      if (!selfClosing && pathMatch) stack.push(normalizeRoute(full));
      else if (!selfClosing) stack.push(stack[stack.length - 1] ?? '/');
    } else if (!selfClosing) {
      // pathless layout route — children compose under the current parent
      stack.push(stack[stack.length - 1] ?? '');
    }

    i = j + 1;
  }

  return out;
}

export function normalizeRoute(p: string): string {
  if (!p) return '/';
  let out = p.replace(/\/{2,}/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

/** Load + parse the real router sources (Vite raw imports; dev tool only). */
const ROUTER_SOURCES = import.meta.glob(
  ['/src/App.tsx', '/src/features/logo-maker/flow/routes.tsx'],
  { query: '?raw', import: 'default' },
);

export async function discoverRoutes(): Promise<DiscoveredRoute[]> {
  const all: DiscoveredRoute[] = [];
  for (const [file, load] of Object.entries(ROUTER_SOURCES)) {
    try {
      const src = (await load()) as string;
      all.push(...parseRoutesFromSource(src, file.replace(/^\//, '')));
    } catch {
      /* a missing source just yields fewer discovered routes */
    }
  }
  return all;
}
