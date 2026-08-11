/**
 * Code Navigator / Architecture Explorer — data contract (dev-only tool at
 * /__architecture).
 *
 * Every field here is DERIVED from the real codebase by
 * `generator/buildMap.node.ts`. There is no hand-maintained list: adding,
 * renaming, moving or deleting a route changes this data on the next request
 * with no documentation step. (Contrast `features/dev-product-map/`, which is
 * a deliberately human-curated product review map — different job.)
 *
 * This module is browser-safe (types + pure helpers only, no node imports).
 */

/** What kind of thing a route mounts. Derived, never declared. */
export type RouteKind =
  /** Renders a real page component. */
  | 'page'
  /** Mounts a layout/shell whose children are the real pages. */
  | 'layout'
  /** Forwards elsewhere — a `<Navigate>` or a *Redirect/*Fallback component. */
  | 'redirect'
  /** `<Route index>` — resolves to the parent path. */
  | 'index'
  /** Splat (`/x/*`) or the global `*` not-found route. */
  | 'catch-all';

/** Coarse product area, assigned by deterministic URL rules (`groups.ts`). */
export type RouteGroup =
  | 'Authentication'
  | 'Onboarding'
  | 'Dashboard'
  | 'Brand Workspace (Studio)'
  | 'Brand Workspace (Classic)'
  | 'Editors'
  | 'Tools'
  | 'Settings'
  | 'Admin'
  | 'Public'
  | 'Development'
  | 'Other';

/**
 * Bucket for one of a page's first-party imports, so "what does this page
 * depend on?" is answerable at a glance without opening the file.
 */
export type ImportKind =
  | 'ds'
  | 'shared'
  | 'feature'
  | 'page'
  | 'store'
  | 'service'
  | 'domain'
  | 'component'
  | 'external';

export interface ImportRef {
  /** The specifier exactly as written, e.g. `@/shared/ds`. */
  specifier: string;
  /** Repo-relative resolved file, or null when it's a package / unresolvable. */
  file: string | null;
  kind: ImportKind;
  /** Named/default bindings pulled from this module. */
  names: string[];
}

/**
 * Extension slot for the deeper analysis layers (hooks, stores, services, API
 * calls, Supabase tables, reverse dependencies, impact analysis).
 *
 * Deliberately NOT populated beyond `imports` today — each future scanner adds
 * its own optional field here and its own module under `generator/scanners/`,
 * so no consumer has to change shape when one lands. Read
 * `docs/dev-architecture/README.md` before adding one.
 */
export interface NodeAnalysis {
  /** Level-1 (direct) imports of `sourceFile`. Not transitive. */
  imports?: ImportRef[];
}

/** One routable URL in the application. */
export interface RouteNode {
  /**
   * Stable identity for selection + deep-linking (`?r=<id>`). Derived from the
   * composed path plus component, so it survives reordering of App.tsx but
   * intentionally changes when the route itself changes.
   */
  id: string;
  /** Composed path as React Router sees it, e.g. `/b/:slug/setup`. */
  path: string;
  /** Human page name, derived from the path (falling back to the component). */
  name: string;
  /** Page/redirect component name, e.g. `BrandSetupPageV2`. */
  component: string | null;
  /** Repo-relative file that defines `component`, e.g. `src/pages/b/[slug]/setup.tsx`. */
  sourceFile: string | null;
  /** Repo-relative file containing the `<Route>` definition. */
  routeFile: string;
  /** 1-indexed line of the `<Route>` element inside `routeFile`. */
  routeLine: number;
  kind: RouteKind;
  group: RouteGroup;
  /** Dynamic segment names, e.g. `['slug', 'designSlug']`. */
  params: string[];
  /** Components wrapped OUTSIDE the page, outermost first (`['ProtectedRoute']`). */
  wrappers: string[];
  /** Path this route forwards to, when statically knowable. */
  redirectTo?: string;
  /** True when the `<Route>` is behind an `import.meta.env.DEV` guard. */
  devOnly: boolean;
  /** Composed path of the parent `<Route>`, when nested. */
  parentPath?: string;
  analysis?: NodeAnalysis;
}

/** A router source file the generator read. */
export interface RouterSource {
  /** Repo-relative path. */
  file: string;
  /** How the generator reached it: the entry, or an imported route fragment. */
  via: 'entry' | 'fragment';
  routeCount: number;
}

/** Non-fatal problems, surfaced in the UI so silent degradation is visible. */
export interface MapWarning {
  message: string;
  file?: string;
  path?: string;
}

export interface ArchitectureMap {
  /** Bumped when the shape changes; the UI refuses mismatched data. */
  schemaVersion: 1;
  /** ISO timestamp of generation (fresh on every dev-server request). */
  generatedAt: string;
  routes: RouteNode[];
  sources: RouterSource[];
  warnings: MapWarning[];
}
