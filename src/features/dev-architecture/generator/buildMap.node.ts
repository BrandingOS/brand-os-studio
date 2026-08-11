/**
 * ══════════════════════════════════════════════════════════════════════════
 * NODE-ONLY. Never import this from browser code.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Orchestrator: reads the real router, follows any imported route fragments,
 * resolves every route's component to a source file, derives names and groups,
 * and returns the `ArchitectureMap` the explorer renders.
 *
 * Called fresh on every dev-server request (see the `architecture-map` plugin in
 * vite.config.ts), so there is no generated artifact that can drift from the
 * codebase. The only thing that can go stale is this generator's own parsing —
 * which is what `__tests__/realRouter.test.ts` guards.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { groupForPath } from '../groups';
import { deriveName, disambiguate } from '../naming';
import type {
  ArchitectureMap,
  ImportRef,
  MapWarning,
  RouteKind,
  RouteNode,
  RouterSource,
} from '../types';
import { parseRouterSource, type RawRoute } from './parseRouter.node';
import { resolveSpecifier } from './resolveModule.node';
import { scanImports } from './scanImports.node';

/** The one entry point the generator needs to be told about. */
export const ROUTER_ENTRY = 'src/App.tsx';

/**
 * Components that wrap a page without being one. They are reported as
 * `wrappers` on the node; this list only stops them being mistaken for the page
 * itself when a route element has no deeper child.
 */
const REDIRECT_NAME = /(?:Redirect|Fallback)$/;

function paramsOf(path: string): string[] {
  return path
    .split('/')
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => segment.slice(1));
}

function kindOf(raw: RawRoute, hasRedirectTarget: boolean): RouteKind {
  const isNavigate = raw.component === 'Navigate';
  if (isNavigate || (raw.component && REDIRECT_NAME.test(raw.component)) || hasRedirectTarget) {
    return 'redirect';
  }
  if (raw.path.endsWith('*')) return 'catch-all';
  if (raw.hasChildren) return 'layout';
  if (raw.isIndex) return 'index';
  return 'page';
}

/** Reads + parses one router file, or null when it can't be read. */
function parseFile(file: string, rootDir: string) {
  let text: string;
  try {
    text = readFileSync(resolve(rootDir, file), 'utf8');
  } catch {
    return null;
  }
  return parseRouterSource(text, file);
}

/** How many barrel hops to follow before giving up chasing a route fragment. */
const MAX_BARREL_DEPTH = 5;

/**
 * Follows a route fragment to the module that actually defines the `<Route>`s,
 * hopping through barrel re-exports (`export { x } from './routes'`) as needed.
 */
function followFragment(
  exportedName: string,
  startFile: string,
  rootDir: string,
): { file: string; parsed: ReturnType<typeof parseRouterSource> } | null {
  let file = startFile;
  let name = exportedName;

  for (let hop = 0; hop < MAX_BARREL_DEPTH; hop += 1) {
    const parsed = parseFile(file, rootDir);
    if (!parsed) return null;
    if (parsed.routes.length > 0) return { file, parsed };

    const next = parsed.reExports.get(name) ?? parsed.reExports.get('*');
    if (!next) return null;
    const resolved = resolveSpecifier(next, file, rootDir);
    if (!resolved.file) return null;
    file = resolved.file;
    // The name survives a re-export unless it was aliased, which this codebase
    // does not do for route fragments.
    name = exportedName;
  }

  return null;
}

export function buildArchitectureMap(rootDir: string): ArchitectureMap {
  const warnings: MapWarning[] = [];
  const sources: RouterSource[] = [];
  /** Route + the file whose bindings resolve its component. */
  const collected: Array<{ raw: RawRoute; file: string }> = [];

  const entryText = (() => {
    try {
      return readFileSync(resolve(rootDir, ROUTER_ENTRY), 'utf8');
    } catch {
      return null;
    }
  })();

  if (entryText === null) {
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      routes: [],
      sources: [],
      warnings: [{ message: `Router entry not found: ${ROUTER_ENTRY}`, file: ROUTER_ENTRY }],
    };
  }

  const entry = parseRouterSource(entryText, ROUTER_ENTRY);
  const bindingsByFile = new Map<string, Map<string, string>>([[ROUTER_ENTRY, entry.bindings]]);
  for (const raw of entry.routes) collected.push({ raw, file: ROUTER_ENTRY });
  sources.push({ file: ROUTER_ENTRY, via: 'entry', routeCount: entry.routes.length });

  // Follow imported route fragments (e.g. `{logoMakerFlowRoutes}`). Following
  // the import — rather than keeping a list of router files — is what makes a
  // NEW route-fragment file appear here with no configuration.
  const visitedFragments = new Set<string>();
  for (const fragment of entry.fragments) {
    const { file } = resolveSpecifier(fragment.specifier, ROUTER_ENTRY, rootDir);
    if (!file) {
      warnings.push({
        message: `Route fragment {${fragment.name}} could not be resolved from "${fragment.specifier}" — its routes are missing from this map.`,
        file: ROUTER_ENTRY,
      });
      continue;
    }
    if (visitedFragments.has(file)) continue;
    visitedFragments.add(file);

    const followed = followFragment(fragment.name, file, rootDir);
    if (!followed) {
      warnings.push({
        message: `Route fragment {${fragment.name}} resolved to ${file} but no <Route> definitions were found there (or through its re-exports).`,
        file,
      });
      continue;
    }
    const { file: routeFile, parsed } = followed;
    visitedFragments.add(routeFile);

    bindingsByFile.set(routeFile, parsed.bindings);
    for (const raw of parsed.routes) {
      // Fragment paths are absolute in practice; re-compose defensively so a
      // relative fragment still lands under its mount point.
      const path = raw.path.startsWith('/')
        ? raw.path
        : `${fragment.parentPath}/${raw.path}`.replace(/\/{2,}/g, '/');
      collected.push({ raw: { ...raw, path }, file: routeFile });
    }
    sources.push({ file: routeFile, via: 'fragment', routeCount: parsed.routes.length });
  }

  // ── Resolve components → source files, derive names, attach analysis ──────
  const importCache = new Map<string, ImportRef[]>();
  const nodes: RouteNode[] = [];

  for (const { raw, file } of collected) {
    const bindings = bindingsByFile.get(file);
    let sourceFile: string | null = null;

    if (raw.component && bindings?.has(raw.component)) {
      const specifier = bindings.get(raw.component) as string;
      const resolved = resolveSpecifier(specifier, file, rootDir);
      // A library component in the element slot (`<Navigate>`) has no first-party
      // source — the route file is where its behaviour is actually written.
      sourceFile = resolved.external ? file : resolved.file;
      if (!sourceFile && !resolved.external) {
        warnings.push({
          message: `Component <${raw.component}> imports "${specifier}" but no file was found at that path.`,
          file,
          path: raw.path,
        });
      }
    } else if (raw.component) {
      // Either a helper declared in the router file itself (the *Redirect
      // components) or a bare `<Navigate>` from react-router — in both cases the
      // router file is genuinely where this route's behaviour is written.
      sourceFile = file;
    }

    if (sourceFile && !importCache.has(sourceFile)) {
      importCache.set(sourceFile, scanImports(sourceFile, rootDir));
    }

    const kind = kindOf(raw, Boolean(raw.redirectTo));

    nodes.push({
      id: `${raw.path}::${raw.component ?? 'none'}`,
      path: raw.path,
      name: deriveName(raw.path, raw.component, { isIndex: raw.isIndex }),
      component: raw.component,
      sourceFile,
      routeFile: file,
      routeLine: raw.line,
      kind,
      group: groupForPath(raw.path),
      params: paramsOf(raw.path),
      wrappers: raw.wrappers,
      redirectTo: raw.redirectTo,
      devOnly: raw.devOnly,
      parentPath: raw.parentPath,
      analysis: sourceFile ? { imports: importCache.get(sourceFile) } : undefined,
    });
  }

  // ── Disambiguate names that collide inside a group ────────────────────────
  const byGroupName = new Map<string, string[]>();
  for (const node of nodes) {
    const key = `${node.group}::${node.name}`;
    byGroupName.set(key, [...(byGroupName.get(key) ?? []), node.path]);
  }
  for (const node of nodes) {
    const colliding = byGroupName.get(`${node.group}::${node.name}`) ?? [];
    node.name = disambiguate(node.name, node.path, colliding);
  }

  // Duplicate ids would break selection + deep links — surface, don't silence.
  const seen = new Map<string, number>();
  for (const node of nodes) {
    seen.set(node.id, (seen.get(node.id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) {
      warnings.push({ message: `Duplicate route id "${id}" appears ${count}× — selection may be ambiguous.` });
    }
  }

  nodes.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    routes: nodes,
    sources,
    warnings,
  };
}
