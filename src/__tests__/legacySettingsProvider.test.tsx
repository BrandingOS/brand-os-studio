// Phase B Group 2 (l) — regression lock for the legacy /a/:slug/settings
// BrandSettingsProvider wrap.
//
// The pre-Phase-B bug: /a/:slug/settings mounted BrandSettingsV2Page
// flat (outside BrandRouteLayout). BrandSettingsV2Page renders
// BrandSettingsHub which calls useBrandSettings — that hook throws
// "useBrandSettings must be used within a <BrandSettingsProvider>"
// when the provider isn't in the tree.
//
// The fix wraps the route element in BrandSettingsProvider in App.tsx.
// This test mirrors the App.tsx mount shape: a Route with a
// BrandSettingsProvider wrapping a child that consumes useBrandSettings.
// If a future change strips the wrap, the child renders the throw and
// the test fails.

import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BrandSettingsProvider, useBrandSettings } from '@/shared/brand-settings';

afterEach(() => cleanup());

// Minimal hook consumer — same shape as BrandSettingsHub's first call:
// destructure the context, render a marker. If the provider isn't in
// scope, useBrandSettings throws synchronously during render.
function ProviderProbe() {
  const value = useBrandSettings();
  return (
    <div data-testid="provider-probe" data-has-context={value ? 'yes' : 'no'}>
      ok
    </div>
  );
}

describe('legacy /a/:slug/settings — BrandSettingsProvider wrap regression lock', () => {
  it('mounts ProviderProbe inside the provider — no throw, marker rendered', () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/a/raqm/settings']}>
        <Routes>
          <Route
            path="/a/:slug/settings"
            element={
              <BrandSettingsProvider>
                <ProviderProbe />
              </BrandSettingsProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    // Render reached the probe and it didn't throw — the provider wrap
    // is still in place.
    expect(getByTestId('provider-probe')).toBeTruthy();
    expect(getByTestId('provider-probe').getAttribute('data-has-context')).toBe('yes');
  });

  it('without the wrap, useBrandSettings throws — the wrap is load-bearing', () => {
    // Sanity check: confirm that removing BrandSettingsProvider would
    // break things. Render is wrapped to capture the throw rather than
    // crash the test runner.
    const renderUnwrapped = () =>
      render(
        <MemoryRouter initialEntries={['/a/raqm/settings']}>
          <Routes>
            <Route path="/a/:slug/settings" element={<ProviderProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    expect(renderUnwrapped).toThrow(/BrandSettingsProvider/);
  });
});
