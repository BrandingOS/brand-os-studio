/**
 * Browser E2E — the builder as a user meets it.
 *
 * The test that matters most here is the last one: editing a brand value
 * inside the guideline must NOT write to the brand. That rule is the reason
 * the override layer exists, and it is invisible in the UI until it is broken.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Brand } from '@/shared/types/brand';

const updateBrand = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@/shared/store/brandStore', () => ({
  useBrandStore: (selector: (s: unknown) => unknown) => selector({ update: updateBrand }),
}));

import { saveSnapshot, deleteSnapshot } from '@/shared/editor/snapshotIDB';
import { GuidelineBuilder } from '../builder/GuidelineBuilder';
import { DEFAULT_PAGE_COUNT } from '../model/document';
import { guidelineEditorKey, useGuidelineDocStore } from '../model/guidelineDocStore';

const brand = {
  id: 'brand-test-1',
  slug: 'acme',
  name: 'Acme',
  primaryColor: '#123456',
  secondaryColor: '#654321',
  fonts: { primary: 'Inter', secondary: 'Georgia' },
  tone: 'Confident',
  audience: '',
  assets: [],
  guidelines: { strategy: { mission: 'Make good things.', values: ['Care'] } },
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Brand;

function mount() {
  return render(
    <div data-workspace data-theme="light">
      <MemoryRouter initialEntries={['/b/acme/guideline']}>
        <GuidelineBuilder brand={brand} slug="acme" />
      </MemoryRouter>
    </div>,
  );
}

/** Build the document and wait for the first page to paint. */
async function mountBuilt() {
  mount();
  fireEvent.click(screen.getByRole('button', { name: /build brand guidelines/i }));
  await screen.findByRole('navigation', { name: 'Guideline pages' });
}

const pageCards = () => document.querySelectorAll('.gl-page');
const sidebar = () => document.querySelector('.gl-sidebar') as HTMLElement;

beforeEach(() => {
  useGuidelineDocStore.setState({ docs: {} });
  updateBrand.mockClear();
});
afterEach(() => cleanup());

describe('first visit', () => {
  it('is one action and nothing else', () => {
    mount();
    expect(screen.getByRole('button', { name: /build brand guidelines/i })).toBeTruthy();
    expect(pageCards()).toHaveLength(0);
    // No template gallery, no blank-document escape hatch.
    expect(screen.queryByRole('navigation', { name: 'Guideline pages' })).toBeNull();
  });

  it('says what is missing without blocking the build', () => {
    // This brand has no logo, so the notice appears — and Build still works.
    expect(mount).not.toThrow();
    expect(screen.getByText(/has no a logo/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /build brand guidelines/i }) as HTMLButtonElement).disabled)
      .toBe(false);
  });
});

describe('building', () => {
  it('creates the whole document from the brand in one click', async () => {
    await mountBuilt();
    expect(pageCards()).toHaveLength(DEFAULT_PAGE_COUNT);
    expect(screen.getByText(`${DEFAULT_PAGE_COUNT} pages`)).toBeTruthy();
  });

  it('renders the pages as a vertical document, in order', async () => {
    await mountBuilt();
    const cards = Array.from(pageCards()) as HTMLElement[];
    // Top to bottom: each page starts below the previous one.
    for (let i = 1; i < Math.min(cards.length, 6); i += 1) {
      expect(cards[i].offsetTop).toBeGreaterThan(cards[i - 1].offsetTop);
    }
  });
});

describe('the outline', () => {
  it('selects a page and opens its editor in the sidebar', async () => {
    await mountBuilt();
    const outline = screen.getByRole('navigation', { name: 'Guideline pages' });
    fireEvent.click(within(outline).getByText('Logo construction'));

    await waitFor(() => {
      expect(within(sidebar()).getByRole('heading', { name: 'Logo construction' })).toBeTruthy();
    });
    // Brand source above, page settings below — the split the panel promises.
    expect(within(sidebar()).getByText('From the brand')).toBeTruthy();
    expect(within(sidebar()).getByText('This page')).toBeTruthy();
    expect(document.querySelector('.gl-page[data-selected]')).toBeTruthy();
  });

  it('comes back out to the outline', async () => {
    await mountBuilt();
    const outline = screen.getByRole('navigation', { name: 'Guideline pages' });
    fireEvent.click(within(outline).getByText('Logo construction'));
    await waitFor(() => expect(within(sidebar()).getByText('This page')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Back to outline' }));
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Guideline pages' })).toBeTruthy();
    });
  });
});

describe('clicking a page', () => {
  it('selects it rather than starting an edit', async () => {
    await mountBuilt();
    const first = pageCards()[0] as HTMLElement;
    // The first click lands on a select layer, so it cannot drop a caret into
    // the page by accident.
    const hit = first.querySelector('.gl-page-hit') as HTMLElement;
    expect(hit).toBeTruthy();
    fireEvent.click(hit);
    await waitFor(() => expect(first.dataset.selected).toBe('true'));
    // Once selected, the select layer is gone and the page itself is live.
    expect(first.querySelector('.gl-page-hit')).toBeNull();
  });
});

describe('adding a page', () => {
  it('inserts at the chosen point and takes the user to it', async () => {
    await mountBuilt();
    const before = pageCards().length;

    fireEvent.click(screen.getByRole('button', { name: 'Add page' }));
    await screen.findByText(/^Adds after/);
    fireEvent.click(within(sidebar()).getByText('Motion principles'));

    await waitFor(() => expect(pageCards()).toHaveLength(before + 1));
    // A second instance of a type keeps its own id, so its edits stay separate.
    expect(document.querySelector('[data-page-id="motion-2"]')).toBeTruthy();
  });

  it('offers an insert point between two pages', async () => {
    await mountBuilt();
    const inserts = document.querySelectorAll('.gl-insert-btn');
    expect(inserts.length).toBe(DEFAULT_PAGE_COUNT + 1);

    fireEvent.click(inserts[1]);
    await waitFor(() => expect(screen.getByText(/^Adds after/)).toBeTruthy());
    // Inserting before page 2 means adding after page 1.
    expect(within(sidebar()).getByText(/page 1 ·/)).toBeTruthy();
  });
});

describe('brand values are guideline-scoped until the user says otherwise', () => {
  it('does not write to the brand when a colour is changed', async () => {
    await mountBuilt();
    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));

    const hex = await screen.findByLabelText('Primary colour hex');
    fireEvent.change(hex, { target: { value: '#ff0000' } });

    await waitFor(() => expect(within(sidebar()).getByText('Guideline only')).toBeTruthy());
    expect(updateBrand).not.toHaveBeenCalled();
    // …and the document repaints with the guideline's colour, not the brand's.
    expect(useGuidelineDocStore.getState().get(brand.id)!.overrides.primaryColor).toBe('#ff0000');
  });

  it('asks before it changes the brand, and says what that means', async () => {
    await mountBuilt();
    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));
    fireEvent.change(await screen.findByLabelText('Primary colour hex'), {
      target: { value: '#ff0000' },
    });
    await waitFor(() => expect(within(sidebar()).getByText('Guideline only')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /update brand…/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/changes the brand itself/i)).toBeTruthy();
    // Still nothing written while the question is on screen.
    expect(updateBrand).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /update the brand/i }));
    await waitFor(() => expect(updateBrand).toHaveBeenCalledWith(brand.id, { primaryColor: '#ff0000' }));
  });

  it('lets the user back out, leaving the guideline value in place', async () => {
    await mountBuilt();
    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));
    fireEvent.change(await screen.findByLabelText('Primary colour hex'), {
      target: { value: '#00ff00' },
    });
    await waitFor(() => expect(within(sidebar()).getByText('Guideline only')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /update brand…/i }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /keep it to this guideline/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(updateBrand).not.toHaveBeenCalled();
    expect(useGuidelineDocStore.getState().get(brand.id)!.overrides.primaryColor).toBe('#00ff00');
  });

  it('resets back to the brand value', async () => {
    await mountBuilt();
    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));
    fireEvent.change(await screen.findByLabelText('Primary colour hex'), {
      target: { value: '#ff0000' },
    });
    await waitFor(() => expect(within(sidebar()).getByText('Guideline only')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Reset to brand' }));
    await waitFor(() => expect(within(sidebar()).queryByText('Guideline only')).toBeNull());
    expect(updateBrand).not.toHaveBeenCalled();
  });
});

describe('removing a page', () => {
  it('confirms first', async () => {
    await mountBuilt();
    const before = pageCards().length;
    fireEvent.click(document.querySelector('.gl-page-hit') as HTMLElement);
    await waitFor(() => expect(within(sidebar()).getByText('This page')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /remove page/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(pageCards()).toHaveLength(before);

    fireEvent.click(within(dialog).getAllByRole('button', { name: /remove page/i })[0]);
    await waitFor(() => expect(pageCards()).toHaveLength(before - 1));
  });
});

describe('the sidebar', () => {
  it('closes and reopens from the rail', async () => {
    await mountBuilt();
    expect(sidebar()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    await waitFor(() => expect(document.querySelector('.gl-sidebar')).toBeNull());
    // The document is still there to browse — that is the point of closing it.
    expect(pageCards()).toHaveLength(DEFAULT_PAGE_COUNT);

    fireEvent.click(screen.getByRole('button', { name: 'Content' }));
    await waitFor(() => expect(document.querySelector('.gl-sidebar')).toBeTruthy());
  });
});

describe('edits made before the builder existed', () => {
  const editorKey = guidelineEditorKey(brand.id);

  afterEach(async () => { await deleteSnapshot(editorKey, 'cover'); });

  it('still load, in the wrapper shape the old deck editor wrote', async () => {
    // The retired deck editor captured the OUTER slide canvas, so its snapshots
    // carry two layout wrappers around the content. The builder captures the
    // inner content node instead — this proves the old shape still renders,
    // which is the difference between "we changed the editor" and "we deleted
    // everyone's work".
    const legacy =
      '<div class="absolute inset-0"><div class="relative w-full h-full">'
      + '<div class="w-full h-full"><div class="relative w-full aspect-video">'
      + '<h1 data-legacy-probe>KEPT</h1></div></div></div></div>';
    await saveSnapshot(editorKey, 'cover', legacy);

    await mountBuilt();

    await waitFor(() => {
      const probe = document.querySelector('[data-page-id="cover"] [data-legacy-probe]');
      expect(probe?.textContent).toBe('KEPT');
    });
    // …and it is marked as edited, so the user can tell it apart and reset it.
    expect(document.querySelector('[data-page-id="cover"] .gl-page-edited')).toBeTruthy();
  });
});
