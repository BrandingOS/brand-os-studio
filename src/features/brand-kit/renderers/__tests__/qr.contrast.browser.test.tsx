/**
 * QR codes — the label under every code reads.
 *
 * The code itself is measured in `qr.bind.test.tsx`, which is the harder
 * question and the one a screenshot cannot answer. What is left for a real
 * browser is the ordinary one: these designs put a label on the brand's
 * own colour, on a dark page and on a disc, and a caption nobody can read
 * beside a code nobody knows whether to scan is the whole deliverable
 * wasted.
 *
 * The four cards are built here rather than fetched from
 * `variantsForCard`: the QR family has no entry in the card MAP, so its
 * templates are only ever reached by type. Shaping them locally is the
 * honest way to render exactly what the dispatcher would.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@/index.css';
import '../../brand-kit.css';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { renderCosmosTemplate } from '../index';
import { QR_KEPT_NAMES, QR_TYPES } from '../QrCodeExtended';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. A caption on a code is four words; there is no excuse. */
const BUDGET = 0;

/** QR cards are square, and the renderers are authored for a 260px tile. */
const TILE = 260;

afterEach(cleanup);

function templatesFor(type: string): BrandKitTemplate[] {
  return QR_KEPT_NAMES.map((name, i) => ({
    id: `${type}-ext-${i + 1}`,
    name,
    category: 'Modern',
    type: type as BrandKitTemplate['type'],
    orientation: 'square',
    tags: [type, 'extended', 'Modern'],
  })) as BrandKitTemplate[];
}

function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = `${TILE}px`;
  host.style.height = `${TILE}px`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

describe.each(QR_TYPES)('contrast sweep — %s', (type) => {
  const all = templatesFor(type);

  it('has six designs to measure', () => {
    expect(all).toHaveLength(6);
  });

  it('measures real colours, not jsdom defaults', () => {
    const { container } = mount(
      renderCosmosTemplate(all[0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const template of all) {
      it(`${template.name} reads for ${brand.name}`, () => {
        const { container } = mount(
          renderCosmosTemplate(template, brand, mockBrand, undefined),
        );
        const report = measureContrast(container);
        if (report.violations.length > 0) {
          console.log(
            `\n${template.id} — ${template.name} — ${brand.name}\n` +
              `${formatViolations(report.violations)}\n`,
          );
        }
        assertReadable(container, {
          maxViolations: BUDGET,
          label: `${template.id} (${template.name}) for ${brand.name}`,
        });
      });
    }
  }
});
