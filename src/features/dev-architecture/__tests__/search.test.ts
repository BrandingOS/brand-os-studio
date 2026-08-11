import { describe, expect, it } from 'vitest';

import { searchRoutes } from '../search';
import type { RouteNode } from '../types';

function route(partial: Partial<RouteNode> & { path: string; name: string }): RouteNode {
  return {
    id: `${partial.path}::${partial.component ?? 'none'}`,
    component: null,
    sourceFile: null,
    routeFile: 'src/App.tsx',
    routeLine: 1,
    kind: 'page',
    group: 'Dashboard',
    params: [],
    wrappers: [],
    devOnly: false,
    ...partial,
  };
}

const ROUTES: RouteNode[] = [
  route({
    path: '/b/:slug/setup',
    name: 'Setup',
    component: 'BrandSetupPageV2',
    sourceFile: 'src/pages/b/[slug]/setup.tsx',
    group: 'Brand Workspace (Studio)',
  }),
  route({
    path: '/b/:slug/brand-kit',
    name: 'Brand Kit',
    component: 'BrandBrandKitPageV2',
    sourceFile: 'src/pages/b/[slug]/brand-kit.tsx',
    group: 'Brand Workspace (Studio)',
    analysis: {
      imports: [
        {
          specifier: '@/features/brand-kit/BrandKitCosmosPage',
          file: 'src/features/brand-kit/BrandKitCosmosPage.tsx',
          kind: 'feature',
          names: ['BrandKitCosmosPage'],
        },
      ],
    },
  }),
  route({ path: '/', name: 'Home', component: 'IndexPage', sourceFile: 'src/pages/Index.tsx' }),
  route({
    path: '/dashboard/brands',
    name: 'Brands',
    component: 'BrandsPage',
    sourceFile: 'src/pages/dashboard/brands/index.tsx',
  }),
];

const paths = (query: string) => searchRoutes(ROUTES, query).map((hit) => hit.route.path);

describe('searchRoutes', () => {
  it('returns everything for an empty query', () => {
    expect(searchRoutes(ROUTES, '')).toHaveLength(ROUTES.length);
    expect(searchRoutes(ROUTES, '   ')).toHaveLength(ROUTES.length);
  });

  it('finds a route by human name', () => {
    expect(paths('brand kit')[0]).toBe('/b/:slug/brand-kit');
  });

  it('finds a route by URL', () => {
    expect(paths('/b/:slug/setup')[0]).toBe('/b/:slug/setup');
  });

  it('finds a route by component name', () => {
    expect(paths('BrandSetupPageV2')[0]).toBe('/b/:slug/setup');
  });

  it('finds a route by source file path', () => {
    expect(paths('pages/dashboard/brands')[0]).toBe('/dashboard/brands');
  });

  it('is case-insensitive', () => {
    expect(paths('SETUP')[0]).toBe('/b/:slug/setup');
  });

  it('requires every whitespace-separated term to match', () => {
    expect(paths('setup nonexistentterm')).toEqual([]);
  });

  it('ranks an exact name match above a substring match elsewhere', () => {
    const results = paths('setup');
    expect(results[0]).toBe('/b/:slug/setup');
  });

  it('finds a thin wrapper page by the component it imports', () => {
    // The point of the dependency tier: /b/:slug/brand-kit is a 6-line page and
    // BrandKitCosmosPage is the real implementation.
    const hits = searchRoutes(ROUTES, 'BrandKitCosmosPage');
    expect(hits).toHaveLength(1);
    expect(hits[0].route.path).toBe('/b/:slug/brand-kit');
    expect(hits[0].matchedOn).toBe('dependency');
  });

  it('ranks dependency matches below every direct match', () => {
    const hits = searchRoutes(ROUTES, 'brand');
    const dependencyIndexes = hits
      .map((hit, index) => (hit.matchedOn === 'dependency' ? index : -1))
      .filter((index) => index >= 0);
    const directIndexes = hits
      .map((hit, index) => (hit.matchedOn !== 'dependency' ? index : -1))
      .filter((index) => index >= 0);

    if (dependencyIndexes.length && directIndexes.length) {
      expect(Math.min(...dependencyIndexes)).toBeGreaterThan(Math.max(...directIndexes));
    }
  });

  it('reports which field produced the match', () => {
    expect(searchRoutes(ROUTES, 'Setup')[0].matchedOn).toBe('name');
    expect(searchRoutes(ROUTES, 'pages/Index')[0].matchedOn).toBe('file');
  });

  it('prefers a shorter path when ranks tie', () => {
    const tied = [
      route({ path: '/x/deep/nested/thing', name: 'Thing' }),
      route({ path: '/x/thing', name: 'Thing' }),
    ];
    expect(searchRoutes(tied, 'thing')[0].route.path).toBe('/x/thing');
  });
});
