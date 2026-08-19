import type { MockBrand } from '@/features/setup/data/mockBrand';
import { STRATEGY_CARDS } from '@/features/setup/data/strategyCards';
import { SystemBand, SystemEmpty } from './SystemLayout';

/**
 * Strategy — the brand's own answers, read from Setup.
 *
 * The card this replaces showed only `about[]`, the free-form sections.
 * The eleven structured answers a user gives during onboarding, and edits
 * in Setup, were invisible here — so the Brand Kit's account of the brand
 * disagreed with Setup's.
 *
 * There is deliberately NO strategy data in this feature. `STRATEGY_CARDS`
 * is Setup's list, in Setup's order, under Setup's names, and the values
 * come off `MockBrand.strategy` — the same projection Setup renders. This
 * view reads; it never writes and never stores. Editing strategy stays
 * where editing strategy lives.
 */

function formatValue(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const items = value.filter((v) => typeof v === 'string' && v.trim().length > 0);
    return items.length > 0 ? items.join(' · ') : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function StrategyView({ brand }: { brand: MockBrand }) {
  const answered = STRATEGY_CARDS.map((card) => ({
    card,
    value: formatValue((brand.strategy ?? {})[card.key]),
  })).filter((row) => row.value !== null);

  // A heading with nothing under it is not content. The default brand
  // ships four empty `about` slots, and rendering them produced four
  // headings and no words.
  const sections = (brand.about ?? []).filter((a) => (a.content ?? '').trim().length > 0);

  if (answered.length === 0 && sections.length === 0) {
    return (
      <SystemEmpty
        title="No strategy yet"
        sub="Answer the strategy questions in Setup and they appear here."
      />
    );
  }

  return (
    <div className="bk-sys">
      {answered.length > 0 && (
        <SystemBand
          title="What this brand stands for"
          lede="The answers given in Setup. Editing them there updates this."
        >
          <dl className="bk-strategy-list">
            {answered.map(({ card, value }) => (
              <div key={card.key} className="bk-strategy-row">
                <dt className="bk-strategy-term">{card.name}</dt>
                <dd className="bk-strategy-def">{value}</dd>
              </div>
            ))}
          </dl>
        </SystemBand>
      )}

      {sections.length > 0 && (
        <SystemBand
          title="In its own words"
          lede="Sections written for this brand that the eleven answers cannot hold."
        >
          <div className="bk-strategy-sections">
            {sections.map((section, i) => (
              <article key={`${section.title}-${i}`} className="bk-strategy-section">
                <h4 className="bk-strategy-section-title">{section.title}</h4>
                <p className="bk-strategy-section-body">{section.content}</p>
              </article>
            ))}
          </div>
        </SystemBand>
      )}
    </div>
  );
}
