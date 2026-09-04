// The Tools hub is a HUB: every card links out to a tool that already
// exists, and the hub owns none of them. So what is worth pinning is the
// wiring — that a tool is offered, and that it points at the brand-scoped
// route rather than the standalone one, which would drop the brand.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/shared/layouts/WorkspaceShell', () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/shared/hooks/useBrandFromSlug', () => ({
  useBrandFromSlug: () => ({ brand: { id: 'b1', name: 'Raqm', slug: 'raqm' }, isLoading: false }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ slug: 'raqm' }) };
});

import BrandToolsTabPage from './tools';

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/b/raqm/tools']}>
      <BrandToolsTabPage />
    </MemoryRouter>,
  );

afterEach(() => cleanup());

describe('Brand Tools hub — Bento', () => {
  it('offers Bento', () => {
    mount();
    expect(screen.getByText('Bento Grid')).toBeTruthy();
  });

  it('opens the brand-scoped Bento, not the standalone one', () => {
    mount();
    const link = screen.getByText('Bento Grid').closest('a');
    // /tools/bento is the no-brand route; reaching it from inside a brand
    // would silently drop the brand the tiles are generated from.
    expect(link?.getAttribute('href')).toBe('/b/raqm/bento');
  });

  it('sits with the other makers rather than in a section of its own', () => {
    mount();
    const utilities = screen.getByText('Bento Grid').closest('[data-key]');
    expect(utilities?.getAttribute('data-key')).toBe('utilities');
  });
});
