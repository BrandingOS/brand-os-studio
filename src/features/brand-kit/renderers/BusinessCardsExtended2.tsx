/**
 * Business cards — Wave 2. Six designs, not a hundred.
 *
 * WHAT THIS FILE USED TO BE
 *
 * `business-cards-ext-19` … `-ext-118`: a hundred designs generated in one
 * function body from `brand.name`. `.audit/CODE.md` §2 measured what a
 * customer actually got from them — roughly fifty-five printed the string
 * "VP" over the bound job title, five tiled the letters "JN / SM / XX",
 * one printed `> jane_smith`, one an issue number "N° 013", and one a
 * founding year computed from the LENGTH of the brand's name. They reached
 * the picker as "Wave 2 · 95" and the drilldown as a hundred near-identical
 * tiles, and one of them was FEATURED on the Brand Kit page.
 *
 * WHAT IT IS NOW
 *
 * Six designs, at the ids `ext-19` … `-ext-24`, built from the same
 * machinery Wave 1 uses (`cardTheme`, `CardStage`, `Face`, `CardBack`,
 * `Mark`, `fragments`, `cardText`) — so there is one answer in this repo to
 * "what is a business card", not two. Each of the six is a COMPOSITION Wave
 * 1 does not have: a diagonal cut, a contact rail, a centre split, three
 * stacked panels, a perforated stub, and type running up the edge.
 *
 * Every one of them binds all ten `person` fields, paints only from
 * `brandStyle`, and carries a back. The other 94 ids are archived in
 * `renderers/curation/businessCards.ts` — reserved, so a saved
 * customization filed under one still resolves, and invisible everywhere
 * else. `BUSINESS_CARDS_EXTENDED_2` holding six entries is what actually
 * stops the 94 being emitted; the ids' `-ext-N` arithmetic is untouched.
 */
import type { ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import {
  CardBack,
  CardStage,
  Contacts,
  ContactsSplit,
  Face,
  Mark,
  UPPER,
  cardContext,
  cardText,
  type CardCtx,
  type PersonCardContent,
} from './BusinessCardsExtended';

interface Props {
  brand: Brand;
  templateIndex: number;
  /** The `person` content the shared dispatch hands every card. */
  content?: PersonCardContent;
}

type CardDesign = (ctx: CardCtx) => { front: ReactNode; back: ReactNode };

const DESIGNS: CardDesign[] = [
  // 19 — Diagonal Cut. A brand wedge taken out of the top-right corner,
  // carrying the mark. Nothing else is printed on it: a wedge is a shape
  // whose edge moves with the card's width, and type that has to dodge a
  // moving edge is type that eventually collides with it.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <div style={{ position: 'absolute', inset: 0, background: t.paper, overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '54%',
            height: '48%',
            background: t.brandBg,
            clipPath: 'polygon(26% 0, 100% 0, 100% 100%)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '7%',
            right: '6%',
            display: 'block',
          }}
        >
          <Mark brand={brand} theme={t} on={t.brandBg} height={11} picks={picks} company={company} />
        </span>
        <Face bg="transparent">
          <div style={{ maxWidth: '44%' }}>
            <div style={cardText(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
            <div style={cardText(5.1, t.paperMuted, t.body, { marginTop: '1px' })}>{f.Tagline}</div>
          </div>
          <div
            style={cardText(11.5, t.paperInk, t.heading, {
              fontWeight: 600,
              marginTop: 'auto',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={cardText(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={cardText(5.8, t.paperAccent, t.body, { marginTop: '1px', ...UPPER })}>
            {f.Role}
          </div>
          <div style={{ marginTop: '5px' }}>
            <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.1} />
            <div style={cardText(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
          </div>
        </Face>
      </div>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="dark" />,
  }),

  // 20 — Contact Rail. The four ways to reach the person live in a brand
  // column down the right-hand edge, so they read as a block rather than
  // as the tail of the card.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ display: 'flex', height: '100%' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: '9% 6% 9% 8%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Mark brand={brand} theme={t} on={t.paper} height={12} picks={picks} company={company} />
            <div
              style={cardText(11, t.paperInk, t.heading, {
                fontWeight: 600,
                marginTop: 'auto',
                letterSpacing: '-0.015em',
              })}
            >
              {f.Name}
              <span style={cardText(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={cardText(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
            <div style={cardText(5.3, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Company}</div>
            <div style={cardText(5.1, t.paperMuted, t.body, { marginTop: '3px' })}>{f.Address}</div>
          </div>
          <div
            style={{
              width: '38%',
              background: t.brandBg,
              padding: '9% 6%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
            }}
          >
            <div style={cardText(5.2, t.brandMuted, t.body, UPPER)}>{f.Tagline}</div>
            <Contacts f={f} color={t.brandInk} font={t.body} size={5.3} gap={1.4} />
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="dark" />,
  }),

  // 21 — Centre Split. One hairline down the middle: who, and how to
  // reach them. The most literal reading of what a card is for.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="9% 7%">
        <div style={{ display: 'flex', height: '100%', gap: '6%' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
            <div
              style={cardText(10.5, t.paperInk, t.heading, {
                fontWeight: 600,
                marginTop: 'auto',
                letterSpacing: '-0.015em',
              })}
            >
              {f.Name}
              <span style={cardText(5.1, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={cardText(5.7, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          </div>
          <div style={{ width: '1px', background: t.paperLine, flex: '0 0 auto' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={cardText(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
            <div style={cardText(5.2, t.paperMuted, t.body, { marginTop: '1px' })}>{f.Tagline}</div>
            <div style={{ marginTop: 'auto' }}>
              <Contacts f={f} color={t.paperInk} font={t.body} size={5.3} gap={1.1} />
              <div style={cardText(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>
                {f.Address}
              </div>
            </div>
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 22 — Three Panels. Paper, tint, brand — stacked, each one holding the
  // part of the card that belongs to it: the mark, the person, the
  // contact. Every text node is measured against the panel it sits on.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div
          style={{
            padding: '5% 8% 3%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '5%',
          }}
        >
          <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
          <div style={cardText(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
        </div>
        <div style={{ background: t.tint, padding: '4% 8%', flex: 1 }}>
          <div
            style={cardText(11, t.tintInk, t.heading, { fontWeight: 600, letterSpacing: '-0.015em' })}
          >
            {f.Name}
            <span style={cardText(5.2, t.tintMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={cardText(5.8, t.tintAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          <div style={cardText(5.2, t.tintMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
        </div>
        <div style={{ background: t.brandBg, padding: '4% 8%' }}>
          <ContactsSplit f={f} color={t.brandInk} font={t.body} size={5.3} gap={0.8} />
          <div style={cardText(5.1, t.brandMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="second" />,
  }),

  // 23 — Perforation. A dashed rule with a notch at each end, the way a
  // ticket tears. The stub below it carries the contact block.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ flex: 1, padding: '8% 8% 4%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={cardText(5.3, t.paperMuted, t.mono, UPPER)}>{f.Company}</div>
            <Mark brand={brand} theme={t} on={t.paper} height={10} picks={picks} company={company} />
          </div>
          <div
            style={cardText(11.5, t.paperInk, t.heading, {
              fontWeight: 600,
              marginTop: 'auto',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={cardText(5.2, t.paperMuted, t.mono)}>{f.Pron}</span>
          </div>
          <div style={cardText(5.7, t.paperAccent, t.mono, { marginTop: '1px', ...UPPER })}>
            {f.Role}
          </div>
          <div style={cardText(5.2, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
        </div>
        <div style={{ position: 'relative', height: '1px' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `repeating-linear-gradient(90deg, ${t.paperLine} 0 2px, transparent 2px 4px)`,
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: '-2%',
              top: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: t.brandBg,
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: '-2%',
              top: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: t.brandBg,
            }}
          />
        </div>
        <div style={{ padding: '4.5% 8% 7%' }}>
          <ContactsSplit f={f} color={t.paperInk} font={t.mono} size={5.3} gap={1.1} />
          <div style={cardText(5.1, t.paperMuted, t.mono, { marginTop: '2px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 24 — Edge Type. The company runs UP the left edge in a tint strip.
  // The strip's rotated box is sized in PERCENT of the strip, not pixels,
  // so it stays the height of the card at any width the stage is given.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ display: 'flex', height: '100%' }}>
          <div
            style={{
              width: '13%',
              background: t.brandBg,
              position: 'relative',
              flex: '0 0 auto',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '480%',
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                textAlign: 'center',
                ...cardText(5.6, t.brandInk, t.heading, { fontWeight: 600, ...UPPER }),
              }}
            >
              {f.Company}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: '9% 8% 8% 7%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={cardText(5.2, t.paperMuted, t.body)}>{f.Tagline}</div>
              <Mark brand={brand} theme={t} on={t.paper} height={10} picks={picks} company={company} />
            </div>
            <div
              style={cardText(11.5, t.paperInk, t.heading, {
                fontWeight: 600,
                marginTop: 'auto',
                letterSpacing: '-0.02em',
              })}
            >
              {f.Name}
              <span style={cardText(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={cardText(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
            <div style={{ marginTop: '5px' }}>
              <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.3} gap={1.1} />
              <div style={cardText(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>
                {f.Address}
              </div>
            </div>
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="dark" />,
  }),
];

/**
 * Wave 2's renderer.
 *
 * `templateIndex` arrives already rebased by the shared dispatch (`ext-19`
 * is 0). An index past the six can only come from a saved customization
 * filed against an archived id: it wraps rather than painting nothing,
 * because the customer's own content still shows on a design that reads.
 */
export function BusinessCardExtended2Renderer({ brand, templateIndex, content }: Props) {
  const ctx = cardContext(brand, content);
  const design = DESIGNS[templateIndex] ?? DESIGNS[templateIndex % DESIGNS.length] ?? DESIGNS[0];
  const { front, back } = design(ctx);
  return <CardStage theme={ctx.theme} front={front} back={back} />;
}

/** The kept Wave-2 ids. Six entries where there were a hundred. */
export const BUSINESS_CARDS_EXTENDED_2 = [
  { idSuffix: 'ext-19', name: 'Diagonal Cut', category: 'Bold' },
  { idSuffix: 'ext-20', name: 'Contact Rail', category: 'Modern' },
  { idSuffix: 'ext-21', name: 'Centre Split', category: 'Minimalist' },
  { idSuffix: 'ext-22', name: 'Three Panels', category: 'Modern' },
  { idSuffix: 'ext-23', name: 'Perforation', category: 'Editorial' },
  { idSuffix: 'ext-24', name: 'Edge Type', category: 'Lux' },
] as const;

/** The ids this file used to emit and no longer does, for the curation record. */
export const BUSINESS_CARDS_WAVE_2_ARCHIVED_IDS: ReadonlyArray<string> = Array.from(
  { length: 94 },
  (_, i) => `business-cards-ext-${25 + i}`,
);
