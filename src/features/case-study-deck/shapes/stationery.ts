/**
 * Stationery category — 10 shapes.
 *
 * Each shape composes a different print collateral set (cards, letterhead,
 * notebooks, etc.) for a single brand. Style tokens flow from the active
 * deck style — shapes don't override them.
 */

import { createElement } from 'react';
import { headingSize, FitText } from '../styles';
import type { SlideShape, ShapeCatalog } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const STATIONERY_SHAPES: SlideShape[] = [
  {
    id: 'three-objects',
    name: 'Three Objects',
    description: 'Folder + card + envelope (existing).',
    render: ({ profile, style, surface, fonts, region }) => {
      const cardGap = style.spacing.blockGap;
      const cardW = Math.round((region.width - cardGap * 2) / 3);
      const cardH = 540;
      const cardPad = 36;
      const cardInnerW = cardW - cardPad * 2;
      const labelReserve = 80;
      const cardLabelH = cardH - cardPad * 2 - labelReserve;
      const objects = [
        { kind: 'Folder', bg: profile.palette.primary, ink: '#FFF' },
        { kind: 'Card', bg: '#FFF', ink: '#0A0A0A' },
        { kind: 'Envelope', bg: '#0A0A0A', ink: profile.palette.primary },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 36, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink } }, 'Three objects, one system.'),
        h('div', { key: 'row', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: cardGap, height: cardH } }, objects.map((o) =>
          h('div', { key: o.kind, style: { background: o.bg, borderRadius: style.layout.cardCorner, padding: cardPad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 18px 40px -10px rgba(0,0,0,0.2)' : 'none' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: o.ink, opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' } }, o.kind),
            h(FitText, { key: 'n', as: 'span', maxSize: 78, minSize: 20, width: cardInnerW, height: cardLabelH, style: { fontFamily: fonts.heading, fontWeight: 800, color: o.ink, letterSpacing: '-0.03em', lineHeight: 0.9 } }, profile.name),
            h('span', { key: 'u', style: { fontFamily: fonts.body, fontSize: 11, color: o.ink, opacity: 0.65 } }, o.kind === 'Card' ? 'www.' + profile.name.toLowerCase().replace(/\s+/g, '') + '.com' : '—'),
          ])
        )),
      ]);
    },
  },

  {
    id: 'business-card-flatlay',
    name: 'Business Card Flatlay',
    description: 'Front + back of business card.',
    render: ({ profile, style, surface, fonts, region }) => {
      const cardW = 520;
      const cardH = 320;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 36, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 120, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Hand to hand.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, position: 'relative' } }, [
          h('div', { key: 'front', style: { width: cardW, height: cardH, background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF', boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.35)' : 'none', transform: 'rotate(-4deg)' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, opacity: 0.8, letterSpacing: '0.2em', textTransform: 'uppercase' } }, 'Front'),
            h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.9 } }, profile.name),
            h('span', { key: 't', style: { fontFamily: fonts.body, fontSize: 12, opacity: 0.85, letterSpacing: '0.18em', textTransform: 'uppercase' } }, profile.tagline.slice(0, 40)),
          ]),
          h('div', { key: 'back', style: { width: cardW, height: cardH, background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF', boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.35)' : 'none', transform: 'rotate(4deg)' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' } }, 'Back'),
            h('div', { key: 'meta', style: { display: 'flex', flexDirection: 'column', gap: 6, fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6 } }, [
              h('span', { key: 'l', style: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 700 } }, 'Studio Director'),
              h('span', { key: 'e', style: { opacity: 0.85 } }, 'hello@' + profile.name.toLowerCase().replace(/\s+/g, '') + '.com'),
              h('span', { key: 'p', style: { opacity: 0.85 } }, '+1 (000) 000-0000'),
            ]),
            h('span', { key: 'u', style: { fontFamily: fonts.body, fontSize: 11, opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' } }, 'www.' + profile.name.toLowerCase().replace(/\s+/g, '') + '.com'),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'letterhead-suite',
    name: 'Letterhead Suite',
    description: 'Letterhead + envelope + comp slip.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Correspondence kit.'),
        h('div', { key: 'row', style: { flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: style.spacing.blockGap } }, [
          h('div', { key: 'lh', style: { background: '#FFF', borderRadius: style.layout.cardCorner, padding: 36, display: 'flex', flexDirection: 'column', boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.18)' : 'none', border: '1px solid rgba(0,0,0,0.06)' } }, [
            h('div', { key: 't', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 } }, [
              h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' } }, profile.name),
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 10, color: '#0A0A0A', opacity: 0.55, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Letterhead · A4'),
            ]),
            h('div', { key: 'lines', style: { display: 'flex', flexDirection: 'column', gap: 10, flex: 1 } }, Array.from({ length: 8 }).map((_, i) =>
              h('div', { key: i, style: { height: i === 0 ? 14 : 8, width: i === 0 ? '60%' : `${85 - (i * 4)}%`, background: i === 0 ? profile.palette.primary : 'rgba(0,0,0,0.1)', borderRadius: 4 } })
            )),
            h('span', { key: 'foot', style: { marginTop: 24, fontFamily: fonts.body, fontSize: 10, color: '#0A0A0A', opacity: 0.55, letterSpacing: '0.18em', textTransform: 'uppercase' } }, 'www.' + profile.name.toLowerCase().replace(/\s+/g, '') + '.com'),
          ]),
          h('div', { key: 'col', style: { display: 'flex', flexDirection: 'column', gap: style.spacing.blockGap } }, [
            h('div', { key: 'env', style: { flex: 1.4, background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: 24, color: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 18px 40px -10px rgba(0,0,0,0.25)' : 'none' } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 10, opacity: 0.85, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Envelope · DL'),
              h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' } }, profile.name),
            ]),
            h('div', { key: 'cs', style: { flex: 1, background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 22, color: '#FFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: style.effect.shadow !== 'none' ? '0 18px 40px -10px rgba(0,0,0,0.25)' : 'none' } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 10, opacity: 0.7, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Comp Slip'),
              h('span', { key: 't', style: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, lineHeight: 1.3, opacity: 0.95 } }, '“With compliments — ' + profile.name + '.”'),
            ]),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'notebook-set',
    name: 'Notebook Set',
    description: 'Notebook covers in three sizes.',
    render: ({ profile, style, surface, fonts, region }) => {
      const books = [
        { sz: 'A6', w: 200, h: 280, bg: profile.palette.primary, ink: '#FFF' },
        { sz: 'A5', w: 280, h: 380, bg: '#0A0A0A', ink: '#FFF' },
        { sz: 'A4', w: 360, h: 480, bg: '#FFF', ink: '#0A0A0A' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Bound by hand.'),
        h('div', { key: 'row', style: { flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 32 } }, books.map((b, i) =>
          h('div', { key: i, style: { width: b.w, height: b.h, background: b.bg, borderRadius: 6, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: b.ink, boxShadow: style.effect.shadow !== 'none' ? '0 26px 50px -14px rgba(0,0,0,0.3)' : 'none', border: b.bg === '#FFF' ? '1px solid rgba(0,0,0,0.08)' : 'none' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 10, opacity: 0.7, letterSpacing: '0.22em', textTransform: 'uppercase' } }, b.sz),
            h(FitText, { key: 'n', as: 'span', maxSize: 56, minSize: 14, width: b.w - 48, height: b.h * 0.45, style: { fontFamily: fonts.heading, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.03em' } }, profile.name),
            h('span', { key: 'y', style: { fontFamily: fonts.body, fontSize: 10, opacity: 0.6, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Vol. ' + (i + 1)),
          ])
        )),
      ]);
    },
  },

  {
    id: 'tag-stickers',
    name: 'Tags & Stickers',
    description: 'Hangtag + stickers + label set.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Marks of origin.'),
        h('div', { key: 'g', style: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: style.spacing.blockGap } }, [
          // Hangtag (spans 2 rows)
          h('div', { key: 'tag', style: { gridRow: 'span 2', background: '#FFF', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', border: '1px solid rgba(0,0,0,0.08)', boxShadow: style.effect.shadow !== 'none' ? '0 18px 40px -10px rgba(0,0,0,0.18)' : 'none' } }, [
            h('span', { key: 'hole', style: { position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 18, height: 18, borderRadius: 999, border: '2px solid rgba(0,0,0,0.25)' } }),
            h('span', { key: 'eb', style: { marginTop: 24, fontFamily: fonts.body, fontSize: 11, color: '#0A0A0A', opacity: 0.6, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Hangtag'),
            h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 60, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-0.04em', lineHeight: 0.9 } }, profile.name),
            h('span', { key: 'p', style: { fontFamily: fonts.body, fontSize: 12, color: profile.palette.primary, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' } }, profile.tagline.slice(0, 24)),
          ]),
          // Round sticker
          h('div', { key: 's1', style: { background: profile.palette.primary, borderRadius: 999, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: style.effect.shadow !== 'none' ? '0 14px 30px -8px rgba(0,0,0,0.25)' : 'none' } },
            h('span', { style: { fontFamily: fonts.heading, fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em' } }, profile.name.charAt(0))
          ),
          // Square sticker
          h('div', { key: 's2', style: { background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF', boxShadow: style.effect.shadow !== 'none' ? '0 14px 30px -8px rgba(0,0,0,0.25)' : 'none' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 10, opacity: 0.7, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Sticker'),
            h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' } }, profile.name),
          ]),
          // Long label
          h('div', { key: 'lab', style: { gridColumn: 'span 2', background: '#FFF', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `2px solid ${profile.palette.primary}`, boxShadow: style.effect.shadow !== 'none' ? '0 14px 30px -8px rgba(0,0,0,0.18)' : 'none' } }, [
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, color: '#0A0A0A', opacity: 0.6, letterSpacing: '0.22em', textTransform: 'uppercase' } }, 'Label · 80×20mm'),
            h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 24, fontWeight: 800, color: profile.palette.primary, letterSpacing: '-0.02em' } }, profile.name + ' / Made with care'),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'tote-merch',
    name: 'Tote & Merch',
    description: 'Tote bag + tee + cap as CSS shapes.',
    render: ({ profile, style, surface, fonts, region }) => {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Worn outside.'),
        h('div', { key: 'row', style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: style.spacing.blockGap } }, [
          // Tote
          h('div', { key: 'tote', style: { background: surface.subtle, borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' } }, [
            h('div', { key: 'handles', style: { position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 80 } }, [
              h('div', { key: 'l', style: { width: 40, height: 60, border: `4px solid ${surface.ink}`, borderBottom: 'none', borderRadius: '40px 40px 0 0' } }),
              h('div', { key: 'r', style: { width: 40, height: 60, border: `4px solid ${surface.ink}`, borderBottom: 'none', borderRadius: '40px 40px 0 0' } }),
            ]),
            h('div', { key: 'bag', style: { marginTop: 60, width: '88%', aspectRatio: '0.95', background: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxShadow: style.effect.shadow !== 'none' ? '0 14px 30px -8px rgba(0,0,0,0.18)' : 'none' } },
              h('span', { style: { fontFamily: fonts.heading, fontSize: 44, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-0.03em', textAlign: 'center' } }, profile.name)
            ),
          ]),
          // Tee
          h('div', { key: 'tee', style: { background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', clipPath: 'polygon(20% 0, 30% 0, 35% 8%, 65% 8%, 70% 0, 80% 0, 100% 18%, 92% 32%, 80% 30%, 80% 100%, 20% 100%, 20% 30%, 8% 32%, 0 18%)' } },
            h('span', { style: { fontFamily: fonts.heading, fontSize: 38, fontWeight: 900, color: '#FFF', letterSpacing: '-0.03em', textAlign: 'center' } }, profile.name.charAt(0))
          ),
          // Cap
          h('div', { key: 'cap', style: { background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#FFF' } }, [
            h('div', { key: 'crown', style: { width: '70%', aspectRatio: '2.2', background: profile.palette.primary, borderRadius: '50% 50% 6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              h('span', { style: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' } }, profile.name)
            ),
            h('div', { key: 'brim', style: { width: '90%', height: 14, background: '#1c1c1c', borderRadius: '0 0 30% 30%' } }),
            h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, opacity: 0.7, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 8 } }, 'Cap · 6-panel'),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'flyer-grid',
    name: 'Flyer Grid',
    description: 'Three different poster flyers.',
    render: ({ profile, style, surface, fonts, region }) => {
      const flyers = [
        { bg: profile.palette.primary, ink: '#FFF', kicker: 'NOW OPEN', headline: profile.name, sub: profile.tagline },
        { bg: '#0A0A0A', ink: '#FFF', kicker: 'EVENT', headline: 'A night with ' + profile.name, sub: 'May 12 · Studio' },
        { bg: '#FFF', ink: '#0A0A0A', kicker: 'NEW', headline: 'Volume 01', sub: profile.mission.slice(0, 60) },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Posters in print.'),
        h('div', { key: 'row', style: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: style.spacing.blockGap } }, flyers.map((f, i) => {
          const cw = Math.round((region.width - style.spacing.blockGap * 2) / 3 - 56);
          return h('div', { key: i, style: { background: f.bg, borderRadius: style.layout.cardCorner, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: f.ink, boxShadow: style.effect.shadow !== 'none' ? '0 22px 48px -12px rgba(0,0,0,0.25)' : 'none', border: f.bg === '#FFF' ? '1px solid rgba(0,0,0,0.08)' : 'none' } }, [
            h('span', { key: 'k', style: { fontFamily: fonts.body, fontSize: 11, opacity: 0.7, letterSpacing: '0.32em', textTransform: 'uppercase' } }, f.kicker),
            h(FitText, { key: 'h', as: 'span', maxSize: 80, minSize: 18, width: cw, height: 220, style: { fontFamily: fonts.heading, fontWeight: 900, color: f.ink, letterSpacing: '-0.04em', lineHeight: 0.9 } }, f.headline),
            h('span', { key: 's', style: { fontFamily: fonts.body, fontSize: 13, opacity: 0.85, lineHeight: 1.5 } }, f.sub),
          ]);
        })),
      ]);
    },
  },

  {
    id: 'id-badge',
    name: 'ID Badge',
    description: 'Corporate ID badge with brand.',
    render: ({ profile, style, surface, fonts, region }) => {
      const badgeW = 320;
      const badgeH = 480;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Worn at the door.'),
        h('div', { key: 'stage', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 50 } }, Array.from({ length: 2 }).map((_, i) =>
          h('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', transform: i === 0 ? 'rotate(-3deg)' : 'rotate(3deg)' } }, [
            // Lanyard
            h('div', { key: 'lan', style: { width: 16, height: 80, background: profile.palette.primary, borderRadius: '4px 4px 0 0' } }),
            h('div', { key: 'card', style: { width: badgeW, height: badgeH, background: '#FFF', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.3)' : 'none', border: '1px solid rgba(0,0,0,0.08)' } }, [
              h('div', { key: 'top', style: { background: profile.palette.primary, color: '#FFF', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' } }, profile.name),
                h('span', { key: 'l', style: { fontFamily: fonts.body, fontSize: 10, opacity: 0.85, letterSpacing: '0.2em', textTransform: 'uppercase' } }, 'STAFF'),
              ]),
              h('div', { key: 'photo', style: { marginTop: 14, aspectRatio: '1', background: surface.subtle, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A', fontFamily: fonts.heading, fontSize: 80, fontWeight: 800, opacity: 0.4 } }, profile.name.charAt(0)),
              h('div', { key: 'meta', style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 } }, [
                h('span', { key: 'nm', style: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: '#0A0A0A' } }, i === 0 ? 'A. Kassem' : 'L. Mara'),
                h('span', { key: 'r', style: { fontFamily: fonts.body, fontSize: 11, color: '#0A0A0A', opacity: 0.6, letterSpacing: '0.16em', textTransform: 'uppercase' } }, i === 0 ? 'Director' : 'Designer'),
              ]),
              h('span', { key: 'id', style: { marginTop: 'auto', fontFamily: fonts.body, fontSize: 10, color: '#0A0A0A', opacity: 0.5, letterSpacing: '0.18em' } }, 'ID · 0008' + (i + 1)),
            ]),
          ])
        )),
      ]);
    },
  },

  {
    id: 'gift-wrap',
    name: 'Gift Wrap',
    description: 'Wrapping paper pattern + ribbon.',
    render: ({ profile, style, surface, fonts, region }) => {
      const tilesPerRow = 8;
      const rows = 5;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Wrapped, never plain.'),
        h('div', { key: 'paper', style: { flex: 1, position: 'relative', borderRadius: style.layout.cardCorner, overflow: 'hidden', background: '#FFF', boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.18)' : 'none' } }, [
            h('div', { key: 'pat', style: { position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${tilesPerRow}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` } }, Array.from({ length: tilesPerRow * rows }).map((_, i) =>
              h('div', { key: i, style: { display: 'flex', alignItems: 'center', justifyContent: 'center', transform: i % 2 === 0 ? 'rotate(-12deg)' : 'rotate(12deg)' } },
                h('span', { style: { fontFamily: fonts.heading, fontSize: 38, fontWeight: 800, color: i % 3 === 0 ? profile.palette.primary : '#0A0A0A', letterSpacing: '-0.03em', opacity: 0.85 } }, profile.name.charAt(0))
              )
            )),
            // Vertical ribbon
            h('div', { key: 'rv', style: { position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 60, background: profile.palette.primary } }),
            // Horizontal ribbon
            h('div', { key: 'rh', style: { position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 60, background: profile.palette.primary } }),
            // Bow center
            h('div', { key: 'bow', style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 90, height: 90, borderRadius: 14, background: profile.palette.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontFamily: fonts.heading, fontSize: 32, fontWeight: 900, boxShadow: '0 12px 24px rgba(0,0,0,0.2)' } }, profile.name.charAt(0)),
        ]),
      ]);
    },
  },

  {
    id: 'cd-vinyl',
    name: 'Vinyl Set',
    description: 'Circular vinyl / disc collection.',
    render: ({ profile, style, surface, fonts, region }) => {
      const discs = [
        { bg: profile.palette.primary, label: '#FFF', n: '01' },
        { bg: '#0A0A0A', label: '#FFF', n: '02' },
        { bg: '#FFF', label: '#0A0A0A', n: '03' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 28, height: '100%' } }, [
        h(FitText, { key: 'h', as: 'div', maxSize: headingSize(style, 96), minSize: 32, width: region.width, height: 110, style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, color: surface.ink } }, 'Pressed in series.'),
        h('div', { key: 'row', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 } }, discs.map((d, i) => {
          const size = 380;
          return h('div', { key: i, style: { width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, ${d.bg} 35%, ${d.bg === '#FFF' ? '#e5e5e5' : (d.bg === '#0A0A0A' ? '#1a1a1a' : '#0A0A0A')} 36%, ${d.bg === '#FFF' ? '#f0f0f0' : (d.bg === '#0A0A0A' ? '#0f0f0f' : d.bg)} 100%)`, position: 'relative', boxShadow: style.effect.shadow !== 'none' ? '0 26px 56px -14px rgba(0,0,0,0.4)' : 'none', transform: i === 1 ? 'translateY(-30px)' : 'translateY(20px)' } }, [
            // Center label
            h('div', { key: 'lab', style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '46%', height: '46%', borderRadius: '50%', background: d.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: d.label, gap: 4 } }, [
              h('span', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 9, opacity: 0.7, letterSpacing: '0.32em', textTransform: 'uppercase' } }, 'Side ' + d.n),
              h('span', { key: 'n', style: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', textAlign: 'center', padding: '0 8px' } }, profile.name),
            ]),
            // Center hole
            h('span', { key: 'hole', style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: surface.bg, zIndex: 2 } }),
          ]);
        })),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'three-objects',
  monolith: 'letterhead-suite',
  playful: 'gift-wrap',
  editorial: 'business-card-flatlay',
  magazine: 'flyer-grid',
  swiss: 'letterhead-suite',
  minimal: 'business-card-flatlay',
  modern: 'notebook-set',
  brutalist: 'tag-stickers',
  technical: 'id-badge',
};

export const STATIONERY_CATALOG: ShapeCatalog = {
  archetype: 'stationery',
  categoryLabel: 'Stationery',
  shapes: STATIONERY_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? STATIONERY_SHAPES[0].id,
};
