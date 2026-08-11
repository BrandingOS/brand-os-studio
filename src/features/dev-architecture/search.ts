/**
 * Search + ranking for the Code Navigator.
 *
 * Four fields are searchable because they are the four things a developer
 * already knows when they start looking: the page name they saw in the product,
 * the URL in their address bar, the component name from a stack trace, or a file
 * path from a grep. Any of them should find the route.
 *
 * Browser-safe and pure. Unit-tested in `__tests__/search.test.ts`.
 */
import type { RouteNode } from './types';

export interface SearchHit {
  route: RouteNode;
  /** Lower sorts first. */
  rank: number;
  /** Which field produced the best match — shown as a hint in the results. */
  matchedOn: 'name' | 'path' | 'component' | 'file' | 'dependency';
}

/** Rank tiers, lowest (best) first. */
const RANK = {
  pathExact: 0,
  nameExact: 1,
  namePrefix: 2,
  pathPrefix: 3,
  componentPrefix: 4,
  nameContains: 5,
  pathContains: 6,
  componentContains: 7,
  fileContains: 8,
  dependencyContains: 9,
} as const;

/** Fields of a route that participate in search, pre-lowercased. */
function haystack(route: RouteNode) {
  const imports = route.analysis?.imports ?? [];
  return {
    name: route.name.toLowerCase(),
    path: route.path.toLowerCase(),
    component: (route.component ?? '').toLowerCase(),
    file: (route.sourceFile ?? '').toLowerCase(),
    /**
     * Direct dependencies, searched LAST so they never outrank a real page
     * match. This is what makes thin route wrappers findable: `/b/:slug/brand-kit`
     * is a six-line page whose actual implementation is `BrandKitCosmosPage`, so
     * searching for that component has to lead somewhere.
     */
    dependencies: imports
      .map((ref) => `${ref.specifier} ${ref.file ?? ''} ${ref.names.join(' ')}`)
      .join('\n')
      .toLowerCase(),
  };
}

/** Best (lowest) rank for a single term against one route, or null if no match. */
function rankTerm(
  fields: ReturnType<typeof haystack>,
  term: string,
): { rank: number; matchedOn: SearchHit['matchedOn'] } | null {
  if (fields.path === term) return { rank: RANK.pathExact, matchedOn: 'path' };
  if (fields.name === term) return { rank: RANK.nameExact, matchedOn: 'name' };
  if (fields.name.startsWith(term)) return { rank: RANK.namePrefix, matchedOn: 'name' };
  if (fields.path.startsWith(term)) return { rank: RANK.pathPrefix, matchedOn: 'path' };
  if (fields.component.startsWith(term)) {
    return { rank: RANK.componentPrefix, matchedOn: 'component' };
  }
  if (fields.name.includes(term)) return { rank: RANK.nameContains, matchedOn: 'name' };
  if (fields.path.includes(term)) return { rank: RANK.pathContains, matchedOn: 'path' };
  if (fields.component.includes(term)) {
    return { rank: RANK.componentContains, matchedOn: 'component' };
  }
  if (fields.file.includes(term)) return { rank: RANK.fileContains, matchedOn: 'file' };
  if (fields.dependencies.includes(term)) {
    return { rank: RANK.dependencyContains, matchedOn: 'dependency' };
  }
  return null;
}

/**
 * Filters and ranks routes. Whitespace splits the query into terms that must ALL
 * match (`brand kit` finds "Brand Kit"; `setup studio` narrows to the Studio
 * one), which keeps refinement predictable as you type.
 */
export function searchRoutes(routes: RouteNode[], query: string): SearchHit[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return routes.map((route) => ({ route, rank: 0, matchedOn: 'name' as const }));
  }

  const hits: SearchHit[] = [];

  for (const route of routes) {
    const fields = haystack(route);
    let worstRank = -1;
    let best: { rank: number; matchedOn: SearchHit['matchedOn'] } | null = null;
    let allMatched = true;

    for (const term of terms) {
      const result = rankTerm(fields, term);
      if (!result) {
        allMatched = false;
        break;
      }
      // The route's rank is driven by its BEST field match, but every term has
      // to land somewhere for the route to qualify.
      if (!best || result.rank < best.rank) best = result;
      if (result.rank > worstRank) worstRank = result.rank;
    }

    if (!allMatched || !best) continue;
    hits.push({ route, rank: best.rank, matchedOn: best.matchedOn });
  }

  return hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.route.path.length - b.route.path.length ||
      a.route.path.localeCompare(b.route.path),
  );
}
