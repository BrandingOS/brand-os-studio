/**
 * Browser E2E — the builder as a user meets it.
 *
 * The tests that matter most are the last two groups: editing a brand value
 * inside the guideline must NOT write to the brand, and undo must take back a
 * whole action rather than half of one. Both rules are invisible in the UI
 * until they are broken.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Brand } from '@/shared/types/brand';

// The builder mounts the real `WorkspaceShell`, which mounts `BrandSwitcher`,
// which reads the brand list — so the mock has to be a believable store, not
// just the one action under test. `getState` is needed too: the canonical
// brand write path goes through it.
const store = vi.hoisted(() => ({
  list: [] as unknown[],
  current: undefined as unknown,
  isLoading: false,
  update: vi.fn(async (_brandId: string, _patch: unknown) => {}),
  setTypescale: vi.fn(async () => {}),
}));
const updateBrand = store.update;

vi.mock('@/shared/store/brandStore', () => ({
  useBrandStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector(store),
    { getState: () => store },
  ),
}));

import { saveSnapshot, deleteSnapshot } from '@/shared/editor/snapshotIDB';
import { useHistoryRegistry, startHistoryKeyboard } from '@/shared/history';
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
    <MemoryRouter initialEntries={['/b/acme/guideline']}>
      <GuidelineBuilder brand={brand} slug="acme" />
    </MemoryRouter>,
  );
}

/** Build the document and wait for the outline to paint. */
async function mountBuilt() {
  mount();
  fireEvent.click(screen.getByRole('button', { name: /build brand guidelines/i }));
  await screen.findByRole('navigation', { name: 'Guideline pages' });
}

const pageCards = () => document.querySelectorAll('.gl-page');
const sidebar = () => document.querySelector('.panel') as HTMLElement;
const railBtn = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  useGuidelineDocStore.setState({ docs: {} });
  useHistoryRegistry.setState({ scopes: [], version: 0 });
  store.list = [brand];
  store.current = brand;
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
    mount();
    expect(screen.getByText(/has no a logo/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /build brand guidelines/i }) as HTMLButtonElement).disabled)
      .toBe(false);
  });
});

describe('the house style', () => {
  it('uses the design system rail, not a bespoke one', async () => {
    await mountBuilt();
    // `DsRail` — separate cards, toggle-to-close, charcoal active border. An
    // earlier version of this feature hand-rolled all of that.
    const rail = document.querySelector('.ds-rail');
    expect(rail).toBeTruthy();
    expect(rail!.querySelectorAll('.ds-rail-item')).toHaveLength(3);
  });

  it('uses the Studio page grid and sidebar card', async () => {
    await mountBuilt();
    expect(document.querySelector('.shell.gl-shell')).toBeTruthy();
    expect(document.querySelector('aside.panel > .panel-top')).toBeTruthy();
    expect(document.querySelector('.panel-list')).toBeTruthy();
  });

  it('uses the Studio panel row for outline entries', async () => {
    await mountBuilt();
    const rows = document.querySelectorAll('.panel-list .panel-item .panel-item-body');
    expect(rows.length).toBe(DEFAULT_PAGE_COUNT);
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
    for (let i = 1; i < Math.min(cards.length, 6); i += 1) {
      expect(cards[i].offsetTop).toBeGreaterThan(cards[i - 1].offsetTop);
    }
  });
});

describe('the outline', () => {
  it('selects a page and opens its compact editor', async () => {
    await mountBuilt();
    const outline = screen.getByRole('navigation', { name: 'Guideline pages' });
    fireEvent.click(within(outline).getByText('Logo construction'));

    await waitFor(() => {
      expect(within(sidebar()).getByRole('heading', { name: 'Logo construction' })).toBeTruthy();
    });
    // Controls, not prose. The page does not explain itself back to the user.
    expect(within(sidebar()).getByLabelText('Name')).toBeTruthy();
    expect(within(sidebar()).getByRole('button', { name: 'Duplicate' })).toBeTruthy();
    expect(within(sidebar()).queryByText(/page 9 of/i)).toBeNull();
    expect(within(sidebar()).queryByText(/construction grid/i)).toBeNull();
    expect(document.querySelector('.gl-page[data-selected]')).toBeTruthy();
  });

  it('comes back out to the outline', async () => {
    await mountBuilt();
    const outline = screen.getByRole('navigation', { name: 'Guideline pages' });
    fireEvent.click(within(outline).getByText('Logo construction'));
    await waitFor(() => expect(within(sidebar()).getByLabelText('Name')).toBeTruthy());

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
    const hit = first.querySelector('.gl-page-hit') as HTMLElement;
    expect(hit).toBeTruthy();
    fireEvent.click(hit);
    await waitFor(() => expect(first.dataset.selected).toBe('true'));
    // Once selected the select layer is gone and the page itself is live.
    expect(first.querySelector('.gl-page-hit')).toBeNull();
  });
});

describe('adding a page', () => {
  it('inserts at the chosen point and takes the user to it', async () => {
    await mountBuilt();
    const before = pageCards().length;

    fireEvent.click(railBtn('Add'));
    await screen.findByText(/^After /);
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
    // Inserting before page 2 means adding after page 1.
    await waitFor(() => expect(screen.getByText(/After page 1 ·/)).toBeTruthy());
  });
});

describe('the Brand panel', () => {
  it('is the brand’s real sections, not a few text fields', async () => {
    await mountBuilt();
    fireEvent.click(railBtn('Brand'));

    const nav = await screen.findByRole('navigation', { name: 'Brand sections' });
    for (const section of ['Logo', 'Colours', 'Typography', 'Iconography', 'Voice & Tone', 'Strategy', 'Website']) {
      expect(within(nav).getByText(section), `missing ${section}`).toBeTruthy();
    }
    // …showing this brand's actual values.
    expect(within(nav).getByText(/#123456/)).toBeTruthy();
    expect(within(nav).getByText(/Inter/)).toBeTruthy();
  });

  it('drills into a section and back', async () => {
    await mountBuilt();
    fireEvent.click(railBtn('Brand'));
    fireEvent.click(await screen.findByText('Colours'));

    await waitFor(() => expect(within(sidebar()).getByRole('heading', { name: 'Colours' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Back to outline' }));
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Brand sections' })).toBeTruthy());
  });

  it('opens Setup’s own colour picker rather than a new one', async () => {
    await mountBuilt();
    fireEvent.click(railBtn('Brand'));
    fireEvent.click(await screen.findByText('Colours'));
    fireEvent.click(await within(sidebar()).findByText('#123456'));
    // `commitLabel="Use"` — the picker Setup edits brand colours with.
    await waitFor(() => expect(within(sidebar()).getByRole('button', { name: 'Use' })).toBeTruthy());
  });
});

describe('brand values are guideline-scoped until the user says otherwise', () => {
  /** Put a guideline-only value in place without driving the colour picker. */
  const overrideColour = (hex: string) =>
    useGuidelineDocStore.getState().setOverride(brand.id, 'primaryColor', hex);

  it('marks a guideline-only value and does not touch the brand', async () => {
    await mountBuilt();
    overrideColour('#ff0000');
    fireEvent.click(railBtn('Brand'));

    const nav = await screen.findByRole('navigation', { name: 'Brand sections' });
    // The section list flags the difference before the user drills in.
    expect(within(nav).getByTitle(/only/i)).toBeTruthy();
    fireEvent.click(within(nav).getByText('Colours'));

    await waitFor(() => expect(within(sidebar()).getByText('Guideline only')).toBeTruthy());
    expect(updateBrand).not.toHaveBeenCalled();
  });

  it('asks before it changes the brand, and says what that means', async () => {
    await mountBuilt();
    overrideColour('#ff0000');
    fireEvent.click(railBtn('Brand'));
    fireEvent.click(await screen.findByText('Colours'));
    fireEvent.click(await within(sidebar()).findByRole('button', { name: /update brand…/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/changes the brand itself/i)).toBeTruthy();
    // Still nothing written while the question is on screen.
    expect(updateBrand).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /update the brand/i }));
    await waitFor(() => expect(updateBrand).toHaveBeenCalledTimes(1));
    // Through the canonical Setup patch path, not a hand-built partial.
    expect(updateBrand.mock.calls[0][0]).toBe(brand.id);
  });

  it('lets the user back out, leaving the guideline value in place', async () => {
    await mountBuilt();
    overrideColour('#00ff00');
    fireEvent.click(railBtn('Brand'));
    fireEvent.click(await screen.findByText('Colours'));
    fireEvent.click(await within(sidebar()).findByRole('button', { name: /update brand…/i }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(updateBrand).not.toHaveBeenCalled();
    expect(useGuidelineDocStore.getState().get(brand.id)!.overrides.primaryColor).toBe('#00ff00');
  });

  it('resets back to the brand value', async () => {
    await mountBuilt();
    overrideColour('#ff0000');
    fireEvent.click(railBtn('Brand'));
    fireEvent.click(await screen.findByText('Colours'));
    fireEvent.click(await within(sidebar()).findByRole('button', { name: 'Reset' }));

    await waitFor(() => expect(within(sidebar()).queryByText('Guideline only')).toBeNull());
    expect(updateBrand).not.toHaveBeenCalled();
  });
});

describe('undo and redo', () => {
  let stop: () => void;
  beforeEach(() => { stop = startHistoryKeyboard(window); });
  afterEach(() => stop());

  const press = (init: KeyboardEventInit) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));

  it('takes back an added page in one step, and puts it back', async () => {
    await mountBuilt();
    const before = pageCards().length;

    fireEvent.click(railBtn('Add'));
    fireEvent.click(await within(sidebar()).findByText('Motion principles'));
    await waitFor(() => expect(pageCards()).toHaveLength(before + 1));

    press({ key: 'z', metaKey: true });
    await waitFor(() => expect(pageCards()).toHaveLength(before));

    press({ key: 'z', metaKey: true, shiftKey: true });
    await waitFor(() => expect(pageCards()).toHaveLength(before + 1));
  });

  it('undoes a move', async () => {
    await mountBuilt();
    const idAt = (i: number) => (pageCards()[i] as HTMLElement).dataset.pageId;
    const second = idAt(1);

    fireEvent.click((pageCards()[1] as HTMLElement).querySelector('.gl-page-hit') as HTMLElement);
    fireEvent.click(await within(sidebar()).findByRole('button', { name: 'Move up' }));
    await waitFor(() => expect(idAt(0)).toBe(second));

    press({ key: 'z', metaKey: true });
    await waitFor(() => expect(idAt(1)).toBe(second));
  });

  it('drives the toolbar buttons from the same stack', async () => {
    await mountBuilt();
    const undo = screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);

    fireEvent.click(railBtn('Add'));
    fireEvent.click(await within(sidebar()).findByText('Motion principles'));

    await waitFor(() => expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(pageCards()).toHaveLength(DEFAULT_PAGE_COUNT));
  });

  it('leaves the browser’s own undo alone while the user is typing a name', async () => {
    await mountBuilt();
    fireEvent.click((pageCards()[0] as HTMLElement).querySelector('.gl-page-hit') as HTMLElement);
    const field = await within(sidebar()).findByLabelText('Name');

    const event = new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true });
    field.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('removing a page', () => {
  it('confirms first', async () => {
    await mountBuilt();
    const before = pageCards().length;
    fireEvent.click(document.querySelector('.gl-page-hit') as HTMLElement);
    await waitFor(() => expect(within(sidebar()).getByLabelText('Name')).toBeTruthy());

    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Remove page' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(pageCards()).toHaveLength(before);

    fireEvent.click(within(dialog).getByRole('button', { name: /remove page/i }));
    await waitFor(() => expect(pageCards()).toHaveLength(before - 1));
  });
});

describe('the sidebar', () => {
  it('closes and reopens from the rail', async () => {
    await mountBuilt();
    expect(sidebar()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    await waitFor(() => expect(document.querySelector('.panel')).toBeNull());
    // The document is still there to browse — that is the point of closing it.
    expect(pageCards()).toHaveLength(DEFAULT_PAGE_COUNT);

    fireEvent.click(railBtn('Content'));
    await waitFor(() => expect(document.querySelector('.panel')).toBeTruthy());
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
    expect(document.querySelector('[data-page-id="cover"] .gl-page-edited')).toBeTruthy();
  });
});
