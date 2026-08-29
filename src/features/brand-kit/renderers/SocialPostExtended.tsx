import type { Brand } from '@/shared/types/brand';
import {
  hydrateContent,
  type DeliverableContent,
  type SocialPostContent,
} from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
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
import { fgOn } from './brandStyle';

/**
 * Instagram post — 16 designs, 1:1, drawn edge to edge.
 *
 * What changed, and why it is not a restyle. The twenty designs this
 * replaces painted a studio that does not exist: `"a small studio doing
 * work that lasts."`, a three-line manifesto, `April 27`, `join the
 * studio`, `est. 2026`. None of it was reachable by an edit, so a
 * customer's post said somebody else's words for ever. They also drew the
 * square INSIDE a grey mat, which is why every download arrived
 * letterboxed.
 *
 * Now every design paints the same seven fields of the `socialPost`
 * content — headline · subline · body · cta · handle · date · tag — and
 * differs only in how it arranges them and which brand ground it sits on.
 * All seven, in all sixteen: a family where some designs accept an edit
 * and others quietly drop it is worse than one where none do, because
 * nobody can tell which is which.
 *
 * The sixteen, by INTENT (what a post is for) and STYLE (how it looks):
 *
 *    1  Statement      Announcement · Bold       brand ground, one loud line
 *    2  Pull Quote     Quote · Editorial         paper, oversized quote mark
 *    3  Split Deck     Launch · Modern           mark above, copy below
 *    4  Header Band    Announcement · Minimal    brand strip, quiet page
 *    5  Ruled Frame    Quote · Minimal           inset brand rule, centred
 *    6  Night Offer    Sales · Bold              inverted ground, accent cta
 *    7  Editorial      Quote · Editorial         left rule, stacked type
 *    8  Corner Mark    Launch · Minimal          headline high, mark low
 *    9  Centre Stage   Announcement · Bold       inverted, everything centred
 *   10  Season Ribbon  Holiday · Modern          accent ribbon carries the tag
 *   11  Underline      Sales · Bold              headline on a thick rule
 *   12  Inset Card     Launch · Modern           paper card on brand ground
 *   13  Tile Field     Holiday · Modern          brand tiles above the copy
 *   14  Accent Bar     Sales · Bold              headline reversed out of a bar
 *   15  Quiet Page     Quote · Minimal           small type, plenty of space
 *   16  Footer Bar     Announcement · Modern     copy up top, brand foot
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
}

/** The content this design paints, whether or not the editor supplied it. */
export function postContentFor(brand: Brand, content?: DeliverableContent): SocialPostContent {
  if (content && content.kind === 'socialPost') return content;
  return hydrateContent('socialPost', brand, undefined) as SocialPostContent;
}

export function picksOf(content?: DeliverableContent): TemplateDesignPicks | undefined {
  return content?.picks;
}

/** A body paragraph, capped to the lines the design has room for. */
function Body({
  brand,
  ground,
  fields,
  size = 7.5,
  lines = 3,
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
        ...bodyStyle(brand, ground, size, { color, lineHeight: 1.45 }),
        maxHeight: size * 1.45 * lines,
        overflow: 'hidden',
      }}
    >
      {fields.Body}
    </div>
  );
}

export function SocialPostExtendedRenderer({ brand, templateIndex, content }: Props) {
  const c = postContentFor(brand, content);
  const picks = picksOf(content);
  const f = postFields(c);
  const g = groundsFor(brand, picks);
  const head = (ground: Ground, size: number, color?: string) =>
    headingStyle(brand, ground, size, { color });

  const designs = [
    // 1 — Statement. The brand's own colour, one line as loud as the
    // square allows, everything else deferring to it.
    (
      <Frame ground={g.brand}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Mark brand={brand} ground={g.brand} size={16} picks={picks} />
          <MetaLine brand={brand} ground={g.brand} fields={f} align="right" />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={head(g.brand, 26)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.brand, 9.5, { weight: 500 }), marginTop: 6 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.brand} fields={f} lines={2} color={g.brand.soft} />
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <CtaPill brand={brand} ground={g.brand} fields={f} />
          <TagChip brand={brand} ground={g.brand} fields={f} filled={false} />
        </div>
      </Frame>
    ),

    // 2 — Pull Quote. The quote mark is decoration and carries no text,
    // so it can be as big as it likes without anything to read on it.
    (
      <Frame ground={g.paper}>
        {/* Two blocks reading as an opening quote. Shapes, not glyphs:
            a decorative character is still a text node, and the contrast
            sweep would rightly measure it. */}
        <Deco
          style={{
            left: 18,
            top: 46,
            width: 9,
            height: 22,
            borderRadius: '0 0 5px 5px',
            background: mixHex(g.paper.accent, g.paper.bg, 0.5),
          }}
        />
        <Deco
          style={{
            left: 31,
            top: 46,
            width: 9,
            height: 22,
            borderRadius: '0 0 5px 5px',
            background: mixHex(g.paper.accent, g.paper.bg, 0.5),
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark brand={brand} ground={g.paper} size={14} picks={picks} />
          <TagChip brand={brand} ground={g.paper} fields={f} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 2, width: 34, background: g.paper.accent, marginBottom: 10 }} />
          <div style={head(g.paper, 19, g.paper.ink)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 9, { weight: 600 }), marginTop: 6 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={3} color={g.paper.soft} />
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <CtaLink brand={brand} ground={g.paper} fields={f} color={g.paper.accent} />
          <MetaLine brand={brand} ground={g.paper} fields={f} align="right" />
        </div>
      </Frame>
    ),

    // 3 — Split Deck. Mark on the brand half, copy on the paper half.
    (
      <Frame ground={g.paper} pad={0}>
        <div
          style={{
            height: '42%',
            background: g.brand.bg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Mark brand={brand} ground={g.brand} size={20} picks={picks} />
            <TagChip brand={brand} ground={g.brand} fields={f} filled={false} />
          </div>
          <MetaLine brand={brand} ground={g.brand} fields={f} />
        </div>
        <div
          style={{
            flex: 1,
            padding: 16,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={head(g.paper, 20)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 8.5, { weight: 600 }), marginTop: 4 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 6 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={2} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaPill brand={brand} ground={g.paper} fields={f} color={g.paper.accent} />
          </div>
        </div>
      </Frame>
    ),

    // 4 — Header Band. A quiet page with the brand held to one strip.
    (
      <Frame ground={g.paper} pad={0}>
        <div
          style={{
            background: g.brand.bg,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Mark brand={brand} ground={g.brand} size={13} picks={picks} />
          <MetaLine brand={brand} ground={g.brand} fields={f} align="right" size={6} />
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={metaStyle(brand, g.paper, 6.5, { color: g.paper.accent })}>{f.Tag}</div>
          <div style={{ ...head(g.paper, 22), marginTop: 8 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 9, { weight: 600 }), marginTop: 5 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={3} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaLink brand={brand} ground={g.paper} fields={f} />
          </div>
        </div>
      </Frame>
    ),

    // 5 — Ruled Frame. Everything inside a drawn rule, centred.
    (
      <Frame ground={g.paper}>
        <div
          style={{
            flex: 1,
            border: `1px solid ${g.paper.accent}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 16,
            gap: 6,
          }}
        >
          <Mark brand={brand} ground={g.paper} size={14} picks={picks} />
          <div style={{ ...head(g.paper, 18), marginTop: 4 }}>{f.Headline}</div>
          <div style={bodyStyle(brand, g.paper, 8.5, { weight: 600 })}>{f.Subline}</div>
          <Body brand={brand} ground={g.paper} fields={f} lines={2} color={g.paper.soft} />
          <CtaLink brand={brand} ground={g.paper} fields={f} color={g.paper.accent} />
          <div style={{ marginTop: 4 }}>
            <MetaLine brand={brand} ground={g.paper} fields={f} align="center" size={6} />
          </div>
          <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
        </div>
      </Frame>
    ),

    // 6 — Night Offer. The brand's own near-black, with the accent kept
    // for the one thing a sales post wants pressed.
    (
      <Frame ground={g.ink}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TagChip brand={brand} ground={g.ink} fields={f} />
          <MetaLine brand={brand} ground={g.ink} fields={f} align="right" />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={head(g.ink, 25)}>{f.Headline}</div>
          <div
            style={{
              ...bodyStyle(brand, g.ink, 9.5, { weight: 600, color: g.ink.accent }),
              marginTop: 6,
            }}
          >
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.ink} fields={f} lines={2} color={g.ink.soft} />
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CtaPill brand={brand} ground={g.ink} fields={f} color={g.ink.accent} size={8} />
          <Mark brand={brand} ground={g.ink} size={14} picks={picks} />
        </div>
      </Frame>
    ),

    // 7 — Editorial. A single rule down the left, type stacked against it.
    (
      <Frame ground={g.paper}>
        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
          <div style={{ width: 3, background: g.paper.accent, flex: '0 0 auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <MetaLine brand={brand} ground={g.paper} fields={f} />
            <div style={{ ...head(g.paper, 21), marginTop: 10 }}>{f.Headline}</div>
            <div style={{ ...bodyStyle(brand, g.paper, 9, { weight: 600 }), marginTop: 5 }}>
              {f.Subline}
            </div>
            <div style={{ marginTop: 8 }}>
              <Body brand={brand} ground={g.paper} fields={f} lines={4} color={g.paper.soft} />
            </div>
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <CtaLink brand={brand} ground={g.paper} fields={f} />
              <TagChip brand={brand} ground={g.paper} fields={f} filled={false} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Mark brand={brand} ground={g.paper} size={13} picks={picks} />
        </div>
      </Frame>
    ),

    // 8 — Corner Mark. Headline pinned high, the mark low and small —
    // the arrangement a launch announcement wants when the words are new.
    (
      <Frame ground={g.brand}>
        <div style={metaStyle(brand, g.brand, 6.5)}>{f.Tag}</div>
        <div style={{ ...head(g.brand, 27), marginTop: 8 }}>{f.Headline}</div>
        <div style={{ ...bodyStyle(brand, g.brand, 9, { weight: 500 }), marginTop: 6 }}>
          {f.Subline}
        </div>
        <div style={{ marginTop: 8 }}>
          <Body brand={brand} ground={g.brand} fields={f} lines={2} color={g.brand.soft} />
        </div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Mark brand={brand} ground={g.brand} size={18} picks={picks} />
          <div style={{ textAlign: 'right' }}>
            <CtaLink brand={brand} ground={g.brand} fields={f} />
            <div style={{ marginTop: 5 }}>
              <MetaLine brand={brand} ground={g.brand} fields={f} align="right" size={6} />
            </div>
          </div>
        </div>
      </Frame>
    ),

    // 9 — Centre Stage. Everything on the centre line, nothing else.
    (
      <Frame ground={g.ink}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 7,
          }}
        >
          <Mark brand={brand} ground={g.ink} size={20} picks={picks} />
          <div style={{ ...head(g.ink, 23), marginTop: 4 }}>{f.Headline}</div>
          <div style={bodyStyle(brand, g.ink, 9, { weight: 600, color: g.ink.accent })}>
            {f.Subline}
          </div>
          <Body brand={brand} ground={g.ink} fields={f} lines={2} color={g.ink.soft} />
          <CtaPill brand={brand} ground={g.ink} fields={f} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <MetaLine brand={brand} ground={g.ink} fields={f} size={6} />
          <div style={metaStyle(brand, g.ink, 6, { color: g.ink.accent })}>{f.Tag}</div>
        </div>
      </Frame>
    ),

    // 10 — Season Ribbon. The tag rides a band across the square; the
    // band is a solid colour, so what sits on it can be measured.
    (
      <Frame ground={g.tint} pad={0}>
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Mark brand={brand} ground={g.tint} size={14} picks={picks} />
            <MetaLine brand={brand} ground={g.tint} fields={f} align="right" size={6} />
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            background: g.brand.bg,
            padding: '7px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={metaStyle(brand, g.brand, 6.5, { color: g.brand.ink })}>{f.Tag}</div>
          <div style={metaStyle(brand, g.brand, 6.5, { color: g.brand.ink })}>{f.Cta}</div>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={head(g.tint, 21)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.tint, 9, { weight: 600 }), marginTop: 5 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.tint} fields={f} lines={3} color={g.tint.soft} />
          </div>
        </div>
      </Frame>
    ),

    // 11 — Underline. The rule under the headline is the loudest thing
    // in the design, which is what a price-free sales post has instead
    // of a price.
    (
      <Frame ground={g.paper}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark brand={brand} ground={g.paper} size={14} picks={picks} />
          <TagChip brand={brand} ground={g.paper} fields={f} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={head(g.paper, 24)}>{f.Headline}</div>
          <div style={{ height: 6, background: g.paper.accent, marginTop: 6, width: '68%' }} />
          <div style={{ ...bodyStyle(brand, g.paper, 9, { weight: 600 }), marginTop: 8 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 6 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={2} color={g.paper.soft} />
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <CtaPill brand={brand} ground={g.paper} fields={f} color={g.paper.accent} />
          <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={6} />
        </div>
      </Frame>
    ),

    // 12 — Inset Card. A paper card floating on the brand's colour.
    (
      <Frame ground={g.brand} pad={14}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Mark brand={brand} ground={g.brand} size={13} picks={picks} />
          <div style={metaStyle(brand, g.brand, 6)}>{f.Tag}</div>
        </div>
        <div
          style={{
            marginTop: 10,
            flex: 1,
            background: g.paper.bg,
            borderRadius: 6,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={head(g.paper, 19)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 8.5, { weight: 600 }), marginTop: 4 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 6 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={3} color={g.paper.soft} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <CtaLink brand={brand} ground={g.paper} fields={f} color={g.paper.accent} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <MetaLine brand={brand} ground={g.brand} fields={f} size={6} />
        </div>
      </Frame>
    ),

    // 13 — Tile Field. A run of brand tiles above the copy; the tiles
    // carry nothing, so they are free to be pure colour.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ display: 'flex', height: '30%' }}>
          {[0.16, 0.34, 0.2, 0.3].map((w, i) => (
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
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Mark brand={brand} ground={g.paper} size={13} picks={picks} />
            <div style={metaStyle(brand, g.paper, 6, { color: g.paper.accent })}>{f.Tag}</div>
          </div>
          <div style={{ ...head(g.paper, 20), marginTop: 10 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 8.5, { weight: 600 }), marginTop: 4 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 6 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={2} color={g.paper.soft} />
          </div>
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CtaLink brand={brand} ground={g.paper} fields={f} />
            <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={6} />
          </div>
        </div>
      </Frame>
    ),

    // 14 — Accent Bar. The headline reversed out of a solid bar.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ padding: '16px 18px 0', display: 'flex', justifyContent: 'space-between' }}>
          <Mark brand={brand} ground={g.paper} size={14} picks={picks} />
          <TagChip brand={brand} ground={g.paper} fields={f} />
        </div>
        <div
          style={{
            marginTop: 'auto',
            background: g.brand.bg,
            padding: '14px 18px',
          }}
        >
          <div style={head(g.brand, 23)}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.brand, 8.5, { weight: 600 }), marginTop: 4 }}>
            {f.Subline}
          </div>
        </div>
        <div style={{ padding: '12px 18px 16px' }}>
          <Body brand={brand} ground={g.paper} fields={f} lines={2} color={g.paper.soft} />
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CtaPill brand={brand} ground={g.paper} fields={f} color={g.paper.accent} />
            <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={6} />
          </div>
        </div>
      </Frame>
    ),

    // 15 — Quiet Page. Small type and a great deal of space; the one
    // design in the set that says the brand does not have to shout.
    (
      <Frame ground={g.tint} pad={22}>
        <MetaLine brand={brand} ground={g.tint} fields={f} size={6} />
        <div style={{ marginTop: 'auto', maxWidth: '86%' }}>
          <div style={{ ...head(g.tint, 16, g.tint.ink), lineHeight: 1.25 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.tint, 8, { weight: 600 }), marginTop: 6 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.tint} fields={f} lines={3} size={7} color={g.tint.soft} />
          </div>
        </div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
            <div style={metaStyle(brand, g.tint, 6, { color: g.tint.accent })}>{f.Tag}</div>
            <div style={{ marginTop: 6 }}>
              <CtaLink brand={brand} ground={g.tint} fields={f} />
            </div>
          </div>
          <Mark brand={brand} ground={g.tint} size={13} picks={picks} />
        </div>
      </Frame>
    ),

    // 16 — Footer Bar. Copy on the page, the brand holding the floor.
    (
      <Frame ground={g.paper} pad={0}>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={metaStyle(brand, g.paper, 6.5, { color: g.paper.accent })}>{f.Tag}</div>
            <MetaLine brand={brand} ground={g.paper} fields={f} align="right" size={6} />
          </div>
          <div style={{ ...head(g.paper, 22), marginTop: 10 }}>{f.Headline}</div>
          <div style={{ ...bodyStyle(brand, g.paper, 9, { weight: 600 }), marginTop: 5 }}>
            {f.Subline}
          </div>
          <div style={{ marginTop: 8 }}>
            <Body brand={brand} ground={g.paper} fields={f} lines={3} color={g.paper.soft} />
          </div>
        </div>
        <div
          style={{
            background: g.brand.bg,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Mark brand={brand} ground={g.brand} size={14} picks={picks} />
          <span
            style={{
              ...metaStyle(brand, g.brand, 7, { color: g.brand.ink }),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {f.Cta}
            <span aria-hidden style={{ color: fgOn(g.brand.bg) }}>
              →
            </span>
          </span>
        </div>
      </Frame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

/**
 * The sixteen kept designs.
 *
 * `idSuffix` is a PERSISTENCE KEY: `instagram-posts-ext-3` is whatever a
 * customer saved against it, so the numbering never moves. `ext-17`…
 * `ext-20` and the ten legacy `instagram-posts-N` ids are culled and
 * recorded in `renderers/curation/social.ts`.
 */
export const SOCIAL_POST_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Statement', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Pull Quote', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Split Deck', category: 'Modern' },
  { idSuffix: 'ext-4', name: 'Header Band', category: 'Minimalist' },
  { idSuffix: 'ext-5', name: 'Ruled Frame', category: 'Minimalist' },
  { idSuffix: 'ext-6', name: 'Night Offer', category: 'Bold' },
  { idSuffix: 'ext-7', name: 'Editorial', category: 'Editorial' },
  { idSuffix: 'ext-8', name: 'Corner Mark', category: 'Minimalist' },
  { idSuffix: 'ext-9', name: 'Centre Stage', category: 'Bold' },
  { idSuffix: 'ext-10', name: 'Season Ribbon', category: 'Modern' },
  { idSuffix: 'ext-11', name: 'Underline', category: 'Bold' },
  { idSuffix: 'ext-12', name: 'Inset Card', category: 'Modern' },
  { idSuffix: 'ext-13', name: 'Tile Field', category: 'Modern' },
  { idSuffix: 'ext-14', name: 'Accent Bar', category: 'Bold' },
  { idSuffix: 'ext-15', name: 'Quiet Page', category: 'Minimalist' },
  { idSuffix: 'ext-16', name: 'Footer Bar', category: 'Modern' },
] as const;
