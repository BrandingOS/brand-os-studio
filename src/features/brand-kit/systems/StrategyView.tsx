import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DsButton } from '@/shared/ds';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';
import { DownloadMenu } from '../components/DownloadMenu';
import { StrategyEditor } from '../components/assets/StrategyEditor';
import {
  STRATEGY_DOWNLOAD_OPTIONS,
  downloadStrategyFormat,
} from '../data/strategyDocument';
import '../components/assets/assets.css';
import { SystemBand, SystemEmpty } from './SystemLayout';

/**
 * Strategy — the brand's own answers, read from Setup, with the two
 * actions the card advertises.
 *
 * The card this replaces showed only `about[]`, the free-form sections.
 * The eleven structured answers a user gives during onboarding, and edits
 * in Setup, were invisible here — so the Brand Kit's account of the brand
 * disagreed with Setup's.
 *
 * There is deliberately NO strategy data in this feature. `STRATEGY_CARDS`
 * is Setup's list, in Setup's order, under Setup's names, and the values
 * come off `MockBrand.strategy` — the same projection Setup renders.
 *
 * Two rules the action row exists to keep:
 *
 *  • **The answers are read through `contentOf`, never raw.** A closed
 *    vocabulary is STORED as an id, so printing `brand.strategy.industry`
 *    straight put "b2b-saas" on the page while the brand book, the
 *    markdown and Setup itself all said "B2B SaaS". One list, one reader.
 *  • **Editing strategy still lives where editing strategy lives.** Edit
 *    opens `StrategyEditor`, which is a list that opens SETUP'S OWN
 *    modals; nothing here knows what a vocabulary is or how a field saves.
 */

export function StrategyView({
  brand,
  sourceBrand,
  chrome = true,
}: {
  brand: MockBrand;
  /**
   * The canonical brand — needed to write an edit and to put the logo and
   * the applications in the brand book.
   *
   * Optional because the drilldown mounts this view as
   * `<StrategyView brand={mockBrand} />`. When it is absent the store's
   * CURRENT brand stands in, and only when it is demonstrably the same
   * brand: this view is only interactive inside the live kit, where
   * `current` is exactly the brand the page loaded.
   */
  sourceBrand?: Brand;
  /**
   * False for the offscreen mount an export rasterizes through. The row
   * is also hidden by CSS inside `.bk-snapshot-host`, because the export
   * path does not pass this prop — a picture of the page with an Edit
   * button in it is a picture of the app, not of the brand.
   */
  chrome?: boolean;
}) {
  const current = useBrandStore((s) => s.current);
  const source = sourceBrand ?? (current && current.name === brand.name ? current : undefined);

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const answered = useMemo(
    () =>
      STRATEGY_CARDS.map((card) => ({
        card,
        // `contentOf`, not the raw field: a vocabulary answer is stored
        // as an id and read back as the word a person wrote.
        value: brand.strategy ? contentOf(card, brand.strategy) : '',
      })).filter((row) => row.value.length > 0),
    [brand.strategy],
  );

  // A heading with nothing under it is not content. The default brand
  // ships four empty `about` slots, and rendering them produced four
  // headings and no words.
  const sections = (brand.about ?? []).filter((a) => (a.content ?? '').trim().length > 0);

  const download = useCallback(
    async (format: Parameters<typeof downloadStrategyFormat>[0]) => {
      const id = toast.loading('Preparing the strategy…');
      try {
        const skipped = await downloadStrategyFormat(format, brand, source, {
          element: pageRef.current,
        });
        if (skipped.length > 0) {
          // A download that quietly left the applications out is a
          // download that lied about what it was.
          toast.warning('Downloaded, with gaps', {
            id,
            description: skipped.map((s) => `${s.label}: ${s.reason}`).join(' · '),
          });
        } else {
          toast.success('Strategy downloaded', { id });
        }
      } catch (err) {
        toast.error('Download failed', {
          id,
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [brand, source],
  );

  const actions = chrome ? (
    <>
      {/* `data-html2canvas-ignore` because "Flattened" photographs THIS
          element: a picture of the strategy page with its own toolbar in
          the corner is a picture of the app. The CSS rule on
          `.bk-snapshot-host` covers the other rasterizer, the offscreen
          one the kit zip mounts through; neither guard covers both. */}
      <div className="bka-strategy-actions" data-html2canvas-ignore="true">
        <DsButton tone="secondary" size="sm" onClick={() => setEditing(true)}>
          Edit strategy
        </DsButton>
        <div className="bka-strategy-dl">
          <DsButton tone="tertiary" size="sm" onClick={() => setMenuOpen((v) => !v)}>
            Download
          </DsButton>
          {menuOpen && (
            <DownloadMenu
              options={STRATEGY_DOWNLOAD_OPTIONS}
              onChoose={(choice) => void download(choice.format)}
              onClose={() => setMenuOpen(false)}
              anchor={{ top: 34, left: 0 }}
            />
          )}
        </div>
      </div>
      {editing && (
        <StrategyEditor
          open
          onClose={() => setEditing(false)}
          brand={brand}
          sourceBrand={source}
        />
      )}
    </>
  ) : null;

  if (answered.length === 0 && sections.length === 0) {
    return (
      <div className="bk-sys" ref={pageRef}>
        {actions}
        <SystemEmpty
          title="No strategy yet"
          sub="Answer the strategy questions in Setup and they appear here."
        />
      </div>
    );
  }

  return (
    <div className="bk-sys" ref={pageRef}>
      {actions}

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
