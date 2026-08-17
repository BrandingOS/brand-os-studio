/**
 * Deterministic URL → product area mapping for the Architecture Explorer.
 *
 * Rules, not a list of routes: a new URL lands in the right group without
 * anyone editing this file, as long as it lives under an existing prefix. Order
 * matters — the first matching rule wins, so narrower prefixes come first
 * (`/dashboard/admin` must beat `/dashboard`).
 *
 * Browser-safe and pure. Unit-tested in `__tests__/groups.test.ts`.
 */
import type { RouteGroup } from './types';

interface GroupRule {
  group: RouteGroup;
  /** Matches the whole path. */
  test: (path: string) => boolean;
}

/** `/a` matches `/a` and `/a/...` but never `/abc`. */
const under = (...prefixes: string[]) => (path: string) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

const exact = (...paths: string[]) => (path: string) => paths.includes(path);

/**
 * Brand-scoped namespaces are matched on the SECOND segment being a param, so
 * the rule holds for any `/b/:slug/<anything>` without enumerating sections.
 */
const brandNamespace = (ns: 'a' | 'b') => (path: string) =>
  path === `/${ns}` || new RegExp(`^/${ns}/:[^/]+`).test(path);

const RULES: GroupRule[] = [
  // Development first — these paths are ours and must never be reclassified.
  { group: 'Development', test: (p) => p.startsWith('/_dev') || p.startsWith('/__') },

  { group: 'Authentication', test: (p) => exact('/login', '/signup')(p) || under('/auth')(p) },

  // Onboarding includes the Logo Maker flow: it is the 6-screen brand-creation
  // wizard, not a tool (see CLAUDE.md carve-out #1).
  {
    group: 'Onboarding',
    test: (p) =>
      under('/onboarding', '/onboarding-brand', '/onboard-brand', '/logo-maker')(p),
  },

  // Admin before Dashboard so the legacy /dashboard/admin/* pages group with
  // the real admin dashboard rather than the workspace.
  { group: 'Admin', test: under('/admin', '/dashboard/admin') },

  { group: 'Settings', test: under('/settings') },

  { group: 'Brand Workspace (Studio)', test: brandNamespace('b') },
  { group: 'Brand Workspace (Classic)', test: brandNamespace('a') },

  // Legacy /dashboard/brand/:slug/* redirects belong with the brand workspace
  // they forward into, not with the workspace dashboard.
  { group: 'Brand Workspace (Studio)', test: under('/dashboard/brand') },

  { group: 'Editors', test: under('/editor') },
  { group: 'Tools', test: (p) => under('/tools')(p) || exact('/claim')(p) },

  {
    group: 'Dashboard',
    test: (p) =>
      under('/dashboard', '/templates', '/marketplace')(p) || exact('/learn')(p),
  },

  // Public / unauthenticated surfaces, including the marketing index and the
  // global not-found route (`/*`), which renders publicly.
  {
    group: 'Public',
    test: (p) =>
      under('/brand', '/p', '/d', '/i')(p) ||
      exact('/', '/*', '/privacy', '/account-deletion')(p),
  },
];

/** Group order used by the UI so the list reads top-down like the product. */
export const GROUP_ORDER: RouteGroup[] = [
  'Public',
  'Authentication',
  'Onboarding',
  'Dashboard',
  'Brand Workspace (Studio)',
  'Brand Workspace (Classic)',
  'Editors',
  'Tools',
  'Settings',
  'Admin',
  'Development',
  'Other',
];

export function groupForPath(path: string): RouteGroup {
  for (const rule of RULES) {
    if (rule.test(path)) return rule.group;
  }
  return 'Other';
}

export function sortGroups(groups: RouteGroup[]): RouteGroup[] {
  return [...groups].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
}
