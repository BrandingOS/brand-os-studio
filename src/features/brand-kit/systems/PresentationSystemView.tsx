import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import { renderCosmosTemplate } from '../renderers';
import { SystemBand, SystemEmpty, SystemExample, SystemExamples, SystemRule, SystemRules } from './SystemLayout';

/**
 * The Presentation System.
 *
 * Four deck cards became one for the same reason four social cards did:
 * thirty tiles per deck type is not thirty decks. The pitch-deck renderer
 * holds TEN genuinely distinct slides and then repeats them three times
 * to fill a grid — so the honest presentation of that work is the deck
 * itself, in order, which is what the applied band below shows.
 *
 * The other three deck types (Business Plan, Proposal, Case Studies) are
 * untouched and still render; they are experimental capabilities in the
 * catalog, not deleted ones.
 */

/** Slide roles, and what each one does with the brand's colour. */
function slideRoles(brand: MockBrand) {
  const core = brand.colors.core ?? [];
  const primary = core[0]?.hex;
  const secondary = core[1]?.hex;
  if (!primary) return [];
  return [
    { name: 'Title', ground: primary, note: 'Full bleed. Name, nothing else.' },
    { name: 'Section', ground: secondary ?? primary, note: 'A number and a word.' },
    { name: 'Content', ground: '#FFFFFF', note: 'One idea per slide.' },
    { name: 'Data', ground: '#FFFFFF', note: 'The number is the headline.' },
    { name: 'Closing', ground: primary, note: 'Where to reach you.' },
  ];
}

const DECK_SLIDES = Array.from({ length: 10 }, (_, i) => i + 1);

const SLIDE_CAPTIONS = [
  'Title',
  'Problem',
  'Solution',
  'Market',
  'Product',
  'Traction',
  'Team',
  'The ask',
  'Why us',
  'Closing',
];

function slideTemplate(n: number): BrandKitTemplate {
  return {
    id: `pres-pitch-ext-${n}`,
    name: `Slide ${n}`,
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
  const roles = useMemo(() => slideRoles(brand), [brand]);
  const heading = brand.fonts.find((f) => /head|display|title/i.test(f.role)) ?? brand.fonts[0];
  const body = brand.fonts.find((f) => /body|text|para/i.test(f.role)) ?? brand.fonts[1] ?? heading;

  if (roles.length === 0) {
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
        lede="Five slide roles and one type scale. A deck that needs a sixth role needs an edit."
      >
        <SystemRules>
          <SystemRule label="Slide roles" note="Every slide is one of these">
            <div className="bk-sys-slides">
              {roles.map((role) => (
                <div key={role.name} className="bk-sys-slide">
                  <div
                    className="bk-sys-slide-chip"
                    style={{
                      background: role.ground,
                      color: pickFgOnBackground(role.ground, ['#111113', '#FFFFFF']),
                    }}
                  >
                    {role.name}
                  </div>
                  <span className="bk-sys-slide-note">{role.note}</span>
                </div>
              ))}
            </div>
          </SystemRule>

          {heading && (
            <SystemRule label="Type scale" note="Three sizes, no more">
              <div className="bk-sys-scale">
                <span
                  className="bk-sys-scale-xl"
                  style={{ fontFamily: `${heading.family}, serif` }}
                >
                  Headline
                </span>
                <span
                  className="bk-sys-scale-md"
                  style={{ fontFamily: `${heading.family}, serif` }}
                >
                  Slide title
                </span>
                <span
                  className="bk-sys-scale-sm"
                  style={{ fontFamily: `${body?.family ?? heading.family}, sans-serif` }}
                >
                  Supporting copy, one line where possible.
                </span>
              </div>
            </SystemRule>
          )}

          <SystemRule label="Colour on a slide" note="One ground, one accent">
            <div className="bk-sys-swatches">
              {[...(brand.colors.core ?? []), ...(brand.colors.accent ?? [])]
                .slice(0, 5)
                .map((c) => (
                  <div
                    key={c.hex}
                    className="bk-sys-swatch"
                    style={{
                      background: c.hex,
                      color: pickFgOnBackground(c.hex, ['#111113', '#FFFFFF']),
                    }}
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
            {DECK_SLIDES.map((n) => (
              <SystemExample
                key={n}
                caption={`${String(n).padStart(2, '0')} · ${SLIDE_CAPTIONS[n - 1]}`}
                aspect={16 / 9}
              >
                {renderCosmosTemplate(slideTemplate(n), sourceBrand, brand)}
              </SystemExample>
            ))}
          </SystemExamples>
        </SystemBand>
      )}
    </div>
  );
}
