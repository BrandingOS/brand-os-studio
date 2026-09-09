/**
 * Every design the kit offers lays out inside its own frame.
 *
 * The third guard, beside the literal scan and the contrast sweep. It
 * exists because the two of those are blind to the way the restored
 * designs were most likely to fail: a longer brand name, a third address
 * line, a two-word job title — none of which changes a string or a
 * colour, and any of which can push type out of the card.
 *
 * It sweeps EVERY kept design of every family with a content kind, on
 * both seed brands, because a layout defect is a function of the content
 * and the brand's own typeface rather than of the design alone.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every box measures as the browser's
// default and the sweep proves nothing.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { contentKindForTemplateType, hydrateContent } from '@/features/brandkit/content/kinds';
import { variantsForCard } from '../../data/legacy-mapping';
import { aspectForLabel } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { formatLayoutViolations, measureLayout } from './renderSweep';

afterEach(cleanup);

/**
 * Designs that were ALREADY laying out wrong when this guard landed,
 * counted per card and measured on both seed brands (2026-09-09).
 *
 * They are pre-existing, they are the same on both brands, and each one
 * is a real defect: the Cover family's tagline runs past the bottom of
 * the banner and over its own "Learn more" link, the Website and Landing
 * heroes hang their two buttons below the fold, and `invoices-ext-5`
 * (Stamped Due) prints the due date across the word "Due".
 *
 * **The numbers may only ever go DOWN.** A design restored into one of
 * these families adds nothing to its card's count — that is the bar the
 * restore was held to, and it is why the four families that restored
 * designs into a ZERO card are still at zero.
 */
const LAYOUT_BUDGET: Record<string, number> = {
  'Business Card': 0,
  Letterhead: 0,
  Envelope: 0,
  Invoice: 1,
  Profile: 0,
  Cover: 9,
  Post: 0,
  Story: 0,
  Favicon: 0,
  Website: 1,
  'Email Signature': 0,
  'Landing Page': 1,
};

/** The families whose artwork carries a customer's own words. */
const CARDS: Array<[string, string]> = [
  ['stationery', 'Business Card'],
  ['stationery', 'Letterhead'],
  ['stationery', 'Envelope'],
  ['stationery', 'Invoice'],
  ['social', 'Profile'],
  ['social', 'Cover'],
  ['social', 'Post'],
  ['social', 'Story'],
  ['web', 'Favicon'],
  ['web', 'Website'],
  ['web', 'Email Signature'],
  ['web', 'Landing Page'],
];

/**
 * The tile, at the size the kit draws it.
 *
 * Both halves matter. Renderers are authored for a ~260px card and starve
 * when laid out wider — and they are authored to FILL a box of the card's
 * own ratio, so a host with `height: auto` gives every `h-full` child zero
 * height and the sweep reports the whole design as escaping. The host IS
 * the frame the artwork is cut at.
 */
function mountTile(label: string, node: React.ReactNode) {
  const width = 260;
  const host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.height = `${Math.round(width / aspectForLabel(label))}px`;
  host.style.background = '#ffffff';
  host.style.overflow = 'visible';
  document.body.appendChild(host);
  return { ...render(<>{node}</>, { container: host }), host };
}

describe('render sweep — every offered design lays out', () => {
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const [sectionKey, label] of CARDS) {
      it(`${label} · ${brand.name}`, () => {
        const variants = variantsForCard(sectionKey as never, label, mockBrand);
        expect(variants.length).toBeGreaterThan(0);
        const failures: string[] = [];
        for (const template of variants) {
          const kind = contentKindForTemplateType(template.type as string);
          const content = kind ? hydrateContent(kind, mockBrand, undefined) : undefined;
          const { container, host } = mountTile(
            label,
            renderCosmosTemplate(template, brand, mockBrand, content),
          );
          const report = measureLayout(container, host);
          if (report.violations.length > 0) {
            failures.push(
              `${template.id} (${template.name})\n${formatLayoutViolations(report.violations)}`,
            );
          }
          cleanup();
        }
        const budget = LAYOUT_BUDGET[label] ?? 0;
        expect(
          failures.length,
          failures.length <= budget
            ? ''
            : `\n\n${failures.join('\n\n')}\n`,
        ).toBeLessThanOrEqual(budget);
      });
    }
  }
});
