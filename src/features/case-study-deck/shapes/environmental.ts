/**
 * Environmental category — 10 shapes.
 *
 * Each shape composes a different physical-signage / installation
 * mockup — lobby cards, banners, building facades, transit posters.
 * Style tokens (font, weight, padding, radius, shadow) come from the
 * active deck style — shapes never override those.
 */

import { createElement } from 'react';
import { LogoMark } from '../slides/shared';
import { headingSize, FitText } from '../styles';
import { shiftLightness } from '../utils';
import type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
import type { DeckStyle } from '../styles';

const h = createElement;

/* ─────────────────────────  helpers  ─────────────────────── */

function shadowFor(style: ShapeRenderProps['style']) {
  return style.effect.shadow !== 'none' ? '0 30px 60px -12px rgba(0,0,0,0.25)' : 'none';
}

function copyHeader(profile: ShapeRenderProps['profile'], style: ShapeRenderProps['style'], surface: ShapeRenderProps['surface'], fonts: ShapeRenderProps['fonts'], width: number) {
  return h('div', { key: 'cap', style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' } }, [
    h('div', { key: 't' }, [
      h(FitText, {
        as: 'div',
        maxSize: headingSize(style, 96),
        minSize: 28,
        width,
        height: 240,
        style: { fontFamily: fonts.heading, fontWeight: style.typography.headingWeight, lineHeight: 0.92, letterSpacing: style.typography.headingTracking, color: surface.ink, whiteSpace: 'pre-line' as const },
      }, 'Built\nfor the\nstreet.'),
      h(FitText, {
        as: 'div',
        maxSize: 18,
        minSize: 11,
        width,
        height: 140,
        style: { marginTop: 24, opacity: 0.7, lineHeight: 1.65, color: surface.ink, fontFamily: fonts.body },
      }, `${profile.name} as you encounter it — signage, flagship moments, environmental presence.`),
    ]),
  ]);
}

/* ─────────────────────────  shape catalog  ─────────────────────── */

export const ENVIRONMENTAL_SHAPES: SlideShape[] = [
  {
    id: 'lobby-card',
    name: 'Lobby Card',
    description: 'Large branded card placard in a lobby.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const colGap = style.spacing.columnGap;
      const halfW = Math.round((region.width - colGap) / 2);
      const cardW = 580;
      const cardH = 540;
      const cardPad = 60;
      const cardInnerW = cardW - cardPad * 2;
      const cardLogoH = 48;
      const cardCaptionH = 22;
      const cardNameH = cardH - cardPad * 2 - cardLogoH - cardCaptionH - 60;
      return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: colGap, height: '100%' } }, [
        copyHeader(profile, style, surface, fonts, halfW),
        h('div', { key: 'card', style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h('div', { style: { width: cardW, height: cardH, background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: cardPad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: shadowFor(style) } }, [
            h(LogoMark, { key: 'l', profile, variant: 'white', height: cardLogoH, color: '#FFF' }),
            h(FitText, {
              key: 'n',
              as: 'span',
              maxSize: 180,
              minSize: 48,
              width: cardInnerW,
              height: cardNameH,
              style: { fontFamily: fonts.heading, fontWeight: 900, lineHeight: 0.85, letterSpacing: '-0.04em', color: '#FFF' },
            }, profile.name),
            h('div', { key: 'c', style: { fontFamily: fonts.body, fontSize: 12, color: '#FFF', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.8 } }, `Lobby installation · ${style.name}`),
          ])
        ),
      ]);
    },
  },

  {
    id: 'hanging-banner',
    name: 'Hanging Banner',
    description: 'Vertical banner with rope/grommet hanger above.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const colGap = style.spacing.columnGap;
      const halfW = Math.round((region.width - colGap) / 2);
      const bannerW = 360;
      const bannerH = 600;
      return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: colGap, height: '100%' } }, [
        copyHeader(profile, style, surface, fonts, halfW),
        h('div', { key: 'b', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative' } }, [
          // crossbar
          h('div', { key: 'bar', style: { position: 'absolute', top: 6, width: bannerW + 80, height: 6, background: shiftLightness(surface.bg, surface.ink === '#FFFFFF' ? 0.16 : -0.18), borderRadius: 4 } }),
          // ropes
          h('div', { key: 'r1', style: { position: 'absolute', top: 12, left: '50%', marginLeft: -bannerW / 2, width: 2, height: 28, background: surface.muted } }),
          h('div', { key: 'r2', style: { position: 'absolute', top: 12, left: '50%', marginLeft: bannerW / 2 - 2, width: 2, height: 28, background: surface.muted } }),
          h('div', { key: 'banner', style: { marginTop: 40, width: bannerW, height: bannerH, background: profile.palette.primary, borderRadius: 4, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: shadowFor(style) } }, [
            h(LogoMark, { key: 'l', profile, variant: 'white', height: 36, color: '#FFF' }),
            h(FitText, {
              key: 'n',
              as: 'span',
              maxSize: 110,
              minSize: 36,
              width: bannerW - 60,
              height: bannerH - 220,
              style: { fontFamily: fonts.heading, fontWeight: 800, color: '#FFF', lineHeight: 0.9, letterSpacing: '-0.03em', textAlign: 'center' as const },
            }, profile.name),
            h('div', { key: 'c', style: { fontFamily: fonts.body, fontSize: 11, color: '#FFF', letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.85, textAlign: 'center' as const } }, 'Hanging banner'),
          ]),
        ]),
      ]);
    },
  },

  {
    id: 'office-wall',
    name: 'Office Wall',
    description: 'Wide wall installation with brand name in raised letters.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const wallW = region.width;
      const wallH = Math.round(region.height * 0.62);
      const innerPad = 60;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 36, height: '100%' } }, [
        h('div', { key: 'cap', style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, `Reception wall · ${profile.name} HQ`),
        h('div', { key: 'wall', style: { width: '100%', height: wallH, background: shiftLightness(surface.bg, surface.ink === '#FFFFFF' ? 0.06 : -0.08), borderRadius: style.layout.cardCorner, padding: innerPad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadowFor(style), position: 'relative', overflow: 'hidden' } }, [
          // wall texture stripes
          h('div', { key: 'tex', style: { position: 'absolute', inset: 0, background: `repeating-linear-gradient(180deg, ${shiftLightness(surface.bg, surface.ink === '#FFFFFF' ? 0.04 : -0.04)} 0 2px, transparent 2px 64px)`, opacity: 0.4 } }),
          h(FitText, {
            key: 'n',
            as: 'span',
            maxSize: 320,
            minSize: 64,
            width: wallW - innerPad * 2,
            height: wallH - innerPad * 2,
            style: { fontFamily: fonts.heading, fontWeight: 900, color: profile.palette.primary, lineHeight: 0.85, letterSpacing: '-0.05em', textAlign: 'center' as const, position: 'relative', textShadow: '4px 4px 0 rgba(0,0,0,0.12)' },
          }, profile.name.toUpperCase()),
        ]),
        h(FitText, {
          key: 'd',
          as: 'div',
          maxSize: 16,
          minSize: 11,
          width: region.width,
          height: 80,
          style: { fontFamily: fonts.body, color: surface.ink, opacity: 0.7, lineHeight: 1.6 },
        }, `Identity scaled to architecture — the ${profile.name} mark, dimensional, lit, present.`),
      ]);
    },
  },

  {
    id: 'building-facade',
    name: 'Building Facade',
    description: 'Frosted-glass facade impression with brand mark applied.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const facadeH = region.height;
      return h('div', { style: { position: 'relative', height: '100%', borderRadius: style.layout.cardCorner, overflow: 'hidden', background: `linear-gradient(180deg, ${shiftLightness(profile.palette.primary, 0.2)} 0%, ${profile.palette.primary} 100%)` } }, [
        // facade glass tiles grid
        h('div', { key: 'grid', style: { position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 4, padding: 4 } },
          Array.from({ length: 48 }, (_, i) =>
            h('div', { key: i, style: { background: `rgba(255,255,255,${0.06 + (i % 7) * 0.02})`, borderRadius: 2, backdropFilter: 'blur(8px)' } })
          )
        ),
        // brand mark center
        h('div', { key: 'mark', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(FitText, {
            as: 'span',
            maxSize: 280,
            minSize: 56,
            width: Math.round(region.width * 0.7),
            height: Math.round(facadeH * 0.5),
            style: { fontFamily: fonts.heading, fontWeight: 900, color: '#FFF', lineHeight: 0.85, letterSpacing: '-0.04em', textAlign: 'center' as const, textShadow: '0 8px 32px rgba(0,0,0,0.3)' },
          }, profile.name)
        ),
        h('div', { key: 'cap', style: { position: 'absolute', bottom: 24, left: 32, fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#FFF', opacity: 0.9 } }, `Facade application · ${style.name}`),
      ]);
    },
  },

  {
    id: 'event-stage',
    name: 'Event Stage',
    description: 'Stage backdrop with brand mark dead-center.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const stageH = Math.round(region.height * 0.78);
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, height: '100%' } }, [
        h('div', { key: 'stage', style: { width: '100%', height: stageH, background: '#0A0A0A', borderRadius: style.layout.cardCorner, position: 'relative', overflow: 'hidden', boxShadow: shadowFor(style) } }, [
          // spotlight
          h('div', { key: 'sp', style: { position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${shiftLightness(profile.palette.primary, 0.2)} 0%, transparent 60%)`, opacity: 0.65 } }),
          h('div', { key: 'mark', style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 60 } }, [
            h(LogoMark, { key: 'l', profile, variant: 'white', height: 60, color: '#FFF' }),
            h(FitText, {
              key: 'n',
              as: 'span',
              maxSize: 180,
              minSize: 48,
              width: Math.round(region.width * 0.7),
              height: 220,
              style: { fontFamily: fonts.heading, fontWeight: 900, color: '#FFF', lineHeight: 0.9, letterSpacing: '-0.03em', textAlign: 'center' as const },
            }, profile.tagline),
            h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 14, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#FFF', opacity: 0.7 } }, `${profile.name} keynote`),
          ]),
          // stage front lip
          h('div', { key: 'lip', style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 26, background: shiftLightness('#0A0A0A', 0.04) } }),
        ]),
        h('div', { key: 'cap', style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, `Stage backdrop · ${style.name}`),
      ]);
    },
  },

  {
    id: 'kiosk-displays',
    name: 'Kiosk Displays',
    description: 'Three vertical kiosks lined up, each carrying the brand.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const kioskH = Math.round(region.height * 0.82);
      const kioskW = Math.round((region.width - 32 * 2) / 3);
      const kioskInnerW = kioskW - 40;
      const swatches = profile.palette.swatches.slice(0, 3);
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, height: '100%' } }, [
        h('div', { key: 'row', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, height: kioskH } },
          [0, 1, 2].map((i) => {
            const accent = swatches[i]?.hex ?? profile.palette.primary;
            return h('div', { key: i, style: { background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 14, display: 'flex', flexDirection: 'column', boxShadow: shadowFor(style) } }, [
              h('div', { key: 'screen', style: { flex: 1, background: accent, borderRadius: 8, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }, [
                h(LogoMark, { key: 'l', profile, variant: 'white', height: 28, color: '#FFF' }),
                h(FitText, {
                  key: 'n',
                  as: 'span',
                  maxSize: 90,
                  minSize: 24,
                  width: kioskInnerW,
                  height: kioskH - 200,
                  style: { fontFamily: fonts.heading, fontWeight: 800, color: '#FFF', lineHeight: 0.9, letterSpacing: '-0.03em' },
                }, profile.name),
                h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#FFF', opacity: 0.85 } }, `Kiosk · 0${i + 1}`),
              ]),
              // base bar
              h('div', { key: 'b', style: { height: 24, marginTop: 8, background: shiftLightness('#0A0A0A', 0.1), borderRadius: 4 } }),
            ]);
          })
        ),
        h('div', { key: 'cap', style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, `Wayfinding kiosks · ${profile.name}`),
      ]);
    },
  },

  {
    id: 'transit-poster',
    name: 'Transit Poster',
    description: '4-up subway poster grid in different brand colorways.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const swatches = profile.palette.swatches.slice(0, 4);
      while (swatches.length < 4) swatches.push({ hex: profile.palette.primary, name: 'Primary', rgb: '' });
      const cellH = Math.round((region.height - 32) / 2);
      const cellW = Math.round((region.width - 32) / 2);
      return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 32, height: '100%' } },
        swatches.map((s, i) => {
          const ink = s.hex.toLowerCase() === '#ffffff' ? '#0A0A0A' : '#FFF';
          return h('div', { key: s.hex + i, style: { background: s.hex, borderRadius: style.layout.cardCorner, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: shadowFor(style) } }, [
            h(LogoMark, { key: 'l', profile, variant: ink === '#FFF' ? 'white' : 'black', height: 32, color: ink }),
            h(FitText, {
              key: 'n',
              as: 'span',
              maxSize: 140,
              minSize: 32,
              width: cellW - 72,
              height: cellH - 200,
              style: { fontFamily: fonts.heading, fontWeight: 900, color: ink, lineHeight: 0.88, letterSpacing: '-0.04em' },
            }, profile.name),
            h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: ink, opacity: 0.85 } }, `Subway · platform 0${i + 1}`),
          ]);
        })
      );
    },
  },

  {
    id: 'wayfinding-arrows',
    name: 'Wayfinding Arrows',
    description: 'Directional signage with arrows + brand mark.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const rows = [
        { dir: '→', label: profile.name + ' Reception', accent: profile.palette.primary },
        { dir: '↑', label: 'Galleries 01–03', accent: profile.palette.swatches[1]?.hex ?? profile.palette.primary },
        { dir: '↗', label: 'Auditorium', accent: profile.palette.swatches[2]?.hex ?? profile.palette.primary },
        { dir: '↓', label: 'Archive', accent: profile.palette.swatches[3]?.hex ?? '#0A0A0A' },
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, height: '100%' } }, [
        h('div', { key: 'cap', style: { fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', color: surface.ink, opacity: 0.6 } }, `Wayfinding system · ${profile.name}`),
        h('div', { key: 'panel', style: { flex: 1, background: '#0A0A0A', borderRadius: style.layout.cardCorner, padding: 36, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: shadowFor(style) } },
          rows.map((r, i) =>
            h('div', { key: i, style: { flex: 1, display: 'flex', alignItems: 'center', gap: 36, padding: '0 32px', borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${shiftLightness('#0A0A0A', 0.12)}` } }, [
              h('span', { key: 'a', style: { width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.accent, borderRadius: 12, color: '#FFF', fontFamily: fonts.heading, fontSize: 64, fontWeight: 900, lineHeight: 1 } }, r.dir),
              h(FitText, {
                key: 'l',
                as: 'span',
                maxSize: 64,
                minSize: 24,
                width: region.width - 220,
                height: 80,
                style: { fontFamily: fonts.heading, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em', lineHeight: 1 },
              }, r.label),
            ])
          )
        ),
      ]);
    },
  },

  {
    id: 'floor-graphic',
    name: 'Floor Graphic',
    description: 'Floor-stick graphic in skewed perspective.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      return h('div', { style: { position: 'relative', height: '100%', borderRadius: style.layout.cardCorner, overflow: 'hidden', background: shiftLightness(surface.bg, surface.ink === '#FFFFFF' ? 0.06 : -0.08) } }, [
        // floor planks
        h('div', { key: 'planks', style: { position: 'absolute', inset: 0, background: `repeating-linear-gradient(90deg, ${shiftLightness(surface.bg, surface.ink === '#FFFFFF' ? 0.04 : -0.04)} 0 90px, transparent 90px 92px)`, opacity: 0.4 } }),
        // perspective sticker
        h('div', { key: 'stk', style: { position: 'absolute', left: '12%', right: '12%', bottom: '14%', height: '58%', background: profile.palette.primary, borderRadius: style.layout.cardCorner, padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transform: 'perspective(900px) rotateX(58deg)', transformOrigin: 'center bottom', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.4)' } }, [
          h('div', { key: 'eb', style: { fontFamily: fonts.body, fontSize: 16, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#FFF', opacity: 0.9 } }, 'Stand here'),
          h(FitText, {
            key: 'n',
            as: 'span',
            maxSize: 220,
            minSize: 48,
            width: Math.round(region.width * 0.6),
            height: 280,
            style: { fontFamily: fonts.heading, fontWeight: 900, color: '#FFF', lineHeight: 0.85, letterSpacing: '-0.04em', textAlign: 'center' as const },
          }, profile.name),
          h('div', { key: 'arr', style: { fontFamily: fonts.heading, fontSize: 90, fontWeight: 900, color: '#FFF', textAlign: 'center' as const, lineHeight: 1 } }, '↓'),
        ]),
        h('div', { key: 'cap', style: { position: 'absolute', top: 24, left: 32, fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: surface.ink, opacity: 0.7 } }, `Floor graphic · ${profile.name}`),
      ]);
    },
  },

  {
    id: 'light-installation',
    name: 'Light Installation',
    description: 'Light-on-dark glowing brand mark in a gallery space.',
    render: ({ profile, style, surface, fonts, region }: ShapeRenderProps) => {
      const accent = profile.palette.primary;
      return h('div', { style: { position: 'relative', height: '100%', borderRadius: style.layout.cardCorner, overflow: 'hidden', background: '#050505' } }, [
        // glow bg
        h('div', { key: 'g1', style: { position: 'absolute', left: '50%', top: '50%', width: 1200, height: 1200, marginLeft: -600, marginTop: -600, background: accent, filter: 'blur(220px)', opacity: 0.5 } }),
        h('div', { key: 'g2', style: { position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 60%, transparent 0%, rgba(0,0,0,0.6) 80%)` } }),
        // mark
        h('div', { key: 'mark', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(FitText, {
            as: 'span',
            maxSize: 320,
            minSize: 64,
            width: Math.round(region.width * 0.7),
            height: Math.round(region.height * 0.55),
            style: { fontFamily: fonts.heading, fontWeight: 900, color: '#FFF', lineHeight: 0.85, letterSpacing: '-0.04em', textAlign: 'center' as const, textShadow: `0 0 40px ${accent}, 0 0 80px ${accent}, 0 0 120px ${accent}` },
          }, profile.name)
        ),
        h('div', { key: 'cap', style: { position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.body, fontSize: 12, letterSpacing: '0.36em', textTransform: 'uppercase', color: '#FFF', opacity: 0.7 } }, `Light installation · ${style.name}`),
      ]);
    },
  },
];

const STYLE_TO_DEFAULT_SHAPE: Record<DeckStyle['id'], string> = {
  bold: 'lobby-card',
  monolith: 'building-facade',
  playful: 'transit-poster',
  editorial: 'office-wall',
  magazine: 'transit-poster',
  swiss: 'wayfinding-arrows',
  minimal: 'lobby-card',
  modern: 'light-installation',
  brutalist: 'office-wall',
  technical: 'kiosk-displays',
};

export const ENVIRONMENTAL_CATALOG: ShapeCatalog = {
  archetype: 'environmental',
  categoryLabel: 'Environmental',
  shapes: ENVIRONMENTAL_SHAPES,
  defaultFor: (style) => STYLE_TO_DEFAULT_SHAPE[style.id] ?? ENVIRONMENTAL_SHAPES[0].id,
};
