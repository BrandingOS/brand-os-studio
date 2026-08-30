/**
 * Mockups — every word printed on every object reads.
 *
 * This is the guard the family was built around rather than fitted with.
 * The audit found the same defect three times in the hidden renderers —
 * white print on a cream tee at seven indexes, dark text on a black tote at
 * three, a red mark on a red card — and all three are the same mistake: the
 * OBJECT's colour and the INK on it were chosen in different places, so
 * nothing in the code could notice they had collided.
 *
 * The scenes now pick a print face first and take `ink(face)` from it, so
 * the budget is ZERO and it is zero on both seed brands. A mockup is the
 * image a brand shows a client; a caption nobody can read on it is worse
 * than no caption.
 *
 * jsdom cannot answer this — it has no cascade, so every renderer measures
 * as black on white and passes vacuously. Hence the browser project.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { featuredTemplates } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. See the header. */
const BUDGET = 0;

const SECTION = 'mockups';
const LABELS = [
  'Signage',
  'Apparel',
  'Mug',
  'Tote',
  'Sticker',
  'Business Card Stack',
  'Device Screen',
  'Billboard',
] as const;

afterEach(cleanup);

/**
 * A mockup scene fills its box, and an unsized box is a zero-height one —
 * every text node inside it would be reported as invisible and skipped,
 * which is how a sweep passes without measuring anything. 260 × 195 is the
 * card tile's own shape (the `ScaledStage` contract).
 */
function mountCard(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.height = '195px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

function stage(node: React.ReactNode, key: string) {
  return (
    <div key={key} style={{ width: 260, height: 195, background: '#ffffff' }}>
      {node}
    </div>
  );
}

describe('contrast sweep — mockups', () => {
  it('measures real colours, not jsdom defaults', () => {
    const featured = featuredTemplates('Mug', variantsForCard(SECTION, 'Mug', mockBrand));
    const { container } = mountCard(
      renderCosmosTemplate(featured[0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(
      report.measured + report.skippedNoSolidBackground + report.skippedInvisible,
    ).toBeGreaterThan(0);
    expect(report.measured).toBeGreaterThan(0);
    // Every scene prints on a FLAT face on purpose. Light, shading and
    // curvature are painted around the type, never through it — a face
    // wearing a gradient would be skipped rather than judged, which is how
    // a family "passes" without being readable.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  // Two brands, because the pairing that fails is the brand's own: Raqm is
  // a violet on cream, SKAM a red on near-black. An object that reads for
  // one and not the other is an object that does not read.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const label of LABELS) {
      it(`${label} reads for ${brand.name}`, () => {
        const all = variantsForCard(SECTION, label, mockBrand);
        expect(all, label).toHaveLength(6);
        const host = document.createElement('div');
        document.body.appendChild(host);
        render(
          <>{all.map((t) => stage(renderCosmosTemplate(t, brand, mockBrand, undefined), t.id))}</>,
          { container: host },
        );
        const report = measureContrast(host);
        if (report.violations.length > 0) {
          console.log(`\n${label} — ${brand.name}\n${formatViolations(report.violations)}\n`);
        }
        expect(report.violations.length).toBeLessThanOrEqual(BUDGET);
      });
    }
  }

  it('holds the whole featured set — eight cards, two brands — to one budget', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      <>
        {SEED_BRANDS.slice(0, 2).map((brand) =>
          LABELS.map((label) =>
            featuredTemplates(label, variantsForCard(SECTION, label, mockBrand)).map((t) =>
              stage(renderCosmosTemplate(t, brand, mockBrand, undefined), `${brand.id}-${t.id}`),
            ),
          ),
        )}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured mockups' });
  });

  it('reads with a badge filled in, not only with the empty default', () => {
    // `badge` defaults to empty — a claim nobody made — so the pill it
    // sits in is `display: none` on every scene and the sweep never
    // measures it. A customer typing one word into that field is the
    // moment it has to be readable.
    const content = {
      kind: 'mockupLabel' as const,
      primaryText: 'Northwind',
      secondaryText: 'Coffee and provisions',
      badge: 'New',
      url: 'northwind.co',
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      <>
        {LABELS.map((label) =>
          variantsForCard(SECTION, label, mockBrand).map((t) =>
            stage(renderCosmosTemplate(t, SEED_BRANDS[0]!, mockBrand, content), t.id),
          ),
        )}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'every mockup with a badge' });
  });
});
