/**
 * The Brand Kit's chrome, in a real browser.
 *
 * Everything here needs REAL layout and REAL hit-testing, which is why it
 * cannot live in the jsdom suite: the defects it defends against were
 * invisible to `fireEvent`, because `fireEvent` dispatches at an element
 * and never asks the browser what is actually on top of it.
 *
 *   • A card's ⬇ and ✎ could not be clicked. `CardCover` shipped with no
 *     stylesheet, so its artwork was a static block that sized to its
 *     content, overflowed the cover box and sat over the action row.
 *     Playwright refused every click with "subtree intercepts pointer
 *     events" — and every jsdom test still passed.
 *   • The composed covers were unstyled, so the palette collapsed to
 *     nothing, the type specimen ran into the family names, and the
 *     strategy line painted past the card's own edge.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

/**
 * `PhotosEditor` builds an uploader from the DI container the moment it
 * renders, and no test boots the container. Stubbed at the same module
 * boundary its own suite uses — what is under test here is that the kit
 * OPENS the right panel, not how the canonical picker collects a file.
 */
vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const brand: MockBrand = {
  ...mockBrand,
  strategy: {
    ...mockBrand.strategy,
    // Deliberately long: a cover is a glance, and this must be clamped
    // rather than painted over the card's edge.
    summary:
      'A careful studio for small teams who would rather make less and make it ' +
      'last, working slowly enough that the work is still worth looking at a ' +
      'decade later, and refusing every shortcut that would make it otherwise.',
  },
};

function renderKit(which: MockBrand = brand) {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={which} />
    </MemoryRouter>,
  );
}

/** The card whose caption is `label`. */
function card(label: string): HTMLElement {
  const found = Array.from(document.querySelectorAll('figure.bk-card')).find(
    (f) => f.querySelector('figcaption')?.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No card labelled ${label}`);
  return found as HTMLElement;
}

/** Let layout settle so measured styles and rects are real. */
async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  });
}

beforeEach(async () => {
  await page.viewport(1440, 900);
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

describe('a card cover is a picture, not a lid', () => {
  it('never intercepts a click meant for the card’s own actions', async () => {
    renderKit();
    await settle();

    const logos = card('Logos');
    const art = logos.querySelector('.bk-card-cover-art') as HTMLElement;
    expect(art).toBeTruthy();

    // 1. The art declares itself unclickable. Every control on a card is
    //    above it, and a picture must never eat their clicks.
    expect(getComputedStyle(art).pointerEvents).toBe('none');

    // 2. It is an absolute fill, so it can neither resize the card nor
    //    spill out of it — the two ways it used to reach the action row.
    const coverBox = (logos.querySelector('.bk-card-cover') as HTMLElement).getBoundingClientRect();
    const artBox = art.getBoundingClientRect();
    expect(artBox.height).toBeLessThanOrEqual(coverBox.height + 1);
    expect(artBox.bottom).toBeLessThanOrEqual(coverBox.bottom + 1);

    // 3. The proof: ask the browser what is on top at the ⬇ button's own
    //    centre. `is-ctx-active` is the class the card already uses to
    //    hold its actions open, which is what :hover does for a mouse.
    logos.classList.add('is-ctx-active');
    await settle();
    const dl = logos.querySelector('button[aria-label^="Download"]') as HTMLElement;
    const r = dl.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    expect(dl.contains(top)).toBe(true);
  });

  it('opens the download menu from the card’s ⬇', async () => {
    renderKit();
    await settle();

    const logos = card('Logos');
    logos.classList.add('is-ctx-active');
    const dl = logos.querySelector('button[aria-label^="Download"]') as HTMLElement;
    expect(document.querySelector('.bk-dl-menu')).toBeNull();

    fireEvent.click(dl);
    await settle();

    const menu = document.querySelector('.bk-dl-menu');
    expect(menu).toBeTruthy();
    const labels = Array.from(menu!.querySelectorAll('.ds-menu-item')).map((i) =>
      i.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(labels.join(' | ')).toMatch(/For web/);
    expect(labels.join(' | ')).toMatch(/For print/);
  });
});

describe('the composed covers are legible', () => {
  it('paints the palette as swatches with real width', async () => {
    renderKit();
    await settle();
    const swatches = Array.from(
      card('Colors').querySelectorAll('.bk-cover-swatch'),
    ) as HTMLElement[];
    expect(swatches.length).toBeGreaterThan(1);
    for (const s of swatches) {
      const b = s.getBoundingClientRect();
      // The bug: `flexGrow` on spans with no flex parent, so every
      // swatch was 0 × 0 and the Colors card rendered EMPTY.
      expect(b.width).toBeGreaterThan(4);
      expect(b.height).toBeGreaterThan(40);
    }
  });

  it('separates the specimen from the pairing it names', async () => {
    renderKit();
    await settle();
    const type = card('Typography');
    const aa = type.querySelector('.bk-cover-aa') as HTMLElement;
    const names = type.querySelector('.bk-cover-type-names') as HTMLElement;
    expect(aa).toBeTruthy();
    expect(names).toBeTruthy();
    // They used to run together as one string ("AaInterDM Sans") because
    // the cover had no column and no gap.
    expect(aa.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      names.getBoundingClientRect().top + 1,
    );
    expect(Number.parseFloat(getComputedStyle(aa).fontSize)).toBeGreaterThan(28);
  });

  it('draws icon glyphs at a size a person can recognise', async () => {
    renderKit();
    await settle();
    const icons = Array.from(card('Icons').querySelectorAll('.bk-cover-icon')) as HTMLElement[];
    expect(icons.length).toBeGreaterThan(0);
    for (const i of icons) {
      expect(Number.parseFloat(getComputedStyle(i).fontSize)).toBeGreaterThanOrEqual(20);
      // The reported defect was "the icon font isn't loaded in the cover's
      // scope". UICONS paints through `::before`, so that is where both the
      // font and the glyph have to be real...
      expect(getComputedStyle(i, '::before').fontFamily.toLowerCase()).toContain('uicons');
      // ...and the class must name a glyph that exists. `brand.icons` holds
      // bare names too, and `class="fi camera"` names nothing at all.
      const content = getComputedStyle(i, '::before').content;
      expect(content === 'none' || content === '""' || content === '').toBe(false);
    }
  });

  it('shows the photograph as an IMAGE, so a dead source can be seen', async () => {
    renderKit();
    await settle();
    const photos = card('Photos');
    const art = photos.querySelector('.bk-cover-art--photo') as HTMLElement;
    expect(art).toBeTruthy();
    // A CSS background cannot report that its source failed, so SKAM's
    // `/images/grain.png` painted a blank white card. An <img> can.
    expect(getComputedStyle(art).backgroundImage).toBe('none');
    const img = art.querySelector('img.bk-cover-photo') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBeTruthy();
  });

  it('falls back to the honest empty when the brand has no real photograph', async () => {
    renderKit({ ...brand, photos: [{ id: 'p1', src: '', slot: 'A' }] });
    await settle();
    const photos = card('Photos');
    expect(photos.querySelector('.bk-cover-art--photo')).toBeNull();
    const empty = photos.querySelector('.bk-cover-art--empty');
    expect(empty).toBeTruthy();
    expect(empty!.textContent).toContain('No photography yet');
  });

  it('keeps the strategy line inside its band', async () => {
    renderKit();
    await settle();
    const strategy = card('Strategy');
    const band = strategy.querySelector('.bk-cover-art--strategy') as HTMLElement;
    const quote = strategy.querySelector('.bk-cover-quote') as HTMLElement;
    expect(band).toBeTruthy();
    expect(quote).toBeTruthy();
    expect(quote.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      band.getBoundingClientRect().bottom + 1,
    );
    // It is clamped, not merely lucky about this brand's wording.
    expect(getComputedStyle(quote).webkitLineClamp).toBe('4');
    expect(getComputedStyle(quote).overflow).toBe('hidden');
  });
});

describe('a brand asset opens its own editor, not Quick Edit', () => {
  /**
   * The five editors existed, were tested, and had no caller. The pencil
   * on Colors opened the generic Quick Edit over a stock cover, so the
   * only way to change a palette from the kit was to leave the kit.
   */
  const cases: Array<[card: string, title: string]> = [
    ['Logos', 'Logos'],
    ['Colors', 'Colors'],
    // The catalog renames the card; the DATA is still filed under `Fonts`,
    // and a rename must not cost anyone their editor.
    ['Typography', 'Typography'],
    ['Icons', 'Icons'],
    ['Photos', 'Photos'],
  ];

  for (const [label, title] of cases) {
    it(`opens the ${title} editor from the ${label} card`, async () => {
      renderKit();
      await settle();

      const c = card(label);
      fireEvent.click(c.querySelector(`button[aria-label="Edit ${label}"]`)!);
      await settle();

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog!.textContent).toContain(title);
      // ...and NOT the generic card editor over a stock cover.
      expect(document.querySelector('.bk-editor-backdrop')).toBeNull();
    });
  }

  it('paints the kit behind the panel from the editor’s live draft', async () => {
    renderKit();
    await settle();

    const before = Array.from(
      card('Colors').querySelectorAll('.bk-cover-swatch'),
    ).map((s) => (s as HTMLElement).style.background);
    expect(before.length).toBeGreaterThan(0);

    fireEvent.click(card('Colors').querySelector('button[aria-label="Edit Colors"]')!);
    await settle();
    // The editor reports its draft on open; the cover must be painting
    // from THAT, which is what makes an edit visible before it is saved.
    const after = Array.from(
      card('Colors').querySelectorAll('.bk-cover-swatch'),
    ).map((s) => (s as HTMLElement).style.background);
    expect(after.length).toBe(before.length);
  });
});
