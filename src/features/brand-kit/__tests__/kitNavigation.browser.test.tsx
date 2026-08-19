/**
 * The Brand Kit's navigation, in a real browser.
 *
 * The user-visible claim this file defends: the Brand Kit is ONE
 * workspace. Every item you are allowed to open is in the sidebar, and
 * getting from one to another is a single click — never a round trip out
 * through the board and back in.
 *
 * The second claim is about what is NOT there. Capabilities below `active`
 * must be invisible to an ordinary viewer, and no URL, param or click may
 * reveal them.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import { __setIsAdminTestOverride } from '@/shared/hooks/useIsAdmin';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

/** A brand that has actually answered Setup's strategy questions. */
const brandWithStrategy: MockBrand = {
  ...mockBrand,
  strategy: {
    ...mockBrand.strategy,
    summary: 'A careful studio for small teams.',
    mission: 'Make less, make better, make it last.',
    values: ['Clarity', 'Craft'],
  },
};

function renderKit(brand: MockBrand = brandWithStrategy) {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={brand} />
    </MemoryRouter>,
  );
}

/**
 * Let the enter transition's two-phase commit finish.
 *
 * Opening an item populates page 2 in one commit and flips the view on the
 * next frame, so the CSS transition has a prior state to interpolate from.
 * Anything asserting on the VIEW (the sidebar highlight) has to let that
 * frame pass; anything asserting on page 2's CONTENT does not.
 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

/** The sidebar's own row for `label`. */
function navRow(label: string): HTMLElement {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  return within(nav).getByText(label).closest('.panel-item') as HTMLElement;
}

async function openItem(label: string) {
  fireEvent.click(within(navRow(label)).getByText(label));
  await settle();
}

/** The heading of whichever item is currently open. */
function openTitle(): string | null {
  return document.querySelector('.bk-drilldown-title')?.textContent?.trim() ?? null;
}

afterEach(() => {
  __setIsAdminTestOverride(null);
  cleanup();
});

describe('Brand Kit — one continuous workspace', () => {
  it('lists every item in the sidebar, grouped, with no folder step', () => {
    renderKit();
    const nav = document.querySelector('.panel-list') as HTMLElement;

    const groupLabels = Array.from(nav.querySelectorAll('.panel-group-label')).map(
      (el) => el.textContent?.trim(),
    );
    expect(groupLabels).toEqual([
      'Brand Assets',
      'Brand Applications',
      'Social Media',
      'Presentations',
    ]);

    // The items themselves are rows, not things you reach by opening a
    // folder first.
    for (const label of ['Logos', 'Business Card', 'Invoice', 'Brand Board']) {
      expect(within(nav).getByText(label)).toBeTruthy();
    }
  });

  it('switches from one item straight to another', async () => {
    renderKit();

    await openItem('Business Card');
    expect(openTitle()).toBe('Business Card');

    // THE point of the change: no Back, no Overview, no second click.
    await openItem('Invoice');
    expect(openTitle()).toBe('Invoice');

    await openItem('Letterhead');
    expect(openTitle()).toBe('Letterhead');
  });

  it('highlights the open item and only that item', async () => {
    renderKit();
    await openItem('Invoice');

    expect(navRow('Invoice').className).toContain('is-active');
    expect(navRow('Business Card').className).not.toContain('is-active');
    expect(navRow('Overview').className).not.toContain('is-active');

    const active = document.querySelectorAll('.panel-item.is-active');
    expect(active.length).toBe(1);
  });

  it('starts on the Overview, and Overview is where an item takes you back to', async () => {
    renderKit();
    expect(navRow('Overview').className).toContain('is-active');

    await openItem('Business Card');
    expect(navRow('Overview').className).not.toContain('is-active');
  });
});

describe('Brand Kit — renamed items keep their storage identity', () => {
  it('shows Typography and Strategy, not Fonts and About', () => {
    renderKit();
    const nav = document.querySelector('.panel-list') as HTMLElement;

    expect(within(nav).getByText('Typography')).toBeTruthy();
    expect(within(nav).getByText('Strategy')).toBeTruthy();
    expect(within(nav).queryByText('Fonts')).toBeNull();
    expect(within(nav).queryByText('About')).toBeNull();
  });

  it('opens the renamed item under its new name', async () => {
    renderKit();
    await openItem('Typography');
    expect(openTitle()).toBe('Typography');
  });
});

describe('Brand Kit — composed views', () => {
  it('Strategy renders the brand strategy Setup owns, not a template grid', async () => {
    renderKit();
    await openItem('Strategy');

    // Setup's own card names, from STRATEGY_CARDS — and Setup's values.
    expect(screen.getByText('Brand summary')).toBeTruthy();
    expect(screen.getByText('A careful studio for small teams.')).toBeTruthy();
    expect(screen.getByText('Core values')).toBeTruthy();
    expect(screen.getByText('Clarity · Craft')).toBeTruthy();
    expect(document.querySelector('.bk-drilldown-grid')).toBeNull();
  });

  it('the Social Media System is a system AND an application', async () => {
    renderKit();
    await openItem('Social Media System');

    expect(screen.getByText('How this brand behaves on social')).toBeTruthy();
    expect(screen.getByText('Colour, in proportion')).toBeTruthy();
    expect(document.querySelector('.bk-drilldown-grid')).toBeNull();
  });

  it('the Presentation System is a system AND a real deck', async () => {
    renderKit();
    await openItem('Presentation System');

    expect(screen.getByText('How this brand presents')).toBeTruthy();
    expect(screen.getByText('Slide roles')).toBeTruthy();
  });

  it('offers no Download on a composed view — there are no variants to bundle', async () => {
    renderKit();

    await openItem('Business Card');
    expect(document.querySelector('.bk-drilldown .section-download')).toBeTruthy();

    await openItem('Strategy');
    expect(document.querySelector('.bk-drilldown .section-download')).toBeNull();
  });
});

describe('Brand Kit — capability visibility', () => {
  /**
   * Two halves, tested in the two places that can actually see them.
   *
   * Whether a STATE is visible to a given viewer is a pure function, and
   * `catalog.test.ts` pins all four states against all four viewers —
   * including the one that matters most, a production user seeing nothing
   * but `active`.
   *
   * What only a rendered page can prove is that the page asks that
   * question at all, and renders exactly the answer. `import.meta.env.DEV`
   * is true under Vitest, so this viewer is dev-eligible — which makes it
   * the right viewer for that proof: experimental items must appear, and
   * hidden ones must still not.
   */
  it('renders exactly what the catalog says this viewer may see', () => {
    __setIsAdminTestOverride({ isAdmin: false });
    renderKit();
    const nav = document.querySelector('.panel-list') as HTMLElement;

    // Dev-eligible → the retired-but-working families are reachable, which
    // is the whole point of not deleting them.
    for (const kept of ['Envelope', 'Website', 'Pitch Deck', 'Logo Reveal']) {
      expect(within(nav).getByText(kept)).toBeTruthy();
    }

    // `hidden` is hidden from everyone, dev builds included — the
    // guideline duplicates have a shipped surface of their own.
    for (const gone of ['Logo Guide', 'Color Guide', 'Typography Guide']) {
      expect(within(nav).queryByText(gone)).toBeNull();
    }
  });

  it('marks a capability that is not part of the product yet', () => {
    renderKit();
    // A dev/admin viewer is told what they are looking at; a normal user
    // never sees the row, so never sees the badge.
    expect(within(navRow('Envelope')).getByText('experimental')).toBeTruthy();
    expect(within(navRow('Business Card')).queryByText('experimental')).toBeNull();
  });

  it('offers a group download for a group that spans two storage sections', () => {
    // Brand Applications draws Business Card / Letterhead / Invoice from
    // `stationery::` and Email Signature from `web::`. The download used
    // to be keyed by one storage section, so a regrouped item could not
    // be bundled with the group it now belongs to.
    renderKit();
    const sections = Array.from(document.querySelectorAll('.bk-stage-layer--page1 .section'));
    const applications = sections.find(
      (el) => el.querySelector('h2')?.textContent === 'Brand Applications',
    ) as HTMLElement;
    expect(applications).toBeTruthy();
    expect(applications.querySelector('.section-download')).toBeTruthy();
  });

  it('never renders a group that has nothing in it', () => {
    renderKit();
    const nav = document.querySelector('.panel-list') as HTMLElement;
    const groups = nav.querySelectorAll('.bk-nav-group');
    for (const group of Array.from(groups)) {
      expect(group.querySelectorAll('.panel-item').length).toBeGreaterThan(0);
    }
  });
});
