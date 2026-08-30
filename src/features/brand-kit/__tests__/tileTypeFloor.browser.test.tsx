/**
 * QA Q19 — TILE TYPE THAT NOBODY CAN READ.
 *
 * Measured on the shipped drilldowns: Envelope "Postage" **3.0px**, Letterhead
 * date and address **3.9px**, deck footers **3.4px**, Business Card contacts
 * 5.2–5.8px, Website / Landing nav 5.0–5.5px. Choosing between three variants
 * is the tile's only job.
 *
 * The cause is a mismatch of contracts, not a design mistake: renderers are
 * authored against a 260px stage (`ScalingStage`, and what `snapshotTemplatePng`
 * mounts), the card covers and the editor preview transform-scale that stage to
 * their box, and the drilldown grid alone stretches the renderer to ~347px with
 * no scaling at all. So the authored 3.0px paints as 3.0px.
 *
 * The fix is a floor declared by the SURFACE (`--bk-type-floor` on
 * `.bk-variant-tile-render`, read by `renderers/typeFloor.ts`), and this suite
 * asserts both halves of it:
 *
 *   1. **No leaf of type paints below the floor in a tile** — measured the way
 *      QA measured it, `getComputedStyle().fontSize` on elements that carry
 *      text and no element children, across seven families.
 *   2. **The export is untouched.** The same renderer mounted on the offscreen
 *      host still paints its authored size, because that surface sets no floor
 *      and `max()` falls back to `0px`. Proportions at export scale are the
 *      design's, not this file's.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import '../brand-kit.css';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { SEED_BRANDS } from '@/data/brands';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';
import { typePx } from '../renderers/typeFloor';

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const SOURCE = migrateBrandToCurrent(SEED_BRANDS[0]!);
const KIT_BRAND = { ...brandToMockBrand(SOURCE), photos: mockBrand.photos };

/** The floor `.bk-variant-tile-render` declares. Read, never assumed. */
function declaredFloor(): number {
  const el = document.querySelector('.bk-variant-tile-render');
  if (!el) return NaN;
  return parseFloat(getComputedStyle(el).getPropertyValue('--bk-type-floor'));
}

async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  });
}

async function openItem(label: string) {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  fireEvent.click(within(nav).getByText(label));
  await settle();
}

/**
 * Every element inside the drilldown grid that carries visible text and has no
 * element children — the leaves, which is where a font size actually lands.
 */
function typeLeaves(): Array<{ px: number; text: string }> {
  const out: Array<{ px: number; text: string }> = [];
  for (const el of Array.from(
    document.querySelectorAll<HTMLElement>('.bk-variant-tile-render *'),
  )) {
    if (el.childElementCount > 0) continue;
    const text = (el.textContent ?? '').trim();
    if (!text) continue;
    const style = getComputedStyle(el);
    // Something painted at zero opacity or hidden is not type anyone reads.
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const px = parseFloat(style.fontSize);
    if (!Number.isFinite(px) || px === 0) continue;
    out.push({ px, text: text.slice(0, 40) });
  }
  return out;
}

beforeEach(async () => {
  await page.viewport(1440, 900);
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

// The families QA measured, plus the two dense ones (Invoice, guides) that are
// built the same way. Named as the sidebar names them.
const FAMILIES = [
  'Envelope',
  'Letterhead',
  'Business Card',
  'Invoice',
  'Website',
  'Landing Page',
  'Pitch Deck',
];

describe('tile type has a legible floor', () => {
  it.each(FAMILIES)('%s — nothing in a tile paints below the floor', async (label) => {
    // A REAL brand and its canonical source: without `sourceBrand` the tiles
    // fall back to a placeholder cover and there is no type to measure.
    render(
      <MemoryRouter>
        <BrandKitCosmosPage brand={KIT_BRAND} sourceBrand={SOURCE} />
      </MemoryRouter>,
    );
    await openItem(label);

    const floor = declaredFloor();
    expect(floor).toBeGreaterThanOrEqual(7);

    const leaves = typeLeaves();
    // A family that rendered no type at all would pass vacuously.
    expect(leaves.length).toBeGreaterThan(3);

    const tooSmall = leaves.filter((l) => l.px < floor - 0.01);
    expect(
      tooSmall.map((l) => `${l.px}px "${l.text}"`).join('\n'),
    ).toBe('');
  });
});

describe('the export keeps the design’s own proportions', () => {
  it('a floor is a tile’s rule, and the offscreen host has none', () => {
    // `typePx` is `max(var(--bk-type-floor, 0px), Npx)`, so the answer depends
    // entirely on which surface the node is under. Measured on both.
    const host = document.createElement('div');
    host.className = 'bk-snapshot-host';
    host.style.width = '260px';
    host.style.height = '160px';
    host.style.minHeight = '0';
    const probe = document.createElement('span');
    probe.style.fontSize = typePx(3);
    probe.textContent = 'Postage';
    host.appendChild(probe);
    document.body.appendChild(host);
    expect(parseFloat(getComputedStyle(probe).fontSize)).toBeCloseTo(3, 1);

    const tile = document.createElement('div');
    tile.className = 'bk-variant-tile-render';
    tile.appendChild(probe);
    document.body.appendChild(tile);
    expect(parseFloat(getComputedStyle(probe).fontSize)).toBeGreaterThanOrEqual(7);

    host.remove();
    tile.remove();
  });

  it('leaves type that was already big enough exactly where it was', () => {
    const tile = document.createElement('div');
    tile.className = 'bk-variant-tile-render';
    const probe = document.createElement('span');
    probe.style.fontSize = typePx(34);
    tile.appendChild(probe);
    document.body.appendChild(tile);
    expect(parseFloat(getComputedStyle(probe).fontSize)).toBeCloseTo(34, 1);
    tile.remove();
  });
});
