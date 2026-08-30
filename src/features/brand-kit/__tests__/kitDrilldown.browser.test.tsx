/**
 * The drilldown's own chrome, in a real browser.
 *
 * Three defects live here, and all three needed real layout to see:
 *
 *   • **D53 — a tile had no actions.** Opening a card gave you a wall of
 *     designs and exactly one verb: click, which featured the design. The
 *     ⬇ on the CARD downloaded the card's FIRST variant, so downloading
 *     the design you were actually looking at was unreachable. `TileActions`
 *     puts ⬇ · ✎ · ⋯ on the tile itself — and they are real buttons, so
 *     they are reachable with Tab and hidden only by opacity, never by
 *     `display: none`.
 *
 *   • **A library you can only scroll is a pile.** Twenty-four business
 *     cards with no way to say "the dark ones" is a slower way to find
 *     nothing. The chips are the curation's OWN tags (`renderers/curation`
 *     `tagsFor`), so a chip can only ever offer a word a designer really
 *     filed a design under — a chip that matches nothing cannot exist.
 *
 *   • **Twelve identical photographs.** A brand with no photography fell
 *     through to a generic fallback that painted TWELVE tiles of the
 *     card's own stock cover. It lied twice: the pictures were not the
 *     brand's, and there were not twelve of them.
 *
 * Escape is tested because it is the one keyboard behaviour that spans two
 * components: a menu open over the drilldown must swallow Escape and close
 * only itself, and the SECOND Escape must reach the drilldown.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import { tagsFor } from '../renderers/curation';
import { variantsForCard } from '../data/legacy-mapping';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

/** A brand that brought no photography at all. */
const brandWithoutPhotos: MockBrand = { ...mockBrand, photos: [] };

function renderKit(brand: MockBrand = mockBrand) {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={brand} />
    </MemoryRouter>,
  );
}

async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  });
}

/** Open an item from the sidebar — the one way into a drilldown. */
async function openItem(label: string) {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  fireEvent.click(within(nav).getByText(label));
  await settle();
}

/** Poll until a condition holds — transitions and `history.back()` are
 *  asynchronous, and a fixed number of frames is a guess. */
async function until(fn: () => boolean, ms = 2000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (fn()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
  }
  throw new Error('Timed out waiting for the page to settle');
}

/** Which page the stage is showing — 'sections' or 'drilldown'. */
function stageView(): string | null {
  return document.querySelector('.bk-stage')?.getAttribute('data-active') ?? null;
}

function tiles(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.bk-drilldown-grid .bk-variant-card'));
}

function captions(): string[] {
  return tiles().map((t) => t.querySelector('.bk-variant-label')?.textContent?.trim() ?? '');
}

beforeEach(async () => {
  await page.viewport(1440, 900);
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

describe('a tile carries its own actions', () => {
  it('offers Download, Edit and a ⋯ menu on the design under the cursor', async () => {
    renderKit();
    await openItem('Business Card');

    const first = tiles()[0]!;
    const name = first.querySelector('.bk-variant-label')!.textContent!.trim();

    // Named after THIS design, not the card — that is the whole of D53.
    expect(first.querySelector(`button[aria-label="Download ${name}"]`)).toBeTruthy();
    expect(first.querySelector(`button[aria-label="Edit ${name}"]`)).toBeTruthy();
    expect(first.querySelector(`button[aria-label="More actions for ${name}"]`)).toBeTruthy();

    // The cluster is a SIBLING of the tile, never inside it: the tile is a
    // <button>, and a button inside a button is not a button.
    const actions = first.querySelector('.bk-tile-actions') as HTMLElement;
    expect(first.querySelector('.bk-variant-tile')!.contains(actions)).toBe(false);
  });

  it('is reachable with the keyboard — hidden by opacity, never by display', async () => {
    renderKit();
    await openItem('Business Card');

    const first = tiles()[0]!;
    const actions = first.querySelector('.bk-tile-actions') as HTMLElement;
    // At rest it is invisible and inert...
    expect(getComputedStyle(actions).display).not.toBe('none');
    expect(getComputedStyle(actions).pointerEvents).toBe('none');

    // ...and focusing a button inside it reveals the whole cluster, so a
    // control you can focus is never a control you cannot see.
    const dl = first.querySelector('button[aria-label^="Download"]') as HTMLButtonElement;
    dl.focus();
    expect(document.activeElement).toBe(dl);
    // The reveal is a 180ms transition, so the value is only 1 once it has
    // run — asserting a frame later would measure the animation, not the
    // rule.
    await until(() => Number(getComputedStyle(actions).opacity) === 1);
    expect(getComputedStyle(actions).pointerEvents).toBe('auto');
  });

  it('downloads THAT variant, through the one shared menu', async () => {
    renderKit();
    await openItem('Business Card');

    const first = tiles()[0]!;
    fireEvent.click(first.querySelector('button[aria-label^="Download"]')!);
    await settle();

    const menu = first.querySelector('.bk-dl-menu');
    expect(menu).toBeTruthy();
    const labels = Array.from(menu!.querySelectorAll('.ds-menu-item'))
      .map((i) => i.textContent?.replace(/\s+/g, ' ').trim())
      .join(' | ');
    // The same five words as the card, the header and the editor.
    expect(labels).toMatch(/For web/);
    expect(labels).toMatch(/For print/);
  });

  /**
   * QA Q6 — the pencil on a brand-asset TILE opened the legacy card editor,
   * which has no fields for a brand asset: a logo on a grey field, Cancel /
   * Download / Save, and an entirely empty right panel. Only the CARD's ✎ had
   * been re-pointed at the new asset editors.
   *
   * Asserted on all four brand-asset families, because the bug was one line
   * that four labels reached.
   */
  it.each(['Logos', 'Colors', 'Typography', 'Icons'])(
    "a %s tile's pencil opens that asset's own editor, never an empty panel",
    async (label) => {
      renderKit();
      await openItem(label);

      const first = tiles()[0]!;
      fireEvent.click(first.querySelector('button[aria-label^="Edit "]')!);
      await settle();

      // The asset editor is a DsModal with the family's own title…
      const modal = document.querySelector('.ds-modal') as HTMLElement | null;
      expect(modal).toBeTruthy();
      // …and it asks for something. An empty panel is the defect.
      expect(
        modal!.querySelectorAll('input, select, button[role="combobox"], .ds-select').length,
      ).toBeGreaterThan(0);
      // The legacy full-screen card editor must not be what opened.
      expect(document.querySelector('.bk-editor')).toBeNull();
    },
  );

  it('opens the Logos panel on the variant the tile was drawn from', async () => {
    renderKit();
    await openItem('Logos');

    // A combo tile well down the wall, not the first original.
    const wall = tiles();
    const target = wall[wall.length - 1]!;
    fireEvent.click(target.querySelector('button[aria-label^="Edit "]')!);
    await settle();

    const focused = document.querySelector('.bka-logos-row[data-focused]');
    expect(focused).toBeTruthy();
  });

  /**
   * QA Q27 — every Icons tile printed its name inside the artwork AND again as
   * the caption below it, on all twenty-eight of them.
   */
  it('an Icons tile does not repeat the caption inside the artwork', async () => {
    renderKit();
    await openItem('Icons');

    const shown = tiles().filter((card) => {
      const caption = card.querySelector('.bk-variant-label')?.textContent?.trim() ?? '';
      const inside = card.querySelector('.brand-asset-render--icon')?.textContent ?? '';
      return caption.length > 2 && inside.toLowerCase().includes(caption.toLowerCase());
    });
    expect(shown.map((c) => c.querySelector('.bk-variant-label')?.textContent)).toEqual([]);
    // …and where the renderer really mounted, the tile still says the one
    // thing only it can say. (This harness has no canonical `sourceBrand`, so
    // some tiles fall back to the shared cover and draw nothing of their own.)
    const drawn = tiles()
      .map((c) => c.querySelector('.brand-asset-render--icon'))
      .filter(Boolean) as HTMLElement[];
    for (const tile of drawn) expect(tile.textContent).toMatch(/\d+ · \d+ · \d+ px/);
  });

  /**
   * QA Q9 — the drilldown header's ⬇ fired one fixed zip with no menu, on the
   * one surface where the user is looking at the whole family. Every other ⬇
   * in the kit shows the same five rows.
   */
  it('the header ⬇ opens the same five-row menu the card and the tile use', async () => {
    renderKit();
    await openItem('Business Card');

    const header = document.querySelector('.bk-drilldown-dl') as HTMLElement;
    expect(header).toBeTruthy();
    fireEvent.click(header.querySelector('button[aria-label^="Download"]')!);
    await settle();

    const menu = header.querySelector('.bk-dl-menu');
    expect(menu).toBeTruthy();
    const labels = Array.from(menu!.querySelectorAll('.ds-menu-item')).map((i) =>
      i.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
    expect(labels).toHaveLength(5);
    expect(labels.join(' | ')).toMatch(/For web/);
    expect(labels.join(' | ')).toMatch(/For print/);
    expect(labels.join(' | ')).toMatch(/Custom size/);
  });

  it('lists Use Template · Edit Template · Set as featured in the ⋯ menu', async () => {
    renderKit();
    await openItem('Business Card');

    const first = tiles()[0]!;
    fireEvent.click(first.querySelector('button[aria-label^="More actions"]')!);
    await settle();

    const menu = first.querySelector('.bk-tile-menu');
    expect(menu).toBeTruthy();
    const labels = Array.from(menu!.querySelectorAll('.ds-menu-item')).map((i) =>
      i.textContent?.trim(),
    );
    expect(labels).toContain('Use Template');
    expect(labels).toContain('Edit Template');
    expect(labels).toContain('Set as featured');
  });

  it('Escape peels one layer: the menu first, the drilldown second', async () => {
    renderKit();
    await openItem('Business Card');
    expect(stageView()).toBe('drilldown');

    const first = tiles()[0]!;
    const more = first.querySelector('button[aria-label^="More actions"]') as HTMLElement;
    fireEvent.click(more);
    await settle();
    expect(first.querySelector('.bk-tile-menu')).toBeTruthy();

    // The drilldown's own listener is on `window`; the cluster's is on
    // `document`, which is reached first — so the menu closes and the
    // drilldown does not.
    fireEvent.keyDown(more, { key: 'Escape' });
    await settle();
    expect(document.querySelector('.bk-tile-menu')).toBeNull();
    expect(stageView()).toBe('drilldown');

    // With nothing of its own to peel, Escape goes through. The exit runs
    // through `history.back()`, so the page-2 layer stays MOUNTED for its
    // fade-out — what changes is which page the stage is showing.
    fireEvent.keyDown(window, { key: 'Escape' });
    await until(() => stageView() === 'sections');
  });
});

describe('a wall of designs can be searched and filtered', () => {
  /**
   * Where the library actually IS.
   *
   * A card in `PICKER_LABELS` (every stationery, social, web, guide,
   * deck and animation family) shows THREE featured designs in its
   * drilldown; the other twenty-one live behind its "+". So the row that
   * sifts a pile has to be on both surfaces, and the picker is the one
   * that carries the tags — which is why it is tested here and why the
   * two share one component (`KitFilterRow`).
   */
  async function openPicker() {
    await openItem('Business Card');
    fireEvent.click(
      document.querySelector('button[aria-label^="Browse more"]') as HTMLElement,
    );
    await settle();
  }

  function cells(): string[] {
    return Array.from(document.querySelectorAll('.bk-card-picker-cell-label')).map(
      (el) => el.textContent?.trim() ?? '',
    );
  }

  it('offers only tags a designer really filed a design under', async () => {
    renderKit();
    await openPicker();

    const chips = Array.from(document.querySelectorAll('.bk-drilldown-chips .ds-chip'));
    expect(chips.length).toBeGreaterThan(0);

    const known = new Set(
      variantsForCard('stationery', 'Business Card', mockBrand).flatMap((t) => tagsFor(t.id)),
    );
    for (const chip of chips) {
      // The count rides inside the chip; the tag is what is left of it.
      const count = chip.querySelector('.bk-chip-count')?.textContent ?? '';
      const tag = (chip.textContent ?? '').replace(count, '').trim();
      expect(known.has(tag), tag).toBe(true);
    }
  });

  it('a chip narrows the wall to the designs that carry that tag', async () => {
    renderKit();
    await openPicker();

    const before = cells();
    expect(before.length).toBeGreaterThan(2);

    const chip = document.querySelector('.bk-drilldown-chips .ds-chip') as HTMLElement;
    const count = Number(chip.querySelector('.bk-chip-count')!.textContent!.trim());
    fireEvent.click(chip);
    await settle();

    // The chip's own count is a promise about what pressing it does. The
    // three featured designs are already excluded from the picker, so it
    // can only ever be a ceiling.
    expect(cells().length).toBeLessThanOrEqual(count);
    expect(cells().length).toBeGreaterThan(0);
    expect(count).toBeLessThan(before.length);
    expect(chip.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(chip);
    await settle();
    expect(cells()).toHaveLength(before.length);
  });

  it('search matches a design by its name', async () => {
    renderKit();
    await openPicker();

    const all = cells();
    const target = all[Math.min(2, all.length - 1)]!;
    const field = document.querySelector('input.bk-drilldown-search') as HTMLInputElement;
    expect(field).toBeTruthy();

    fireEvent.change(field, { target: { value: target } });
    await settle();

    const shown = cells();
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(all.length);
    expect(shown).toContain(target);
  });

  it('says it filtered to nothing, and offers the way back', async () => {
    renderKit();
    await openPicker();

    const field = document.querySelector('input.bk-drilldown-search') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'zzzz-no-such-design' } });
    await settle();

    const empty = document.querySelector('.bk-drilldown-empty') as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('No design matches that');

    fireEvent.click(empty);
    await settle();
    expect(cells().length).toBeGreaterThan(1);
  });

  it('the drilldown carries the same row wherever the wall is long', async () => {
    renderKit();
    // Logos is not a picker family — every combination is on the wall, so
    // the row belongs in the drilldown itself.
    await openItem('Logos');
    const field = document.querySelector('input.bk-drilldown-search') as HTMLInputElement;
    expect(field).toBeTruthy();

    const all = captions();
    expect(all.length).toBeGreaterThan(5);
    fireEvent.change(field, { target: { value: 'zzzz-no-such-design' } });
    await settle();
    expect(tiles()).toHaveLength(0);
    expect(document.querySelector('.bk-drilldown-empty')).toBeTruthy();
  });
});

describe('a brand with no photography', () => {
  it('says so once, instead of painting twelve stock photographs', async () => {
    renderKit(brandWithoutPhotos);
    await openItem('Photos');

    // The defect: a generic fallback drew TWELVE tiles of the card's own
    // licensed cover art, none of it the brand's.
    expect(tiles()).toHaveLength(1);
    expect(document.querySelector('.bk-variant-tile-cover')).toBeNull();

    const tile = document.querySelector('[data-testid="photos-empty"]');
    expect(tile).toBeTruthy();
    expect(tile!.textContent).toContain('No photos yet');
  });

  it('the empty tile is a statement, not a control', async () => {
    renderKit(brandWithoutPhotos);
    await openItem('Photos');

    const tile = document.querySelector('.bk-variant-tile') as HTMLElement;
    expect(tile.tagName).toBe('DIV');
    expect(tile.classList.contains('bk-variant-tile--static')).toBe(true);
    expect(getComputedStyle(tile).cursor).toBe('default');
  });

  it('names a real photograph after the picture, never after its slot', async () => {
    renderKit();
    await openItem('Photos');

    const names = captions();
    expect(names.length).toBeGreaterThan(0);
    // `Slot A` is the storage key, not a caption. The name comes from
    // `photoExport.photoName`, which is what the zip writes too.
    for (const n of names) expect(n).not.toMatch(/^Slot /);
  });
});
