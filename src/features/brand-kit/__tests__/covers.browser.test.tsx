/**
 * FOUR CARDS MUST NOT BE ONE PICTURE.
 *
 * QA Q21: Logos, Social Media System, Presentation System and Brand Board all
 * painted the brand's mark centred on the brand's colour — because the three
 * composed views have no template library and fell through to `IdentityCover`,
 * which is very nearly what `LogosCover` draws. And Logo Reveal, Slide In,
 * Fade and Rotate were four identical white cards: every animation ENDS on the
 * finished lockup by design, so a cover taken at rest is the same picture four
 * times.
 *
 * Both halves are asserted structurally rather than by eye — a cover is
 * "different" here only if the DOM it produces is different, which is the
 * weakest claim that still catches the defect.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import '../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const SOURCE = migrateBrandToCurrent(SEED_BRANDS[0]!);
const KIT_BRAND = brandToMockBrand(SOURCE);

function cardNamed(label: string): HTMLElement | null {
  for (const card of Array.from(document.querySelectorAll<HTMLElement>('figure.bk-card'))) {
    if (card.querySelector('.bk-card-label')?.textContent?.trim() === label) return card;
  }
  return null;
}

/** Every cover mounts on approach, so each one has to be approached. */
async function mountCovers(labels: string[]) {
  for (const label of labels) {
    cardNamed(label)?.scrollIntoView();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
  }
  await act(async () => {
    await new Promise((r) => setTimeout(r, 600));
  });
}

function coverShape(label: string): string {
  const art = cardNamed(label)?.querySelector('.bk-card-cover-art');
  expect(art, `${label} has a cover`).toBeTruthy();
  // Structure only — colours and text come from the same brand, so two
  // different drawings of it must differ in their MARKUP.
  return (art!.innerHTML ?? '').replace(/\s+/g, ' ');
}

/** What a frozen animation frame is actually doing, per layer. */
function motionShape(label: string): string {
  const card = cardNamed(label);
  expect(card, `${label} has a card`).toBeTruthy();
  const layers = Array.from(card!.querySelectorAll<HTMLElement>('.bka-anim'));
  expect(layers.length, `${label} draws at least one animated layer`).toBeGreaterThan(0);
  return layers
    .map((el) => {
      const s = getComputedStyle(el);
      return `${s.transform}|${s.opacity}|${s.clipPath}`;
    })
    .join(' // ');
}

beforeEach(async () => {
  await page.viewport(1440, 900);
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

describe('the overview covers', () => {
  it('gives the composed views a picture of their own, not the identity mark', async () => {
    render(
      <MemoryRouter>
        <BrandKitCosmosPage brand={KIT_BRAND} sourceBrand={SOURCE} />
      </MemoryRouter>,
    );

    const labels = ['Logos', 'Social Media System', 'Presentation System', 'Brand Board'];
    await mountCovers(labels);

    const shapes = labels.map(coverShape);
    for (const shape of shapes) expect(shape.length).toBeGreaterThan(40);
    expect(new Set(shapes).size, `these four covers are all different:\n${labels.join(', ')}`).toBe(
      labels.length,
    );
  }, 60_000);

  it('freezes each motion card mid-move, so the four are four pictures', async () => {
    render(
      <MemoryRouter>
        <BrandKitCosmosPage brand={KIT_BRAND} sourceBrand={SOURCE} />
      </MemoryRouter>,
    );

    const labels = ['Logo Reveal', 'Slide In', 'Fade', 'Rotate'];
    await mountCovers(labels);

    const shapes = labels.map(motionShape);
    // At rest every one of these is `none|1|none` — which is the defect.
    expect(shapes.some((s) => /matrix|inset\(/.test(s))).toBe(true);
    expect(new Set(shapes).size, `four motion covers, four states:\n${shapes.join('\n')}`).toBe(
      labels.length,
    );
  }, 60_000);
});
