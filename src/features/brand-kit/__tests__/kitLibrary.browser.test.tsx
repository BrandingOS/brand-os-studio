/**
 * The drilldown IS the library.
 *
 * The defect this file exists to keep closed: a family of thirty designs
 * showed THREE, and the other twenty-seven lived behind a "+" that opened
 * a modal over the page. Ninety-four designs had just been restored to the
 * kit and the owner could not see them — and the one surface that would
 * have shown them covered the page they were being compared against.
 *
 * So the assertions here are all about completeness and about the absence
 * of a second surface:
 *
 *   • what a family HAS is what the wall SHOWS — counted against
 *     `variantsForCard`, the same function the page reads;
 *   • the `All` chip states the family's true total, so the row always
 *     says how big the library under it is;
 *   • every facet is a SUBSET of the unfiltered wall — a chip can only
 *     ever narrow, never reveal something browsing did not already show;
 *   • the filter row is present on every family, so it is a control people
 *     learn rather than one they discover;
 *   • and nothing opens a dialog. Browsing never covers the page.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SEED_BRANDS } from '@/data/brands';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { variantsForCard } from '../data/legacy-mapping';
import { visibleEntries } from '../catalog/catalog';
import type { KitEntry } from '../catalog/catalog';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

/* A REAL brand, so every tile paints its real renderer. With no
 * `sourceBrand` the drilldown falls back to the card's cover image and the
 * deferral has nothing to defer — which would make the performance
 * assertion below pass by measuring nothing. */
const SOURCE = migrateBrandToCurrent(SEED_BRANDS[0]!);
const mockBrand = brandToMockBrand(SOURCE);

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

/** Every item that renders a WALL of designs — the composed views
 *  (Strategy, the two systems, the Brand Board) are single documents and
 *  have no library to show. The viewer is a developer because that is the
 *  viewer a browser test is: it sees the experimental families too, which
 *  is where the biggest libraries are (Envelope, Website, Favicon…). */
const FAMILIES: KitEntry[] = visibleEntries({ isDev: true, isAdmin: false }).filter(
  (e) => (e.view ?? 'variants') === 'variants',
);

function renderKit() {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={mockBrand} sourceBrand={SOURCE} />
    </MemoryRouter>,
  );
}

async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  });
}

async function openItem(label: string) {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  const row = within(nav).getAllByText(label, { selector: '.panel-item-name' })[0]!;
  fireEvent.click(row);
  await settle();
}

function tiles(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.bk-drilldown-grid .bk-variant-card'));
}

function captions(): string[] {
  return tiles().map((t) => t.querySelector('.bk-variant-label')?.textContent?.trim() ?? '');
}

function allChip(): HTMLElement | null {
  return document.querySelector('.ds-chip[data-facet="all"]');
}

function facetChips(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.bk-drilldown-chips .ds-chip'),
  ).filter((c) => c.dataset.facet !== 'all');
}

/** What the family really holds, read the same way the page reads it. */
function libraryFor(entry: KitEntry): number {
  return variantsForCard(entry.sectionKey, entry.storageLabel, mockBrand).length;
}

beforeEach(async () => {
  await page.viewport(1440, 900);
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

describe('every design a family has is on its wall', () => {
  it('renders the whole library for every family, and never fewer', async () => {
    renderKit();
    const measured: Array<[string, number, number]> = [];

    for (const entry of FAMILIES) {
      const expected = libraryFor(entry);
      if (expected === 0) continue; // no legacy library — a placeholder wall
      await openItem(entry.label);
      measured.push([entry.label, expected, tiles().length]);
    }

    expect(measured.length).toBeGreaterThan(15);
    for (const [label, expected, shown] of measured) {
      expect(shown, `${label}: showed ${shown} of ${expected}`).toBe(expected);
    }
    // The families that made this worth doing: thirty designs, three shown.
    const big = measured.filter(([, expected]) => expected >= 20);
    expect(big.length).toBeGreaterThan(4);
  });

  it('the All chip states the family total on every family', async () => {
    renderKit();
    for (const entry of FAMILIES) {
      const expected = libraryFor(entry);
      if (expected === 0) continue;
      await openItem(entry.label);
      const chip = allChip();
      expect(chip, entry.label).toBeTruthy();
      const total = Number(chip!.querySelector('.bk-chip-count')!.textContent!.trim());
      expect(total, entry.label).toBe(expected);
      expect(total, entry.label).toBe(tiles().length);
    }
  });

  it('the filter row is on every family — inert where there is nothing to sift', async () => {
    renderKit();
    for (const entry of FAMILIES) {
      await openItem(entry.label);
      const row = document.querySelector('.bk-drilldown-filter') as HTMLElement | null;
      expect(row, entry.label).toBeTruthy();
      const field = row!.querySelector('input.bk-drilldown-search') as HTMLInputElement;
      expect(field, entry.label).toBeTruthy();
      expect(allChip(), entry.label).toBeTruthy();
      // Inert is a STATE of the row, never its absence.
      if (row!.dataset.inert === 'true') {
        expect(field.disabled, entry.label).toBe(true);
        expect(facetChips(), entry.label).toHaveLength(0);
      } else {
        expect(field.disabled, entry.label).toBe(false);
      }
    }
  });
});

describe('a facet can only ever narrow the wall', () => {
  it('every chip on a big family yields a subset of the unfiltered set', async () => {
    renderKit();
    // The four biggest libraries in the kit, one per section shape.
    for (const label of ['Envelope', 'Letterhead', 'Business Card', 'Website']) {
      await openItem(label);
      const unfiltered = new Set(captions());
      expect(unfiltered.size, label).toBeGreaterThan(15);

      const chips = facetChips();
      expect(chips.length, label).toBeGreaterThan(0);
      for (const chip of chips) {
        const count = Number(chip.querySelector('.bk-chip-count')!.textContent!.trim());
        fireEvent.click(chip);
        await settle();
        const shown = captions();
        expect(shown.length, `${label} · ${chip.textContent}`).toBe(count);
        for (const name of shown) {
          expect(unfiltered.has(name), `${label} · ${name}`).toBe(true);
        }
        fireEvent.click(chip);
        await settle();
        expect(captions()).toHaveLength(unfiltered.size);
      }
    }
  });
});

describe('browsing never covers the page', () => {
  it('opens no dialog on any family, and offers no "Browse more"', async () => {
    renderKit();
    for (const entry of FAMILIES) {
      await openItem(entry.label);
      expect(
        document.querySelector('[role="dialog"]'),
        `${entry.label} opened a dialog`,
      ).toBeNull();
      expect(
        document.querySelector('button[aria-label^="Browse more"]'),
        `${entry.label} still offers "Browse more"`,
      ).toBeNull();
      expect(document.querySelector('.bk-card-picker-backdrop'), entry.label).toBeNull();
    }
  });
});

describe('the grid is keyed to the material', () => {
  it('gives an icon a glyph cell and a letterhead a document one', async () => {
    renderKit();

    await openItem('Icons');
    const iconGrid = document.querySelector('.bk-drilldown-grid') as HTMLElement;
    expect(iconGrid.dataset.density).toBe('glyph');
    const iconCell = tiles()[0]!.getBoundingClientRect().width;

    await openItem('Letterhead');
    const docGrid = document.querySelector('.bk-drilldown-grid') as HTMLElement;
    expect(docGrid.dataset.density).toBe('document');
    const docCell = tiles()[0]!.getBoundingClientRect().width;

    // Not a fixed column count: the same width holds far more icons than
    // letterheads, which is the whole point.
    expect(iconCell).toBeLessThan(docCell / 1.5);
  });
});

describe('thirty tiles do not all render at once', () => {
  it('paints what is above the fold and defers the rest', async () => {
    renderKit();
    await openItem('Envelope');

    const all = tiles();
    expect(all.length).toBeGreaterThanOrEqual(25);

    // `.bk-variant-tile-render` is always in the DOM — it is the box the
    // artwork lands in. What defers is what is INSIDE it.
    const painted = all.filter(
      (t) => (t.querySelector('.bk-variant-tile-render')?.childElementCount ?? 0) > 0,
    );
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.length, 'every tile painted — the deferral is not working').toBeLessThan(
      all.length,
    );

    // The first tile is one the user is looking at: it never waits.
    expect(
      all[0]!.querySelector('.bk-variant-tile-render')!.childElementCount,
    ).toBeGreaterThan(0);
  });
});
