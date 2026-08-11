/**
 * Human page names, derived — never declared.
 *
 * A URL segment is the best name when it exists (`/b/:slug/setup` → "Setup").
 * When the final segment is dynamic (`:designSlug`) or a splat (`*`) it carries
 * no meaning, so the component name is the better source
 * (`BrandDesignEditorPage` → "Brand Design Editor").
 *
 * Browser-safe and pure. Unit-tested in `__tests__/naming.test.ts`.
 */

/**
 * Tokens that are wrong when title-cased word-by-word. Extend this when a new
 * initialism shows up in a URL — it is the only naming knob, and getting it
 * wrong is cosmetic (never breaks a lookup, since search matches the raw path
 * and file too).
 */
const ACRONYMS: Record<string, string> = {
  ui: 'UI',
  ai: 'AI',
  ds: 'DS',
  api: 'API',
  svg: 'SVG',
  dam: 'DAM',
  qa: 'QA',
  seo: 'SEO',
  crm: 'CRM',
  pdf: 'PDF',
};

/** Version-ish tokens keep their lowercase `v` (`v2`, not `V2`). */
const isVersionToken = (t: string) => /^v\d+$/i.test(t);

function titleToken(token: string): string {
  const lower = token.toLowerCase();
  if (ACRONYMS[lower]) return ACRONYMS[lower];
  if (isVersionToken(token)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** `brand-kit` → `Brand Kit`; `ui-color-system` → `UI Color System`. */
export function humanizeSegment(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map(titleToken)
    .join(' ');
}

/** `BrandDesignEditorPage` → `Brand Design Editor`. */
export function humanizeComponent(component: string): string {
  const words = component
    // Split camel/Pascal case, keeping runs of capitals together (`UIColor` →
    // `UI Color`) so acronyms in component names survive.
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    // `Page` is noise on every page component; `Screen` likewise in flows.
    .filter((w) => w !== 'Page' && w !== 'Screen');

  return words
    .map((w) => (isVersionToken(w) ? w.toLowerCase() : w))
    .join(' ');
}

const isDynamic = (segment: string) => segment.startsWith(':') || segment === '*';

/**
 * Router primitives that say nothing about the destination — naming a route
 * "Navigate" is strictly worse than naming it after its URL.
 */
const UNINFORMATIVE_COMPONENTS = new Set(['Navigate', 'Outlet']);

/** Path segments with the leading slash removed; `/` → `[]`. */
export function segmentsOf(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/**
 * Best-effort human name for a route. Deterministic: same inputs always give
 * the same name, so the UI never reorders between requests.
 *
 * `isIndex` matters because an index route's path is its PARENT's path — the
 * last segment names the parent, not this screen. `/logo-maker` (index) is the
 * mode-select screen, so the component is the honest name there.
 */
export function deriveName(
  path: string,
  component: string | null,
  options: { isIndex?: boolean } = {},
): string {
  const segments = segmentsOf(path);
  const useful = component && !UNINFORMATIVE_COMPONENTS.has(component) ? component : null;

  if (options.isIndex && useful) return humanizeComponent(useful);

  if (segments.length === 0) return 'Home';

  const last = segments[segments.length - 1];

  // A dynamic tail names nothing — lean on the component instead.
  if (isDynamic(last)) {
    if (useful) return humanizeComponent(useful);
    const lastStatic = [...segments].reverse().find((s) => !isDynamic(s));
    return lastStatic ? humanizeSegment(lastStatic) : 'Root';
  }

  return humanizeSegment(last);
}

/**
 * Disambiguates names that collide within a group by prefixing the nearest
 * distinguishing static ancestor segment (`Setup` → `Brand Kit · Setup`). Keeps
 * search results unambiguous without hand-written labels.
 *
 * Mutates nothing; returns the name to use for `route`.
 */
export function disambiguate(
  name: string,
  path: string,
  collidingPaths: string[],
): string {
  if (collidingPaths.length < 2) return name;

  const own = segmentsOf(path);
  // Walk up from the tail looking for a static segment that the other colliding
  // routes don't share at the same depth.
  for (let depth = own.length - 2; depth >= 0; depth -= 1) {
    const segment = own[depth];
    if (isDynamic(segment)) continue;
    const sharedByAll = collidingPaths
      .filter((p) => p !== path)
      .every((p) => segmentsOf(p)[depth] === segment);
    if (!sharedByAll) return `${humanizeSegment(segment)} · ${name}`;
  }

  // Fully ambiguous by path (e.g. `/login` + `/signup` on one component) —
  // the URL itself is the differentiator and the UI always shows it.
  return name;
}
