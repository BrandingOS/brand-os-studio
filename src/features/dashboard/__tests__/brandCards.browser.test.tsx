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

function mountMany(brands: Brand[]) {
  useBrandStore.setState({ list: brands, current: brands[0], isLoading: false, listReady: true });
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <WorkspaceHome />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function mount(brand: Brand) {
  useBrandStore.setState({ list: [brand], current: brand, isLoading: false, listReady: true });
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
  // Home keeps the skeleton up until BOTH are confirmed — the signed-in
  // identity and that identity's brand list — so that a visitor never
  // sees someone else's brands flash past. A test that only puts brands
  // in the store now renders skeletons.
  useSessionStore.setState({
    user: { id: 'u1', email: 'q@a.test' },
    isAuthenticated: true,
    isLoading: false,
  } as never);
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
    expect(within(menu).getByText('Change cover')).toBeTruthy();
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

describe('selecting projects', () => {
  const three = () => [
    seedBrand({ id: 'b1', slug: 'one', name: 'One' }),
    seedBrand({ id: 'b2', slug: 'two', name: 'Two' }),
    seedBrand({ id: 'b3', slug: 'three', name: 'Three' }),
  ];

  function installMany(brands: Brand[]) {
    let stored = [...brands];
    const patches: Array<{ id: string; patch: Partial<Brand> }> = [];
    const deleted: string[] = [];
    container.register(SERVICE_KEYS.BRANDS, () =>
      ({
        list: async () => stored,
        getById: async (id: string) => stored.find((b) => b.id === id) ?? null,
        getBySlug: async (slug: string) => stored.find((b) => b.slug === slug) ?? null,
        create: async () => stored[0]!,
        update: async (id: string, patch: Partial<Brand>) => {
          patches.push({ id, patch });
          stored = stored.map((b) => (b.id === id ? { ...b, ...patch } : b));
          return stored.find((b) => b.id === id)!;
        },
        delete: async (id: string) => {
          deleted.push(id);
          stored = stored.filter((b) => b.id !== id);
        },
      }) as IBrandsService,
    );
    return { patches, deleted };
  }

  /** Entering the mode the way a user has to: from the card's own menu. */
  const selectFromMenu = async (name: string) => {
    fireEvent.click(await screen.findByRole('button', { name: `Actions for ${name}` }));
    fireEvent.click(await screen.findByText('Select'));
  };

  it('the menu is the way in, and then every card has a checkbox', async () => {
    installMany(three());
    mountMany(three());

    await selectFromMenu('One');
    expect(await screen.findByText('1 selected')).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Three' }));
    expect(await screen.findByText('2 selected')).toBeTruthy();
  });

  it('and nothing reveals that checkbox on hover', async () => {
    installMany(three());
    mountMany(three());

    const slot = document.querySelector('[data-project-id="b1"]') as HTMLElement;
    const check = screen.getByRole('checkbox', { name: 'Select One' });
    fireEvent.pointerOver(slot);
    fireEvent.mouseOver(slot);

    // A control under the pointer on every card the eye passes over is noise on
    // a page people mostly come to in order to open ONE brand. Invisible is not
    // enough either — it sits in the card's corner, so it must also be out of
    // the way of the click meant for the card.
    expect(getComputedStyle(check).opacity).toBe('0');
    expect(getComputedStyle(check).pointerEvents).toBe('none');
  });

  it('Shift takes the run between the two', async () => {
    installMany(three());
    mountMany(three());

    await selectFromMenu('One');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Three' }), { shiftKey: true });

    expect(await screen.findByText('3 selected')).toBeTruthy();
  });

  it('a card click selects rather than opens once a selection is running', async () => {
    installMany(three());
    mountMany(three());

    await selectFromMenu('One');
    const card = document.querySelector('[data-project-id="b2"] .ws-brand-card') as HTMLElement;
    fireEvent.click(card);

    expect(await screen.findByText('2 selected')).toBeTruthy();
    // The brand was NOT opened.
    expect(lastPath).toBe('/dashboard');
  });

  it('moves the selected projects into a folder, and offers it afterwards', async () => {
    const installed = installMany(three());
    mountMany(three());

    await selectFromMenu('One');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Two' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to folder' }));

    const field = await screen.findByLabelText('Folder name');
    fireEvent.change(field, { target: { value: 'Client work' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and move' }));

    await waitFor(() => expect(installed.patches.length).toBe(2));
    expect(installed.patches.every((p) => p.patch.workspaceCard?.folder === 'Client work')).toBe(
      true,
    );
    // A folder is a name the projects carry, so the bar is derived from them.
    expect(await screen.findByRole('tab', { name: 'Client work' })).toBeTruthy();
  });

  /** Press, travel, release — the gesture as a mouse actually performs it. */
  const drag = (from: Element, to: Element) => {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const start = { clientX: a.left + a.width / 2, clientY: a.top + a.height / 2 };
    const end = { clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 };
    fireEvent.pointerDown(from, { button: 0, pointerType: 'mouse', ...start });
    fireEvent.pointerMove(window, { ...end });
    fireEvent.pointerUp(window, { ...end });
  };

  it('a band dragged FROM a card selects everything it crosses', async () => {
    installMany(three());
    mountMany(three());

    const slots = document.querySelectorAll('[data-project-id]');
    // Requiring empty space made this gesture nearly unreachable: a full grid
    // is mostly cards, so there was almost nowhere left to start.
    drag(slots[0], slots[2]);

    expect(await screen.findByText('3 selected')).toBeTruthy();
  });

  it('and a band started off the grid entirely still works', async () => {
    installMany(three());
    mountMany(three());

    // The grid is a narrow strip of a wide page. Requiring the press to land on
    // it put the margins, the heading and the space under the last row — most
    // of what the eye reads as empty — out of reach.
    const heading = document.querySelector('.ws-hero-title')!;
    drag(heading, document.querySelectorAll('[data-project-id]')[1]);

    expect(await screen.findByText('2 selected')).toBeTruthy();
  });

  it('and the card it started on does not open', async () => {
    installMany(three());
    mountMany(three());

    const slots = document.querySelectorAll('[data-project-id]');
    drag(slots[0], slots[2]);
    // The click the release fires would otherwise open the brand and throw
    // away the selection the drag had just made.
    fireEvent.click(slots[0].querySelector('.ws-brand-card')!);

    expect(lastPath).toBe('/dashboard');
  });

  it('but a press that never travels is still a click', async () => {
    installMany(three());
    mountMany(three());

    const card = document.querySelector('[data-project-id="b1"] .ws-brand-card') as HTMLElement;
    const r = card.getBoundingClientRect();
    const at = { clientX: r.left + 10, clientY: r.top + 10 };
    fireEvent.pointerDown(card, { button: 0, pointerType: 'mouse', ...at });
    fireEvent.pointerUp(window, { ...at });
    fireEvent.click(card);

    expect(lastPath).not.toBe('/dashboard');
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it('Escape clears the selection', async () => {
    installMany(three());
    mountMany(three());

    await selectFromMenu('One');
    expect(await screen.findByText('1 selected')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('1 selected')).toBeNull());
  });
});

/**
 * The cover picker exists because the two halves of a card's face are ONE
 * decision. The card measures its way to both, and when nothing reads it takes
 * the pairing that loses least — which is how a primary-colour mark lands on
 * the primary-colour ground it disappears into. Forcing the logo alone never
 * fixed that: the ground simply moved to suit whichever variant was forced.
 *
 * It applies on click, with no draft and nothing to confirm, because the card
 * it changes is right there behind it.
 */
describe('choosing the logo and the colour', () => {
  /** A brand whose only mark is inked in its own colour — the invisible case. */
  const soleColouredMark = (): Brand =>
    seedBrand({
      primaryColor: '#EF4444',
      brandAssets: [
        {
          id: 'asset-primary',
          kind: 'logo',
          name: 'primary',
          formats: { svg: { url: 'https://cdn/primary.svg', size: 1 } },
          tags: [],
        },
      ],
      logoSystem: { primary: { assetId: 'asset-primary' } },
    } as Partial<Brand>);

  /** That brand, plus a white twin — so there are two variants to choose from. */
  const withWhiteTwin = (): Brand =>
    seedBrand({
      primaryColor: '#EF4444',
      brandAssets: [
        {
          id: 'asset-primary',
          kind: 'logo',
          name: 'primary',
          formats: { svg: { url: 'https://cdn/primary.svg', size: 1 } },
          tags: [],
        },
        {
          id: 'asset-mono-white',
          kind: 'logo',
          name: 'mono.white',
          formats: { svg: { url: 'https://cdn/white.svg', size: 1 } },
          tags: [],
        },
      ],
      logoSystem: {
        primary: { assetId: 'asset-primary' },
        mono: { white: { assetId: 'asset-mono-white' } },
      },
    } as Partial<Brand>);

  const openPicker = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /actions for acme/i }));
    fireEvent.click(await screen.findByText('Change cover'));
    return screen.findByRole('radiogroup', { name: 'Brand Logos' });
  };

  it('offers the brand’s logos and the brand’s colours, in that order', async () => {
    installBrand(withWhiteTwin());
    mount(withWhiteTwin());
    const logos = await openPicker();

    expect(within(logos).getAllByRole('radio').length).toBe(2);

    const colours = screen.getByRole('radiogroup', { name: 'Brand Colors' });
    const names = within(colours)
      .getAllByRole('radio')
      .map((el) => el.getAttribute('aria-label') ?? '');
    expect(names.some((n) => n.startsWith('Primary'))).toBe(true);
    // The two the automatic rule reaches for have to be offerable by hand, or
    // the control could not express the answer that fixes an invisible mark.
    expect(names.some((n) => n.startsWith('Dark'))).toBe(true);
    expect(names.some((n) => n.startsWith('Light'))).toBe(true);
  });

  it('shuffles to a pairing the card is not already wearing', async () => {
    const installed = installBrand(withWhiteTwin());
    mount(withWhiteTwin());

    const faceNow = () => {
      const band = document.querySelector('.ws-brand-card-color') as HTMLElement;
      const logo = document.querySelector('.ws-brand-card-logo') as HTMLImageElement | null;
      return `${band.style.background}|${logo?.getAttribute('src') ?? ''}`;
    };
    const before = faceNow();

    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Acme' }));
    fireEvent.click(await screen.findByText('Shuffle cover'));

    await waitFor(() => expect(installed.patches.length).toBe(1));
    // It steps from what the card is SHOWING, not from what it has stored — a
    // card that has never been touched stores nothing, and starting at the head
    // of the list would apply the answer already on screen: one press that
    // visibly does nothing, on the control whose whole promise is that it does.
    await waitFor(() => expect(faceNow()).not.toBe(before));
  });

  it('and offers no shuffle to a brand with nothing to shuffle', async () => {
    // No artwork, so every ground shows the same letter. One offer is not a
    // choice, and a control that cannot change anything should not be there.
    installBrand(seedBrand());
    mount(seedBrand());

    fireEvent.click(await screen.findByRole('button', { name: 'Actions for Acme' }));
    await screen.findByText('Change cover');
    expect(screen.queryByText('Shuffle cover')).toBeNull();
  });

  it('shows the logos on nothing — a tile is not a preview of the pairing', async () => {
    const brand = withWhiteTwin();
    brand.workspaceCard = { coverBackground: '#EF4444' };
    installBrand(brand);
    mount(brand);
    const logos = await openPicker();

    const grounds = within(logos)
      .getAllByRole('radio')
      .map((el) => (el as HTMLElement).style.background);

    // Painting the tiles with the card's ground made the picker look like it
    // had already applied something, and put a second, smaller answer to the
    // pairing question next to the card that is the real one.
    expect(grounds.some((g) => g.includes('239, 68, 68') || g.includes('#EF4444'))).toBe(false);

    // A chip appears only so a mark can be SEEN: white artwork on plain black,
    // and nothing at all behind artwork that reads either way.
    const white = within(logos).getByRole('radio', { name: /on dark|white/i });
    expect(white.style.background).toBe('rgb(20, 20, 20)');
  });

  it('applies a colour on click — no Save, and the popover stays open', async () => {
    const installed = installBrand(withWhiteTwin());
    mount(withWhiteTwin());
    await openPicker();

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Brand Colors' })).getByRole('radio', {
        name: /^Primary/,
      }),
    );

    await waitFor(() => expect(installed.patches.length).toBe(1));
    expect(installed.patches[0].workspaceCard).toEqual({ coverBackground: '#EF4444' });
    // Still open, so the other half can be chosen against the card itself.
    expect(screen.getByRole('radiogroup', { name: 'Brand Logos' })).toBeTruthy();
  });

  it('keeps both halves when they are picked one after the other', async () => {
    const installed = installBrand(withWhiteTwin());
    mount(withWhiteTwin());
    const logos = await openPicker();

    fireEvent.click(within(logos).getByRole('radio', { name: /on dark|white/i }));
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Brand Colors' })).getByRole('radio', {
        name: /^Dark/,
      }),
    );

    // The second write must be built from the FIRST one's result, not from the
    // brand this render closed over — otherwise choosing the colour silently
    // undoes the logo that was chosen a moment earlier.
    await waitFor(() => expect(installed.patches.length).toBe(2));
    const card = installed.current().workspaceCard;
    expect(card?.logoRole).toBe('mono.white');
    expect(card?.coverBackground).toBeTruthy();
  });

  it('changes one half without disturbing the other', async () => {
    const brand = withWhiteTwin();
    brand.workspaceCard = { coverBackground: '#EF4444' };
    const installed = installBrand(brand);
    mount(brand);
    await openPicker();

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Brand Logos' })).getByRole('radio', {
        name: 'On dark',
      }),
    );

    await waitFor(() => expect(installed.patches.length).toBe(1));
    expect(installed.patches[0].workspaceCard).toEqual({
      coverBackground: '#EF4444',
      logoRole: 'mono.white',
    });
  });

  it('keeps the ground the user chose, where the measurement would have moved it', async () => {
    // The whole point. This brand owns ONE mark and it is inked in the brand's
    // own colour, so left alone the card refuses that colour and moves the
    // ground. Asked for it, the card must obey — the person choosing can see
    // the result and we cannot.
    const brand = soleColouredMark();
    installBrand(brand);
    mount(brand);

    await waitFor(() => {
      const band = document.querySelector('.ws-brand-card-color') as HTMLElement;
      expect(band.style.background.replace(/\s/g, '')).not.toBe('rgb(239,68,68)');
    });

    await openPicker();
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Brand Colors' })).getByRole('radio', {
        name: /^Primary/,
      }),
    );

    await waitFor(() => {
      const band = document.querySelector('.ws-brand-card-color') as HTMLElement;
      expect(band.style.background.replace(/\s/g, '')).toBe('rgb(239,68,68)');
    });
  });

  it('clears a full-bleed photo, which would otherwise hide the choice', async () => {
    const brand = withWhiteTwin();
    brand.workspaceCard = { coverAssetId: 'asset-cover' };
    brand.brandAssets = [
      ...(brand.brandAssets ?? []),
      {
        id: 'asset-cover',
        kind: 'image',
        name: 'Cover',
        formats: { png: { url: 'https://cdn/cover.png', size: 1 } },
        tags: [],
      },
    ] as never;
    const installed = installBrand(brand);
    mount(brand);
    await openPicker();

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Brand Colors' })).getByRole('radio', {
        name: /^Primary/,
      }),
    );

    await waitFor(() => expect(installed.patches.length).toBe(1));
    expect(installed.patches[0].workspaceCard).toEqual({ coverBackground: '#EF4444' });
    // The picture stays in the brand; only the card stopped using it.
    expect(installed.current().brandAssets?.some((a) => a.id === 'asset-cover')).toBe(true);
  });
});
