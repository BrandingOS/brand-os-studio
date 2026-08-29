import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import {
  CtaLink,
  CtaPill,
  Deco,
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
 * Instagram story — 16 designs, 9:16, drawn edge to edge.
 *
 * A story is not a post rotated. It is read once, held in one hand, and
 * the eye lands in the middle third — so these designs put the message
 * where a thumb is not, keep the mark and the attribution on the two
 * edges, and leave the top strip clear of anything the platform's own
 * chrome would sit on.
 *
 * The twenty-two designs this replaces shared their invented copy with
 * the post family, word for word: the same "small studio doing work that
 * lasts", the same `join the studio`, the same `est. 2026`, plus a
 * hand-lettered pair welded to `Caveat, cursive` — another brand's
 * typeface, in a design sold as this brand's. All sixteen below paint the
 * `socialPost` content and the brand's own typefaces, and nothing else.
 *
 *    1  Tall Statement   Announcement · Bold      brand ground, message low
 *    2  Story Quote      Quote · Editorial        paper, rule and quote marks
 *    3  Third Split      Launch · Modern          brand top third, copy below
 *    4  Top Chrome       Announcement · Minimal   brand strip, quiet page
 *    5  Tall Frame       Quote · Minimal          inset rule, centred
 *    6  Night Drop       Sales · Bold             inverted, accent cta
 *    7  Side Rule        Quote · Editorial        left rule, stacked type
 *    8  Low Mark         Launch · Minimal         headline high, mark low
 *    9  Middle Stage     Announcement · Bold      inverted, centred block
 *   10  Season Band      Holiday · Modern         accent band across the middle
 *   11  Heavy Rule       Sales · Bold             headline over a thick rule
 *   12  Inset Sheet      Launch · Modern          paper sheet on brand ground
 *   13  Stacked Tiles    Holiday · Modern         brand tiles as a header
 *   14  Reversed Bar     Sales · Bold             headline out of a solid bar
 *   15  Quiet Column     Quote · Minimal          small type, long column
 *   16  Foot Bar         Announcement · Modern    copy up top, brand foot
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
}

function Body({
  brand,
  ground,
  fields,
  size = 9,
  lines = 4,
  color,
}: {
  brand: Brand;
  ground: Ground;
  fields: PostFields;
  size?: number;
  lines?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        ...bodyStyle(brand, ground, size, { color, lineHeight: 1.5 }),
        maxHeight: size * 1.5 * lines,
        overflow: 'hidden',
      }}
    >
      {fields.Body}
    </div>
  );
}

export function SocialStoryExtendedRenderer({ brand, templateIndex, content }: Props) {
  const c = postContentFor(brand, content);
  const picks = picksOf(content);
  const f = postFields(c);
  const g = groundsFor(brand, picks);
  const head = (ground: Ground, size: number, color?: string) =>
    headingStyle(brand, ground, size, { color });

  const designs = [
    // 1 — Tall Statement.
    (
      <Frame ground={g.brand} pad={22}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Mark brand={brand} ground={g.brand} size={20} picks={picks} />
          <TagChip brand={brand} ground={g.brand} fields={f} filled={false} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={head(g.brand, 34)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.brand, 12, { weight: 500 }), marginTop: 10 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.brand} fields={f} lines={4} color={g.brand.soft} />
          </div>
          <div style={{ marginTop: 18 }}>
            <CtaPill brand={brand} ground={g.brand} fields={f} size={9} />
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 18 }}>
          <MetaLine brand={brand} ground={g.brand} fields={f} size={7.5} />
        </div>
      </Frame>
    ),

    // 2 — Story Quote.
    (
      <Frame ground={g.paper} pad={22}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark brand={brand} ground={g.paper} size={17} picks={picks} />
          <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={7} />
        </div>
        <Deco
          style={{
            left: 22,
            top: 120,
            width: 11,
            height: 28,
            borderRadius: '0 0 6px 6px',
            background: mixHex(g.paper.accent, g.paper.bg, 0.5),
          }}
        />
        <Deco
          style={{
            left: 38,
            top: 120,
            width: 11,
            height: 28,
            borderRadius: '0 0 6px 6px',
            background: mixHex(g.paper.accent, g.paper.bg, 0.5),
          }}
        />
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 3, width: 44, background: g.paper.accent, marginBottom: 14 }} />
          <div style={{ ...head(g.paper, 25), lineHeight: 1.15 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 11, { weight: 600 }), marginTop: 10 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={5} color={g.paper.soft} />
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 18 }}>
          <CtaLink brand={brand} ground={g.paper} fields={f} color={g.paper.accent} size={9} />
          <div style={{ marginTop: 10 }}>
            <TagChip brand={brand} ground={g.paper} fields={f} size={7} />
          </div>
        </div>
      </Frame>
    ),

    // 3 — Third Split.
    (
      <Frame ground={g.paper} pad={0}>
        <div
          style={{
            height: '34%',
            background: g.brand.bg,
            padding: 22,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Mark brand={brand} ground={g.brand} size={24} picks={picks} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <MetaLine brand={brand} ground={g.brand} fields={f} size={7} />
            <TagChip brand={brand} ground={g.brand} fields={f} filled={false} size={7} />
          </div>
        </div>
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={head(g.paper, 27)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 11, { weight: 600 }), marginTop: 8 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={5} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaPill brand={brand} ground={g.paper} fields={f} color={g.paper.accent} size={9} />
          </div>
        </div>
      </Frame>
    ),

    // 4 — Top Chrome.
    (
      <Frame ground={g.paper} pad={0}>
        <div
          style={{
            background: g.brand.bg,
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Mark brand={brand} ground={g.brand} size={16} picks={picks} />
          <MetaLine brand={brand} ground={g.brand} fields={f} align="right" size={7} />
        </div>
        <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={metaStyle(brand, g.paper, 7.5, { color: g.paper.accent })}>{f.Tag}</div>
          <div style={{ ...head(g.paper, 29), marginTop: 12 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 11.5, { weight: 600 }), marginTop: 10 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={6} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaLink brand={brand} ground={g.paper} fields={f} size={9} />
          </div>
        </div>
      </Frame>
    ),

    // 5 — Tall Frame.
    (
      <Frame ground={g.paper} pad={18}>
        <div
          style={{
            flex: 1,
            border: `1px solid ${g.paper.accent}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 20,
            gap: 10,
          }}
        >
          <Mark brand={brand} ground={g.paper} size={20} picks={picks} />
          <div style={{ ...head(g.paper, 24), marginTop: 6 }}>{f.Headline}</div>
          <div style={bodyStyle(brand, g.paper, 11, { weight: 600 })}>{f.Subline}</div>
          <Body brand={brand} ground={g.paper} fields={f} lines={4} color={g.paper.soft} />
          <CtaLink brand={brand} ground={g.paper} fields={f} color={g.paper.accent} size={9} />
          <div style={{ marginTop: 6 }}>
            <MetaLine brand={brand} ground={g.paper} fields={f} align="center" size={7} />
          </div>
          <div style={metaStyle(brand, g.paper, 7, { color: g.paper.accent })}>{f.Tag}</div>
        </div>
      </Frame>
    ),

    // 6 — Night Drop.
    (
      <Frame ground={g.ink} pad={22}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TagChip brand={brand} ground={g.ink} fields={f} size={7} />
          <MetaLine brand={brand} ground={g.ink} fields={f} align="right" size={7} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={head(g.ink, 33)}>{f.Headline}</div>
          <div
            style={{
              ...bodyStyle(brand, g.ink, 12, { weight: 600, color: g.ink.accent }),
              marginTop: 10,
            }}
          >
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.ink} fields={f} lines={4} color={g.ink.soft} />
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <CtaPill brand={brand} ground={g.ink} fields={f} color={g.ink.accent} size={9.5} />
          <div style={{ marginTop: 14 }}>
            <Mark brand={brand} ground={g.ink} size={18} picks={picks} />
          </div>
        </div>
      </Frame>
    ),

    // 7 — Side Rule.
    (
      <Frame ground={g.paper} pad={22}>
        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
          <div style={{ width: 3, background: g.paper.accent, flex: '0 0 auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <MetaLine brand={brand} ground={g.paper} fields={f} size={7} />
            <div style={{ ...head(g.paper, 28), marginTop: 14 }}>{f.Headline}</div>
            <div style={{ ...bodyStyle(brand, g.paper, 11, { weight: 600 }), marginTop: 8 }}>
              {f.Subline}
            </div>
            <div style={{ marginTop: 12 }}>
              <Body brand={brand} ground={g.paper} fields={f} lines={7} color={g.paper.soft} />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <TagChip brand={brand} ground={g.paper} fields={f} filled={false} size={7} />
              <div style={{ marginTop: 10 }}>
                <CtaLink brand={brand} ground={g.paper} fields={f} size={9} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Mark brand={brand} ground={g.paper} size={16} picks={picks} />
        </div>
      </Frame>
    ),

    // 8 — Low Mark.
    (
      <Frame ground={g.brand} pad={22}>
        <div style={metaStyle(brand, g.brand, 7.5)}>{f.Tag}</div>
        <div style={{ ...head(g.brand, 34), marginTop: 12 }}>{f.Headline}</div>
        <div style={{ ...bodyStyle(brand, g.brand, 11.5, { weight: 500 }), marginTop: 10 }}>
          {f.Subline}
        </div>
        <div style={{ marginTop: 12 }}>
          <Body brand={brand} ground={g.brand} fields={f} lines={4} color={g.brand.soft} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <CtaLink brand={brand} ground={g.brand} fields={f} size={9} />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Mark brand={brand} ground={g.brand} size={22} picks={picks} />
            <MetaLine brand={brand} ground={g.brand} fields={f} align="right" size={7} />
          </div>
        </div>
      </Frame>
    ),

    // 9 — Middle Stage.
    (
      <Frame ground={g.ink} pad={22}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 10,
          }}
        >
          <Mark brand={brand} ground={g.ink} size={26} picks={picks} />
          <div style={{ ...head(g.ink, 30), marginTop: 8 }}>{f.Headline}</div>
          <div style={bodyStyle(brand, g.ink, 11.5, { weight: 600, color: g.ink.accent })}>
            {f.Subline}
          </div>
          <Body brand={brand} ground={g.ink} fields={f} lines={4} color={g.ink.soft} />
          <div style={{ marginTop: 6 }}>
            <CtaPill brand={brand} ground={g.ink} fields={f} size={9} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <MetaLine brand={brand} ground={g.ink} fields={f} size={7} />
          <div style={metaStyle(brand, g.ink, 7, { color: g.ink.accent })}>{f.Tag}</div>
        </div>
      </Frame>
    ),

    // 10 — Season Band.
    (
      <Frame ground={g.tint} pad={0}>
        <div style={{ padding: '22px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
          <Mark brand={brand} ground={g.tint} size={17} picks={picks} />
          <MetaLine brand={brand} ground={g.tint} fields={f} align="right" size={7} />
        </div>
        <div
          style={{
            marginTop: 20,
            background: g.brand.bg,
            padding: '11px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={metaStyle(brand, g.brand, 7.5, { color: g.brand.ink })}>{f.Tag}</div>
          <div style={metaStyle(brand, g.brand, 7.5, { color: g.brand.ink })}>{f.Cta}</div>
        </div>
        <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={head(g.tint, 27)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.tint, 11, { weight: 600 }), marginTop: 8 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.tint} fields={f} lines={6} color={g.tint.soft} />
          </div>
        </div>
      </Frame>
    ),

    // 11 — Heavy Rule.
    (
      <Frame ground={g.paper} pad={22}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark brand={brand} ground={g.paper} size={17} picks={picks} />
          <TagChip brand={brand} ground={g.paper} fields={f} size={7} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={head(g.paper, 32)}>{f.Headline}</div>
          <div style={{ height: 9, background: g.paper.accent, marginTop: 10, width: '72%' }} />
          <div style={{ ...bodyStyle(brand, g.paper, 11.5, { weight: 600 }), marginTop: 12 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 10 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={4} color={g.paper.soft} />
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 18 }}>
          <CtaPill brand={brand} ground={g.paper} fields={f} color={g.paper.accent} size={9} />
          <div style={{ marginTop: 12 }}>
            <MetaLine brand={brand} ground={g.paper} fields={f} size={7} />
          </div>
        </div>
      </Frame>
    ),

    // 12 — Inset Sheet.
    (
      <Frame ground={g.brand} pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark brand={brand} ground={g.brand} size={16} picks={picks} />
          <div style={metaStyle(brand, g.brand, 7)}>{f.Tag}</div>
        </div>
        <div
          style={{
            marginTop: 14,
            flex: 1,
            background: g.paper.bg,
            borderRadius: 8,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={head(g.paper, 25)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 10.5, { weight: 600 }), marginTop: 8 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 10 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={7} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaLink brand={brand} ground={g.paper} fields={f} color={g.paper.accent} size={9} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <MetaLine brand={brand} ground={g.brand} fields={f} size={7} />
        </div>
      </Frame>
    ),

    // 13 — Stacked Tiles.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ display: 'flex', height: '22%' }}>
          {[0.18, 0.3, 0.22, 0.3].map((w, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                width: `${w * 100}%`,
                background: i % 2 === 0 ? g.brand.bg : mixHex(g.brand.bg, g.paper.bg, 0.45),
              }}
            />
          ))}
        </div>
        <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Mark brand={brand} ground={g.paper} size={16} picks={picks} />
            <div style={metaStyle(brand, g.paper, 7, { color: g.paper.accent })}>{f.Tag}</div>
          </div>
          <div style={{ ...head(g.paper, 27), marginTop: 14 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 11, { weight: 600 }), marginTop: 8 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 10 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={5} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaLink brand={brand} ground={g.paper} fields={f} size={9} />
            <div style={{ marginTop: 12 }}>
              <MetaLine brand={brand} ground={g.paper} fields={f} size={7} />
            </div>
          </div>
        </div>
      </Frame>
    ),

    // 14 — Reversed Bar.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ padding: '22px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
          <Mark brand={brand} ground={g.paper} size={17} picks={picks} />
          <TagChip brand={brand} ground={g.paper} fields={f} size={7} />
        </div>
        <div style={{ marginTop: 'auto', background: g.brand.bg, padding: '20px 22px' }}>
          <div style={head(g.brand, 30)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.brand, 11, { weight: 600 }), marginTop: 8 }}>
            {f.Subline}
          </div>
        </div>
        <div style={{ padding: '16px 22px 22px' }}>
          <Body brand={brand} ground={g.paper} fields={f} lines={4} color={g.paper.soft} />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <CtaPill brand={brand} ground={g.paper} fields={f} color={g.paper.accent} size={9} />
            <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={7} />
          </div>
        </div>
      </Frame>
    ),

    // 15 — Quiet Column.
    (
      <Frame ground={g.tint} pad={26}>
        <MetaLine brand={brand} ground={g.tint} fields={f} size={7} />
        <div style={{ marginTop: 'auto', maxWidth: '88%' }}>
          <div style={{ ...head(g.tint, 21), lineHeight: 1.25 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.tint, 10, { weight: 600 }), marginTop: 10 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.tint} fields={f} lines={6} size={8.5} color={g.tint.soft} />
          </div>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={metaStyle(brand, g.tint, 7, { color: g.tint.accent })}>{f.Tag}</div>
          <div style={{ marginTop: 10 }}>
            <CtaLink brand={brand} ground={g.tint} fields={f} size={9} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Mark brand={brand} ground={g.tint} size={16} picks={picks} />
          </div>
        </div>
      </Frame>
    ),

    // 16 — Foot Bar.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={metaStyle(brand, g.paper, 7.5, { color: g.paper.accent })}>{f.Tag}</div>
            <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={7} />
          </div>
          <div style={{ ...head(g.paper, 29), marginTop: 14 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 11.5, { weight: 600 }), marginTop: 10 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 12 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={7} color={g.paper.soft} />
          </div>
        </div>
        <div
          style={{
            background: g.brand.bg,
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Mark brand={brand} ground={g.brand} size={18} picks={picks} />
          <CtaPill brand={brand} ground={g.brand} fields={f} size={8.5} color={g.brand.ink} />
        </div>
      </Frame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

/**
 * The sixteen kept designs. `ext-17`…`ext-22` and the eight legacy
 * `instagram-stories-N` ids are culled; see `renderers/curation/social.ts`.
 */
export const SOCIAL_STORY_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Tall Statement', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Story Quote', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Third Split', category: 'Modern' },
  { idSuffix: 'ext-4', name: 'Top Chrome', category: 'Minimalist' },
  { idSuffix: 'ext-5', name: 'Tall Frame', category: 'Minimalist' },
  { idSuffix: 'ext-6', name: 'Night Drop', category: 'Bold' },
  { idSuffix: 'ext-7', name: 'Side Rule', category: 'Editorial' },
  { idSuffix: 'ext-8', name: 'Low Mark', category: 'Minimalist' },
  { idSuffix: 'ext-9', name: 'Middle Stage', category: 'Bold' },
  { idSuffix: 'ext-10', name: 'Season Band', category: 'Modern' },
  { idSuffix: 'ext-11', name: 'Heavy Rule', category: 'Bold' },
  { idSuffix: 'ext-12', name: 'Inset Sheet', category: 'Modern' },
  { idSuffix: 'ext-13', name: 'Stacked Tiles', category: 'Modern' },
  { idSuffix: 'ext-14', name: 'Reversed Bar', category: 'Bold' },
  { idSuffix: 'ext-15', name: 'Quiet Column', category: 'Minimalist' },
  { idSuffix: 'ext-16', name: 'Foot Bar', category: 'Modern' },
] as const;
