// Phase A v2 — regression-lock for the click-time UI-preference bug.
//
// Originally reported in Phase A visual verification (Issue 2): with
// Classic set as the user's preference, clicking "Open" on a brand card
// in /dashboard/brands navigated to /b/:slug/setup (Studio) instead of
// /a/:slug/setup (Classic). Commit 6's path harmonization closed the
// underlying inconsistency. This test locks in the correct behavior
// across both preferences so a future change can't silently regress.
//
// Strategy: render BrandsPage inside a MemoryRouter, swap the
// uiPreference store, click "Open", and assert the resulting URL.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BrandsPage from './index';
import { useUiPreferenceStore } from '@/shared/hooks/useUiPreference';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';

const fakeBrand = (slug = 'raqm'): Brand => ({
  id: `brand-${slug}`, slug, name: slug.toUpperCase(),
  primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
  tone: 'casual', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
});

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
}

let lastPath = '';

beforeEach(() => {
  // Reset stores to known state.
  localStorage.clear();
  useUiPreferenceStore.setState({ preference: 'studio' });
  useBrandStore.setState({
    list: [fakeBrand('raqm'), fakeBrand('skam')],
    isLoading: false,
    loadAll: vi.fn(),
  } as never);
  lastPath = '';
});

afterEach(() => {
  cleanup();
});

function mount() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/brands']}>
      <Routes>
        <Route path="/dashboard/brands" element={<BrandsPage />} />
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe onChange={(p) => { lastPath = p; }} />
    </MemoryRouter>,
  );
}

describe('BrandsPage — Open button respects UI preference (regression lock)', () => {
  it('Studio default: Open → /b/:slug/setup', () => {
    const { getAllByRole } = mount();
    const openButtons = getAllByRole('button', { name: /Open/ });
    fireEvent.click(openButtons[0]);
    expect(lastPath).toBe('/b/raqm/setup');
  });

  it('Classic preference: Open → /a/:slug/setup (the original Issue 2 bug)', () => {
    useUiPreferenceStore.setState({ preference: 'classic' });
    const { getAllByRole } = mount();
    const openButtons = getAllByRole('button', { name: /Open/ });
    fireEvent.click(openButtons[0]);
    expect(lastPath).toBe('/a/raqm/setup');
  });

  it('Brand Kit button: Studio → /b/:slug/brand-kit (cosmos hub)', () => {
    const { getAllByRole } = mount();
    const kitButtons = getAllByRole('button', { name: /Brand Kit/ });
    fireEvent.click(kitButtons[0]);
    expect(lastPath).toBe('/b/raqm/brand-kit');
  });

  it('Brand Kit button: Classic → /a/:slug/brand-kit (legacy hub at harmonized path)', () => {
    useUiPreferenceStore.setState({ preference: 'classic' });
    const { getAllByRole } = mount();
    const kitButtons = getAllByRole('button', { name: /Brand Kit/ });
    fireEvent.click(kitButtons[0]);
    expect(lastPath).toBe('/a/raqm/brand-kit');
  });
});
