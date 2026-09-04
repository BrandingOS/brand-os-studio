// The launcher is an OWNER control on a page that is also published, so the
// thing worth pinning is not that it renders — it is that it cannot reach the
// public mount, and that it goes to the brand-scoped Bento rather than the
// standalone one.
import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IdentityModelContext } from '../identityContext';
import type { IdentityModel } from '../identityModel';
import { IdentityBentoAction } from './IdentityBentoAction';

const model = (brand: unknown) => ({ brand, name: 'Raqm' }) as unknown as IdentityModel;

const mount = (value: IdentityModel | null) =>
  render(
    <MemoryRouter>
      <IdentityModelContext.Provider value={value}>
        <IdentityBentoAction />
      </IdentityModelContext.Provider>
    </MemoryRouter>,
  );

afterEach(() => cleanup());

describe('IdentityBentoAction', () => {
  it('opens this brand’s Bento', () => {
    mount(model({ id: 'b1', slug: 'raqm', name: 'Raqm' }));
    // Not /tools/bento: that is the no-brand maker, and arriving there from a
    // brand page would silently drop the brand the tiles come from.
    expect(screen.getByText('Bento').getAttribute('href')).toBe('/b/raqm/bento');
  });

  it('renders nothing rather than a link to nowhere when the brand has no slug', () => {
    const { container } = mount(model({ id: 'b1', name: 'Raqm' }));
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing outside the identity page', () => {
    const { container } = mount(null);
    expect(container.innerHTML).toBe('');
  });
});
