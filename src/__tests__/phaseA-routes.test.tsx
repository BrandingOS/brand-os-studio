// Phase A — namespace split routing tests.
//
// Asserts the redirect behavior of the two Phase A helpers:
//   • StudioToClassicFallback — /b/:slug/<unmigrated>  → /a/:slug/<same>
//   • DashboardBrandToStudioRedirect — /dashboard/brand/:slug/<X> → /b/:slug/<X>
//
// Plus a small integration check that route specificity beats the
// catch-all (a migrated /b/:slug/setup must NOT fall into the fallback).
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { afterEach } from 'vitest';
import {
  StudioToClassicFallback,
  DashboardBrandToStudioRedirect,
} from '../App';

afterEach(() => cleanup());

function LocationProbe({ onChange }: { onChange: (path: string, search: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname, loc.search);
  return null;
}

function mount(initialPath: string, routes: React.ReactNode) {
  let path = initialPath.split('?')[0];
  let search = initialPath.includes('?') ? `?${initialPath.split('?')[1]}` : '';
  const ui = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        {routes}
      </Routes>
      <LocationProbe
        onChange={(p, s) => {
          path = p;
          search = s;
        }}
      />
    </MemoryRouter>,
  );
  return { ...ui, getPath: () => path, getSearch: () => search };
}

describe('Phase A — StudioToClassicFallback', () => {
  const fallbackRoutes = (
    <>
      <Route path="/b/:slug/*" element={<StudioToClassicFallback />} />
      <Route path="/a/:slug" element={<div data-testid="classic-home">classic-home</div>} />
      <Route path="/a/:slug/*" element={<div data-testid="classic-section">classic-section</div>} />
    </>
  );

  it('redirects /b/:slug/identity → /a/:slug/identity', () => {
    const { getPath } = mount('/b/raqm/identity', fallbackRoutes);
    expect(getPath()).toBe('/a/raqm/identity');
  });

  it('redirects /b/:slug/templates → /a/:slug/templates', () => {
    const { getPath } = mount('/b/skam/templates', fallbackRoutes);
    expect(getPath()).toBe('/a/skam/templates');
  });

  it('redirects /b/:slug bare → /a/:slug bare', () => {
    const { getPath } = mount('/b/raqm', fallbackRoutes);
    expect(getPath()).toBe('/a/raqm');
  });

  it('preserves query string on fallback', () => {
    const { getPath, getSearch } = mount('/b/raqm/identity?tab=colors', fallbackRoutes);
    expect(getPath()).toBe('/a/raqm/identity');
    expect(getSearch()).toBe('?tab=colors');
  });

  it('handles deep paths (multiple segments after slug)', () => {
    const { getPath } = mount('/b/raqm/brandkit/colors', fallbackRoutes);
    expect(getPath()).toBe('/a/raqm/brandkit/colors');
  });
});

describe('Phase A — DashboardBrandToStudioRedirect', () => {
  const dashboardRoutes = (
    <>
      <Route path="/dashboard/brand/:slug/*" element={<DashboardBrandToStudioRedirect />} />
      {/* Stub Studio routes for the dashboard catch-all to redirect into. */}
      <Route path="/b/:slug" element={<div>studio-home</div>} />
      <Route path="/b/:slug/setup" element={<div data-testid="studio-setup">studio-setup</div>} />
      <Route path="/b/:slug/*" element={<div data-testid="studio-other">studio-other</div>} />
    </>
  );

  it('redirects /dashboard/brand/:slug/setup → /b/:slug/setup', () => {
    const { getPath } = mount('/dashboard/brand/raqm/setup', dashboardRoutes);
    expect(getPath()).toBe('/b/raqm/setup');
  });

  it('redirects bare /dashboard/brand/:slug → /b/:slug', () => {
    const { getPath } = mount('/dashboard/brand/skam', dashboardRoutes);
    expect(getPath()).toBe('/b/skam');
  });

  it('preserves query string on dashboard redirect', () => {
    const { getPath, getSearch } = mount(
      '/dashboard/brand/raqm/identity?tab=logo',
      dashboardRoutes,
    );
    expect(getPath()).toBe('/b/raqm/identity');
    expect(getSearch()).toBe('?tab=logo');
  });

  it('handles deep dashboard paths (tools/variant-studio)', () => {
    const { getPath } = mount(
      '/dashboard/brand/raqm/tools/variant-studio',
      dashboardRoutes,
    );
    expect(getPath()).toBe('/b/raqm/tools/variant-studio');
  });
});

describe('Phase A v2 — Classic path harmonization redirects', () => {
  // Mirrors the actual /a/:slug nested block from App.tsx so the
  // redirects are exercised through real React Router resolution.
  // Index → setup, /kit → /brand-kit, /guidelines → /guideline.
  function ClassicIndexToSetupRedirect() {
    const { slug } = useParams<{ slug: string }>();
    return <Navigate to={`/a/${slug}/setup`} replace />;
  }
  function ClassicKitToBrandKitRedirect() {
    const { slug } = useParams<{ slug: string }>();
    return <Navigate to={`/a/${slug}/brand-kit`} replace />;
  }
  function ClassicGuidelinesToGuidelineRedirect() {
    const { slug } = useParams<{ slug: string }>();
    return <Navigate to={`/a/${slug}/guideline`} replace />;
  }
  // Need useParams import locally for the inline components above.

  const harmonizedRoutes = (
    <Route path="/a/:slug" element={<div data-testid="classic-shell">classic-shell<Outlet /></div>}>
      <Route index element={<ClassicIndexToSetupRedirect />} />
      <Route path="setup" element={<div data-testid="setup-page">setup</div>} />
      <Route path="brand-kit" element={<div data-testid="brand-kit-page">brand-kit</div>} />
      <Route path="kit" element={<ClassicKitToBrandKitRedirect />} />
      <Route path="guideline" element={<div data-testid="guideline-page">guideline</div>} />
      <Route path="guidelines" element={<ClassicGuidelinesToGuidelineRedirect />} />
    </Route>
  );

  it('bare /a/:slug redirects to /a/:slug/setup', () => {
    const { getPath } = mount('/a/raqm', harmonizedRoutes);
    expect(getPath()).toBe('/a/raqm/setup');
  });

  it('/a/:slug/kit redirects to /a/:slug/brand-kit', () => {
    const { getPath } = mount('/a/raqm/kit', harmonizedRoutes);
    expect(getPath()).toBe('/a/raqm/brand-kit');
  });

  it('/a/:slug/guidelines redirects to /a/:slug/guideline', () => {
    const { getPath } = mount('/a/raqm/guidelines', harmonizedRoutes);
    expect(getPath()).toBe('/a/raqm/guideline');
  });

  it('/a/:slug/setup renders BrandHomePage directly (no redirect)', () => {
    const { getByTestId, getPath } = mount('/a/raqm/setup', harmonizedRoutes);
    expect(getPath()).toBe('/a/raqm/setup');
    expect(getByTestId('setup-page')).toBeTruthy();
  });

  it('/a/:slug/brand-kit renders the brand-kit hub directly', () => {
    const { getByTestId, getPath } = mount('/a/raqm/brand-kit', harmonizedRoutes);
    expect(getPath()).toBe('/a/raqm/brand-kit');
    expect(getByTestId('brand-kit-page')).toBeTruthy();
  });

  it('/a/:slug/guideline renders the guideline hub directly', () => {
    const { getByTestId } = mount('/a/raqm/guideline', harmonizedRoutes);
    expect(getByTestId('guideline-page')).toBeTruthy();
  });
});

describe('Phase A — route specificity (migrated routes win the catch-all)', () => {
  // Mirrors a slice of the App.tsx ranking: explicit Studio routes for
  // setup/brand-kit/guideline/design/tools must take priority over the
  // /b/:slug/* catch-all that falls back to Classic.
  const studioMigratedRoutes = (
    <>
      <Route path="/b/:slug/setup" element={<div data-testid="setup-mounted">setup</div>} />
      <Route path="/b/:slug/brand-kit" element={<div data-testid="kit-mounted">kit</div>} />
      <Route path="/b/:slug/templates" element={<div data-testid="templates-mounted">templates</div>} />
      <Route path="/b/:slug/design" element={<div data-testid="cosmos-design-mounted">cosmos-design</div>} />
      <Route path="/b/:slug/design/:designSlug" element={<div data-testid="editor-mounted">editor</div>} />
      <Route path="/b/:slug" element={<div data-testid="studio-shell">studio-shell<Outlet /></div>}>
        <Route index element={<div>studio-index</div>} />
      </Route>
      <Route path="/b/:slug/*" element={<StudioToClassicFallback />} />
      <Route path="/a/:slug/*" element={<div data-testid="classic-fallback">classic</div>} />
    </>
  );

  it('/b/:slug/setup mounts SetupPage (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/setup', studioMigratedRoutes);
    expect(getByTestId('setup-mounted')).toBeTruthy();
  });

  it('/b/:slug/brand-kit mounts BrandKit page (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/brand-kit', studioMigratedRoutes);
    expect(getByTestId('kit-mounted')).toBeTruthy();
  });

  it('/b/:slug/design mounts the cosmos design page (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/design', studioMigratedRoutes);
    expect(getByTestId('cosmos-design-mounted')).toBeTruthy();
  });

  it('/b/:slug/design/:designSlug mounts the unified editor (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/design/abc-123', studioMigratedRoutes);
    expect(getByTestId('editor-mounted')).toBeTruthy();
  });

  it('/b/:slug/identity (unmigrated) DOES fall through to Classic', () => {
    const { getPath, getByTestId } = mount('/b/raqm/identity', studioMigratedRoutes);
    expect(getPath()).toBe('/a/raqm/identity');
    expect(getByTestId('classic-fallback')).toBeTruthy();
  });

  it('/b/:slug/templates (Phase B Studio port) mounts the Studio Templates page', () => {
    const { getByTestId, getPath } = mount('/b/raqm/templates', studioMigratedRoutes);
    expect(getPath()).toBe('/b/raqm/templates');
    expect(getByTestId('templates-mounted')).toBeTruthy();
  });
});

describe('Phase B feature ports — explicit Studio routes win over catch-all', () => {
  const portedRoutes = (
    <>
      <Route path="/b/:slug/identity" element={<div data-testid="studio-identity">studio-identity</div>} />
      <Route path="/b/:slug/folders" element={<div data-testid="studio-folders">studio-folders</div>} />
      <Route path="/b/:slug/share" element={<div data-testid="studio-share">studio-share</div>} />
      <Route path="/b/:slug/settings" element={<div data-testid="studio-settings">studio-settings</div>} />
      <Route path="/b/:slug/*" element={<StudioToClassicFallback />} />
      <Route path="/a/:slug/*" element={<div data-testid="classic-fallback">classic</div>} />
    </>
  );

  it('/b/:slug/identity mounts Studio Identity (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/identity', portedRoutes);
    expect(getByTestId('studio-identity')).toBeTruthy();
  });

  it('/b/:slug/folders mounts Studio Folders (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/folders', portedRoutes);
    expect(getByTestId('studio-folders')).toBeTruthy();
  });

  it('/b/:slug/share mounts Studio Share (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/share', portedRoutes);
    expect(getByTestId('studio-share')).toBeTruthy();
  });

  it('/b/:slug/settings mounts Studio Settings (does NOT fall through)', () => {
    const { getByTestId } = mount('/b/raqm/settings', portedRoutes);
    expect(getByTestId('studio-settings')).toBeTruthy();
  });

  it('an unmigrated path (e.g. /b/:slug/randomthing) still falls through', () => {
    const { getPath } = mount('/b/raqm/randomthing', portedRoutes);
    expect(getPath()).toBe('/a/raqm/randomthing');
  });
});
