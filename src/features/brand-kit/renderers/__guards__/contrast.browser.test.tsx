/**
 * The worked example for the contrast sweep, in a real browser.
 *
 * jsdom has no cascade: `getComputedStyle` there answers with the initial
 * value for anything a stylesheet or a Tailwind utility set, so every
 * renderer would measure as black-on-white and pass. The three casualties
 * the audit found (white print on a cream tee, dark text on a black tote,
 * a red logo on a red card) are exactly the class of bug that only a
 * browser with the real stylesheets loaded can see.
 *
 * The budget below is a MEASUREMENT taken on the day this landed, not a
 * target. `assertReadable` fails in BOTH directions on purpose: the
 * Business Card agent lowering it must lower the number here too.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every Tailwind colour utility is
// inert and the whole sweep measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from './contrast';

/**
 * Measured 2026-08-29 across the three featured Business Card designs on
 * the Raqm seed brand. MUST ONLY GO DOWN.
 *
 * The one violation is real and is the exact bug class this guard exists
 * for: `business-cards-ext-3` ("Brute Force") prints the job title in the
 * brand's primary — Raqm violet `#7231ff` — on its own near-black panel
 * `#0f1216`, at 3.22:1 where 4.5 is required. Nothing about the STRING is
 * wrong, so the literal scan cannot see it; the pairing is what fails.
 * The Business Card agent fixes it by asking `brandStyle.surface(...)` for
 * the panel's own `textMuted` instead of reaching for the brand colour.
 */
const BUSINESS_CARD_VIOLATION_BUDGET = 1;

const brand = SEED_BRANDS[0]!;

afterEach(cleanup);

/** Renderers are authored for a ~260px card and starve when laid out wider. */
function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  const result = render(<>{node}</>, { container: host });
  return result;
}

const featuredIds = DEFAULT_FEATURED_IDS_BY_LABEL['Business Card'] ?? [];
const all = variantsForCard('stationery', 'Business Card', mockBrand);
const featured = featuredIds
  .map((id) => all.find((t) => t.id === id))
  .filter((t): t is NonNullable<typeof t> => Boolean(t));

describe('contrast sweep — the featured business cards', () => {
  it('has the featured designs to measure', () => {
    expect(featured.length).toBeGreaterThan(0);
  });

  it('measures real colours, not jsdom defaults', () => {
    const { container } = mountAt260(
      renderCosmosTemplate(featured[0]!, brand, mockBrand, undefined),
    );
    const report = measureContrast(container);
    // If the stylesheets had not loaded there would be nothing to measure
    // and no skips either — the sweep would be vacuously green.
    expect(
      report.measured + report.skippedNoSolidBackground + report.skippedInvisible,
    ).toBeGreaterThan(0);
  });

  for (const template of featured) {
    it(`${template.name} reads`, () => {
      const { container } = mountAt260(
        renderCosmosTemplate(template, brand, mockBrand, undefined),
      );
      const report = measureContrast(container);
      if (report.violations.length > 0) {
        console.log(`\n${template.id} — ${template.name}\n${formatViolations(report.violations)}\n`);
      }
      expect(report.violations.length).toBeLessThanOrEqual(BUSINESS_CARD_VIOLATION_BUDGET);
    });
  }

  it('holds the whole featured set to one budget', () => {
    const host = document.createElement('div');
    host.style.width = '260px';
    document.body.appendChild(host);
    render(
      <>
        {featured.map((t) => (
          <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
            {renderCosmosTemplate(t, brand, mockBrand, undefined)}
          </div>
        ))}
      </>,
      { container: host },
    );
    assertReadable(host, {
      maxViolations: BUSINESS_CARD_VIOLATION_BUDGET,
      label: 'the featured business cards',
    });
  });

  it('catches a genuinely unreadable pairing', () => {
    // The guard has to be provably able to fail, or a green run means
    // nothing. Grey on white at 12px is ~1.6:1.
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      <div style={{ background: '#ffffff', color: '#dddddd', fontSize: 12 }}>
        Invisible price
      </div>,
      { container: host },
    );
    expect(() => assertReadable(host, { label: 'a deliberately broken tile' })).toThrow(
      /unreadable text node/,
    );
  });
});
