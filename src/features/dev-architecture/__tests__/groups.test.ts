import { describe, expect, it } from 'vitest';

import { GROUP_ORDER, groupForPath, sortGroups } from '../groups';

describe('groupForPath', () => {
  it.each([
    ['/login', 'Authentication'],
    ['/signup', 'Authentication'],
    ['/auth/reset-password', 'Authentication'],
    ['/onboard-brand', 'Onboarding'],
    ['/onboarding/preview', 'Onboarding'],
    ['/logo-maker/brief', 'Onboarding'],
    ['/dashboard', 'Dashboard'],
    ['/dashboard/brands', 'Dashboard'],
    ['/learn', 'Dashboard'],
    ['/templates', 'Dashboard'],
    ['/b/:slug/setup', 'Brand Workspace (Studio)'],
    ['/b/:slug/tools/typescale', 'Brand Workspace (Studio)'],
    ['/a/:slug/identity', 'Brand Workspace (Classic)'],
    ['/editor', 'Editors'],
    ['/editor/design/:slug', 'Editors'],
    ['/tools', 'Tools'],
    ['/tools/logo-to-svg', 'Tools'],
    ['/claim', 'Tools'],
    ['/settings/account', 'Settings'],
    ['/admin/users', 'Admin'],
    ['/brand/:slug/showcase', 'Public'],
    ['/p/:slug', 'Public'],
    ['/d/:brandSlug/:designSlug', 'Public'],
    ['/', 'Public'],
    ['/privacy', 'Public'],
    ['/_dev/product-map', 'Development'],
    ['/__architecture', 'Development'],
  ])('puts %s in %s', (path, expected) => {
    expect(groupForPath(path)).toBe(expected);
  });

  it('prefers Admin over Dashboard for the legacy admin pages', () => {
    // Rule order matters: /dashboard/admin/* must not fall into Dashboard.
    expect(groupForPath('/dashboard/admin/brands')).toBe('Admin');
    expect(groupForPath('/dashboard/admin/analytics')).toBe('Admin');
  });

  it('groups legacy brand redirects with the workspace they forward into', () => {
    expect(groupForPath('/dashboard/brand/:slug/*')).toBe('Brand Workspace (Studio)');
  });

  it('does not let a prefix match a longer unrelated segment', () => {
    // `/a` must not capture `/account-deletion`, `/admin` must not capture it either.
    expect(groupForPath('/account-deletion')).toBe('Public');
  });

  it('falls back to Other for an unrecognised prefix', () => {
    expect(groupForPath('/something-new')).toBe('Other');
  });
});

describe('sortGroups', () => {
  it('orders groups the way the UI lists them', () => {
    const shuffled = ['Admin', 'Public', 'Development', 'Dashboard'] as const;
    expect(sortGroups([...shuffled])).toEqual([
      'Public',
      'Dashboard',
      'Admin',
      'Development',
    ]);
  });

  it('has an order entry for every group it can produce', () => {
    // Guards against adding a group to the union without adding it to GROUP_ORDER,
    // which would silently sort it to the front (indexOf → -1).
    const produced = new Set(
      [
        '/login',
        '/onboard-brand',
        '/dashboard',
        '/b/:slug',
        '/a/:slug',
        '/editor',
        '/tools',
        '/settings',
        '/admin',
        '/',
        '/_dev/x',
        '/unknown-thing',
      ].map(groupForPath),
    );
    for (const group of produced) {
      expect(GROUP_ORDER, `${group} missing from GROUP_ORDER`).toContain(group);
    }
  });
});
