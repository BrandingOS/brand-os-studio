import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import {
  CtaLink,
  CtaPill,
  Frame,
  Mark,
  MetaLine,
  TagChip,
  bodyStyle,
  groundsFor,
  headingStyle,
  metaStyle,
  mixHex,
  postFields,
  type Ground,
  type PostFields,
} from './socialCommon';
import { picksOf, postContentFor } from './SocialPostExtended';

/**
 * Facebook / LinkedIn / X cover — 12 designs, wide, safe-area aware.
 *
 * A cover is the one social format nobody sees whole. Facebook serves the
 * same file at 820×312 on a desktop and crops it to roughly 640×360 on a
 * phone; LinkedIn and X want 1584×396 and 1500×500. So a cover that
 * arranges its message across the full width is a cover whose message is
 * cut in half on the device most people use.
 *
 * Every design here therefore keeps its words inside a CENTRED SAFE BAND —
 * `<SafeBand>`, 74% of the width — and lets only colour, rule and tile
 * reach the edges. The band is what survives every crop. It is also why
 * these are laid out as ROWS: the kit draws this card at 1.6 and the
 * editor previews it at the real 820÷312, so the design has to read at
 * 260×162 and at 260×99 without re-authoring, and a row degrades where a
 * column clips.
 *
 * What it replaces: twenty-two designs that printed `a brand · est. 2026`
 * and `good morning,` as though they were facts about the customer, on
 * grounds picked by eye.
 *
 *    1  Wide Banner     Announcement · Bold      brand ground, mark and message
 *    2  Ruled Page      Quote · Editorial        paper, accent rule
 *    3  Split Panel     Launch · Modern          brand block, paper message
 *    4  Ink Band        Announcement · Bold      inverted ground, centred
 *    5  Edge Strip      Launch · Minimal         brand strip on the left edge
 *    6  Centre Mark     Quote · Minimal          mark over the message
 *    7  Tag Rail        Holiday · Modern         the tag as a standing rail
 *    8  Inset Card      Launch · Modern          paper card on brand ground
 *    9  Wide Underline  Sales · Bold             headline over a thick rule
 *   10  Footer Strip    Announcement · Modern    message up, brand along the foot
 *   11  Tile Edge       Holiday · Modern         brand tiles hold the right edge
 *   12  Quiet Wide      Quote · Minimal          small type, wide margins
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
}

/**
 * The band every crop keeps.
 *
 * Centred, capped at 74% of the width, and vertically centred so the same
 * design reads at 260×162 and at 260×99. Nothing outside it may carry a
 * word.
 */
function SafeBand({
  children,
  align = 'space-between',
  style,
}: {
  children: ReactNode;
  align?: CSSProperties['justifyContent'];
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: '74%',
        maxWidth: '74%',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align,
        gap: 12,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The right-hand stack every cover carries: caption, action, attribution. */
function CoverAside({
  brand,
  ground,
  fields,
  align = 'right',
  cta = 'link',
}: {
  brand: Brand;
  ground: Ground;
  fields: PostFields;
  align?: 'left' | 'right';
  cta?: 'link' | 'pill';
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        textAlign: align,
        gap: 5,
        minWidth: 0,
        maxWidth: '46%',
      }}
    >
      <div
        style={{
          ...bodyStyle(brand, ground, 6.8, { color: ground.soft, lineHeight: 1.4 }),
          maxHeight: 6.8 * 1.4 * 2,
          overflow: 'hidden',
        }}
      >
        {fields.Body}
      </div>
      {cta === 'pill' ? (
        <CtaPill brand={brand} ground={ground} fields={fields} size={6.8} />
      ) : (
        <CtaLink brand={brand} ground={ground} fields={fields} size={6.8} />
      )}
      <MetaLine brand={brand} ground={ground} fields={fields} align={align} size={6} />
    </div>
  );
}

export function SocialCoverExtendedRenderer({ brand, templateIndex, content }: Props) {
  const c = postContentFor(brand, content);
  const picks = picksOf(content);
  const f = postFields(c);
  const g = groundsFor(brand, picks);
  const head = (ground: Ground, size: number) => headingStyle(brand, ground, size);
  const lead = (ground: Ground) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    minWidth: 0,
    flex: 1,
    color: ground.ink,
  });

  const designs = [
    // 1 — Wide Banner.
    (
      <Frame ground={g.brand} pad={0}>
        <SafeBand>
          <div style={lead(g.brand)}>
            <Mark brand={brand} ground={g.brand} size={14} picks={picks} />
            <div style={{ ...head(g.brand, 17), marginTop: 2 }}>{f.Headline}</div>
            <div style={bodyStyle(brand, g.brand, 8, { weight: 600 })}>{f.Subline}</div>
            <div style={metaStyle(brand, g.brand, 6)}>{f.Tag}</div>
          </div>
          <CoverAside brand={brand} ground={g.brand} fields={f} />
        </SafeBand>
      </Frame>
    ),

    // 2 — Ruled Page.
    (
      <Frame ground={g.paper} pad={0}>
        <SafeBand>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0, alignItems: 'stretch' }}>
            <div style={{ width: 3, background: g.paper.accent, flex: '0 0 auto' }} />
            <div style={lead(g.paper)}>
              <div style={head(g.paper, 17)}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.paper, 8, { weight: 600 })}>{f.Subline}</div>
              <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
            </div>
          </div>
          <CoverAside brand={brand} ground={g.paper} fields={f} />
        </SafeBand>
      </Frame>
    ),

    // 3 — Split Panel. Brand block on the left, message on paper.
    (
      <Frame ground={g.paper} pad={0} style={{ flexDirection: 'row' }}>
        <div
          style={{
            width: '30%',
            background: g.brand.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
            boxSizing: 'border-box',
          }}
        >
          <Mark brand={brand} ground={g.brand} size={20} picks={picks} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <SafeBand style={{ width: '86%', maxWidth: '86%' }}>
            <div style={lead(g.paper)}>
              <div style={head(g.paper, 16)}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.paper, 7.6, { weight: 600 })}>{f.Subline}</div>
              <TagChip brand={brand} ground={g.paper} fields={f} size={6} />
            </div>
            <CoverAside brand={brand} ground={g.paper} fields={f} />
          </SafeBand>
        </div>
      </Frame>
    ),

    // 4 — Ink Band.
    (
      <Frame ground={g.ink} pad={0}>
        <SafeBand align="center">
          <div style={{ ...lead(g.ink), alignItems: 'center', textAlign: 'center', flex: 'unset' }}>
            <Mark brand={brand} ground={g.ink} size={14} picks={picks} />
            <div style={{ ...head(g.ink, 17), marginTop: 2 }}>{f.Headline}</div>
            <div style={bodyStyle(brand, g.ink, 8, { weight: 600, color: g.ink.accent })}>
              {f.Subline}
            </div>
            <div
              style={{
                ...bodyStyle(brand, g.ink, 6.8, { color: g.ink.soft, lineHeight: 1.4 }),
                maxHeight: 6.8 * 1.4 * 2,
                overflow: 'hidden',
              }}
            >
              {f.Body}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <CtaPill brand={brand} ground={g.ink} fields={f} size={6.8} />
              <MetaLine brand={brand} ground={g.ink} fields={f} size={6} />
              <div style={metaStyle(brand, g.ink, 6, { color: g.ink.accent })}>{f.Tag}</div>
            </div>
          </div>
        </SafeBand>
      </Frame>
    ),

    // 5 — Edge Strip.
    (
      <Frame ground={g.paper} pad={0} style={{ flexDirection: 'row' }}>
        <div aria-hidden style={{ width: 14, background: g.brand.bg, flex: '0 0 auto' }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <SafeBand style={{ width: '82%', maxWidth: '82%' }}>
            <div style={lead(g.paper)}>
              <Mark brand={brand} ground={g.paper} size={13} picks={picks} />
              <div style={{ ...head(g.paper, 16), marginTop: 2 }}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.paper, 7.6, { weight: 600 })}>{f.Subline}</div>
              <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
            </div>
            <CoverAside brand={brand} ground={g.paper} fields={f} cta="pill" />
          </SafeBand>
        </div>
      </Frame>
    ),

    // 6 — Centre Mark.
    (
      <Frame ground={g.paper} pad={0}>
        <SafeBand align="center">
          <div style={{ ...lead(g.paper), alignItems: 'center', textAlign: 'center', flex: 'unset' }}>
            <Mark brand={brand} ground={g.paper} size={16} picks={picks} />
            <div style={{ height: 2, width: 30, background: g.paper.accent, margin: '3px 0' }} />
            <div style={head(g.paper, 16)}>{f.Headline}</div>
            <div style={bodyStyle(brand, g.paper, 7.6, { weight: 600 })}>{f.Subline}</div>
            <div
              style={{
                ...bodyStyle(brand, g.paper, 6.8, { color: g.paper.soft, lineHeight: 1.4 }),
                maxHeight: 6.8 * 1.4 * 2,
                overflow: 'hidden',
              }}
            >
              {f.Body}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <CtaLink brand={brand} ground={g.paper} fields={f} size={6.8} />
              <MetaLine brand={brand} ground={g.paper} fields={f} size={6} />
              <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
            </div>
          </div>
        </SafeBand>
      </Frame>
    ),

    // 7 — Tag Rail.
    (
      <Frame ground={g.tint} pad={0}>
        <SafeBand>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: g.brand.bg,
                padding: '6px 8px',
                borderRadius: 4,
                flex: '0 0 auto',
                maxWidth: '34%',
              }}
            >
              <div style={metaStyle(brand, g.brand, 6.5, { color: g.brand.ink })}>{f.Tag}</div>
            </div>
            <div style={lead(g.tint)}>
              <div style={head(g.tint, 16)}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.tint, 7.6, { weight: 600 })}>{f.Subline}</div>
              <Mark brand={brand} ground={g.tint} size={12} picks={picks} />
            </div>
          </div>
          <CoverAside brand={brand} ground={g.tint} fields={f} />
        </SafeBand>
      </Frame>
    ),

    // 8 — Inset Card.
    (
      <Frame ground={g.brand} pad={10}>
        <div
          style={{
            flex: 1,
            background: g.paper.bg,
            borderRadius: 6,
            display: 'flex',
            minWidth: 0,
          }}
        >
          <SafeBand style={{ width: '88%', maxWidth: '88%' }}>
            <div style={lead(g.paper)}>
              <Mark brand={brand} ground={g.paper} size={13} picks={picks} />
              <div style={{ ...head(g.paper, 16), marginTop: 2 }}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.paper, 7.6, { weight: 600 })}>{f.Subline}</div>
              <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
            </div>
            <CoverAside brand={brand} ground={g.paper} fields={f} />
          </SafeBand>
        </div>
      </Frame>
    ),

    // 9 — Wide Underline.
    (
      <Frame ground={g.paper} pad={0}>
        <SafeBand>
          <div style={lead(g.paper)}>
            <div style={head(g.paper, 19)}>{f.Headline}</div>
            <div style={{ height: 5, width: '58%', background: g.paper.accent, marginTop: 1 }} />
            <div style={{ ...bodyStyle(brand, g.paper, 8, { weight: 600 }), marginTop: 2 }}>
              {f.Subline}
            </div>
            <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
          </div>
          <CoverAside brand={brand} ground={g.paper} fields={f} cta="pill" />
        </SafeBand>
      </Frame>
    ),

    // 10 — Footer Strip.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <SafeBand>
            <div style={lead(g.paper)}>
              <div style={head(g.paper, 17)}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.paper, 7.6, { weight: 600 })}>{f.Subline}</div>
              <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
            </div>
            <div
              style={{
                ...bodyStyle(brand, g.paper, 6.8, { color: g.paper.soft, lineHeight: 1.4 }),
                maxHeight: 6.8 * 1.4 * 3,
                overflow: 'hidden',
                maxWidth: '46%',
                textAlign: 'right',
              }}
            >
              {f.Body}
            </div>
          </SafeBand>
        </div>
        <div
          style={{
            background: g.brand.bg,
            padding: '7px 0',
            flex: '0 0 auto',
          }}
        >
          <SafeBand style={{ height: 'auto' }}>
            <Mark brand={brand} ground={g.brand} size={11} picks={picks} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <CtaLink brand={brand} ground={g.brand} fields={f} size={6.4} />
              <MetaLine brand={brand} ground={g.brand} fields={f} size={6} />
            </div>
          </SafeBand>
        </div>
      </Frame>
    ),

    // 11 — Tile Edge.
    (
      <Frame ground={g.paper} pad={0} style={{ flexDirection: 'row' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <SafeBand style={{ width: '84%', maxWidth: '84%' }}>
            <div style={lead(g.paper)}>
              <Mark brand={brand} ground={g.paper} size={13} picks={picks} />
              <div style={{ ...head(g.paper, 16), marginTop: 2 }}>{f.Headline}</div>
              <div style={bodyStyle(brand, g.paper, 7.6, { weight: 600 })}>{f.Subline}</div>
              <TagChip brand={brand} ground={g.paper} fields={f} size={6} />
            </div>
            <CoverAside brand={brand} ground={g.paper} fields={f} />
          </SafeBand>
        </div>
        <div aria-hidden style={{ width: '16%', display: 'flex', flexDirection: 'column' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: i % 2 === 0 ? g.brand.bg : mixHex(g.brand.bg, g.paper.bg, 0.45),
              }}
            />
          ))}
        </div>
      </Frame>
    ),

    // 12 — Quiet Wide.
    (
      <Frame ground={g.tint} pad={0}>
        <SafeBand style={{ width: '66%', maxWidth: '66%' }}>
          <div style={lead(g.tint)}>
            <div style={metaStyle(brand, g.tint, 6, { color: g.tint.accent })}>{f.Tag}</div>
            <div style={{ ...headingStyle(brand, g.tint, 14, { weight: 700 }), marginTop: 2 }}>
              {f.Headline}
            </div>
            <div style={bodyStyle(brand, g.tint, 7.2, { weight: 600 })}>{f.Subline}</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              textAlign: 'right',
              gap: 4,
              minWidth: 0,
              maxWidth: '46%',
            }}
          >
            <div
              style={{
                ...bodyStyle(brand, g.tint, 6.6, { color: g.tint.soft, lineHeight: 1.4 }),
                maxHeight: 6.6 * 1.4 * 2,
                overflow: 'hidden',
              }}
            >
              {f.Body}
            </div>
            <CtaLink brand={brand} ground={g.tint} fields={f} size={6.4} />
            <MetaLine brand={brand} ground={g.tint} fields={f} align="right" size={6} />
            <Mark brand={brand} ground={g.tint} size={11} picks={picks} />
          </div>
        </SafeBand>
      </Frame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

/**
 * The twelve kept designs. `ext-13`…`ext-22` and the eight legacy
 * `facebook-covers-N` ids are culled; see `renderers/curation/social.ts`.
 */
export const SOCIAL_COVER_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Wide Banner', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Ruled Page', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Split Panel', category: 'Modern' },
  { idSuffix: 'ext-4', name: 'Ink Band', category: 'Bold' },
  { idSuffix: 'ext-5', name: 'Edge Strip', category: 'Minimalist' },
  { idSuffix: 'ext-6', name: 'Centre Mark', category: 'Minimalist' },
  { idSuffix: 'ext-7', name: 'Tag Rail', category: 'Modern' },
  { idSuffix: 'ext-8', name: 'Inset Card', category: 'Modern' },
  { idSuffix: 'ext-9', name: 'Wide Underline', category: 'Bold' },
  { idSuffix: 'ext-10', name: 'Footer Strip', category: 'Modern' },
  { idSuffix: 'ext-11', name: 'Tile Edge', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Quiet Wide', category: 'Minimalist' },
] as const;
