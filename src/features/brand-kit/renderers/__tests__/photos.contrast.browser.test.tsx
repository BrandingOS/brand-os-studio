/**
 * The Photos drilldown — a real picture, a readable caption, or an honest no.
 *
 * This family had no contrast problem worth the name, because it had no
 * CONTENT: one brand painted twelve copies of a stock 3D render and the other
 * an empty beige "SLOT A" tile, and both counted as finished photography (D14,
 * D46). So the sweep here is only half about contrast. The other half is about
 * truth — what the tile is allowed to draw at all — and those assertions are
 * every bit as much a regression gate.
 *
 * A browser test rather than jsdom for two reasons that both bite: the caption
 * sits on a translucent scrim, which only resolves to a colour with a real
 * cascade; and a duotone is `grayscale(1)` plus two blend layers, none of which
 * exist without one.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react';
// The real stylesheets. Without them every class is inert and the sweep
// measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { aspectForLabel } from '../../data/cardPresentation';
import {
  hasRealPhotos,
  isPhotoSourceBroken,
  markPhotoSourceBroken,
  resetPhotoSourceCache,
  writePhotoDirection,
} from '../../data/photoExport';
import { useBrandStore } from '@/shared/store/brandStore';
import { BrandAssetPhotoRenderer } from '../BrandAssetsRenderers';
import { renderCosmosTemplate } from '../index';
import { assertReadable, measureContrast } from '../__guards__/contrast';

/** Zero. A caption nobody can read is a photograph with no name on it. */
const BUDGET = 0;

/** The canonical tile width the renderers are authored for. */
const TILE = 260;
const HEIGHT = Math.round(TILE / aspectForLabel('Photos'));

/** A 1×1 GIF, so the tile has real bytes to decode rather than a promise. */
const RED = 'data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
const BLUE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAA/wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';

const BRANDS = SEED_BRANDS.slice(0, 2);

beforeEach(() => {
  resetPhotoSourceCache();
  localStorage.removeItem('brandos:brand-kit:photos');
});

afterEach(() => {
  cleanup();
  localStorage.removeItem('brandos:brand-kit:photos');
});

function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  // The kit's own scope — the tile's stylesheet is written under it, and a
  // caption measured outside it is a caption measured on rules that will not
  // be in force when a user sees it.
  host.setAttribute('data-workspace', '');
  host.style.width = `${TILE}px`;
  host.style.height = `${HEIGHT}px`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

/** A brand that owns photographs — the case the seeds cannot supply. */
function withPhotos(mock: MockBrand): MockBrand {
  return {
    ...mock,
    photos: [
      { id: 'photo-studio', src: RED, slot: 'A' },
      { id: 'photo-street', src: BLUE, slot: 'B' },
    ],
  } as MockBrand;
}

describe.each(BRANDS.map((b) => [b.name, b] as const))('Photos · %s', (name, brand) => {
  const base = brandToMockBrand(brand);
  const mock = withPhotos(base);
  const templates = variantsForCard('brand-assets', 'Photos', mock);

  it('offers exactly one tile per photograph the brand owns — never a stock set (D14)', () => {
    expect(templates).toHaveLength(mock.photos.length);
    // The twelve-identical-renders defect, stated as a rule: the tiles the kit
    // shows are the brand's files, so there cannot be more of them than there
    // are files.
    expect(templates.length).toBeLessThanOrEqual(mock.photos.length);
  });

  it('the caption reads on the photograph', () => {
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const report = measureContrast(container);
    expect(report.measured + report.skippedNoSolidBackground).toBeGreaterThan(0);
    assertReadable(container, { maxViolations: BUDGET, label: `Photos · ${name}` });
  });

  it('draws the picture edge to edge, cropped rather than squashed', () => {
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(getComputedStyle(img).objectFit).toBe('cover');
    expect(img.getBoundingClientRect().width).toBeCloseTo(TILE, 0);
  });

  it('every featured tile reads', () => {
    for (const tpl of templates) {
      const { container } = mount(renderCosmosTemplate(tpl, brand, mock, undefined));
      assertReadable(container, { maxViolations: BUDGET, label: `Photos · ${name} · ${tpl.id}` });
      cleanup();
    }
  });

  it('a brand with no photographs says so, once, in words — never a slot (D14, D46)', () => {
    const empty = { ...base, photos: [{ id: 'slot-a', src: '', slot: 'A' }] } as MockBrand;
    const emptyTemplates = variantsForCard('brand-assets', 'Photos', empty);
    const { container } = mount(renderCosmosTemplate(emptyTemplates[0]!, brand, empty, undefined));
    const tile = container.querySelector('[data-testid="photos-empty"]');
    expect(tile).toBeTruthy();
    expect(tile!.textContent).toContain('No photos yet');
    expect(tile!.textContent).toContain('Library');
    // The vocabulary of the defect is gone.
    expect(container.textContent).not.toMatch(/Slot [A-F]/);
    expect(hasRealPhotos(empty)).toBe(false);
    assertReadable(container, { maxViolations: BUDGET, label: `Photos empty · ${name}` });
  });

  it('the empty tile is drawn ONCE, not once per missing photo', () => {
    const empty = {
      ...base,
      photos: [
        { id: 'slot-a', src: '', slot: 'A' },
        { id: 'slot-b', src: '', slot: 'B' },
        { id: 'slot-c', src: '', slot: 'C' },
      ],
    } as MockBrand;
    const emptyTemplates = variantsForCard('brand-assets', 'Photos', empty);
    let seen = 0;
    for (const tpl of emptyTemplates) {
      const { container } = mount(renderCosmosTemplate(tpl, brand, empty, undefined));
      seen += container.querySelectorAll('[data-testid="photos-empty"]').length;
      cleanup();
    }
    expect(seen).toBe(1);
  });
});

/* ─── The tile a brand with NO photographs needs ──────────────────── */

describe('a brand whose Library holds no image at all', () => {
  const brand = SEED_BRANDS[0]!;
  const base = brandToMockBrand(brand);

  it('has no templates, so the honest tile has to be reachable without one', () => {
    const none = { ...base, photos: [] } as MockBrand;
    // `variantsForCard` derives one template per photograph, so a brand with
    // none derives nothing and the drilldown has nothing to render. That is
    // exactly where `BrandKitCosmosPage` falls back to TWELVE tiles painted
    // with the card's stock cover — the Raqm half of D14 — and the fix is to
    // mount this renderer at index 0 instead. It answers with no template.
    expect(variantsForCard('brand-assets', 'Photos', none)).toHaveLength(0);

    const { container } = mount(<BrandAssetPhotoRenderer brand={none} templateIndex={0} />);
    const tile = container.querySelector('[data-testid="photos-empty"]');
    expect(tile).toBeTruthy();
    expect(tile!.textContent).toContain('No photos yet');
    assertReadable(container, { maxViolations: BUDGET, label: 'Photos · no library' });
  });

  it('and it is still only ONE tile, at index 0', () => {
    const none = { ...base, photos: [] } as MockBrand;
    const { container } = mount(<BrandAssetPhotoRenderer brand={none} templateIndex={3} />);
    expect(container.querySelector('[data-testid="photos-empty"]')).toBeNull();
  });
});

/* ─── The measurement that closes D1 ──────────────────────────────── */

describe('a source that is not a photograph', () => {
  const brand = SEED_BRANDS[0]!;
  const base = brandToMockBrand(brand);

  it('an image that will not load is MEASURED, and stops counting as photography', async () => {
    // The defect's own url: `/images/grain.png` does not exist, and the dev
    // server answers it with the SPA document at status 200.
    const missing = '/images/definitely-not-here.png';
    const mock = { ...base, photos: [{ id: 'grain', src: missing, slot: 'A' }] } as MockBrand;
    const templates = variantsForCard('brand-assets', 'Photos', mock);
    expect(hasRealPhotos(mock)).toBe(true);

    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    // A browser will not fire `error` for a file the test server happens to
    // answer, so the failure is asserted through the handler the browser calls.
    fireEvent.error(img);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="photos-empty"]')).toBeTruthy();
    });
    expect(isPhotoSourceBroken(missing)).toBe(true);
    // The completion counter reads the same answer as the tile — that is D46.
    expect(hasRealPhotos(mock)).toBe(false);
  });

  it('a source measured broken elsewhere never paints as a photograph here', () => {
    const missing = '/images/grain.png';
    markPhotoSourceBroken(missing);
    const mock = { ...base, photos: [{ id: 'grain', src: missing, slot: 'A' }] } as MockBrand;
    const templates = variantsForCard('brand-assets', 'Photos', mock);
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="photos-empty"]')).toBeTruthy();
  });
});

/* ─── Treatments ──────────────────────────────────────────────────── */

describe('brand treatments', () => {
  const brand = SEED_BRANDS[0]!;
  const mock = withPhotos(brandToMockBrand(brand));
  const templates = variantsForCard('brand-assets', 'Photos', mock);

  // A renderer is handed a MockBrand, which has a name and no id, so the
  // direction is resolved through the store — the same guard the captions use,
  // so one brand can never borrow another's rules.
  beforeEach(() => {
    useBrandStore.setState({ list: [brand], current: brand } as never);
  });
  afterEach(() => {
    useBrandStore.setState({ list: [], current: undefined } as never);
  });

  it('paints the treatment the art direction puts the photo in', async () => {
    // The direction store is keyed by the CANONICAL brand's id, which is how
    // the renderer resolves it from a MockBrand that carries only a name.
    writePhotoDirection(brand.id, {
      note: '',
      defaultTreatment: 'duotone',
      treatments: {},
      order: [],
      hidden: [],
    });
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const img = container.querySelector('img') as HTMLImageElement;
    // A duotone is a grayscale plus a two-ended ramp; the ramp is two blended
    // layers, and they are the brand's colours.
    await waitFor(() => expect(getComputedStyle(img).filter).toContain('grayscale'));
    const overlays = container.querySelectorAll('span[style*="mix-blend-mode"]');
    expect(overlays.length).toBe(2);
    assertReadable(container, { maxViolations: BUDGET, label: 'Photos · duotone' });
  });

  it('a hidden photograph is not the kit\'s photography', () => {
    writePhotoDirection(brand.id, {
      note: '',
      defaultTreatment: 'original',
      treatments: {},
      order: [],
      hidden: ['photo-studio'],
    });
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    // Hidden at index 0, and the brand still has another photograph, so the
    // tile is simply absent — an apology would be wrong, nothing is missing.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="photos-empty"]')).toBeNull();
  });

  it('the treatment switcher appears only on hover, so an export can never rasterize it', async () => {
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const tile = container.querySelector('.brand-asset-render--photo') as HTMLElement;
    expect(container.querySelectorAll('button')).toHaveLength(0);
    fireEvent.mouseEnter(tile);
    await waitFor(() => expect(container.querySelectorAll('button').length).toBeGreaterThan(0));
    fireEvent.mouseLeave(tile);
    await waitFor(() => expect(container.querySelectorAll('button')).toHaveLength(0));
  });
});
