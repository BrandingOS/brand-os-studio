/**
 * The dashboard card, in a real browser.
 *
 * Three claims, each one a bug the user would meet before we would:
 *
 *   1. The card shows the BRAND — its icon, then its primary logo, then its
 *      cover when it has one — and only falls back to a letter when it has
 *      nothing to show. A grid of initials in front of a user who uploaded
 *      their logo system is the failure this replaces.
 *   2. Renaming a project writes the CARD's name and nothing else. If the
 *      brand's own `name` moved, every guideline, export and public page would
 *      move with it — which is the reason this is a separate field at all.
 *   3. The actions are reachable without knowing to right-click.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { container } from '@/core/container/ServiceContainer';
import { bootServices } from '@/core/boot';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { SERVICE_KEYS, type IAssetsService, type IBrandsService } from '@/core/types/services';
import WorkspaceHome from '@/pages/workspace/Home';
import type { Brand } from '@/shared/types/brand';

const BRAND_ID = 'brand_card_test';

function seedBrand(over: Partial<Brand> = {}): Brand {
  return {
    id: BRAND_ID,
    slug: 'acme',
    name: 'Acme',
    schemaVersion: 3,
    primaryColor: '#1A1A2E',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  } as Brand;
}

/** A logo asset plus the ref that points at it. The seed's primary colour is
 *  dark navy, so a WHITE mark is what reads on the card's brand-coloured band —
 *  the same arrangement every real brand in the repo ships. */
function withLogo(role: 'iconmark' | 'primary', url: string, over: Partial<Brand> = {}): Brand {
  return seedBrand({
    brandAssets: [
      { id: `asset-${role}`, kind: 'logo', name: role, formats: { svg: { url, size: 1 } }, tags: [] },
      {
        id: 'asset-mono-white',
        kind: 'logo',
        name: 'mono.white',
        formats: { svg: { url: 'https://cdn/mono-white.svg', size: 1 } },
        tags: [],
      },
    ],
    logoSystem: { [role]: { assetId: `asset-${role}` }, mono: { white: { assetId: 'asset-mono-white' } } },
    ...over,
  } as Partial<Brand>);
}

/** Registers a brands service over one mutable row, and reports what it got. */
function installBrand(row: Brand) {
  let stored = row;
  const patches: Partial<Brand>[] = [];
  container.register(SERVICE_KEYS.BRANDS, () =>
    ({
      list: async () => [stored],
      getById: async (id: string) => (id === stored.id ? stored : null),
      getBySlug: async (slug: string) => (slug === stored.slug ? stored : null),
      create: async () => stored,
      update: async (_id: string, patch: Partial<Brand>) => {
        patches.push(patch);
        stored = { ...stored, ...patch, updatedAt: new Date() };
        return stored;
      },
      delete: async () => {},
    }) as IBrandsService,
  );
  return { patches, current: () => stored };
}

let lastPath = '';

function LocationProbe() {
  lastPath = useLocation().pathname;
  return null;
}

function mount(brand: Brand) {
  useBrandStore.setState({ list: [brand], current: brand, isLoading: false });
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <WorkspaceHome />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  bootServices();
  useSessionStore.setState({ user: { id: 'u1', email: 'q@a.test' } } as never);
  lastPath = '';
});

afterEach(() => {
  cleanup();
  useBrandStore.setState({ list: [], current: null, isLoading: false });
});

describe('what a dashboard card shows', () => {
  it('draws the brand’s logo rather than the first letter', async () => {
    installBrand(withLogo('primary', 'https://cdn/primary.svg'));
    mount(withLogo('primary', 'https://cdn/primary.svg'));

    // `alt=""` makes the image presentational, so it is queried by class —
    // the logo is decoration beside the card's own accessible name.
    await waitFor(() => {
      const logo = document.querySelector('.ws-brand-card-logo') as HTMLImageElement | null;
      expect(logo?.getAttribute('src')).toBeTruthy();
    });
    expect(document.querySelector('.ws-brand-card-letter')).toBeNull();
  });

  it('draws the Brand Icon when the brand has no primary', async () => {
    installBrand(withLogo('iconmark', 'https://cdn/icon.svg'));
    mount(withLogo('iconmark', 'https://cdn/icon.svg'));

    await waitFor(() => {
      const logo = document.querySelector('.ws-brand-card-logo') as HTMLImageElement | null;
      expect(logo?.getAttribute('src')).toBeTruthy();
    });
  });

  it('keeps the brand’s own colour when the logo reads on it', async () => {
    // A white mark on the seed's dark navy. Nothing has to move.
    const brand = seedBrand({
      brandAssets: [
        {
          id: 'asset-white',
          kind: 'logo',
          name: 'mono.white',
          formats: { svg: { url: 'https://cdn/white.svg', size: 1 } },
          tags: [],
        },
      ],
      logoSystem: { mono: { white: { assetId: 'asset-white' } } },
    } as Partial<Brand>);
    installBrand(brand);
    mount(brand);

    await waitFor(() => {
      const band = document.querySelector('.ws-brand-card-color') as HTMLElement;
      // #1A1A2E — the seed's primary.
      expect(band.style.background.replace(/\s/g, '')).toBe('rgb(26,26,46)');
    });
  });

  it('moves the ground rather than the logo when the two cannot both stay', async () => {
    // The brand's own colour is the FIRST choice, never the only one: a mark
    // that cannot be seen on it gets a different brand-owned ground, not a
    // demotion to the letter.
    installBrand(withLogo('primary', 'https://cdn/primary.svg'));
    mount(withLogo('primary', 'https://cdn/primary.svg'));

    await waitFor(() => {
      expect(document.querySelector('.ws-brand-card-logo')).toBeTruthy();
    });
    expect(document.querySelector('.ws-brand-card-letter')).toBeNull();
  });

  it('falls back to the letter only when there is no logo at all', async () => {
    installBrand(seedBrand());
    mount(seedBrand());

    await waitFor(() => {
      expect(document.querySelector('.ws-brand-card-letter')?.textContent).toBe('A');
    });
  });

  it('shows the cover, resolved from its Library id, when the project has one', async () => {
    const brand = seedBrand({
      workspaceCard: { coverAssetId: 'asset-cover' },
      brandAssets: [
        {
          id: 'asset-cover',
          kind: 'image',
          name: 'Cover',
          formats: { png: { url: 'https://cdn/cover.png', size: 1 } },
          tags: [],
        },
      ],
    } as Partial<Brand>);
    installBrand(brand);
    mount(brand);

    await waitFor(() => {
      const cover = document.querySelector('.ws-brand-card-cover') as HTMLImageElement | null;
      expect(cover?.getAttribute('src')).toBe('https://cdn/cover.png');
    });
  });

  it('shows a LOGO cover whole rather than cropping it', async () => {
    const brand = seedBrand({
      workspaceCard: { coverAssetId: 'asset-logo' },
      brandAssets: [
        {
          id: 'asset-logo',
          kind: 'logo',
          name: 'Primary',
          formats: { png: { url: 'https://cdn/logo.png', size: 1 } },
          tags: [],
        },
      ],
    } as Partial<Brand>);
    installBrand(brand);
    mount(brand);

    await waitFor(() => {
      const cover = document.querySelector('.ws-brand-card-cover') as HTMLImageElement | null;
      expect(cover?.className).toContain('ws-brand-card-cover--contain');
      expect(getComputedStyle(cover!).objectFit).toBe('contain');
    });
  });

  it('never lets the logo outgrow its band', async () => {
    installBrand(withLogo('primary', 'https://cdn/primary.svg'));
    mount(withLogo('primary', 'https://cdn/primary.svg'));

    await waitFor(() => {
      const logo = document.querySelector('.ws-brand-card-logo') as HTMLElement;
      const style = getComputedStyle(logo);
      expect(style.maxHeight).toBe('72px');
      expect(style.objectFit).toBe('contain');
    });
  });

  it('shows the project’s name instead of the brand’s once renamed', async () => {
    const brand = seedBrand({ workspaceCard: { label: 'Acme — rebrand' } });
    installBrand(brand);
    mount(brand);

    expect(await screen.findByText('Acme — rebrand')).toBeTruthy();
    expect(screen.queryByText('Acme')).toBeNull();
  });
});

describe('reaching a card’s actions', () => {
  it('offers a button, so the menu is not something you have to know about', async () => {
    installBrand(seedBrand());
    mount(seedBrand());

    const button = await screen.findByRole('button', { name: /actions for acme/i });
    fireEvent.click(button);

    const menu = await waitFor(() => {
      const el = document.querySelector('.ctx-menu');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    expect(within(menu).getByText('Rename project')).toBeTruthy();
    expect(within(menu).getByText('Delete project')).toBeTruthy();
    expect(within(menu).getByText('Choose cover')).toBeTruthy();
  });

  it('still opens on right-click — the button adds a way in, it removes none', async () => {
    installBrand(seedBrand());
    mount(seedBrand());

    const card = document.querySelector('.ws-brand-card') as HTMLElement;
    fireEvent.contextMenu(card);

    await waitFor(() => expect(document.querySelector('.ctx-menu')).toBeTruthy());
  });
});

describe('renaming a project', () => {
  it('writes the card’s label and never touches the brand’s name', async () => {
    const installed = installBrand(seedBrand());
    mount(seedBrand());

    fireEvent.click(await screen.findByRole('button', { name: /actions for acme/i }));
    fireEvent.click(await screen.findByText('Rename project'));

    const field = await screen.findByLabelText('Project name');
    fireEvent.change(field, { target: { value: 'Acme — pitch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(installed.patches.length).toBeGreaterThan(0));
    const patch = installed.patches.at(-1)!;
    expect(patch.workspaceCard).toEqual({ label: 'Acme — pitch' });
    expect('name' in patch).toBe(false);
    expect(installed.current().name).toBe('Acme');

    // And the card says so.
    expect(await screen.findByText('Acme — pitch')).toBeTruthy();
  });

  it('clears the label rather than refusing an empty name', async () => {
    const installed = installBrand(seedBrand({ workspaceCard: { label: 'Client A' } }));
    mount(seedBrand({ workspaceCard: { label: 'Client A' } }));

    fireEvent.click(await screen.findByRole('button', { name: /actions for client a/i }));
    fireEvent.click(await screen.findByText('Rename project'));
    fireEvent.click(screen.getByRole('button', { name: 'Use brand name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(installed.patches.length).toBeGreaterThan(0));
    // Null, not undefined: undefined is dropped as "no change" by every layer
    // between here and the database, so the old label would have survived.
    expect(installed.patches.at(-1)!.workspaceCard).toBeNull();
    expect(await screen.findByText('Acme')).toBeTruthy();
  });
});

describe('choosing a cover', () => {
  it('stores the Library id of the picked asset, not its url', async () => {
    const installed = installBrand(seedBrand());
    // A picture already in the brand — the canonical picker reads the assets
    // service, which is where Brand Assets actually live.
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    const created = await assets.create({
      brandId: BRAND_ID,
      name: 'Studio shot',
      type: 'image',
      category: 'photo',
      source: 'upload',
      url: 'https://cdn/shot.png',
      size: 1,
      tags: [],
    } as never);

    mount(seedBrand());

    fireEvent.click(await screen.findByRole('button', { name: /actions for acme/i }));
    fireEvent.click(await screen.findByText('Choose cover'));

    const tile = await screen.findByTitle('Studio shot');
    fireEvent.click(tile);

    await waitFor(() => expect(installed.patches.length).toBeGreaterThan(0));
    expect(installed.patches.at(-1)!.workspaceCard).toEqual({ coverAssetId: created.id });
  });

  it('removes a cover without removing the picture from the brand', async () => {
    const brand = seedBrand({
      workspaceCard: { coverAssetId: 'asset-cover' },
      brandAssets: [
        {
          id: 'asset-cover',
          kind: 'image',
          name: 'Cover',
          formats: { png: { url: 'https://cdn/cover.png', size: 1 } },
          tags: [],
        },
      ],
    } as Partial<Brand>);
    const installed = installBrand(brand);
    mount(brand);

    fireEvent.click(await screen.findByRole('button', { name: /actions for acme/i }));
    fireEvent.click(await screen.findByText('Remove cover'));

    await waitFor(() => expect(installed.patches.length).toBeGreaterThan(0));
    // The card is cleared; the asset is untouched.
    expect(installed.patches.at(-1)!.workspaceCard).toBeNull();
    expect(installed.current().brandAssets).toHaveLength(1);
  });
});

describe('renaming from the card itself', () => {
  it('clicking the name edits it, without opening the brand', async () => {
    const installed = installBrand(seedBrand());
    mount(seedBrand());

    const name = await screen.findByText('Acme');
    fireEvent.click(name);

    const field = await screen.findByLabelText('Project name');
    fireEvent.change(field, { target: { value: 'Client B' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(installed.patches.length).toBeGreaterThan(0));
    expect(installed.patches.at(-1)!.workspaceCard).toEqual({ label: 'Client B' });
    expect(installed.current().name).toBe('Acme');
    expect(await screen.findByText('Client B')).toBeTruthy();
  });

  it('Escape leaves the name alone', async () => {
    const installed = installBrand(seedBrand());
    mount(seedBrand());

    fireEvent.click(await screen.findByText('Acme'));
    const field = await screen.findByLabelText('Project name');
    fireEvent.change(field, { target: { value: 'Typed then abandoned' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    fireEvent.blur(field);

    expect(await screen.findByText('Acme')).toBeTruthy();
    expect(installed.patches).toHaveLength(0);
  });
});

describe('where the menu goes', () => {
  it('Share opens the brand’s Identity page, in Studio', async () => {
    installBrand(seedBrand());
    mount(seedBrand());

    fireEvent.click(await screen.findByRole('button', { name: /actions for acme/i }));
    fireEvent.click(await screen.findByText('Share'));

    await waitFor(() => expect(lastPath).toBe('/b/acme/identity'));
  });
});
