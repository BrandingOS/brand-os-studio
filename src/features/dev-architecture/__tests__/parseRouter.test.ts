/**
 * Parser unit tests — one case per routing pattern that exists in App.tsx.
 *
 * These use synthetic sources so a pattern stays covered even if the real router
 * stops using it. `realRouter.test.ts` covers the live file.
 */
import { describe, expect, it } from 'vitest';

import { normalizePath, parseRouterSource } from '../generator/parseRouter.node';

const parse = (src: string) => parseRouterSource(src, 'test.tsx');
const pathsOf = (src: string) => parse(src).routes.map((route) => route.path);
const find = (src: string, path: string) => parse(src).routes.find((r) => r.path === path);

describe('normalizePath', () => {
  it('collapses duplicate slashes and strips the trailing one', () => {
    expect(normalizePath('/a//b/')).toBe('/a/b');
  });

  it('keeps the root path intact', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });
});

describe('flat routes', () => {
  it('extracts path and component', () => {
    const route = find(`<Route path="/tools" element={<ToolsDirectoryPage />} />`, '/tools');
    expect(route?.component).toBe('ToolsDirectoryPage');
    expect(route?.wrappers).toEqual([]);
    expect(route?.line).toBe(1);
  });
});

describe('wrapper unwrapping', () => {
  it('reaches the page through ProtectedRoute', () => {
    const route = find(
      `<Route path="/x" element={<ProtectedRoute><RealPage /></ProtectedRoute>} />`,
      '/x',
    );
    expect(route?.component).toBe('RealPage');
    expect(route?.wrappers).toEqual(['ProtectedRoute']);
  });

  it('reaches the page through two nested providers', () => {
    const route = find(
      `<Route path="/y" element={
         <ProtectedRoute><BrandSettingsProvider><SettingsPage /></BrandSettingsProvider></ProtectedRoute>
       } />`,
      '/y',
    );
    expect(route?.component).toBe('SettingsPage');
    expect(route?.wrappers).toEqual(['ProtectedRoute', 'BrandSettingsProvider']);
  });

  it('sees through a helper call expression', () => {
    // The logo-maker fragment wraps every screen in `wrap(<Screen/>)`.
    const route = find(`<Route path="/z" element={wrap(<BriefScreen />)} />`, '/z');
    expect(route?.component).toBe('BriefScreen');
  });

  it('does not mistake a route child for the element component', () => {
    const parsed = parse(`
      <Route path="/parent" element={<Layout />}>
        <Route path="child" element={<ChildPage />} />
      </Route>`);
    expect(find(`
      <Route path="/parent" element={<Layout />}>
        <Route path="child" element={<ChildPage />} />
      </Route>`, '/parent')?.component).toBe('Layout');
    expect(parsed.routes.map((r) => r.path)).toContain('/parent/child');
  });
});

describe('nesting', () => {
  const src = `
    <Route path="/a/:slug" element={<BrandRouteLayout />}>
      <Route index element={<IndexRedirect />} />
      <Route path="setup" element={<BrandHomePage />} />
      <Route path="brandkit/:moduleId" element={<ModulePage />} />
    </Route>`;

  it('composes child paths under the parent', () => {
    expect(pathsOf(src)).toEqual([
      '/a/:slug',
      '/a/:slug',
      '/a/:slug/setup',
      '/a/:slug/brandkit/:moduleId',
    ]);
  });

  it('resolves an index route to the parent path and flags it', () => {
    const index = parse(src).routes.find((r) => r.isIndex);
    expect(index?.path).toBe('/a/:slug');
    expect(index?.component).toBe('IndexRedirect');
  });

  it('marks the parent as having children', () => {
    const parent = parse(src).routes.find((r) => r.component === 'BrandRouteLayout');
    expect(parent?.hasChildren).toBe(true);
  });

  it('records the parent path on children', () => {
    expect(find(src, '/a/:slug/setup')?.parentPath).toBe('/a/:slug');
  });

  it('treats an absolute child path as absolute', () => {
    const src2 = `
      <Route path="/parent" element={<L />}>
        <Route path="/elsewhere" element={<P />} />
      </Route>`;
    expect(pathsOf(src2)).toContain('/elsewhere');
  });
});

describe('redirects', () => {
  it('reads a literal Navigate target', () => {
    const route = find(
      `<Route path="/settings" element={<SettingsLayout />}>
         <Route index element={<Navigate to="/settings/account" replace />} />
       </Route>`,
      '/settings',
    );
    // Two routes share /settings; the index one carries the target.
    const target = parse(`
      <Route path="/settings" element={<SettingsLayout />}>
        <Route index element={<Navigate to="/settings/account" replace />} />
      </Route>`).routes.find((r) => r.isIndex);
    expect(route).toBeDefined();
    expect(target?.redirectTo).toBe('/settings/account');
  });

  it('reconstructs a template Navigate target from a local component', () => {
    const src = `
      function DamRedirect() {
        const { slug } = useParams();
        const { search } = useLocation();
        return <Navigate to={\`/a/\${slug}/folders\${search}\`} replace />;
      }
      <Route path="/a/:slug/dam" element={<DamRedirect />} />`;
    // `${slug}` occupies a whole segment → `:slug`; `${search}` is a suffix → dropped.
    expect(find(src, '/a/:slug/dam')?.redirectTo).toBe('/a/:slug/folders');
  });

  it('reports no target when the destination is computed', () => {
    const src = `
      function StudioToClassicFallback() {
        const target = compute();
        return <Navigate to={\`\${target}\${search}\`} replace />;
      }
      <Route path="/b/:slug/*" element={<StudioToClassicFallback />} />`;
    expect(find(src, '/b/:slug/*')?.redirectTo).toBeUndefined();
  });
});

describe('dev-only guards', () => {
  it('flags a route behind import.meta.env.DEV', () => {
    const src = `
      <Route path="/always" element={<A />} />
      {import.meta.env.DEV && (
        <Route path="/only-dev" element={<B />} />
      )}`;
    expect(find(src, '/always')?.devOnly).toBe(false);
    expect(find(src, '/only-dev')?.devOnly).toBe(true);
  });
});

describe('bindings (component → import specifier)', () => {
  it('collects lazy, default and named imports', () => {
    const { bindings } = parse(`
      import IndexPage from "./pages/Index";
      import { SettingsLayout } from "./shared/layouts/SettingsLayout";
      const LazyPage = lazy(() => import("./pages/b/[slug]/setup"));
      <Route path="/" element={<IndexPage />} />`);

    expect(bindings.get('IndexPage')).toBe('./pages/Index');
    expect(bindings.get('SettingsLayout')).toBe('./shared/layouts/SettingsLayout');
    expect(bindings.get('LazyPage')).toBe('./pages/b/[slug]/setup');
  });

  it('collects re-exports so barrels can be followed', () => {
    const { reExports } = parse(`export { logoMakerFlowRoutes } from './routes';`);
    expect(reExports.get('logoMakerFlowRoutes')).toBe('./routes');
  });
});

describe('route fragments', () => {
  it('records an imported route array for following', () => {
    const { fragments } = parse(`
      import { logoMakerFlowRoutes } from "./features/logo-maker/flow";
      <Routes>
        <Route path="/" element={<A />} />
        {logoMakerFlowRoutes}
      </Routes>`);

    expect(fragments).toHaveLength(1);
    expect(fragments[0]).toMatchObject({
      name: 'logoMakerFlowRoutes',
      specifier: './features/logo-maker/flow',
    });
  });

  it('ignores a JSX expression that is not an imported binding', () => {
    const { fragments } = parse(`
      <Routes>
        {someLocalThing}
        <Route path="/" element={<A />} />
      </Routes>`);
    expect(fragments).toHaveLength(0);
  });

  it('ignores an imported binding used as an ATTRIBUTE value', () => {
    // A fragment is a CHILD of <Routes>. `ts.isJsxExpression` is also true for
    // an attribute value, so without a parent check every
    // `someProp={ImportedThing}` in the router was chased as a route fragment
    // and then reported as a warning because the target has no <Route> in it.
    // Adding `storageKey={THEME_STORAGE_KEY}` to <ThemeProvider> is exactly
    // what tripped it.
    const { fragments } = parse(`
      import { THEME_STORAGE_KEY } from "@/shared/theme/useWorkspaceTheme";
      <ThemeProvider storageKey={THEME_STORAGE_KEY}>
        <Routes>
          <Route path="/" element={<A />} />
        </Routes>
      </ThemeProvider>`);
    expect(fragments).toHaveLength(0);
  });

  it('still finds a real fragment alongside an imported attribute value', () => {
    const { fragments } = parse(`
      import { THEME_STORAGE_KEY } from "@/shared/theme/useWorkspaceTheme";
      import { logoMakerFlowRoutes } from "./features/logo-maker/flow";
      <ThemeProvider storageKey={THEME_STORAGE_KEY}>
        <Routes>
          {logoMakerFlowRoutes}
        </Routes>
      </ThemeProvider>`);
    expect(fragments.map((f) => f.name)).toEqual(['logoMakerFlowRoutes']);
  });
});

describe('splats and pathless layouts', () => {
  it('composes a bare splat against the root', () => {
    // `path="*"` is relative, so it composes to `/*` — the same normalization the
    // independent product-map scanner produces, which realRouter.test.ts relies on.
    expect(pathsOf(`<Route path="*" element={<NotFound />} />`)).toEqual(['/*']);
  });

  it('keeps a nested splat under its parent', () => {
    const paths = pathsOf(`
      <Route path="/b/:slug/*" element={<Fallback />} />`);
    expect(paths).toEqual(['/b/:slug/*']);
  });

  it('emits no route for a pathless layout but still composes its children', () => {
    const paths = pathsOf(`
      <Route element={<SilentLayout />}>
        <Route path="/child" element={<C />} />
      </Route>`);
    expect(paths).toEqual(['/child']);
  });
});
