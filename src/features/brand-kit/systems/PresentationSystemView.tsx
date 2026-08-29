import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  DECK_SLIDE_KINDS,
  hydrateContent,
  type DeckContent,
  type DeckSlideKind,
} from '@/features/brandkit/content/kinds';
import { fgOn, fontStack, surface } from '../renderers/brandStyle';
import { deckSurfaceKind } from '../renderers/PresentationsExtended';
import { deckSlideName } from '../renderers/curation/presentations';
import { renderCosmosTemplate } from '../renderers';
import { SystemBand, SystemEmpty, SystemExample, SystemExamples, SystemRule, SystemRules } from './SystemLayout';

/**
 * The Presentation System.
 *
 * Four deck cards became one for the same reason four social cards did:
 * thirty tiles per deck type is not thirty decks. A deck is ten slides,
 * and the honest presentation of that work is the deck itself, in order,
 * which is what the applied band below shows — the real `pres-pitch`
 * renderer, with the brand's own `deck` content, not a picture of one.
 *
 * ## Two things this page must never do again
 *
 * It used to hardcode the DECK. `SLIDE_CAPTIONS` was a ten-item list —
 * "Problem", "Market", "The ask", "Team" — describing a fictional
 * start-up's pitch, and the slides underneath were rendered with no
 * content at all, so they painted the renderer's own invented copy: a
 * `$1.4M seed round`, a market of `014M / 2.1M / 340K`, three initialled
 * founders. Both halves are gone: the captions are the curated slot names
 * from `curation/presentations.ts` (the same names the deck card shows),
 * and every slide is handed `hydrateContent('deck', …)` — the brand's own
 * strategy answers, editable, and identical to what the Pitch Deck card
 * paints.
 *
 * It also hardcoded the SYSTEM it claimed to describe: five role chips
 * with `'#FFFFFF'` grounds and a `${family}, serif` font. The chips are
 * derived now — one per slide kind the model actually has, each painted
 * on the surface that kind's slide really takes (`deckSurfaceKind`), so
 * the legend and the deck below it cannot disagree.
 */

/** What each slide kind is FOR. System prose, not the customer's copy. */
const KIND_NOTES: Record<DeckSlideKind, { label: string; note: string }> = {
  title: { label: 'Title', note: 'Full bleed. The name, and who is presenting.' },
  section: { label: 'Divider', note: 'A number and a heading, and a line if it earns one.' },
  content: { label: 'Content', note: 'One idea, then at most four points.' },
  stat: { label: 'Data', note: 'The number is the headline.' },
  quote: { label: 'Quote', note: 'Someone else’s words, and their name.' },
  closing: { label: 'Closing', note: 'Where to reach you.' },
};

/** The deck the applied band shows. Ten slides is the whole card. */
const DECK_SLIDE_COUNT = 10;

function slideTemplate(n: number): BrandKitTemplate {
  return {
    id: `pres-pitch-ext-${n}`,
    name: deckSlideName('pres-pitch', n),
    category: 'Editorial',
    type: 'pres-pitch' as BrandKitTemplate['type'],
    orientation: 'landscape',
    tags: ['presentations', 'system'],
  } as BrandKitTemplate;
}

export function PresentationSystemView({
  brand,
  sourceBrand,
}: {
  brand: MockBrand;
  sourceBrand?: Brand;
}) {
  // The palette source is the canonical brand where there is one — it
  // carries the logo system the slides read — and the Setup projection
  // otherwise. `brandStyle` takes either and runs both through one
  // palette algorithm, so the chips match the artwork in both cases.
  const styleSource = sourceBrand ?? brand;

  const roles = useMemo(
    () =>
      DECK_SLIDE_KINDS.map((kind) => ({
        kind,
        ...KIND_NOTES[kind],
        tokens: surface(styleSource, deckSurfaceKind('pitch', kind)),
      })),
    [styleSource],
  );

  /**
   * The same content the Pitch Deck card paints.
   *
   * `hydrateContent` with no stored value is the kind's brand-derived
   * default — the brand's summary, mission, offerings, audience,
   * positioning and values, as ten slides. The system page and the card
   * therefore cannot show different decks.
   */
  const deck = useMemo(
    () => hydrateContent('deck', styleSource, undefined) as { kind: 'deck' } & DeckContent,
    [styleSource],
  );

  const headingFont = fontStack(styleSource, 'heading');
  const bodyFont = fontStack(styleSource, 'body');
  const swatches = [...(brand.colors.core ?? []), ...(brand.colors.accent ?? [])].slice(0, 5);

  if (swatches.length === 0) {
    return (
      <SystemEmpty
        title="Nothing to build a deck system from yet"
        sub="Add a colour in Setup, and this fills in."
      />
    );
  }

  return (
    <div className="bk-sys">
      <SystemBand
        title="How this brand presents"
        lede="Six slide roles and one type scale. A deck that needs a seventh role needs an edit."
      >
        <SystemRules>
          <SystemRule label="Slide roles" note="Every slide is one of these">
            <div className="bk-sys-slides">
              {roles.map((role) => (
                <div key={role.kind} className="bk-sys-slide">
                  <div
                    className="bk-sys-slide-chip"
                    style={{ background: role.tokens.bg, color: role.tokens.text }}
                  >
                    {role.label}
                  </div>
                  <span className="bk-sys-slide-note">{role.note}</span>
                </div>
              ))}
            </div>
          </SystemRule>

          <SystemRule label="Type scale" note="Three sizes, no more">
            <div className="bk-sys-scale">
              <span className="bk-sys-scale-xl" style={{ fontFamily: headingFont }}>
                Headline
              </span>
              <span className="bk-sys-scale-md" style={{ fontFamily: headingFont }}>
                Slide title
              </span>
              <span className="bk-sys-scale-sm" style={{ fontFamily: bodyFont }}>
                Supporting copy, one line where possible.
              </span>
            </div>
          </SystemRule>

          <SystemRule label="Colour on a slide" note="One ground, one accent">
            <div className="bk-sys-swatches">
              {swatches.map((c) => (
                <div
                  key={c.hex}
                  className="bk-sys-swatch"
                  style={{ background: c.hex, color: fgOn(c.hex) }}
                >
                  <span className="bk-sys-swatch-name">{c.name}</span>
                  <span className="bk-sys-swatch-hex">{c.hex.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </SystemRule>
        </SystemRules>
      </SystemBand>

      {sourceBrand && (
        <SystemBand
          title="The system, applied"
          lede="A complete ten-slide deck built from the rules above, in order."
        >
          <SystemExamples min={300}>
            {Array.from({ length: DECK_SLIDE_COUNT }, (_, i) => i + 1).map((n) => (
              <SystemExample
                key={n}
                caption={`${String(n).padStart(2, '0')} · ${deckSlideName('pres-pitch', n)}`}
                aspect={16 / 9}
              >
                {renderCosmosTemplate(slideTemplate(n), sourceBrand, brand, deck)}
              </SystemExample>
            ))}
          </SystemExamples>
        </SystemBand>
      )}
    </div>
  );
}
